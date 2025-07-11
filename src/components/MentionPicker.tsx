import { useRef } from "react";

interface User {
  id: number;
  username: string;
  created_at: string;
  avatar_url?: string;
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
  searchTerm,
}: MentionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Filter users based on search term
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isVisible || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 max-h-48 overflow-y-auto"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {filteredUsers.map((user) => (
        <button
          key={user.id}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-3 text-gray-700"
          onClick={() => onMentionSelect(user)}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="w-6 h-6 rounded-full"
              src={user.avatar_url}
              alt={user.username}
            />
          ) : (
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium">@{user.username}</span>
        </button>
      ))}
    </div>
  );
}
