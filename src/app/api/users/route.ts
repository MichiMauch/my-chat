import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO users (username) VALUES (?)',
      args: [username]
    });

    const user = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [result.lastInsertRowid!]
    });

    return NextResponse.json({ user: user.rows[0] });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const users = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
    return NextResponse.json({ users: users.rows });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}