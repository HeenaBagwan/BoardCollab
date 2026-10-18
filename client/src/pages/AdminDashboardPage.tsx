import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../lib/api';
import {
  Users,
  Radio,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

interface ActiveParticipant {
  userId: string;
  name: string;
  avatarColor: string;
  isDrawing: boolean;
  role: string;
}

interface ActiveRoom {
  id: string;
  name: string;
  roomCode: string;
  visibility: string;
  ownerName: string;
  elementCount: number;
  serverClock: number;
  activeCount: number;
  participants: ActiveParticipant[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  created_at: string;
  isOnline: boolean;
  activeInRooms: { roomId: string; roomName: string }[];
}

interface AdminOverviewData {
  stats: {
    totalUsers: number;
    onlineUsersCount: number;
    activeRoomsCount: number;
    totalRoomsCount: number;
  };
  onlineUsers: {
    userId: string;
    name: string;
    avatarColor: string;
    activeInRooms: { roomId: string; roomName: string }[];
  }[];
  activeRooms: ActiveRoom[];
  users: AdminUser[];
  recentRooms: any[];
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'online' | 'activeRooms'>('all');
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchOverview = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await api.get('/admin/overview');
      setData(res.data);
      setAccessDenied(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setAccessDenied(true);
      }
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    // Poll every 10 seconds for real-time live telemetry
    const timer = setInterval(() => fetchOverview(), 10000);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-paper text-ink font-sans paper-grain flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-24">
          <div className="max-w-md w-full p-8 rounded-lg bg-paper-card border border-ink shadow-[4px_5px_0px_#111110] text-center font-mono flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-ink flex items-center justify-center mb-4 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-ink mb-2">Access Denied</h2>
            <p className="text-xs text-ink-muted mb-6">
              You do not have administrator credentials to access the Operations Telemetry Dashboard.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-paper-primary px-4 py-2 text-xs font-bold cursor-pointer"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = (data?.users || []).filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterTab === 'online') return matchesSearch && u.isOnline;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-paper text-ink font-sans paper-grain flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 pt-24">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-muted cursor-pointer transition-colors"
                title="Back to Workspace"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-ink bg-accent/30 px-2 py-0.5 rounded border border-ink/30">
                Operations & Hub Telemetry
              </span>
            </div>
            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-ink tracking-tight">
              Admin Overview
            </h1>
            <p className="font-mono text-xs text-ink-muted mt-1">
              Live active rooms, connected socket collaborators, and system users
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOverview(true)}
              disabled={isRefreshing}
              className="btn-paper-outline px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-paper-primary px-3.5 py-1.5 text-xs font-mono font-bold cursor-pointer"
            >
              Back to Boards
            </button>
          </div>
        </div>

        {/* 4 Stats Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. Online Users */}
          <div className="p-4 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-muted mb-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Online Right Now
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent border border-ink/40" />
              </span>
            </div>
            <div className="font-serif font-bold text-3xl text-ink">
              {isLoading ? '...' : data?.stats?.onlineUsersCount ?? 0}
            </div>
            <span className="font-mono text-[10px] text-ink-subtle mt-1">
              Active in collaborative whiteboards
            </span>
          </div>

          {/* 2. Active Rooms */}
          <div className="p-4 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-muted mb-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Active Rooms
              </span>
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            </div>
            <div className="font-serif font-bold text-3xl text-ink">
              {isLoading ? '...' : data?.stats?.activeRoomsCount ?? 0}
            </div>
            <span className="font-mono text-[10px] text-ink-subtle mt-1">
              Rooms with live WebSocket clients
            </span>
          </div>

          {/* 3. Total Users */}
          <div className="p-4 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-muted mb-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Total Users
              </span>
              <Users className="w-4 h-4 text-ink-muted" />
            </div>
            <div className="font-serif font-bold text-3xl text-ink">
              {isLoading ? '...' : data?.stats?.totalUsers ?? 0}
            </div>
            <span className="font-mono text-[10px] text-ink-subtle mt-1">
              Registered member accounts
            </span>
          </div>

          {/* 4. Total Rooms */}
          <div className="p-4 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-muted mb-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Total Whiteboards
              </span>
              <Layers className="w-4 h-4 text-ink-muted" />
            </div>
            <div className="font-serif font-bold text-3xl text-ink">
              {isLoading ? '...' : data?.stats?.totalRoomsCount ?? 0}
            </div>
            <span className="font-mono text-[10px] text-ink-subtle mt-1">
              Saved canvas boards in database
            </span>
          </div>
        </div>

        {/* Section 1: Active Live Rooms */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-xl text-ink">Active Live Rooms</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent text-ink border border-ink">
                {data?.activeRooms?.length ?? 0} LIVE
              </span>
            </div>
          </div>

          {!data?.activeRooms?.length ? (
            <div className="p-6 rounded-lg bg-paper-card border border-ink border-dashed text-center font-mono text-xs text-ink-muted">
              No rooms currently have active socket collaborators. Open a board to initiate real-time sessions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-ink truncate max-w-[180px]">
                        {room.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-butter border border-ink text-ink">
                        CODE: {room.roomCode}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-ink-muted mb-3 flex items-center gap-2">
                      <span>Owner: {room.ownerName}</span>
                      <span>•</span>
                      <span>{room.elementCount} elements</span>
                    </div>

                    {/* Active Collaborators */}
                    <div className="border-t border-border-paper pt-2.5 mb-3">
                      <span className="text-[10px] font-mono font-bold text-ink-subtle uppercase tracking-wider block mb-1.5">
                        Active Now ({room.participants.length})
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {room.participants.map((p) => (
                          <div
                            key={p.userId}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-paper border border-ink text-[11px] font-mono font-medium"
                            title={`${p.name} (${p.role})`}
                          >
                            <span
                              className="w-2 h-2 rounded-full border border-ink"
                              style={{ backgroundColor: p.avatarColor || '#D4FF3A' }}
                            />
                            <span className="text-ink max-w-[90px] truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/board/${room.id}`)}
                    className="w-full btn-paper-accent py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>Enter Live Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: User Directory */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-ink">User Directory</h2>
              <p className="font-mono text-xs text-ink-muted">
                Inspect registered users and their current online active presence
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tabs */}
              <div className="flex items-center p-0.5 rounded-md bg-paper-card border border-ink text-xs font-mono">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    filterTab === 'all' ? 'bg-accent text-ink font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  All ({data?.users?.length ?? 0})
                </button>
                <button
                  onClick={() => setFilterTab('online')}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                    filterTab === 'online' ? 'bg-accent text-ink font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Online ({data?.stats?.onlineUsersCount ?? 0})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded-md bg-paper-card border border-ink text-xs font-mono text-ink placeholder-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-paper-muted border-b border-ink text-ink-muted uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-bold">User</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Live Status</th>
                    <th className="px-4 py-3 font-bold">Current Activity</th>
                    <th className="px-4 py-3 font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-paper">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                        No users match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-paper-muted/50 transition-colors">
                        {/* User Profile */}
                        <td className="px-4 py-3 flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full border border-ink flex items-center justify-center font-bold text-ink text-xs shadow-sm"
                            style={{ backgroundColor: u.avatar_color || '#FFE98A' }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-ink truncate max-w-[160px]">
                            {u.name}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-ink-muted">
                          {u.email}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {u.isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 border border-emerald-600 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ONLINE NOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-paper border border-border-paper text-ink-muted">
                              OFFLINE
                            </span>
                          )}
                        </td>

                        {/* Current Activity */}
                        <td className="px-4 py-3 text-ink-muted">
                          {u.activeInRooms?.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {u.activeInRooms.map((r) => (
                                <button
                                  key={r.roomId}
                                  onClick={() => navigate(`/board/${r.roomId}`)}
                                  className="text-[11px] text-ink hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                                >
                                  <span>{r.roomName}</span>
                                  <ExternalLink className="w-3 h-3 text-accent-ink" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink-subtle">---</span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="px-4 py-3 text-ink-subtle text-[11px]">
                          {new Date(u.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
