"use client";

import { useState, useEffect } from "react";
import { Hash, Users, Plus } from "lucide-react";

interface Room {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface SidebarUser {
  id: number;
  username: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

interface SidebarProps {
  currentUser: SidebarUser;
  activeRoom: Room | null;
  activeDirectMessage: SidebarUser | null;
  onRoomSelect: (room: Room) => void;
  onUserSelect: (user: SidebarUser) => void;
  onLogout: () => void;
  mentionCounts: { [roomId: number]: number };
  dmMentionCounts: { [userId: number]: number };
  allUsers: SidebarUser[];
  onlineUsers: Set<number>;
}

export default function Sidebar({
  currentUser,
  activeRoom,
  activeDirectMessage,
  onRoomSelect,
  onUserSelect,
  onLogout,
  mentionCounts,
  dmMentionCounts,
  allUsers,
  onlineUsers,
}: SidebarProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Failed to load rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDescription.trim(),
          userId: currentUser.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRooms((prev) => [...prev, data.room]);
        setNewChannelName("");
        setNewChannelDescription("");
        setShowCreateChannel(false);

        // Auto-select the new channel
        onRoomSelect(data.room);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to create channel:", error);
      alert("Failed to create channel");
    } finally {
      setIsCreating(false);
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
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-xl font-bold">My Chat</h1>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {/* Current User Avatar */}
            {currentUser.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="w-6 h-6 rounded-full"
                src={currentUser.avatar_url}
                alt={currentUser.username}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-300">
                  {currentUser.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
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
            {currentUser.role === "admin" && (
              <Plus
                className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer"
                onClick={() => setShowCreateChannel(!showCreateChannel)}
              />
            )}
          </div>

          {/* Create Channel Form */}
          {showCreateChannel && (
            <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
              <form onSubmit={handleCreateChannel} className="space-y-2">
                <input
                  type="text"
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                  maxLength={50}
                  required
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                  maxLength={200}
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={!newChannelName.trim() || isCreating}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateChannel(false);
                      setNewChannelName("");
                      setNewChannelDescription("");
                    }}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-1">
            {rooms.map((room) => {
              const mentionCount = mentionCounts[room.id] || 0;
              return (
                <button
                  key={room.id}
                  onClick={() => onRoomSelect(room)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-left hover:bg-gray-800 ${
                    activeRoom?.id === room.id ? "bg-blue-600" : ""
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">{room.name}</span>
                  </div>
                  {mentionCount > 0 && (
                    <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {mentionCount > 9 ? "9+" : mentionCount}
                    </div>
                  )}
                </button>
              );
            })}
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
            {allUsers
              .filter((user) => user.id !== currentUser.id)
              .map((user) => {
                const dmMentionCount = dmMentionCounts[user.id] || 0;
                return (
                  <button
                    key={user.id}
                    onClick={() => onUserSelect(user)}
                    className={`w-full flex items-center justify-between px-2 py-1 text-sm rounded hover:bg-gray-800 text-left ${
                      activeDirectMessage?.id === user.id ? "bg-blue-600" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          onlineUsers.has(user.id)
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      ></div>
                      {/* Avatar */}
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="w-6 h-6 rounded-full"
                          src={user.avatar_url}
                          alt={user.username}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-300">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span>{user.username}</span>
                    </div>
                    {dmMentionCount > 0 && (
                      <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {dmMentionCount > 9 ? "9+" : dmMentionCount}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
