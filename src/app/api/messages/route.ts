import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const { senderId, message, roomId, fileName, fileUrl, fileType, fileSize, mentionedUsers, parentMessageId } = await request.json();

    if (!senderId || (!message && !fileName) || !roomId) {
      return NextResponse.json(
        { error: 'SenderId, message or file, and roomId are required' },
        { status: 400 }
      );
    }

    const mentionedUsersJson = mentionedUsers ? JSON.stringify(mentionedUsers) : null;

    const result = await db.execute({
      sql: 'INSERT INTO messages (senderId, message, roomId, file_name, file_url, file_type, file_size, mentioned_users, parent_message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [senderId, message || '', roomId, fileName || null, fileUrl || null, fileType || null, fileSize || null, mentionedUsersJson, parentMessageId || null]
    });

    // If this is a thread reply, update the parent message's thread count
    if (parentMessageId) {
      await db.execute({
        sql: 'UPDATE messages SET thread_count = COALESCE(thread_count, 0) + 1, last_thread_timestamp = CURRENT_TIMESTAMP WHERE id = ?',
        args: [parentMessageId]
      });
    }

    const messageRecord = await db.execute({
      sql: `SELECT m.*, u.username, u.avatar_url 
            FROM messages m 
            JOIN users u ON m.senderId = u.id 
            WHERE m.id = ?`,
      args: [result.lastInsertRowid!]
    });

    return NextResponse.json({ message: messageRecord.rows[0] });
  } catch (error) {
    console.error('API Messages Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const messages = await db.execute({
      sql: `SELECT m.*, u.username, u.avatar_url 
            FROM messages m 
            JOIN users u ON m.senderId = u.id 
            WHERE m.roomId = ? AND m.parent_message_id IS NULL
            ORDER BY m.timestamp ASC`,
      args: [roomId]
    });
    return NextResponse.json({ messages: messages.rows });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}