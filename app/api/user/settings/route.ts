import { NextRequest, NextResponse } from 'next/server';
import { requireUserOr401 } from '@/lib/api/guards';
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
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;

    const settings = getUserSettings(auth.user.id);

    return NextResponse.json({
      email: auth.user.email,
      defaultModel: settings.default_model,
      defaultLanguage: settings.default_language,
      emailNotifications: Boolean(settings.email_notifications),
      createdAt: auth.user.created_at,
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
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const db = getDb();

    db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(auth.user.id);

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
      ).run(...values, auth.user.id);
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
