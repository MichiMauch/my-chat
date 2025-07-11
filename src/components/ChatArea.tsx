"use client";

import { useState, useEffect, useRef } from "react";
import { Hash, Send, MessageSquare } from "lucide-react";
import ably from "@/lib/ably";
import { playNotificationSound, playMentionSound } from "@/lib/audio";
import { notificationManager } from "@/lib/notifications";
import { highlightMentions } from "@/lib/mentions";
import { extractMentionedUserIds } from "@/lib/mentions-utils";
import EmojiPickerComponent from "./EmojiPicker";
import FileUpload from "./FileUpload";
import FileMessage from "./FileMessage";
import DragDropZone from "./DragDropZone";
import FilePreview from "./FilePreview";
import MentionPicker from "./MentionPicker";
import ThreadArea from "./ThreadArea";
import YouTubePreview, { detectYouTubeUrls } from "./YouTubePreview";

interface User {
  id: number;
  username: string;
  created_at: string;
  avatar_url?: string;
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
  avatar_url?: string;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  parent_message_id?: number;
  thread_count?: number;
  last_thread_timestamp?: string;
}

interface ChatAreaProps {
  currentUser: User;
  activeRoom: Room | null;
  allUsers: User[];
}

export default function ChatArea({
  currentUser,
  activeRoom,
  allUsers,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [isUploadingDraggedFile, setIsUploadingDraggedFile] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionPickerPosition, setMentionPickerPosition] = useState({
    x: 0,
    y: 0,
  });
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mentionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeRoom) {
      loadMessages();
      setupAbly();
    }

    // Initialize notifications
    initializeNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  const initializeNotifications = async () => {
    if (notificationManager.isSupported()) {
      const initialized = await notificationManager.initialize();
      if (initialized) {
        // Get current permission status
        const currentPermission = notificationManager.getPermissionStatus();
        setNotificationPermission(currentPermission);
        console.log("Current notification permission:", currentPermission);

        // Request permission if not already granted
        if (currentPermission === "default") {
          const permission = await notificationManager.requestPermission();
          setNotificationPermission(permission);
          console.log("Requested notification permission:", permission);
        }
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (notificationPermission === "denied") {
      alert(`Notifications are blocked. To enable them:

Chrome: Click the 🔒 lock icon in the address bar → Notifications → Allow
Firefox: Click the shield icon → Permissions → Notifications → Allow
Safari: Safari menu → Settings for This Website → Notifications → Allow

Then refresh this page.`);
      return;
    }

    const permission = await notificationManager.requestPermission();
    setNotificationPermission(permission);
  };

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

    console.log("Setting up Ably for room:", activeRoom.id, activeRoom.name);

    // Get the channel for current room
    const channel = ably.channels.get(`chat-${activeRoom.id}`);

    // Clean up any existing subscriptions on this channel
    channel.unsubscribe();

    channel.subscribe("message", (message) => {
      const messageData = message.data;

      console.log("=== ABLY MESSAGE RECEIVED ===");
      console.log("Channel:", `chat-${activeRoom.id}`);
      console.log("Message data:", messageData);
      console.log("Message roomId:", messageData.roomId);
      console.log("Current room ID:", activeRoom.id);
      console.log("Room ID match:", messageData.roomId === activeRoom.id);

      // STRICT FILTER: Only add messages that are exactly for THIS room and from other users
      if (
        messageData.senderId !== currentUser.id &&
        messageData.roomId === activeRoom.id
      ) {
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

          // Check if current user is mentioned
          const mentionedUsers = messageData.mentioned_users
            ? JSON.parse(messageData.mentioned_users)
            : [];
          const isMentioned = mentionedUsers.includes(currentUser.id);

          // Play appropriate notification sound and show web notification
          if (isMentioned) {
            playMentionSound();

            // Show push notification for mentions
            notificationManager.showMentionNotification({
              title: `New mention from ${messageData.username}`,
              body: messageData.message,
              senderName: messageData.username,
              senderId: messageData.senderId,
              mentionId: messageData.id,
            });
          } else {
            playNotificationSound();

            // Show simple notification for regular messages
            notificationManager.showSimpleNotification(
              `New message from ${messageData.username}`,
              messageData.message
            );
          }

          return [...prev, messageData];
        });
      }
    });

    channel.subscribe("thread-update", (message) => {
      const { parentMessageId, newReplyCount, lastReplyTimestamp } = message.data;
      
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === parentMessageId 
            ? { 
                ...msg, 
                thread_count: newReplyCount,
                last_thread_timestamp: lastReplyTimestamp 
              }
            : msg
        )
      );
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
      console.log(
        "Cleanup: Unsubscribing from channel:",
        `chat-${activeRoom.id}`
      );
      channel.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !activeRoom) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setShowMentionPicker(false);

    try {
      // Extract mentioned users
      const mentionedUserIds = extractMentionedUserIds(messageText, allUsers);

      console.log("=== SEND MESSAGE DEBUG ===");
      console.log("Message text:", messageText);
      console.log("All users for mention matching:", allUsers);
      console.log("Extracted mentioned user IDs:", mentionedUserIds);

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          message: messageText,
          roomId: activeRoom.id,
          mentionedUsers: mentionedUserIds,
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

        // Broadcast to others via Ably - ensure message has correct roomId
        console.log(
          "Broadcasting message to channel:",
          `chat-${activeRoom.id}`
        );
        console.log("Message being broadcasted:", data.message);
        console.log("Message roomId:", data.message.roomId);
        console.log("Active room ID:", activeRoom.id);

        const channel = ably.channels.get(`chat-${activeRoom.id}`);
        channel.publish("message", data.message);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(messageText);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Clear existing mention timeout
    if (mentionTimeoutRef.current) {
      clearTimeout(mentionTimeoutRef.current);
    }

    // Debounce mention detection for better performance
    mentionTimeoutRef.current = setTimeout(() => {
      // Check for @ mention trigger
      const lastAtIndex = value.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = value.substring(lastAtIndex + 1);

        // Show picker if we're typing after @ and there's no space
        if (!textAfterAt.includes(" ") && textAfterAt.length <= 20) {
          setMentionSearchTerm(textAfterAt);
          setMentionStartIndex(lastAtIndex);
          setShowMentionPicker(true);

          // Calculate picker position - show ABOVE input
          const inputElement = e.target;
          const rect = inputElement.getBoundingClientRect();

          setMentionPickerPosition({
            x: rect.left,
            y: rect.top - 200, // Position ABOVE the input with enough space
          });
        } else {
          setShowMentionPicker(false);
        }
      } else {
        setShowMentionPicker(false);
      }
    }, 100); // 100ms debounce

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

  const handleMentionSelect = (user: User) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = newMessage.substring(0, mentionStartIndex);
    const afterMention = newMessage.substring(
      mentionStartIndex + 1 + mentionSearchTerm.length
    );
    const newValue = beforeMention + `@${user.username} ` + afterMention;

    setNewMessage(newValue);
    setShowMentionPicker(false);
    setMentionStartIndex(-1);
    setMentionSearchTerm("");

    // Refocus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPosition =
          beforeMention.length + user.username.length + 2; // +2 for @ and space
        inputRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);
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
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div className={`flex flex-col bg-white ${activeThread ? "w-1/2" : "w-full"} transition-all duration-300`}>
        <DragDropZone
          onFileSelect={handleDraggedFileSelect}
          className="h-full flex flex-col bg-white relative"
        >
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Hash className="w-5 h-5 text-gray-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activeRoom.name}
              </h1>
              {activeRoom.description && (
                <p className="text-sm text-gray-500">
                  {activeRoom.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {notificationPermission === "denied" && (
              <button
                onClick={handleEnableNotifications}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                🚫 Enable Notifications
              </button>
            )}
            {notificationPermission === "default" && (
              <button
                onClick={handleEnableNotifications}
                className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
              >
                Allow Notifications
              </button>
            )}
            <div className="text-sm text-gray-500">
              {currentUser.username}
              {notificationPermission === "granted" && " 🔔"}
            </div>
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
                  className="flex items-start space-x-3 justify-start"
                >
                  {/* Avatar - immer links */}
                  <div className="flex-shrink-0">
                    {msg.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="w-8 h-8 rounded-full"
                        src={msg.avatar_url}
                        alt={msg.username}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {msg.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Content - immer rechts vom Avatar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.username}
                      </span>
                      {msg.senderId === currentUser?.id && (
                        <span className="text-xs text-gray-500">(You)</span>
                      )}
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
                                {highlightMentions({
                                  text: msg.message,
                                  allUsers,
                                })}
                              </div>
                              {/* YouTube Preview */}
                              {detectYouTubeUrls(msg.message).map((url, index) => (
                                <YouTubePreview 
                                  key={`${msg.id}-youtube-${index}`}
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
                            {highlightMentions({ text: msg.message, allUsers })}
                          </div>
                          {/* YouTube Preview for text-only messages */}
                          {detectYouTubeUrls(msg.message).map((url, index) => (
                            <YouTubePreview 
                              key={`${msg.id}-youtube-${index}`}
                              url={url} 
                              className="mt-2"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Thread Actions - nur für Top-Level-Nachrichten */}
                    {!msg.parent_message_id && (
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => setActiveThread(msg)}
                          className="text-xs text-gray-500 hover:text-blue-600 flex items-center space-x-1 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Reply in thread</span>
                        </button>
                        
                        {(msg.thread_count || 0) > 0 && (
                          <button
                            onClick={() => setActiveThread(msg)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                          >
                            <span className="font-medium">
                              {msg.thread_count} {msg.thread_count === 1 ? "reply" : "replies"}
                            </span>
                            {msg.last_thread_timestamp && (
                              <span className="text-gray-500">
                                • Last reply {new Date(msg.last_thread_timestamp).toLocaleTimeString()}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    )}
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

      {/* Mention Picker */}
      <MentionPicker
        users={allUsers.filter((user) => user.id !== currentUser.id)}
        onMentionSelect={handleMentionSelect}
        isVisible={showMentionPicker}
        position={mentionPickerPosition}
        searchTerm={mentionSearchTerm}
      />
        </DragDropZone>
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <div className="w-1/2 h-full">
          <ThreadArea
            parentMessage={activeThread}
            currentUser={currentUser}
            activeRoom={activeRoom!}
            allUsers={allUsers}
            onClose={() => setActiveThread(null)}
          />
        </div>
      )}
    </div>
  );
}
