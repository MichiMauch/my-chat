import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function GET() {
  try {
    const rooms = await db.execute('SELECT * FROM rooms ORDER BY name');
    return NextResponse.json({ rooms: rooms.rows });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO rooms (name, description) VALUES (?, ?)',
      args: [name, description || '']
    });

    const room = await db.execute({
      sql: 'SELECT * FROM rooms WHERE id = ?',
      args: [result.lastInsertRowid!]
    });

    return NextResponse.json({ room: room.rows[0] });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Room name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}