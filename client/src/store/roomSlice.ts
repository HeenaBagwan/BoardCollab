import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Room, RoomMember } from '../types';
import api from '../lib/api';

export interface RoomState {
  currentRoom: Room | null;
  members: RoomMember[];
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  currentRoom: null,
  members: [],
  rooms: [],
  isLoading: false,
  error: null
};

export const fetchRooms = createAsyncThunk('room/fetchRooms', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/rooms');
    return res.data.rooms;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch rooms');
  }
});

export const fetchRoomById = createAsyncThunk('room/fetchRoomById', async (id: string, { rejectWithValue }) => {
  try {
    const res = await api.get(`/rooms/${id}`);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch room');
  }
});

export const createRoom = createAsyncThunk(
  'room/createRoom',
  async (payload: { name: string; visibility: 'public' | 'private' }, { rejectWithValue }) => {
    try {
      const res = await api.post('/rooms', payload);
      return res.data.room;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create room');
    }
  }
);

export const joinRoomByCode = createAsyncThunk('room/joinByCode', async (roomCode: string, { rejectWithValue }) => {
  try {
    const res = await api.post('/rooms/join', { roomCode });
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to join room');
  }
});

export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setCurrentRoom(state, action: PayloadAction<Room | null>) {
      state.currentRoom = action.payload;
    },
    clearRoomState(state) {
      state.currentRoom = null;
      state.members = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRoomById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRoomById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoom = action.payload.room;
        state.members = action.payload.members;
      })
      .addCase(fetchRoomById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.rooms.unshift(action.payload);
      });
  }
});

export const { setCurrentRoom, clearRoomState } = roomSlice.actions;
export default roomSlice.reducer;
