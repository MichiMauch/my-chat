import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function initializeDatabase() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId INTEGER NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      roomId INTEGER,
      file_name TEXT,
      file_url TEXT,
      file_type TEXT,
      file_size INTEGER,
      mentioned_users TEXT,
      FOREIGN KEY (senderId) REFERENCES users(id)
    );
  `);

  // Migration: Add mentioned_users column if it doesn't exist
  try {
    await client.execute(`
      ALTER TABLE messages ADD COLUMN mentioned_users TEXT;
    `);
  } catch {
    // Column already exists, no action needed
  }

  // Migration: Add role column to users if it doesn't exist
  try {
    await client.execute(`
      ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
    `);
  } catch {
    // Column already exists, no action needed
  }

  // Migration: Add thread support to messages
  try {
    await client.execute(`
      ALTER TABLE messages ADD COLUMN parent_message_id INTEGER;
    `);
  } catch {
    // Column already exists, no action needed
  }

  try {
    await client.execute(`
      ALTER TABLE messages ADD COLUMN thread_count INTEGER DEFAULT 0;
    `);
  } catch {
    // Column already exists, no action needed
  }

  try {
    await client.execute(`
      ALTER TABLE messages ADD COLUMN last_thread_timestamp DATETIME;
    `);
  } catch {
    // Column already exists, no action needed
  }
}

export default client;