import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const parentMessageId = resolvedParams.id;

    if (!parentMessageId) {
      return NextResponse.json(
        { error: 'Parent message ID is required' },
        { status: 400 }
      );
    }

    // Get the parent message
    const parentMessage = await db.execute({
      sql: `SELECT m.*, u.username, u.avatar_url 
            FROM messages m 
            JOIN users u ON m.senderId = u.id 
            WHERE m.id = ?`,
      args: [parentMessageId]
    });

    if (parentMessage.rows.length === 0) {
      return NextResponse.json(
        { error: 'Parent message not found' },
        { status: 404 }
      );
    }

    // Get thread replies
    const threadReplies = await db.execute({
      sql: `SELECT m.*, u.username, u.avatar_url 
            FROM messages m 
            JOIN users u ON m.senderId = u.id 
            WHERE m.parent_message_id = ?
            ORDER BY m.timestamp ASC`,
      args: [parentMessageId]
    });

    return NextResponse.json({
      parentMessage: parentMessage.rows[0],
      replies: threadReplies.rows
    });
  } catch (error) {
    console.error('API Thread Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
