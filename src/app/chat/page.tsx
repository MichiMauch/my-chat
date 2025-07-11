'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import DirectMessageArea from '@/components/DirectMessageArea';
import ably from '@/lib/ably';

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

interface Room {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeDirectMessage, setActiveDirectMessage] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [mentionCounts, setMentionCounts] = useState<{ [roomId: number]: number }>({});
  const [dmMentionCounts, setDmMentionCounts] = useState<{ [userId: number]: number }>({});
  const activeRoomRef = useRef<Room | null>(null);
  const router = useRouter();

  // Define setupGlobalMentionListener before useEffect
  const setupGlobalMentionListener = useCallback((userId: number) => {
    console.log('=== SETTING UP GLOBAL MENTION LISTENER ===');
    console.log('User ID:', userId);
    
    // Listen to all room channels for mentions
    loadRoomsForMentionListener().then(rooms => {
      console.log('Loaded rooms for mention listener:', rooms.length);
      
      rooms.forEach((room: Room) => {
        console.log('Setting up global listener for room:', room.id, room.name);
        const channel = ably.channels.get(`chat-${room.id}`); // Use main chat channel but only for mention badges
        
        channel.subscribe('message', (message) => {
          const messageData = message.data;
          
          console.log(`=== GLOBAL MENTION LISTENER - Room ${room.id} ===`);
          console.log('Message data:', messageData);
          console.log('Message roomId:', messageData.roomId);
          console.log('Expected roomId:', room.id);
          console.log('Room match:', messageData.roomId === room.id);
          
          console.log('Sender ID:', messageData.senderId);
          console.log('Current User ID:', userId);
          console.log('Is from other user:', messageData.senderId !== userId);
          console.log('Room ID match:', messageData.roomId === room.id);
          
          // Only process messages from other users AND from correct room AND not currently viewing this room
          if (messageData.senderId !== userId && 
              messageData.roomId === room.id && 
              (!activeRoomRef.current || activeRoomRef.current.id !== room.id)) {
            // Check if current user is mentioned
            const mentionedUsers = messageData.mentioned_users ? JSON.parse(messageData.mentioned_users) : [];
            const isMentioned = mentionedUsers.includes(userId);
            
            console.log('=== MENTION DEBUG ===');
            console.log('Raw mentioned_users string:', messageData.mentioned_users);
            console.log('Parsed mentioned_users array:', mentionedUsers);
            console.log('Looking for user ID:', userId);
            console.log('Is mentioned:', isMentioned);
            console.log('Message text:', messageData.message);
            
            if (isMentioned) {
              console.log('MENTION DETECTED - processing for room:', room.id);
              console.log('Current active room ref:', activeRoomRef.current?.id);
              console.log('Should increment:', !activeRoomRef.current || activeRoomRef.current.id !== room.id);
              
              // Only increment if not currently viewing this room
              if (!activeRoomRef.current || activeRoomRef.current.id !== room.id) {
                console.log('Incrementing mention count for room:', room.id);
                setMentionCounts(prev => ({
                  ...prev,
                  [room.id]: (prev[room.id] || 0) + 1
                }));
              } else {
                console.log('Not incrementing - user is currently in this room');
              }
            }
          } else {
            console.log('Skipping message - wrong sender or room');
          }
        });
      });
    });
  }, []);

  const setupOnlinePresence = useCallback((userId: number) => {
    console.log('Setting up online presence for user:', userId);
    
    // Use regular channel for online status instead of presence
    const onlineChannel = ably.channels.get('user-online-status');
    
    // Listen for online/offline events
    onlineChannel.subscribe('user-online', (message) => {
      const onlineUserId = message.data.userId;
      if (onlineUserId !== userId) { // Don't process own events
        console.log('User came online:', onlineUserId);
        setOnlineUsers(prev => new Set([...prev, onlineUserId]));
      }
    });
    
    onlineChannel.subscribe('user-offline', (message) => {
      const offlineUserId = message.data.userId;
      if (offlineUserId !== userId) { // Don't process own events
        console.log('User went offline:', offlineUserId);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(offlineUserId);
          return newSet;
        });
      }
    });
    
    // Listen for heartbeats to keep users online
    onlineChannel.subscribe('user-heartbeat', (message) => {
      const heartbeatUserId = message.data.userId;
      if (heartbeatUserId !== userId) { // Don't process own heartbeat
        setOnlineUsers(prev => new Set([...prev, heartbeatUserId]));
      }
    });
    
    // Add current user to online list immediately
    setOnlineUsers(prev => new Set([...prev, userId]));
    
    // Request current online users
    onlineChannel.publish('request-online-users', { requesterId: userId });
    
    // Respond to online user requests
    onlineChannel.subscribe('request-online-users', (message) => {
      const requesterId = message.data.requesterId;
      if (requesterId !== userId) {
        // Announce that we are online to the requester
        onlineChannel.publish('user-online', { userId: userId });
      }
    });
    
    // Announce that this user is online
    onlineChannel.publish('user-online', { userId: userId });
    
    // Set up heartbeat to maintain online status
    const heartbeatInterval = setInterval(() => {
      onlineChannel.publish('user-heartbeat', { userId: userId });
    }, 30000); // Every 30 seconds
    
    // Handle page unload - announce user going offline
    const handleBeforeUnload = () => {
      onlineChannel.publish('user-offline', { userId: userId });
      clearInterval(heartbeatInterval);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also handle visibility change (tab becomes hidden/visible)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onlineChannel.publish('user-away', { userId: userId });
      } else {
        onlineChannel.publish('user-online', { userId: userId });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      onlineChannel.publish('user-offline', { userId: userId });
    };
  }, []);

  const loadRoomsForMentionListener = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      return data.rooms || [];
    } catch (error) {
      console.error('Failed to load rooms for mention listener:', error);
      return [];
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Create user object from session - note: role will be fetched from database
    const user = {
      id: parseInt((session.user as { id?: string })?.id || '0'),
      username: session.user?.name || session.user?.email?.split('@')[0] || 'Unknown',
      role: 'user', // Default role, will be updated from database
      created_at: new Date().toISOString()
    };
    setCurrentUser(user);
    loadDefaultRoom();
    loadUsers();
    loadCurrentUserRole(user.id);
    
    // Setup global mention listener and online presence
    if (user.id) {
      setupGlobalMentionListener(user.id);
      setupOnlinePresence(user.id);
    }
  }, [session, status, router, setupGlobalMentionListener, setupOnlinePresence]);

  const loadCurrentUserRole = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (data.user) {
        setCurrentUser(prev => prev ? { ...prev, role: data.user.role } : null);
        console.log('Current user role loaded:', data.user.role);
      }
    } catch (error) {
      console.error('Failed to load current user role:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadDefaultRoom = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      const rooms = data.rooms || [];
      
      if (rooms.length > 0) {
        const generalRoom = rooms.find((room: Room) => room.name === 'general') || rooms[0];
        setActiveRoom(generalRoom);
        activeRoomRef.current = generalRoom; // Set ref too
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (room: Room) => {
    setActiveRoom(room);
    activeRoomRef.current = room; // Keep ref updated
    setActiveDirectMessage(null);
    
    // Clear mention count for this room when entering
    setMentionCounts(prev => ({
      ...prev,
      [room.id]: 0
    }));
  };

  const handleUserSelect = (user: User) => {
    setActiveDirectMessage(user);
    setActiveRoom(null);
    activeRoomRef.current = null; // Clear room ref
    
    // Clear mention count for this DM when entering
    setDmMentionCounts(prev => ({
      ...prev,
      [user.id]: 0
    }));
  };

  const handleLogout = async () => {
    try {
      // Clear any local storage items that might persist
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all cookies (aggressive approach)
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
        });
      }
      
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: redirect manually if signOut fails
      router.push('/auth/signin');
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        currentUser={currentUser}
        activeRoom={activeRoom}
        activeDirectMessage={activeDirectMessage}
        onRoomSelect={handleRoomSelect}
        onUserSelect={handleUserSelect}
        onLogout={handleLogout}
        mentionCounts={mentionCounts}
        dmMentionCounts={dmMentionCounts}
        allUsers={allUsers}
        onlineUsers={onlineUsers}
      />
      <div className="ml-64 h-screen">
        {activeDirectMessage ? (
          <DirectMessageArea
            currentUser={currentUser}
            otherUser={activeDirectMessage}
          />
        ) : (
          <ChatArea
            currentUser={currentUser}
            activeRoom={activeRoom}
            allUsers={allUsers}
          />
        )}
      </div>
    </div>
  );
}