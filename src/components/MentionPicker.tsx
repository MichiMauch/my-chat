import { useState, useEffect, useRef } from 'react';

interface User {
  id: number;
  username: string;
  created_at: string;
}

interface MentionPickerProps {
  users: User[];
  onMentionSelect: (user: User) => void;
  isVisible: boolean;
  position: { x: number; y: number };
  searchTerm: string;
}

export default function MentionPicker({
  users,
  onMentionSelect,
  isVisible,
  position,
  searchTerm
}: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset selection when filtered users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredUsers.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredUsers.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onMentionSelect(filteredUsers[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, filteredUsers, onMentionSelect]);

  if (!isVisible || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 max-h-48 overflow-y-auto"
      style={{
        left: position.x,
        top: position.y - 10, // Position above the cursor
        transform: 'translateY(-100%)'
      }}
    >
      {filteredUsers.map((user, index) => (
        <button
          key={user.id}
          className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-3 ${
            index === selectedIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          }`}
          onClick={() => onMentionSelect(user)}
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">@{user.username}</span>
        </button>
      ))}
    </div>
  );
}
