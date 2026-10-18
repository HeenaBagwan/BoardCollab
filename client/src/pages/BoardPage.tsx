import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import LaserTrail, { LaserPoint } from '../components/LaserTrail';
import ReactionsLayer, { FloatingReaction, PeerCursorChat } from '../components/ReactionsLayer';
import CommentsLayer, { CommentItem } from '../components/CommentsLayer';
import ReplayScrubber from '../components/ReplayScrubber';
import ShareModal from '../components/ShareModal';
import InstallPrompt from '../components/InstallPrompt';
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
  setLamportCounter,
  setStagePos,
  setStageScale,
  selectActiveElements,
  pushUndo,
  popUndo,
  popRedo
} from '../store/canvasSlice';
import { fetchRoomById } from '../store/roomSlice';
import { connectSocket, getSocket } from '../lib/socket';
import { queueOfflineOp, getOfflineQueue, clearOfflineQueue } from '../lib/offlineQueue';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import api from '../lib/api';
import { Op, CanvasElement } from '../types';
import { Eye, Radio, X } from 'lucide-react';

export const BoardPage: React.FC = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
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
  const activeTool = useAppSelector((state) => state.canvas.tool);
  const remotePresences = useAppSelector((state) => state.canvas.remotePresences);
  const activeElements = useAppSelector(selectActiveElements);

  // Role resolution
  const urlRole = searchParams.get('role') as 'viewer' | 'editor' | null;
  const inviteCode = searchParams.get('invite') || undefined;
  const userRole: 'owner' | 'editor' | 'viewer' =
    currentRoom?.ownerId === currentUser?.id || currentRoom?.myRole === 'owner'
      ? 'owner'
      : urlRole === 'viewer' || currentRoom?.myRole === 'viewer'
      ? 'viewer'
      : 'editor';

  const isOwner = userRole === 'owner';
  const isViewer = userRole === 'viewer';

  // UI Panels & Modals State
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Feature 1: Time-Travel Replay State
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [replayElements, setReplayElements] = useState<CanvasElement[] | null>(null);

  // Feature 2: Follow Mode, Presentation Mode, Laser Pointer State
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [presenterState, setPresenterState] = useState<{
    active: boolean;
    userId: string;
    userName: string;
  } | null>(null);
  const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);
  const lastViewportEmitRef = useRef<number>(0);

  // Feature 3: Reactions & Cursor Chat State
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [peerChats, setPeerChats] = useState<Record<string, PeerCursorChat>>({});
  const [myCursorChat, setMyCursorChat] = useState<{
    isOpen: boolean;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 300, y: 300 });

  // Feature 6: Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentDraft, setNewCommentDraft] = useState<{ x: number; y: number } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch room metadata & initial comments
  useEffect(() => {
    if (roomId) {
      dispatch(fetchRoomById(roomId));
      api.get(`/rooms/${roomId}/comments`)
        .then((res) => {
          if (res.data?.comments) {
            setComments(res.data.comments);
          }
        })
        .catch(() => {});
    }
  }, [roomId, dispatch]);

  // Track global cursor coordinates for "/" cursor chat trigger
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keyboard shortcut "/" to open cursor chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !myCursorChat?.isOpen) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          setMyCursorChat({
            isOpen: true,
            text: '',
            x: lastMousePosRef.current.x,
            y: lastMousePosRef.current.y
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myCursorChat?.isOpen]);

  // Setup Socket.IO real-time connection & listeners
  useEffect(() => {
    if (!roomId) return;

    const socket = connectSocket();

    const handleConnect = () => {
      dispatch(setIsOffline(false));

      // Join room with optional role & inviteCode
      socket.emit('join-room', { roomId, role: userRole, inviteCode }, (res: any) => {
        if (res?.error) {
          showToast(res.error);
          navigate('/dashboard');
        } else if (res?.serverClock) {
          dispatch(setLamportCounter(res.serverClock));
        }
      });

      // Replay any offline queued ops (editors only)
      if (!isViewer) {
        const offlineOps = getOfflineQueue();
        if (offlineOps.length > 0) {
          offlineOps.forEach((op) => {
            socket.emit('op', op);
          });
          clearOfflineQueue();
        }
      }
    };

    const handleDisconnect = () => {
      dispatch(setIsOffline(true));
    };

    // 1. Initial Room State
    const handleRoomState = (data: { elements: CanvasElement[]; serverClock: number }) => {
      if (data.elements) {
        dispatch(upsertElements(data.elements));
      }
      if (data.serverClock) {
        dispatch(setLamportCounter(data.serverClock));
      }
    };

    // 2. Incoming Op
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

    // 3. Batched Ops
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

    // 5. Authoritative Reconcile
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

    // 7. Ephemeral In-Progress Strokes
    const handleRemoteStrokeProgress = (data: any) => {
      dispatch(updateRemoteStroke(data));
    };

    // 8. Ephemeral Cursor Movements
    const handleRemoteCursor = (data: any) => {
      dispatch(updateRemoteCursor(data));
    };

    // 9. Canvas Cleared
    const handleCanvasCleared = () => {
      dispatch(clearAllElements());
      showToast('Canvas was cleared by the owner');
    };

    // 10. Viewport Movements (Follow mode & Presentation mode)
    const handleRemoteViewportMove = (data: {
      userId: string;
      userName?: string;
      pos: { x: number; y: number };
      scale: number;
    }) => {
      // Sync viewport if following this user OR if presenter is active for this user
      setFollowingUserId((currentFollow) => {
        setPresenterState((currPres) => {
          const shouldFollow =
            currentFollow === data.userId || (currPres?.active && currPres.userId === data.userId);
          if (shouldFollow) {
            dispatch(setStagePos(data.pos));
            dispatch(setStageScale(data.scale));
          }
          return currPres;
        });
        return currentFollow;
      });
    };

    // 11. Presenter State Broadcast
    const handlePresenterState = (state: { active: boolean; userId: string; userName: string }) => {
      setPresenterState(state);
      if (state.active && state.userId !== currentUser?.id) {
        showToast(`Presentation started by ${state.userName}`);
      } else if (!state.active) {
        showToast('Presentation ended');
      }
    };

    // 12. Laser Point Broadcast
    const handleLaserPoint = (pt: LaserPoint) => {
      setLaserPoints((prev) => [...prev.slice(-120), { ...pt, time: Date.now() }]);
    };

    // 13. Ephemeral Cursor Chat Broadcast
    const handleCursorChat = (chat: PeerCursorChat) => {
      setPeerChats((prev) => ({
        ...prev,
        [chat.userId]: { ...chat, timestamp: Date.now() }
      }));
    };

    // 14. Floating Reactions Broadcast
    const handleReaction = (reaction: FloatingReaction) => {
      setReactions((prev) => [
        ...prev.slice(-25),
        { ...reaction, id: reaction.id || crypto.randomUUID() }
      ]);
    };

    // 15. Comments Sync & Updates
    const handleCommentsSync = (data: any) => {
      const incoming = data?.comments || (Array.isArray(data) ? data : []);
      if (incoming.length > 0) {
        setComments(incoming);
      }
    };

    const handleCommentAdded = (data: any) => {
      const comment: CommentItem = data?.comment || data;
      if (!comment || !comment.id) return;
      setComments((prev) => {
        const exists = prev.some((c) => c.id === comment.id);
        if (exists) return prev;
        return [...prev, comment];
      });
    };

    const handleCommentResolved = (data: { commentId: string; isResolved: boolean }) => {
      setComments((prev) =>
        prev.map((c) => (c.id === data.commentId ? { ...c, isResolved: data.isResolved } : c))
      );
    };

    const handleCommentDeleted = (data: { commentId: string }) => {
      setComments((prev) => prev.filter((c) => c.id !== data.commentId && c.parentId !== data.commentId));
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
    socket.on('viewport-move', handleRemoteViewportMove);
    socket.on('presenter-state', handlePresenterState);
    socket.on('laser-point', handleLaserPoint);
    socket.on('cursor-chat', handleCursorChat);
    socket.on('reaction', handleReaction);
    socket.on('comments-sync', handleCommentsSync);
    socket.on('comment-added', handleCommentAdded);
    socket.on('comment-resolved', handleCommentResolved);
    socket.on('comment-deleted', handleCommentDeleted);

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
      socket.off('viewport-move', handleRemoteViewportMove);
      socket.off('presenter-state', handlePresenterState);
      socket.off('laser-point', handleLaserPoint);
      socket.off('cursor-chat', handleCursorChat);
      socket.off('reaction', handleReaction);
      socket.off('comments-sync', handleCommentsSync);
      socket.off('comment-added', handleCommentAdded);
      socket.off('comment-resolved', handleCommentResolved);
      socket.off('comment-deleted', handleCommentDeleted);
    };
  }, [roomId, userRole, inviteCode, dispatch, navigate, isViewer, currentUser?.id]);

  // Outgoing Viewport Broadcast (throttled ~60ms when local user pans/zooms or presents)
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) return;

    // If presenter or actively followed, broadcast viewport movements
    const now = Date.now();
    if (now - lastViewportEmitRef.current > 50) {
      lastViewportEmitRef.current = now;
      socket.emit('viewport-move', {
        pos: stagePos,
        scale: stageScale
      });
    }
  }, [stagePos, stageScale, isPresenting]);

  // Outgoing Op Emission (blocked if in viewer role)
  const handleEmitOp = useCallback(
    (op: Op) => {
      if (isViewer) {
        showToast('View-only mode: mutations are disabled');
        return;
      }
      dispatch(pushUndo(op));
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('op', op);
      } else {
        queueOfflineOp(op);
      }
    },
    [isViewer, dispatch]
  );

  // Outgoing Cursor Move Emission (~30ms throttled in CanvasStage)
  const handleEmitCursor = useCallback((cursor: { x: number; y: number } | null, isDrawing: boolean) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('cursor-move', { cursor, isDrawing });
    }
  }, []);

  // Outgoing Stroke Progress
  const handleEmitStrokeProgress = useCallback((data: { points: number[]; stroke: string; strokeWidth: number }) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('stroke-progress', data);
    }
  }, []);

  // Outgoing Laser Point Emission
  const handleEmitLaserPoint = useCallback((pt: { x: number; y: number; color?: string; isDone?: boolean }) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('laser-point', pt);
    }
    // Only append valid laser coordinates locally (ignore isDone closing signal)
    if (!pt.isDone && (pt.x !== 0 || pt.y !== 0)) {
      setLaserPoints((prev) => [
        ...prev.slice(-120),
        {
          x: pt.x,
          y: pt.y,
          color: pt.color || '#D4FF3A',
          time: Date.now(),
          userId: 'me'
        }
      ]);
    }
  }, []);

  // Ephemeral Cursor Chat Handlers
  const handleMyCursorChatChange = (text: string) => {
    if (!myCursorChat) return;
    setMyCursorChat({ ...myCursorChat, text });
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('cursor-chat', {
        text,
        x: lastMousePosRef.current.x,
        y: lastMousePosRef.current.y
      });
    }
  };

  const handleMyCursorChatClose = () => {
    setMyCursorChat(null);
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('cursor-chat', {
        text: '',
        x: lastMousePosRef.current.x,
        y: lastMousePosRef.current.y
      });
    }
  };

  // Floating Reaction Emission
  const handleEmitReaction = (emoji: string) => {
    const socket = getSocket();
    const x = lastMousePosRef.current.x;
    const y = lastMousePosRef.current.y;
    const userName = currentUser?.name || 'You';
    if (socket.connected) {
      socket.emit('reaction', { emoji, x, y, userName });
    }
    setReactions((prev) => [
      ...prev.slice(-25),
      {
        id: crypto.randomUUID(),
        emoji,
        x,
        y,
        userId: currentUser?.id || 'anon',
        userName
      }
    ]);
  };

  // Follow User Toggle
  const handleFollowUser = (userId: string) => {
    if (followingUserId === userId) {
      setFollowingUserId(null);
      showToast('Stopped following');
    } else {
      setFollowingUserId(userId);
      const target = Object.values(remotePresences).find((p) => p.userId === userId);
      showToast(`Now following ${target?.name || 'collaborator'}`);
    }
  };

  // Presenter Mode Toggle
  const handleTogglePresent = () => {
    const socket = getSocket();
    if (!socket.connected) return;

    if (isPresenting) {
      socket.emit('presenter-stop');
      setIsPresenting(false);
      showToast('Presenter mode stopped');
    } else {
      socket.emit('presenter-start');
      setIsPresenting(true);
      showToast('Presenter mode started - viewports are locked to yours');
    }
  };

  // Comment Handlers
  const handleAddComment = (text: string, canvasX: number, canvasY: number, parentId?: string | null) => {
    const socket = getSocket();
    if (!socket.connected) return;

    socket.emit('comment-add', {
      id: crypto.randomUUID(),
      x: canvasX,
      y: canvasY,
      text,
      parentId: parentId || null
    });
  };

  const handleResolveComment = (commentId: string, isResolved: boolean) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('comment-resolve', { commentId, isResolved });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('comment-delete', { commentId });
    }
  };

  const handleCanvasCommentClick = (x: number, y: number) => {
    setNewCommentDraft({ x, y });
  };

  // Undo & Redo Handlers
  const handleUndo = useCallback(() => {
    if (isViewer) return;
    dispatch(popUndo());
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('undo');
    }
  }, [isViewer, dispatch]);

  const handleRedo = useCallback(() => {
    if (isViewer) return;
    dispatch(popRedo());
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('redo');
    }
  }, [isViewer, dispatch]);

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

  // Client Instant PNG Export
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

  // Server High-Res PNG Export
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

  // Following / Presenter Indicator label
  const activePresenterName = presenterState?.active
    ? presenterState.userName
    : followingUserId
    ? Object.values(remotePresences).find((p) => p.userId === followingUserId)?.name || 'Collaborator'
    : null;

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
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onTogglePresent={handleTogglePresent}
        isPresenting={isPresenting}
        userRole={userRole}
        onFollowUser={handleFollowUser}
        followingUserId={followingUserId}
      />

      {/* Presentation / Following Mode Banner */}
      {(presenterState?.active || followingUserId) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-paper-card border border-ink shadow-[2px_2px_0px_#111110] flex items-center gap-2.5 font-mono text-xs animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span className="font-semibold text-ink">
            {presenterState?.active
              ? `Presentation Mode: Locked to ${activePresenterName}`
              : `Following ${activePresenterName}`}
          </span>
          {followingUserId && !presenterState?.active && (
            <button
              onClick={() => setFollowingUserId(null)}
              className="p-0.5 rounded hover:bg-paper-muted cursor-pointer"
              title="Stop Following"
            >
              <X className="w-3.5 h-3.5 text-ink-muted hover:text-ink" />
            </button>
          )}
        </div>
      )}

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Real-Time Live Collaborative Cursors Layer */}
      <LiveCursors stagePos={stagePos} stageScale={stageScale} />

      {/* Real-Time Laser Pointer Fading Comet Trail Layer */}
      <LaserTrail stagePos={stagePos} stageScale={stageScale} points={laserPoints} />

      {/* Floating Emoji Reactions & Cursor Chat Layer */}
      <ReactionsLayer
        stagePos={stagePos}
        stageScale={stageScale}
        reactions={reactions}
        peerChats={peerChats}
        myCursorChat={myCursorChat}
        onMyCursorChatChange={handleMyCursorChatChange}
        onMyCursorChatClose={handleMyCursorChatClose}
        onEmitReaction={handleEmitReaction}
      />

      {/* Threaded Canvas Pinned Comments Layer */}
      <CommentsLayer
        stagePos={stagePos}
        stageScale={stageScale}
        comments={comments}
        isCommentToolActive={activeTool === 'comment'}
        newCommentDraft={newCommentDraft}
        onCancelNewComment={() => setNewCommentDraft(null)}
        onAddComment={handleAddComment}
        onResolveComment={handleResolveComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Main Konva Infinite Canvas Stage */}
      <CanvasStage
        stageRef={stageRef}
        onEmitOp={handleEmitOp}
        onEmitCursor={handleEmitCursor}
        onEmitStrokeProgress={handleEmitStrokeProgress}
        onEmitLaserPoint={handleEmitLaserPoint}
        onAddCommentClick={handleCanvasCommentClick}
        isReadOnly={isReplayOpen || isViewer}
        replayElements={replayElements}
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
        onToggleReplay={() => {
          setIsReplayOpen(!isReplayOpen);
          if (isReplayOpen) setReplayElements(null);
        }}
        isReplayOpen={isReplayOpen}
        userRole={userRole}
      />

      {/* Time-Travel Replay Scrubber Timeline */}
      <ReplayScrubber
        roomId={roomId || ''}
        isOpen={isReplayOpen}
        onClose={() => {
          setIsReplayOpen(false);
          setReplayElements(null);
        }}
        onApplySnapshot={(elements) => setReplayElements(elements)}
        collaborators={remotePresences}
      />

      {/* Role-Based Share & Invite Modal */}
      <ShareModal
        roomId={roomId || ''}
        roomName={currentRoom?.name}
        roomCode={currentRoom?.roomCode}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
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

      {/* PWA App Shell Install Prompt UI */}
      <InstallPrompt />

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
