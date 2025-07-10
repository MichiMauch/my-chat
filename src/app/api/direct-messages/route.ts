import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const { senderId, receiverId, message } = await request.json();

    if (!senderId || !receiverId || !message) {
      return NextResponse.json(
        { error: 'SenderId, receiverId, and message are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO direct_messages (senderId, receiverId, message) VALUES (?, ?, ?)',
      args: [senderId, receiverId, message]
    });

    const directMessage = await db.execute({
      sql: `SELECT dm.*, 
            sender.username as senderUsername,
            receiver.username as receiverUsername
            FROM direct_messages dm 
            JOIN users sender ON dm.senderId = sender.id
            JOIN users receiver ON dm.receiverId = receiver.id
            WHERE dm.id = ?`,
      args: [result.lastInsertRowid!]
    });

    return NextResponse.json({ directMessage: directMessage.rows[0] });
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
    const userId = url.searchParams.get('userId');
    const otherUserId = url.searchParams.get('otherUserId');

    if (!userId || !otherUserId) {
      return NextResponse.json(
        { error: 'Both userId and otherUserId are required' },
        { status: 400 }
      );
    }

    const messages = await db.execute({
      sql: `SELECT dm.*, 
            sender.username as senderUsername,
            receiver.username as receiverUsername
            FROM direct_messages dm 
            JOIN users sender ON dm.senderId = sender.id
            JOIN users receiver ON dm.receiverId = receiver.id
            WHERE (dm.senderId = ? AND dm.receiverId = ?) 
               OR (dm.senderId = ? AND dm.receiverId = ?)
            ORDER BY dm.timestamp ASC`,
      args: [userId, otherUserId, otherUserId, userId]
    });

    return NextResponse.json({ messages: messages.rows });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}