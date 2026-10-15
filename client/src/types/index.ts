export type ElementType = 'stroke' | 'rect' | 'circle' | 'text';

export type ToolType = 'select' | 'pen' | 'rect' | 'circle' | 'text' | 'eraser';

export interface LamportClock {
  counter: number;
  userId: string;
}

export interface StrokeProps {
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export interface RectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
}

export interface CircleProps {
  x: number;
  y: number;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface TextProps {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  width?: number;
}

export type ElementProps = StrokeProps | RectProps | CircleProps | TextProps | Record<string, unknown>;

export interface CanvasElement {
  id: string;
  roomId: string;
  type: ElementType;
  props: Record<string, any>;
  propClocks: Record<string, LamportClock>;
  authorId: string;
  isDeleted: boolean;
  deleteClock: LamportClock | null;
  createdAt: string;
  updatedAt: string;
}

export interface Op {
  opId: string;
  elementId: string;
  type: 'add' | 'update' | 'delete';
  patch?: Record<string, any>;
  props?: Record<string, any>;
  elementType?: ElementType;
  clock: LamportClock;
  userId: string;
  roomId?: string;
  previousProps?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt?: string;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  visibility: 'public' | 'private';
  ownerId?: string;
  ownerName: string;
  ownerAvatar: string;
  createdAt: string;
  lastUpdated: string;
  myRole: 'owner' | 'editor' | 'viewer' | null;
  memberCount?: number;
  elementCount?: number;
}

export interface RoomMember {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
  avatarColor: string;
  cursor: { x: number; y: number } | null;
  isDrawing: boolean;
}

export interface ViewportBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
