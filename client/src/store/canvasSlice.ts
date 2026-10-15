import { createSlice, createEntityAdapter, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { CanvasElement, ToolType, PresenceUser, Op, ViewportBox } from '../types';

export const elementsAdapter = createEntityAdapter<CanvasElement>();

export interface CanvasState {
  elements: ReturnType<typeof elementsAdapter.getInitialState>;
  selectedId: string | null;
  tool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  stagePos: { x: number; y: number };
  stageScale: number;
  remotePresences: Record<string, PresenceUser>;
  remoteStrokes: Record<string, { points: number[]; stroke: string; strokeWidth: number; userId: string }>;
  isOffline: boolean;
  localLamportCounter: number;
  pendingOps: Record<string, Op>;
  undoStack: Op[];
  redoStack: Op[];
}

const initialState: CanvasState = {
  elements: elementsAdapter.getInitialState(),
  selectedId: null,
  tool: 'select',
  strokeColor: '#6366f1',
  strokeWidth: 3,
  fillColor: 'transparent',
  stagePos: { x: 0, y: 0 },
  stageScale: 1,
  remotePresences: {},
  remoteStrokes: {},
  isOffline: false,
  localLamportCounter: 0,
  pendingOps: {},
  undoStack: [],
  redoStack: []
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Replace / hydrate elements in bulk from room-state snapshot
    setElements(state, action: PayloadAction<CanvasElement[]>) {
      elementsAdapter.setAll(state.elements, action.payload);
    },

    // Apply or merge a single element (from op or reconcile)
    upsertElement(state, action: PayloadAction<CanvasElement>) {
      elementsAdapter.upsertOne(state.elements, action.payload);
      if (action.payload.isDeleted && state.selectedId === action.payload.id) {
        state.selectedId = null;
      }
    },

    // Batch upsert multiple elements (from op-batch)
    upsertElements(state, action: PayloadAction<CanvasElement[]>) {
      elementsAdapter.upsertMany(state.elements, action.payload);
    },

    // Soft-delete element locally
    removeElement(state, action: PayloadAction<string>) {
      const existing = state.elements.entities[action.payload];
      if (existing) {
        existing.isDeleted = true;
      }
      if (state.selectedId === action.payload) {
        state.selectedId = null;
      }
    },

    // Clear all elements (owner clear)
    clearAllElements(state) {
      elementsAdapter.removeAll(state.elements);
      state.selectedId = null;
    },

    // Tool & selection
    setTool(state, action: PayloadAction<ToolType>) {
      state.tool = action.payload;
      if (action.payload !== 'select') {
        state.selectedId = null;
      }
    },
    setSelectedId(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },

    // Style properties
    setStrokeColor(state, action: PayloadAction<string>) {
      state.strokeColor = action.payload;
    },
    setStrokeWidth(state, action: PayloadAction<number>) {
      state.strokeWidth = action.payload;
    },
    setFillColor(state, action: PayloadAction<string>) {
      state.fillColor = action.payload;
    },

    // Canvas pan & zoom
    setStagePos(state, action: PayloadAction<{ x: number; y: number }>) {
      state.stagePos = action.payload;
    },
    setStageScale(state, action: PayloadAction<number>) {
      state.stageScale = Math.min(Math.max(action.payload, 0.1), 5); // Clamp 10% to 500%
    },
    resetView(state) {
      state.stagePos = { x: 0, y: 0 };
      state.stageScale = 1;
    },

    // Remote presence updates
    setRemotePresences(state, action: PayloadAction<PresenceUser[]>) {
      const presences: Record<string, PresenceUser> = {};
      for (const p of action.payload) {
        presences[p.socketId] = p;
      }
      state.remotePresences = presences;
    },
    updateRemoteCursor(state, action: PayloadAction<{ socketId: string; userId: string; cursor: { x: number; y: number } | null; isDrawing: boolean }>) {
      if (state.remotePresences[action.payload.socketId]) {
        state.remotePresences[action.payload.socketId].cursor = action.payload.cursor;
        state.remotePresences[action.payload.socketId].isDrawing = action.payload.isDrawing;
      }
    },

    // In-progress ephemeral freehand strokes from peers
    updateRemoteStroke(state, action: PayloadAction<{ socketId: string; points: number[]; stroke: string; strokeWidth: number; userId: string }>) {
      state.remoteStrokes[action.payload.socketId] = {
        points: action.payload.points,
        stroke: action.payload.stroke,
        strokeWidth: action.payload.strokeWidth,
        userId: action.payload.userId
      };
    },
    clearRemoteStroke(state, action: PayloadAction<string>) {
      delete state.remoteStrokes[action.payload];
    },

    // Network / Lamport clock state
    setIsOffline(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload;
    },
    setLamportCounter(state, action: PayloadAction<number>) {
      state.localLamportCounter = Math.max(state.localLamportCounter, action.payload);
    },
    incrementLamport(state) {
      state.localLamportCounter += 1;
    },

    // Optimistic pending ops
    addPendingOp(state, action: PayloadAction<Op>) {
      state.pendingOps[action.payload.opId] = action.payload;
    },
    removePendingOp(state, action: PayloadAction<string>) {
      delete state.pendingOps[action.payload];
    },

    // Undo / Redo tracking
    pushUndo(state, action: PayloadAction<Op>) {
      state.undoStack.push(action.payload);
      if (state.undoStack.length > 50) state.undoStack.shift();
      state.redoStack = []; // Clear redo on new action
    },
    popUndo(state) {
      const op = state.undoStack.pop();
      if (op) {
        state.redoStack.push(op);
      }
    },
    popRedo(state) {
      const op = state.redoStack.pop();
      if (op) {
        state.undoStack.push(op);
      }
    }
  }
});

export const {
  setElements,
  upsertElement,
  upsertElements,
  removeElement,
  clearAllElements,
  setTool,
  setSelectedId,
  setStrokeColor,
  setStrokeWidth,
  setFillColor,
  setStagePos,
  setStageScale,
  resetView,
  setRemotePresences,
  updateRemoteCursor,
  updateRemoteStroke,
  clearRemoteStroke,
  setIsOffline,
  setLamportCounter,
  incrementLamport,
  addPendingOp,
  removePendingOp,
  pushUndo,
  popUndo,
  popRedo
} = canvasSlice.actions;

// Selectors
const adapterSelectors = elementsAdapter.getSelectors<{ canvas: CanvasState }>(
  (state) => state.canvas.elements
);

export const selectAllElements = adapterSelectors.selectAll;
export const selectElementById = adapterSelectors.selectById;
export const selectElementEntities = adapterSelectors.selectEntities;

// Memoized selector: Active (non-deleted) elements only
export const selectActiveElements = createSelector(
  [selectAllElements],
  (elements) => elements.filter((el) => !el.isDeleted)
);

// High-Performance Viewport Culling Selector
// Only returns elements that intersect the visible viewport
export const selectCulledElements = createSelector(
  [
    selectActiveElements,
    (state: { canvas: CanvasState }, viewport: ViewportBox) => viewport
  ],
  (elements, viewport) => {
    return elements.filter((el) => {
      const props = el.props || {};

      if (el.type === 'stroke') {
        const points = props.points as number[] || [];
        if (points.length < 2) return false;
        // Bounding box of stroke
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < points.length; i += 2) {
          const x = points[i];
          const y = points[i + 1];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        return !(maxX < viewport.minX || minX > viewport.maxX || maxY < viewport.minY || minY > viewport.maxY);
      }

      if (el.type === 'rect') {
        const x = props.x || 0;
        const y = props.y || 0;
        const w = props.width || 100;
        const h = props.height || 100;
        return !(x + w < viewport.minX || x > viewport.maxX || y + h < viewport.minY || y > viewport.maxY);
      }

      if (el.type === 'circle') {
        const x = props.x || 0;
        const y = props.y || 0;
        const r = props.radius || 50;
        return !(x + r < viewport.minX || x - r > viewport.maxX || y + r < viewport.minY || y - r > viewport.maxY);
      }

      if (el.type === 'text') {
        const x = props.x || 0;
        const y = props.y || 0;
        const w = props.width || 300;
        const h = 50;
        return !(x + w < viewport.minX || x > viewport.maxX || y + h < viewport.minY || y > viewport.maxY);
      }

      return true;
    });
  }
);

export default canvasSlice.reducer;
