'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import DirectMessageArea from '@/components/DirectMessageArea';

interface User {
  id: number;
  username: string;
  created_at: string;
}

interface Room {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeDirectMessage, setActiveDirectMessage] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCurrentUser(user);
    loadDefaultRoom();
  }, [router]);

  const loadDefaultRoom = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      const rooms = data.rooms || [];
      
      if (rooms.length > 0) {
        const generalRoom = rooms.find((room: Room) => room.name === 'general') || rooms[0];
        setActiveRoom(generalRoom);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (room: Room) => {
    setActiveRoom(room);
    setActiveDirectMessage(null);
  };

  const handleUserSelect = (user: User) => {
    setActiveDirectMessage(user);
    setActiveRoom(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar
        currentUser={currentUser}
        activeRoom={activeRoom}
        activeDirectMessage={activeDirectMessage}
        onRoomSelect={handleRoomSelect}
        onUserSelect={handleUserSelect}
        onLogout={handleLogout}
      />
      {activeDirectMessage ? (
        <DirectMessageArea
          currentUser={currentUser}
          otherUser={activeDirectMessage}
        />
      ) : (
        <ChatArea
          currentUser={currentUser}
          activeRoom={activeRoom}
        />
      )}
    </div>
  );
}