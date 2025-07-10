import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return { error: 'Not authenticated', status: 401 };
  }

  const userResult = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [session.user.email]
  });

  if (userResult.rows.length === 0) {
    return { error: 'User not found', status: 404 };
  }

  const user = userResult.rows[0] as unknown as { id: number; role: string };
  if (user.role !== 'admin') {
    return { error: 'Access denied', status: 403 };
  }

  return { user };
}

export async function GET() {
  const authCheck = await checkAdminAuth();
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const users = await db.execute(`
      SELECT id, username, email, role, created_at, avatar_url 
      FROM users 
      ORDER BY created_at DESC
    `);
    return NextResponse.json({ users: users.rows });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { username, email, role = 'user', password } = await request.json();

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await db.execute({
      sql: 'INSERT INTO users (username, email, role, password_hash) VALUES (?, ?, ?, ?)',
      args: [username, email, role, passwordHash]
    });

    const newUser = await db.execute({
      sql: 'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      args: [result.lastInsertRowid!]
    });

    return NextResponse.json({ user: newUser.rows[0] });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}