"use client";

import { useState, useEffect, useRef } from "react";
import { User, Send } from "lucide-react";
import ably from "@/lib/ably";
import { playNotificationSound } from "@/lib/audio";
import { notificationManager } from "@/lib/notifications";
import EmojiPickerComponent from "./EmojiPicker";
import FileUpload from "./FileUpload";
import FileMessage from "./FileMessage";
import DragDropZone from "./DragDropZone";
import FilePreview from "./FilePreview";
import YouTubePreview, { detectYouTubeUrls } from "./YouTubePreview";

interface CurrentUser {
  id: number;
  username: string;
  created_at: string;
}

interface DirectMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  senderUsername: string;
  receiverUsername: string;
  senderAvatarUrl?: string;
  receiverAvatarUrl?: string;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

interface DirectMessageAreaProps {
  currentUser: CurrentUser;
  otherUser: CurrentUser;
}

export default function DirectMessageArea({
  currentUser,
  otherUser,
}: DirectMessageAreaProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [isUploadingDraggedFile, setIsUploadingDraggedFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otherUser) {
      loadMessages();
      setupAbly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUser]);

  const loadMessages = async () => {
    if (!otherUser) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/direct-messages?userId=${currentUser.id}&otherUserId=${otherUser.id}`
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to load direct messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupAbly = () => {
    if (!otherUser) return;

    const channelName = `dm-${Math.min(
      currentUser.id,
      otherUser.id
    )}-${Math.max(currentUser.id, otherUser.id)}`;
    const channel = ably.channels.get(channelName);

    channel.subscribe("message", (message) => {
      const messageData = message.data;
      // Only add messages from other user, not own messages
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

          // Play notification sound for new incoming message
          playNotificationSound();

          // Show push notification for direct message
          notificationManager.showSimpleNotification(
            `New direct message from ${messageData.senderUsername}`,
            messageData.message
          );

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
    if (!newMessage.trim() || !otherUser) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const response = await fetch("/api/direct-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: otherUser.id,
          message: messageText,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add own message locally immediately with duplicate check
        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.id === data.directMessage.id ||
              (msg.senderId === data.directMessage.senderId &&
                msg.message === data.directMessage.message &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(data.directMessage.timestamp).getTime()
                ) < 1000)
          );
          if (exists) return prev;
          return [...prev, data.directMessage];
        });

        // Broadcast to other user via Ably
        const channelName = `dm-${Math.min(
          currentUser.id,
          otherUser.id
        )}-${Math.max(currentUser.id, otherUser.id)}`;
        const channel = ably.channels.get(channelName);
        channel.publish("message", data.directMessage);
      }
    } catch (error) {
      console.error("Failed to send direct message:", error);
      setNewMessage(messageText);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!otherUser) return;

    const channelName = `dm-${Math.min(
      currentUser.id,
      otherUser.id
    )}-${Math.max(currentUser.id, otherUser.id)}`;
    const channel = ably.channels.get(channelName);
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
    if (!otherUser) return;

    try {
      const response = await fetch("/api/direct-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: otherUser.id,
          message: "",
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
              msg.id === data.directMessage.id ||
              (msg.senderId === data.directMessage.senderId &&
                msg.file_url === data.directMessage.file_url &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(data.directMessage.timestamp).getTime()
                ) < 1000)
          );
          if (exists) return prev;
          return [...prev, data.directMessage];
        });

        // Broadcast to other user via Ably
        const channelName = `dm-${Math.min(
          currentUser.id,
          otherUser.id
        )}-${Math.max(currentUser.id, otherUser.id)}`;
        const channel = ably.channels.get(channelName);
        channel.publish("message", data.directMessage);
      }
    } catch (error) {
      console.error("Failed to send file:", error);
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
    if (!draggedFile || !currentUser || !otherUser) return;

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

      // Send direct message with file
      const messageResponse = await fetch("/api/direct-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: otherUser.id,
          message: newMessage.trim() || "", // Optional message text with file
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
          const exists = prev.some(
            (msg) => msg.id === messageData.directMessage.id
          );
          if (exists) return prev;
          return [...prev, messageData.directMessage];
        });

        // Broadcast via Ably
        const channelName = `dm-${Math.min(
          currentUser.id,
          otherUser.id
        )}-${Math.max(currentUser.id, otherUser.id)}`;
        const channel = ably.channels.get(channelName);
        channel.publish("message", messageData.directMessage);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && otherUser) {
        sendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <DragDropZone
      onFileSelect={handleDraggedFileSelect}
      className="h-full flex flex-col bg-white relative"
    >
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <User className="w-5 h-5 text-gray-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {otherUser.username}
            </h1>
            <p className="text-sm text-gray-500">Direct Message</p>
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
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>Start a private conversation with {otherUser.username}</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isCurrentUser = msg.senderId === currentUser.id;
                const avatarUrl = isCurrentUser
                  ? msg.senderAvatarUrl
                  : msg.receiverAvatarUrl;
                const username = isCurrentUser ? "You" : otherUser.username;

                return (
                  <div
                    key={`dm-${msg.id}-${msg.senderId}-${msg.receiverId}-${index}`}
                    className="flex items-start space-x-3 justify-start"
                  >
                    {/* Avatar - immer links */}
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="w-8 h-8 rounded-full"
                          src={avatarUrl}
                          alt={username}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message Content - immer rechts vom Avatar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
                        {msg.file_url ? (
                          <div className="mb-2">
                            <FileMessage
                              fileName={msg.file_name!}
                              fileUrl={msg.file_url}
                              fileType={msg.file_type!}
                              fileSize={msg.file_size!}
                            />
                            {msg.message && (
                              <div className="mt-2">
                                <div className="whitespace-pre-wrap break-words text-gray-900 mb-2">
                                  {msg.message}
                                </div>
                                {/* YouTube Preview */}
                                {detectYouTubeUrls(msg.message).map((url, index) => (
                                  <YouTubePreview 
                                    key={`dm-${msg.id}-youtube-${index}`}
                                    url={url} 
                                    className="mt-2"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="whitespace-pre-wrap break-words text-gray-900 mb-2">
                              {msg.message}
                            </div>
                            {/* YouTube Preview for text-only direct messages */}
                            {detectYouTubeUrls(msg.message).map((url, index) => (
                              <YouTubePreview 
                                key={`dm-${msg.id}-youtube-${index}`}
                                url={url} 
                                className="mt-2"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {typingUsers.size > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm">
                  {otherUser.username} is typing...
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
            onCancel={handleDraggedFileCancel}
            onSend={handleDraggedFileSend}
            isUploading={isUploadingDraggedFile}
          />
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="border-t border-gray-200 bg-white p-4 flex-shrink-0"
      >
        <div className="flex space-x-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${otherUser.username}`}
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
