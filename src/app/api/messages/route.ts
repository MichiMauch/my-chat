import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const { senderId, message, roomId, fileName, fileUrl, fileType, fileSize } = await request.json();

    if (!senderId || (!message && !fileName) || !roomId) {
      return NextResponse.json(
        { error: 'SenderId, message or file, and roomId are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO messages (senderId, message, roomId, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [senderId, message || '', roomId, fileName || null, fileUrl || null, fileType || null, fileSize || null]
    });

    const messageRecord = await db.execute({
      sql: `SELECT m.*, u.username 
            FROM messages m 
            JOIN users u ON m.senderId = u.id 
            WHERE m.id = ?`,
      args: [result.lastInsertRowid!]
    });

    return NextResponse.json({ message: messageRecord.rows[0] });
  } catch {
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
      sql: `SELECT m.*, u.username 
            FROM messages m 
            JOIN users u ON m.senderId = u.id 
            WHERE m.roomId = ?
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