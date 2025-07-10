"use client";

import { useState, useEffect, useRef } from "react";
import { Hash, Send } from "lucide-react";
import ably from "@/lib/ably";
import EmojiPickerComponent from "./EmojiPicker";
import FileUpload from "./FileUpload";
import FileMessage from "./FileMessage";
import DragDropZone from "./DragDropZone";
import FilePreview from "./FilePreview";

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

interface Message {
  id: number;
  senderId: number;
  message: string;
  timestamp: string;
  username: string;
  roomId: number;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

interface ChatAreaProps {
  currentUser: User;
  activeRoom: Room | null;
}

export default function ChatArea({ currentUser, activeRoom }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [isUploadingDraggedFile, setIsUploadingDraggedFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeRoom) {
      loadMessages();
      setupAbly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  const loadMessages = async () => {
    if (!activeRoom) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/messages?roomId=${activeRoom.id}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupAbly = () => {
    if (!activeRoom) return;

    const channel = ably.channels.get(`chat-${activeRoom.id}`);

    channel.subscribe("message", (message) => {
      const messageData = message.data;
      // Only add messages from other users, not own messages
      if (messageData.senderId !== currentUser.id) {
        setMessages((prev) => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(
            (msg) =>
              msg.id === messageData.id ||
              (msg.senderId === messageData.senderId &&
                msg.message === messageData.message &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(messageData.timestamp).getTime()
                ) < 1000)
          );
          if (exists) return prev;
          return [...prev, messageData];
        });
      }
    });

    channel.subscribe("typing", (message) => {
      const { username, isTyping } = message.data;

      if (username === currentUser.username) return;

      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    });

    return () => {
      channel.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !activeRoom) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          message: messageText,
          roomId: activeRoom.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add own message locally immediately with duplicate check
        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.id === data.message.id ||
              (msg.senderId === data.message.senderId &&
                msg.message === data.message.message &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(data.message.timestamp).getTime()
                ) < 1000)
          );
          if (exists) return prev;
          return [...prev, data.message];
        });

        // Broadcast to others via Ably
        const channel = ably.channels.get(`chat-${activeRoom.id}`);
        channel.publish("message", data.message);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(messageText);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!currentUser || !activeRoom) return;

    const channel = ably.channels.get(`chat-${activeRoom.id}`);
    channel.publish("typing", {
      username: currentUser.username,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channel.publish("typing", {
        username: currentUser.username,
        isTyping: false,
      });
    }, 1000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    // Refocus the input after emoji selection
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleFileSelect = async (fileInfo: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }) => {
    if (!currentUser || !activeRoom) return;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          message: "",
          roomId: activeRoom.id,
          fileName: fileInfo.fileName,
          fileUrl: fileInfo.fileUrl,
          fileType: fileInfo.fileType,
          fileSize: fileInfo.fileSize,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add own message locally immediately with duplicate check
        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.id === data.message.id ||
              (msg.senderId === data.message.senderId &&
                msg.file_url === data.message.file_url &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(data.message.timestamp).getTime()
                ) < 1000)
          );
          if (exists) return prev;
          return [...prev, data.message];
        });

        // Broadcast to others via Ably
        const channel = ably.channels.get(`chat-${activeRoom.id}`);
        channel.publish("message", data.message);
      }
    } catch (error) {
      console.error("Failed to send file:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && currentUser && activeRoom) {
        sendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  const handleDraggedFileSelect = (file: File) => {
    setDraggedFile(file);
    // Scroll to bottom to ensure FilePreview is visible
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDraggedFileCancel = () => {
    setDraggedFile(null);
  };

  const handleDraggedFileSend = async () => {
    if (!draggedFile || !currentUser || !activeRoom) return;

    setIsUploadingDraggedFile(true);

    try {
      // Upload the file
      const formData = new FormData();
      formData.append("file", draggedFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();

      // Send message with file
      const messageResponse = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          message: newMessage.trim() || "", // Optional message text with file
          roomId: activeRoom.id,
          fileName: uploadResult.file.originalName,
          fileUrl: uploadResult.file.url,
          fileType: uploadResult.file.type,
          fileSize: uploadResult.file.size,
        }),
      });

      const messageData = await messageResponse.json();

      if (messageResponse.ok) {
        // Add message locally
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === messageData.message.id);
          if (exists) return prev;
          return [...prev, messageData.message];
        });

        // Broadcast via Ably
        const channel = ably.channels.get(`chat-${activeRoom.id}`);
        channel.publish("message", messageData.message);

        // Clear states
        setDraggedFile(null);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploadingDraggedFile(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Welcome to My Chat
          </h2>
          <p className="text-gray-500">
            Select a channel from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <DragDropZone
      onFileSelect={handleDraggedFileSelect}
      className="flex-1 flex flex-col bg-white relative"
    >
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Hash className="w-5 h-5 text-gray-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {activeRoom.name}
            </h1>
            {activeRoom.description && (
              <p className="text-sm text-gray-500">{activeRoom.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={`room-${msg.id}-${msg.senderId}-${msg.roomId}-${index}`}
                  className={`flex ${
                    msg.senderId === currentUser?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderId === currentUser?.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {msg.username}
                    </div>
                    {msg.file_url ? (
                      <div className="mb-2">
                        <FileMessage
                          fileName={msg.file_name!}
                          fileUrl={msg.file_url}
                          fileType={msg.file_type!}
                          fileSize={msg.file_size!}
                        />
                        {msg.message && (
                          <div className="mt-2 whitespace-pre-wrap break-words">
                            {msg.message}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {msg.message}
                      </div>
                    )}
                    <div className="text-xs opacity-50 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {typingUsers.size > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm">
                  {Array.from(typingUsers).join(", ")}{" "}
                  {typingUsers.size === 1 ? "is" : "are"} typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File preview for dragged files - always visible at bottom */}
      {draggedFile && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <FilePreview
            file={draggedFile}
            onSend={handleDraggedFileSend}
            onCancel={handleDraggedFileCancel}
            isUploading={isUploadingDraggedFile}
          />
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="flex space-x-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${activeRoom.name}`}
              className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <FileUpload onFileSelect={handleFileSelect} />
              <EmojiPickerComponent onEmojiSelect={handleEmojiSelect} />
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </DragDropZone>
  );
}
