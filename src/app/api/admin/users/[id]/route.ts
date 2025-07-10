import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const { role } = await request.json();
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if (!role || !['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role (user/admin) is required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'UPDATE users SET role = ? WHERE id = ?',
      args: [role, userId]
    });

    const updatedUser = await db.execute({
      sql: 'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      args: [userId]
    });

    return NextResponse.json({ user: updatedUser.rows[0] });
  } catch {
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