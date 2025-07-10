import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

// POST endpoint removed - user creation now handled through NextAuth and admin interface

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