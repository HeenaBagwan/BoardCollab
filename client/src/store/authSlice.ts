import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types';
import api, { setAccessToken, getAccessToken } from '../lib/api';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialToken = getAccessToken();

const initialState: AuthState = {
  user: null,
  accessToken: initialToken,
  isAuthenticated: Boolean(initialToken),
  isLoading: true,
  error: null
};

// Check current user session on startup
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me');
    return res.data.user;
  } catch (err: any) {
    // Attempt silent refresh
    try {
      const refreshRes = await api.post('/auth/refresh');
      setAccessToken(refreshRes.data.accessToken);
      return refreshRes.data.user;
    } catch {
      setAccessToken(null);
      return rejectWithValue('Session expired');
    }
  }
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
      setAccessToken(action.payload.accessToken);
    },
    logoutUser(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      setAccessToken(null);
    },
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
      });
  }
});

export const { setAuth, logoutUser, clearError } = authSlice.actions;
export default authSlice.reducer;
