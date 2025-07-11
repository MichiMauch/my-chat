"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageSquare, User } from "lucide-react";
import ably from "@/lib/ably";
import { highlightMentions } from "@/lib/mentions";
import FileMessage from "./FileMessage";
import FileUpload from "./FileUpload";
import EmojiPicker from "./EmojiPicker";
import YouTubePreview, { detectYouTubeUrls } from "./YouTubePreview";

interface User {
  id: number;
  username: string;
  created_at: string;
  avatar_url?: string;
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

interface ThreadAreaProps {
  parentMessage: Message;
  currentUser: User;
  activeRoom: { id: number; name: string };
  allUsers: User[];
  onClose: () => void;
}

export default function ThreadArea({
  parentMessage,
  currentUser,
  activeRoom,
  allUsers,
  onClose,
}: ThreadAreaProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadReplies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/threads/${parentMessage.id}`);
        const data = await response.json();
        setReplies(data.replies || []);
      } catch (error) {
        console.error("Failed to load thread replies:", error);
      } finally {
        setLoading(false);
      }
    };

    const setupAblyConnection = () => {
      // Listen for new thread replies on the thread channel
      const threadChannel = ably.channels.get(`thread-${parentMessage.id}`);
      
      threadChannel.subscribe("reply", (message) => {
        const replyData = message.data;
        
        // Only add replies from other users
        if (replyData.senderId !== currentUser.id) {
          setReplies((prev) => {
            const exists = prev.some((msg) => msg.id === replyData.id);
            if (exists) return prev;
            return [...prev, replyData];
          });
        }
      });

      return () => {
        threadChannel.unsubscribe();
      };
    };

    loadReplies();
    const cleanup = setupAblyConnection();
    
    // Focus the input when thread opens
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return cleanup;
  }, [parentMessage.id, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    const replyText = newReply.trim();
    setNewReply("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          message: replyText,
          roomId: activeRoom.id,
          parentMessageId: parentMessage.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add reply locally
        setReplies((prev) => {
          const exists = prev.some((msg) => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });

        // Broadcast to thread channel
        const threadChannel = ably.channels.get(`thread-${parentMessage.id}`);
        threadChannel.publish("reply", data.message);

        // Also broadcast thread update to main room channel
        const roomChannel = ably.channels.get(`chat-${activeRoom.id}`);
        roomChannel.publish("thread-update", {
          parentMessageId: parentMessage.id,
          newReplyCount: (parentMessage.thread_count || 0) + 1,
          lastReplyTimestamp: data.message.timestamp,
        });
      }
    } catch (error) {
      console.error("Failed to send thread reply:", error);
      setNewReply(replyText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newReply.trim()) {
        sendReply(e as unknown as React.FormEvent);
      }
    }
  };

  const handleFileSelect = async (fileInfo: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }) => {
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
          parentMessageId: parentMessage.id,
          fileName: fileInfo.fileName,
          fileUrl: fileInfo.fileUrl,
          fileType: fileInfo.fileType,
          fileSize: fileInfo.fileSize,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReplies((prev) => {
          const exists = prev.some((msg) => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });

        // Broadcast to thread channel
        const threadChannel = ably.channels.get(`thread-${parentMessage.id}`);
        threadChannel.publish("reply", data.message);
      }
    } catch (error) {
      console.error("Failed to send file in thread:", error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewReply((prev) => prev + emoji);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Thread Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Thread</h2>
              <p className="text-sm text-gray-500">
                #{activeRoom.name} • {replies.length + 1} message{replies.length !== 0 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parent Message */}
        <div className="pb-4 border-b border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {parentMessage.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="w-10 h-10 rounded-full"
                  src={parentMessage.avatar_url}
                  alt={parentMessage.username}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {parentMessage.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">
                  {parentMessage.username}
                </span>
                {parentMessage.senderId === currentUser.id && (
                  <span className="text-xs text-gray-500">(You)</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(parentMessage.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="bg-blue-50 rounded-lg border border-blue-200 px-4 py-3">
                {parentMessage.file_url ? (
                  <div>
                    <FileMessage
                      fileName={parentMessage.file_name!}
                      fileUrl={parentMessage.file_url}
                      fileType={parentMessage.file_type!}
                      fileSize={parentMessage.file_size!}
                    />
                    {parentMessage.message && (
                      <div className="mt-2">
                        <div className="whitespace-pre-wrap break-words text-gray-900 mb-2">
                          {highlightMentions({
                            text: parentMessage.message,
                            allUsers,
                          })}
                        </div>
                        {/* YouTube Preview */}
                        {detectYouTubeUrls(parentMessage.message).map((url, index) => (
                          <YouTubePreview 
                            key={`parent-${parentMessage.id}-youtube-${index}`}
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
                      {highlightMentions({
                        text: parentMessage.message,
                        allUsers,
                      })}
                    </div>
                    {/* YouTube Preview for parent message */}
                    {detectYouTubeUrls(parentMessage.message).map((url, index) => (
                      <YouTubePreview 
                        key={`parent-${parentMessage.id}-youtube-${index}`}
                        url={url} 
                        className="mt-2"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thread Replies */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading replies...</div>
          </div>
        ) : (
          <>
            {replies.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No replies yet. Start the thread conversation!</p>
              </div>
            ) : (
              replies.map((reply, index) => (
                <div key={`thread-reply-${reply.id}-${index}`} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {reply.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="w-8 h-8 rounded-full"
                        src={reply.avatar_url}
                        alt={reply.username}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {reply.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {reply.username}
                      </span>
                      {reply.senderId === currentUser.id && (
                        <span className="text-xs text-gray-500">(You)</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(reply.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
                      {reply.file_url ? (
                        <div>
                          <FileMessage
                            fileName={reply.file_name!}
                            fileUrl={reply.file_url}
                            fileType={reply.file_type!}
                            fileSize={reply.file_size!}
                          />
                          {reply.message && (
                            <div className="mt-2">
                              <div className="whitespace-pre-wrap break-words text-gray-900 mb-2">
                                {highlightMentions({
                                  text: reply.message,
                                  allUsers,
                                })}
                              </div>
                              {/* YouTube Preview for reply */}
                              {detectYouTubeUrls(reply.message).map((url, index) => (
                                <YouTubePreview 
                                  key={`reply-${reply.id}-youtube-${index}`}
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
                            {highlightMentions({
                              text: reply.message,
                              allUsers,
                            })}
                          </div>
                          {/* YouTube Preview for text-only reply */}
                          {detectYouTubeUrls(reply.message).map((url, index) => (
                            <YouTubePreview 
                              key={`reply-${reply.id}-youtube-${index}`}
                              url={url} 
                              className="mt-2"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Input */}
      <form
        onSubmit={sendReply}
        className="border-t border-gray-200 bg-gray-50 p-4 flex-shrink-0"
      >
        <div className="flex space-x-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Reply to thread..."
              className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <FileUpload onFileSelect={handleFileSelect} />
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </div>
          </div>
          <button
            type="submit"
            disabled={!newReply.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
