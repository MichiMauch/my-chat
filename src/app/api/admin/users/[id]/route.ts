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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdminAuth();
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { username, email, role, password } = await request.json();
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (username) {
      updates.push('username = ?');
      args.push(username);
    }

    if (email) {
      updates.push('email = ?');
      args.push(email);
    }

    if (role && ['user', 'admin'].includes(role)) {
      updates.push('role = ?');
      args.push(role);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      args.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    args.push(userId);

    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    const updatedUser = await db.execute({
      sql: 'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      args: [userId]
    });

    return NextResponse.json({ user: updatedUser.rows[0] });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdminAuth();
  if (authCheck.error) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // Prevent deleting yourself
    if (authCheck.user && authCheck.user.id.toString() === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [userId]
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}