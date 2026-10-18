import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Transformer } from 'react-konva';
import Konva from 'konva';

const uuidv4 = () => crypto.randomUUID();
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectActiveElements,
  selectCulledElements,
  setSelectedId,
  setStagePos,
  setStageScale,
  upsertElement,
  removeElement,
  incrementLamport
} from '../store/canvasSlice';
import ShapeRenderer from './shapes/ShapeRenderer';
import { useViewportCulling } from '../hooks/useViewportCulling';
import { simplifyPoints } from '../lib/simplification';
import { CanvasElement, Op, ToolType } from '../types';
import { recognizeStroke, RecognitionResult } from '../lib/shapeRecognizer';
import { X } from 'lucide-react';

interface CanvasStageProps {
  onEmitOp: (op: Op) => void;
  onEmitCursor: (cursor: { x: number; y: number } | null, isDrawing: boolean) => void;
  onEmitStrokeProgress: (data: { points: number[]; stroke: string; strokeWidth: number }) => void;
  onEmitLaserPoint?: (data: { x: number; y: number; color?: string; isDone?: boolean }) => void;
  onAddCommentClick?: (x: number, y: number) => void;
  isReadOnly?: boolean;
  replayElements?: CanvasElement[] | null;
  stageRef: React.RefObject<Konva.Stage>;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  onEmitOp,
  onEmitCursor,
  onEmitStrokeProgress,
  onEmitLaserPoint,
  onAddCommentClick,
  isReadOnly = false,
  replayElements = null,
  stageRef
}) => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?.id || 'anon');
  const activeTool = useAppSelector((state) => state.canvas.tool);
  const selectedId = useAppSelector((state) => state.canvas.selectedId);
  const strokeColor = useAppSelector((state) => state.canvas.strokeColor);
  const strokeWidth = useAppSelector((state) => state.canvas.strokeWidth);
  const fillColor = useAppSelector((state) => state.canvas.fillColor);
  const stagePos = useAppSelector((state) => state.canvas.stagePos);
  const stageScale = useAppSelector((state) => state.canvas.stageScale);
  const localClock = useAppSelector((state) => state.canvas.localLamportCounter);
  const remoteStrokes = useAppSelector((state) => state.canvas.remoteStrokes);

  const [shapeSuggestion, setShapeSuggestion] = useState<{
    strokeId: string;
    stroke: CanvasElement;
    result: RecognitionResult;
  } | null>(null);
  const [isLaserDrawing, setIsLaserDrawing] = useState(false);

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // In-flight active drawing state
  const [activeDrawing, setActiveDrawing] = useState<{
    id: string;
    type: ToolType;
    points?: number[];
    startX?: number;
    startY?: number;
    currentX?: number;
    currentY?: number;
  } | null>(null);

  // Resize window handler
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Viewport Culling Virtualization Box
  const viewportBox = useViewportCulling(stagePos, stageScale, dimensions);
  const culledElements = useAppSelector((state) =>
    selectCulledElements(state, viewportBox)
  );

  // Throttled cursor position emission
  const lastCursorEmitRef = useRef<number>(0);
  const handlePointerMoveCursor = useCallback((stage: Konva.Stage, isDrawing: boolean) => {
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 30) {
      lastCursorEmitRef.current = now;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        // Convert screen pixel to canvas world coordinate
        const worldX = (pointer.x - stagePos.x) / stageScale;
        const worldY = (pointer.y - stagePos.y) / stageScale;
        onEmitCursor({ x: Math.round(worldX), y: Math.round(worldY) }, isDrawing);
      }
    }
  }, [stagePos, stageScale, onEmitCursor]);

  // Zoom centered on pointer
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    // Zoom towards pointer position
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    };

    dispatch(setStageScale(clampedScale));
    dispatch(setStagePos(newPos));
  };

  // Pointer Down (Start pan, drawing, or selection)
  const handlePointerDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Pan mode triggered via Space or Middle Click
    const isMiddleClick = (e.evt as MouseEvent).button === 1;
    if (isSpacePressed || isMiddleClick) {
      setIsPanning(true);
      const pointer = stage.getPointerPosition() || { x: 0, y: 0 };
      setPanStart({ x: pointer.x - stagePos.x, y: pointer.y - stagePos.y });
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert to world coordinate
    const worldX = (pointer.x - stagePos.x) / stageScale;
    const worldY = (pointer.y - stagePos.y) / stageScale;

    // Read-only / viewer mode: allow panning with left click, disable canvas edits
    if (isReadOnly) {
      const isLeftClick = (e.evt as MouseEvent).button === 0;
      if (isLeftClick) {
        setIsPanning(true);
        setPanStart({ x: pointer.x - stagePos.x, y: pointer.y - stagePos.y });
      }
      return;
    }

    // Comment tool (Feature 6)
    if (activeTool === 'comment') {
      onAddCommentClick?.(Math.round(worldX), Math.round(worldY));
      return;
    }

    // Laser tool (Feature 2)
    if (activeTool === 'laser') {
      setIsLaserDrawing(true);
      onEmitLaserPoint?.({ x: worldX, y: worldY, color: strokeColor });
      return;
    }

    // Eraser tool
    if (activeTool === 'eraser') {
      const clickedOn = e.target;
      if (clickedOn !== stage && clickedOn.attrs.id) {
        handleDeleteElement(clickedOn.attrs.id);
      }
      return;
    }

    // Select tool
    if (activeTool === 'select') {
      const clickedOn = e.target;
      if (clickedOn === stage) {
        dispatch(setSelectedId(null));
      }
      return;
    }

    // Text tool
    if (activeTool === 'text') {
      const textInput = window.prompt('Enter text:');
      if (textInput && textInput.trim()) {
        const id = uuidv4();
        const nextClock = { counter: localClock + 1, userId: currentUserId };
        dispatch(incrementLamport());

        const newEl: CanvasElement = {
          id,
          roomId: '',
          type: 'text',
          props: {
            x: Math.round(worldX),
            y: Math.round(worldY),
            text: textInput.trim(),
            fontSize: 24,
            fontFamily: 'Plus Jakarta Sans',
            fill: strokeColor
          },
          propClocks: {
            text: nextClock,
            x: nextClock,
            y: nextClock,
            fontSize: nextClock,
            fill: nextClock
          },
          authorId: currentUserId,
          isDeleted: false,
          deleteClock: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        dispatch(upsertElement(newEl));
        onEmitOp({
          opId: uuidv4(),
          elementId: id,
          type: 'add',
          props: newEl.props,
          elementType: 'text',
          clock: nextClock,
          userId: currentUserId
        });
      }
      return;
    }

    // Drawing tools: pen, rect, circle
    const drawingId = uuidv4();
    if (activeTool === 'pen') {
      setActiveDrawing({
        id: drawingId,
        type: 'pen',
        points: [worldX, worldY]
      });
    } else {
      setActiveDrawing({
        id: drawingId,
        type: activeTool,
        startX: worldX,
        startY: worldY,
        currentX: worldX,
        currentY: worldY
      });
    }
  };

  // Pointer Move (Panning or in-progress drawing)
  const handlePointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    handlePointerMoveCursor(stage, Boolean(activeDrawing));

    // Handle Pan
    if (isPanning) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        dispatch(setStagePos({
          x: pointer.x - panStart.x,
          y: pointer.y - panStart.y
        }));
      }
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldX = (pointer.x - stagePos.x) / stageScale;
    const worldY = (pointer.y - stagePos.y) / stageScale;

    if (activeTool === 'laser' && isLaserDrawing) {
      onEmitLaserPoint?.({ x: worldX, y: worldY, color: strokeColor });
      return;
    }

    if (!activeDrawing) return;

    if (activeDrawing.type === 'pen' && activeDrawing.points) {
      const newPoints = [...activeDrawing.points, worldX, worldY];
      setActiveDrawing({
        ...activeDrawing,
        points: newPoints
      });

      // Broadcast ephemeral in-progress stroke points
      onEmitStrokeProgress({
        points: newPoints,
        stroke: strokeColor,
        strokeWidth
      });
    } else {
      setActiveDrawing({
        ...activeDrawing,
        currentX: worldX,
        currentY: worldY
      });
    }
  };

  // Pointer Up (Commit operation to CRDT and server)
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isLaserDrawing) {
      setIsLaserDrawing(false);
      onEmitLaserPoint?.({ x: 0, y: 0, isDone: true });
      return;
    }

    if (!activeDrawing) return;

    const nextClock = { counter: localClock + 1, userId: currentUserId };
    dispatch(incrementLamport());

    if (activeDrawing.type === 'pen' && activeDrawing.points) {
      // Simplify pen points using Ramer-Douglas-Peucker
      const simplified = simplifyPoints(activeDrawing.points, 1.5);

      if (simplified.length >= 4) {
        const newEl: CanvasElement = {
          id: activeDrawing.id,
          roomId: '',
          type: 'stroke',
          props: {
            points: simplified,
            stroke: strokeColor,
            strokeWidth
          },
          propClocks: {
            points: nextClock,
            stroke: nextClock,
            strokeWidth: nextClock
          },
          authorId: currentUserId,
          isDeleted: false,
          deleteClock: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        dispatch(upsertElement(newEl));
        onEmitOp({
          opId: uuidv4(),
          elementId: newEl.id,
          type: 'add',
          props: newEl.props,
          elementType: 'stroke',
          clock: nextClock,
          userId: currentUserId
        });

        // Feature 4: Shape Recognition via $1 algorithm
        if (simplified.length >= 8) {
          const match = recognizeStroke(simplified);
          if (match && match.score >= 0.72) {
            setShapeSuggestion({
              strokeId: newEl.id,
              stroke: newEl,
              result: match
            });
            setTimeout(() => {
              setShapeSuggestion((curr) => (curr?.strokeId === newEl.id ? null : curr));
            }, 5000);
          }
        }
      }
    } else if (activeDrawing.type === 'rect') {
      const x = Math.min(activeDrawing.startX || 0, activeDrawing.currentX || 0);
      const y = Math.min(activeDrawing.startY || 0, activeDrawing.currentY || 0);
      const width = Math.abs((activeDrawing.currentX || 0) - (activeDrawing.startX || 0));
      const height = Math.abs((activeDrawing.currentY || 0) - (activeDrawing.startY || 0));

      if (width > 5 && height > 5) {
        const newEl: CanvasElement = {
          id: activeDrawing.id,
          roomId: '',
          type: 'rect',
          props: {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
            cornerRadius: 8
          },
          propClocks: {
            x: nextClock,
            y: nextClock,
            width: nextClock,
            height: nextClock,
            fill: nextClock,
            stroke: nextClock,
            strokeWidth: nextClock
          },
          authorId: currentUserId,
          isDeleted: false,
          deleteClock: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        dispatch(upsertElement(newEl));
        onEmitOp({
          opId: uuidv4(),
          elementId: newEl.id,
          type: 'add',
          props: newEl.props,
          elementType: 'rect',
          clock: nextClock,
          userId: currentUserId
        });
      }
    } else if (activeDrawing.type === 'circle') {
      const startX = activeDrawing.startX || 0;
      const startY = activeDrawing.startY || 0;
      const currentX = activeDrawing.currentX || 0;
      const currentY = activeDrawing.currentY || 0;
      const radius = Math.hypot(currentX - startX, currentY - startY);

      if (radius > 5) {
        const newEl: CanvasElement = {
          id: activeDrawing.id,
          roomId: '',
          type: 'circle',
          props: {
            x: Math.round(startX),
            y: Math.round(startY),
            radius: Math.round(radius),
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth
          },
          propClocks: {
            x: nextClock,
            y: nextClock,
            radius: nextClock,
            fill: nextClock,
            stroke: nextClock,
            strokeWidth: nextClock
          },
          authorId: currentUserId,
          isDeleted: false,
          deleteClock: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        dispatch(upsertElement(newEl));
        onEmitOp({
          opId: uuidv4(),
          elementId: newEl.id,
          type: 'add',
          props: newEl.props,
          elementType: 'circle',
          clock: nextClock,
          userId: currentUserId
        });
      }
    }

    setActiveDrawing(null);
  };

  // Handle Drag Move / Update of Existing Element
  const handleElementChange = (id: string, newProps: Record<string, any>) => {
    const nextClock = { counter: localClock + 1, userId: currentUserId };
    dispatch(incrementLamport());

    onEmitOp({
      opId: uuidv4(),
      elementId: id,
      type: 'update',
      patch: newProps,
      clock: nextClock,
      userId: currentUserId
    });
  };

  // Soft delete element
  const handleDeleteElement = (id: string) => {
    const nextClock = { counter: localClock + 1, userId: currentUserId };
    dispatch(incrementLamport());
    dispatch(removeElement(id));

    onEmitOp({
      opId: uuidv4(),
      elementId: id,
      type: 'delete',
      clock: nextClock,
      userId: currentUserId
    });
  };

  // Feature 4: Accept recognized shape and replace stroke via CRDT
  const handleAcceptShape = (suggestion: { strokeId: string; stroke: CanvasElement; result: RecognitionResult }) => {
    const { strokeId, result } = suggestion;
    handleDeleteElement(strokeId);

    const newId = uuidv4();
    const nextClock = { counter: localClock + 1, userId: currentUserId };
    dispatch(incrementLamport());

    let shapeEl: CanvasElement;

    if (result.shape === 'circle') {
      const radius = Math.round(Math.max(result.bounds.width, result.bounds.height) / 2);
      shapeEl = {
        id: newId,
        roomId: '',
        type: 'circle',
        props: {
          x: Math.round(result.bounds.centerX),
          y: Math.round(result.bounds.centerY),
          radius: Math.max(10, radius),
          fill: 'transparent',
          stroke: strokeColor,
          strokeWidth
        },
        propClocks: {
          x: nextClock,
          y: nextClock,
          radius: nextClock,
          fill: nextClock,
          stroke: nextClock,
          strokeWidth: nextClock
        },
        authorId: currentUserId,
        isDeleted: false,
        deleteClock: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      shapeEl = {
        id: newId,
        roomId: '',
        type: 'rect',
        props: {
          x: Math.round(result.bounds.minX),
          y: Math.round(result.bounds.minY),
          width: Math.max(15, Math.round(result.bounds.width)),
          height: Math.max(15, Math.round(result.bounds.height)),
          fill: 'transparent',
          stroke: strokeColor,
          strokeWidth,
          cornerRadius: 4
        },
        propClocks: {
          x: nextClock,
          y: nextClock,
          width: nextClock,
          height: nextClock,
          fill: nextClock,
          stroke: nextClock,
          strokeWidth: nextClock
        },
        authorId: currentUserId,
        isDeleted: false,
        deleteClock: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    dispatch(upsertElement(shapeEl));
    onEmitOp({
      opId: uuidv4(),
      elementId: shapeEl.id,
      type: 'add',
      props: shapeEl.props,
      elementType: shapeEl.type,
      clock: nextClock,
      userId: currentUserId
    });

    setShapeSuggestion(null);
  };

  // Keyboard shortcut: Press Tab to accept shape suggestion
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && shapeSuggestion) {
        e.preventDefault();
        handleAcceptShape(shapeSuggestion);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [shapeSuggestion]);

  // Elements to display (support Time-Travel Replay override)
  const displayElements = replayElements !== null && replayElements !== undefined ? replayElements : culledElements;

  return (
    <div
      className={`relative w-full h-screen overflow-hidden paper-grid ${
        isSpacePressed || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'pen'
          ? 'cursor-crosshair'
          : activeTool === 'laser'
          ? 'cursor-crosshair'
          : activeTool === 'comment'
          ? 'cursor-cell'
          : activeTool === 'eraser'
          ? 'cursor-cell'
          : 'cursor-default'
      }`}
    >
      {/* Feature 4: Floating Snap to Shape Suggestion Banner */}
      {shapeSuggestion && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] font-mono text-xs animate-fade-in">
          <span className="text-ink">
            Convert stroke to clean <strong>{shapeSuggestion.result.name}</strong>? ({Math.round(shapeSuggestion.result.score * 100)}% match)
          </span>
          <button
            onClick={() => handleAcceptShape(shapeSuggestion)}
            className="btn-paper-accent px-2.5 py-1 text-[11px] font-bold cursor-pointer"
          >
            Accept (Tab)
          </button>
          <button
            onClick={() => setShapeSuggestion(null)}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-muted cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* 1. Static & Committed Layer with Viewport Culling */}
        <Layer listening={!isReadOnly && (activeTool === 'select' || activeTool === 'eraser')}>
          {displayElements.map((element) => (
            <ShapeRenderer
              key={element.id}
              element={element}
              isSelected={selectedId === element.id}
              isSelectTool={activeTool === 'select'}
              onSelect={(id) => dispatch(setSelectedId(id))}
              onChange={handleElementChange}
            />
          ))}
        </Layer>

        {/* 2. Active Layer (In-Flight Drawing & Remote Peers Ephemeral Strokes) */}
        <Layer listening={false}>
          {/* My in-flight drawing */}
          {activeDrawing?.type === 'pen' && activeDrawing.points && (
            <Line
              points={activeDrawing.points}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {activeDrawing?.type === 'rect' && (
            <Rect
              x={Math.min(activeDrawing.startX || 0, activeDrawing.currentX || 0)}
              y={Math.min(activeDrawing.startY || 0, activeDrawing.currentY || 0)}
              width={Math.abs((activeDrawing.currentX || 0) - (activeDrawing.startX || 0))}
              height={Math.abs((activeDrawing.currentY || 0) - (activeDrawing.startY || 0))}
              fill={fillColor === 'transparent' ? 'rgba(99, 102, 241, 0.1)' : fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              cornerRadius={8}
            />
          )}

          {activeDrawing?.type === 'circle' && (
            <Circle
              x={activeDrawing.startX || 0}
              y={activeDrawing.startY || 0}
              radius={Math.hypot(
                (activeDrawing.currentX || 0) - (activeDrawing.startX || 0),
                (activeDrawing.currentY || 0) - (activeDrawing.startY || 0)
              )}
              fill={fillColor === 'transparent' ? 'rgba(99, 102, 241, 0.1)' : fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          )}

          {/* Peer in-flight ephemeral strokes */}
          {Object.entries(remoteStrokes).map(([socketId, stroke]) => (
            <Line
              key={socketId}
              points={stroke.points}
              stroke={stroke.stroke}
              strokeWidth={stroke.strokeWidth}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              opacity={0.8}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasStage;
