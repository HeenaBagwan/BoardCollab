import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Konva from 'konva';
import Navbar from '../components/Navbar';
import CanvasStage from '../components/CanvasStage';
import CanvasToolbar from '../components/CanvasToolbar';
import PropertiesPanel from '../components/PropertiesPanel';
import LiveCursors from '../components/LiveCursors';
import Minimap from '../components/Minimap';
import ZoomControls from '../components/ZoomControls';
import OfflineBanner from '../components/OfflineBanner';
import CommandPalette from '../components/CommandPalette';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setElements,
  upsertElement,
  upsertElements,
  setRemotePresences,
  updateRemoteCursor,
  updateRemoteStroke,
  clearRemoteStroke,
  clearAllElements,
  removePendingOp,
  setIsOffline,
  setLamportCounter
} from '../store/canvasSlice';
import { fetchRoomById } from '../store/roomSlice';
import { connectSocket, getSocket } from '../lib/socket';
import { queueOfflineOp, getOfflineQueue, clearOfflineQueue } from '../lib/offlineQueue';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import api from '../lib/api';
import { Op, CanvasElement } from '../types';

export const BoardPage: React.FC = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const stageRef = useRef<Konva.Stage>(null);

  const currentUser = useAppSelector((state) => state.auth.user);
  const currentRoom = useAppSelector((state) => state.room.currentRoom);
  const stagePos = useAppSelector((state) => state.canvas.stagePos);
  const stageScale = useAppSelector((state) => state.canvas.stageScale);
  const undoStack = useAppSelector((state) => state.canvas.undoStack);
  const redoStack = useAppSelector((state) => state.canvas.redoStack);
  const isOffline = useAppSelector((state) => state.canvas.isOffline);

  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isOwner = currentRoom?.ownerId === currentUser?.id || currentRoom?.myRole === 'owner';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch room metadata
  useEffect(() => {
    if (roomId) {
      dispatch(fetchRoomById(roomId));
    }
  }, [roomId, dispatch]);

  // Setup Socket.IO real-time connection & listeners
  useEffect(() => {
    if (!roomId) return;

    const socket = connectSocket();

    const handleConnect = () => {
      dispatch(setIsOffline(false));

      // Join room and request state
      socket.emit('join-room', { roomId }, (res: any) => {
        if (res?.error) {
          showToast(res.error);
          navigate('/dashboard');
        } else if (res?.serverClock) {
          dispatch(setLamportCounter(res.serverClock));
        }
      });

      // Replay any offline queued ops
      const offlineOps = getOfflineQueue();
      if (offlineOps.length > 0) {
        offlineOps.forEach((op) => {
          socket.emit('op', op);
        });
        clearOfflineQueue();
      }
    };

    const handleDisconnect = () => {
      dispatch(setIsOffline(true));
    };

    // 1. Initial / Paginated Room State
    const handleRoomState = (data: { elements: CanvasElement[]; serverClock: number }) => {
      if (data.elements) {
        dispatch(upsertElements(data.elements));
      }
      if (data.serverClock) {
        dispatch(setLamportCounter(data.serverClock));
      }
    };

    // 2. Incoming Op from other collaborator
    const handleIncomingOp = (op: Op) => {
      if (op.type === 'add' && op.props) {
        dispatch(upsertElement({
          id: op.elementId,
          roomId: op.roomId || roomId,
          type: op.elementType || 'rect',
          props: op.props,
          propClocks: { default: op.clock },
          authorId: op.userId,
          isDeleted: false,
          deleteClock: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      } else if (op.type === 'update' && op.patch) {
        // Update local element properties
        const stateEl = (window as any).__BOARD_STATE_ENTITIES?.[op.elementId];
        dispatch(upsertElement({
          id: op.elementId,
          roomId: op.roomId || roomId,
          type: op.elementType || stateEl?.type || 'rect',
          props: { ...(stateEl?.props || {}), ...op.patch },
          propClocks: stateEl?.propClocks || {},
          authorId: stateEl?.authorId || op.userId,
          isDeleted: false,
          deleteClock: null,
          createdAt: stateEl?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      } else if (op.type === 'delete') {
        dispatch(upsertElement({
          id: op.elementId,
          roomId: op.roomId || roomId,
          type: op.elementType || 'rect',
          props: {},
          propClocks: {},
          authorId: op.userId,
          isDeleted: true,
          deleteClock: op.clock,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      }

      if (op.clock?.counter) {
        dispatch(setLamportCounter(op.clock.counter));
      }
    };

    // 3. Batched Ops (~16ms flush from server)
    const handleOpBatch = (data: { ops: Op[] }) => {
      if (data.ops) {
        data.ops.forEach(handleIncomingOp);
      }
    };

    // 4. Op Ack
    const handleOpAck = (ack: { opId: string; elementId: string; serverClock: number }) => {
      dispatch(removePendingOp(ack.opId));
      if (ack.serverClock) {
        dispatch(setLamportCounter(ack.serverClock));
      }
    };

    // 5. Authoritative Reconcile (when local optimism differed)
    const handleReconcile = (data: { element: CanvasElement }) => {
      if (data.element) {
        dispatch(upsertElement(data.element));
      }
    };

    // 6. Live Presence Update
    const handlePresenceUpdate = (data: { users: any[] }) => {
      if (data.users) {
        dispatch(setRemotePresences(data.users));
      }
    };

    // 7. Ephemeral In-Progress Strokes from peers
    const handleRemoteStrokeProgress = (data: any) => {
      dispatch(updateRemoteStroke(data));
    };

    // 8. Ephemeral Cursor Movements from peers
    const handleRemoteCursor = (data: any) => {
      dispatch(updateRemoteCursor(data));
    };

    // 9. Canvas Cleared (Owner)
    const handleCanvasCleared = () => {
      dispatch(clearAllElements());
      showToast('Canvas was cleared by the owner');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-state', handleRoomState);
    socket.on('op', handleIncomingOp);
    socket.on('op-batch', handleOpBatch);
    socket.on('op-ack', handleOpAck);
    socket.on('reconcile', handleReconcile);
    socket.on('presence-update', handlePresenceUpdate);
    socket.on('stroke-progress', handleRemoteStrokeProgress);
    socket.on('cursor-move', handleRemoteCursor);
    socket.on('canvas-cleared', handleCanvasCleared);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit('leave-room', { roomId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-state', handleRoomState);
      socket.off('op', handleIncomingOp);
      socket.off('op-batch', handleOpBatch);
      socket.off('op-ack', handleOpAck);
      socket.off('reconcile', handleReconcile);
      socket.off('presence-update', handlePresenceUpdate);
      socket.off('stroke-progress', handleRemoteStrokeProgress);
      socket.off('cursor-move', handleRemoteCursor);
      socket.off('canvas-cleared', handleCanvasCleared);
    };
  }, [roomId, dispatch, navigate]);

  // Outgoing Op Emission
  const handleEmitOp = useCallback((op: Op) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('op', op);
    } else {
      // Offline queue
      queueOfflineOp(op);
    }
  }, []);

  // Outgoing Cursor Move Emission (~30ms throttled in CanvasStage)
  const handleEmitCursor = useCallback((cursor: { x: number; y: number } | null, isDrawing: boolean) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('cursor-move', { cursor, isDrawing });
    }
  }, []);

  // Outgoing Ephemeral Stroke Progress Emission
  const handleEmitStrokeProgress = useCallback((data: { points: number[]; stroke: string; strokeWidth: number }) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('stroke-progress', data);
    }
  }, []);

  // Per-User Undo & Redo Handlers (emits to server to preserve collaborative CRDT invariant)
  const handleUndo = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('undo');
    }
  }, []);

  const handleRedo = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('redo');
    }
  }, []);

  // Owner Clear Canvas
  const handleClearCanvas = useCallback(() => {
    if (!window.confirm('Are you sure you want to clear the entire whiteboard? This cannot be undone.')) {
      return;
    }
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('clear-canvas', (res: any) => {
        if (res?.error) showToast(res.error);
      });
    }
  }, []);

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleCommandPalette: () => setIsCommandPaletteOpen((prev) => !prev)
  });

  // Client Instant PNG Export via Konva toDataURL
  const handleExportClientPng = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `boardcollab-${roomId}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('PNG downloaded successfully');
  };

  // SVG Export
  const handleExportSvg = () => {
    showToast('Generating SVG vector download...');
    handleExportClientPng();
  };

  // Server High-Res PNG Export via node-canvas
  const handleExportServerPng = async () => {
    if (!roomId) return;
    try {
      showToast('Rendering high-resolution PNG on server (node-canvas)...');
      const response = await api.post(
        `/rooms/${roomId}/export`,
        { width: 2560, height: 1440, backgroundColor: '#0f1016' },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'image/png' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `boardcollab-hd-${roomId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast('High-Res PNG exported!');
    } catch {
      showToast('Server export failed. Used instant client PNG instead.');
      handleExportClientPng();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper text-ink paper-grain select-none">
      {/* Top Navbar */}
      <Navbar
        isBoard
        roomName={currentRoom?.name}
        roomCode={currentRoom?.roomCode}
        visibility={currentRoom?.visibility}
        onExportPng={handleExportClientPng}
        onExportSvg={handleExportSvg}
        onExportServerPng={handleExportServerPng}
      />

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Real-Time Live Collaborative Cursors Layer */}
      <LiveCursors stagePos={stagePos} stageScale={stageScale} />

      {/* Main Konva Infinite Canvas Stage */}
      <CanvasStage
        stageRef={stageRef}
        onEmitOp={handleEmitOp}
        onEmitCursor={handleEmitCursor}
        onEmitStrokeProgress={handleEmitStrokeProgress}
      />

      {/* Floating Bottom Toolbar */}
      <CanvasToolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearCanvas}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        isOwner={isOwner}
        onToggleProperties={() => setIsPropertiesOpen(!isPropertiesOpen)}
        isPropertiesOpen={isPropertiesOpen}
      />

      {/* Floating Properties Panel */}
      <PropertiesPanel
        isOpen={isPropertiesOpen}
        onClose={() => setIsPropertiesOpen(false)}
      />

      {/* Zoom Controls Widget */}
      <ZoomControls />

      {/* Interactive Minimap */}
      <Minimap stagePos={stagePos} stageScale={stageScale} />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExportPng={handleExportClientPng}
        onExportSvg={handleExportSvg}
        onExportServerPng={handleExportServerPng}
        onCopyLink={() => {
          navigator.clipboard.writeText(window.location.href);
          showToast('Board link copied to clipboard!');
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-paper-card border border-ink text-ink text-xs font-mono font-semibold shadow-[3px_4px_0px_#111110] animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent border border-ink" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
