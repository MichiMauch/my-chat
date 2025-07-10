'use client';

import { useState, useEffect } from 'react';
import { User, Hash, Users, Plus } from 'lucide-react';

interface Room {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface SidebarUser {
  id: number;
  username: string;
  created_at: string;
}

interface SidebarProps {
  currentUser: SidebarUser;
  activeRoom: Room | null;
  activeDirectMessage: SidebarUser | null;
  onRoomSelect: (room: Room) => void;
  onUserSelect: (user: SidebarUser) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentUser, activeRoom, activeDirectMessage, onRoomSelect, onUserSelect, onLogout }: SidebarProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<SidebarUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
    loadUsers();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-64 bg-gray-900 text-white p-4">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">My Chat</h1>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">{currentUser.username}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Channels
            </h2>
            <Plus className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
          </div>
          <div className="space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-gray-800 ${
                  activeRoom?.id === room.id ? 'bg-blue-600' : ''
                }`}
              >
                <Hash className="w-4 h-4" />
                <span className="text-sm">{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Direct Messages
            </h2>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1">
            {users.filter(user => user.id !== currentUser.id).map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className={`w-full flex items-center space-x-2 px-2 py-1 text-sm rounded hover:bg-gray-800 text-left ${
                  activeDirectMessage?.id === user.id ? 'bg-blue-600' : ''
                }`}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <User className="w-4 h-4" />
                <span>{user.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}