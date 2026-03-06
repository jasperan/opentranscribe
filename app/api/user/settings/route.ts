import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

interface UserSettings {
  default_model: string;
  default_language: string;
  email_notifications: number;
  updated_at: string;
}

function getUserSettings(userId: string): UserSettings {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM user_settings WHERE user_id = ?')
    .get(userId) as UserSettings | undefined;

  if (row) return row;

  // Create default settings
  db.prepare(
    `INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`
  ).run(userId);

  return {
    default_model: 'faster-whisper',
    default_language: 'auto',
    email_notifications: 1,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const settings = getUserSettings(user.id);

    return NextResponse.json({
      email: user.email,
      defaultModel: settings.default_model,
      defaultLanguage: settings.default_language,
      emailNotifications: Boolean(settings.email_notifications),
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const db = getDb();

    // Ensure row exists
    db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(user.id);

    // Update provided fields
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.defaultModel !== undefined) {
      updates.push('default_model = ?');
      values.push(String(body.defaultModel));
    }
    if (body.defaultLanguage !== undefined) {
      updates.push('default_language = ?');
      values.push(String(body.defaultLanguage));
    }
    if (body.emailNotifications !== undefined) {
      updates.push('email_notifications = ?');
      values.push(body.emailNotifications ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      db.prepare(
        `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`
      ).run(...values, user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
