import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists in database
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found. Please contact an administrator.' },
        { status: 404 }
      );
    }

    // Generate a simple token (in production, use JWT or similar)
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Store token in database (you'd need to add a tokens table)
    // For now, we'll just return success
    console.log(`Magic link for ${email}: http://localhost:3000/auth/verify?token=${token}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent! (Check server console for now)',
      // In production, send email here
      token // Remove this in production
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}