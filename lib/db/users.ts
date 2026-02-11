/**
 * User Database Operations
 */

import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  tier: 'free' | 'creator' | 'pro' | 'unlimited';
  minutes_used: number;
  minutes_limit: number;
  billing_period_start: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  last_active_at: string | null;
}

const TIER_LIMITS: Record<string, number> = {
  free: 500,
  creator: 3000,
  pro: 10000,
  unlimited: -1, // -1 = unlimited
};

export function createUser(email: string): User {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, email, tier, minutes_used, minutes_limit, billing_period_start, created_at, last_active_at)
     VALUES (?, ?, 'free', 0, 500, ?, ?, ?)`
  ).run(id, email.toLowerCase(), now, now, now);

  return getUserById(id)!;
}

export function getUserById(id: string): User | null {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase()) as User | null;
}

export function getOrCreateUser(email: string): User {
  const existing = getUserByEmail(email);
  if (existing) {
    // Update last active
    updateLastActive(existing.id);
    return existing;
  }
  return createUser(email);
}

export function updateLastActive(userId: string): void {
  const db = getDb();
  db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    userId
  );
}

export function updateUserTier(
  userId: string,
  tier: User['tier'],
  stripeSubscriptionId?: string
): void {
  const db = getDb();
  const minutesLimit = TIER_LIMITS[tier];

  db.prepare(
    `UPDATE users
     SET tier = ?, minutes_limit = ?, stripe_subscription_id = ?
     WHERE id = ?`
  ).run(tier, minutesLimit, stripeSubscriptionId || null, userId);
}

export function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): void {
  const db = getDb();
  db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(
    stripeCustomerId,
    userId
  );
}

export function addMinutesUsed(userId: string, minutes: number): void {
  const db = getDb();
  db.prepare(
    'UPDATE users SET minutes_used = minutes_used + ? WHERE id = ?'
  ).run(minutes, userId);
}

export function resetBillingPeriod(userId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE users SET minutes_used = 0, billing_period_start = ? WHERE id = ?`
  ).run(new Date().toISOString(), userId);
}

export function canTranscribe(
  userId: string,
  estimatedMinutes: number
): { allowed: boolean; reason?: string } {
  const user = getUserById(userId);
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Unlimited tier
  if (user.minutes_limit === -1) {
    return { allowed: true };
  }

  const remaining = user.minutes_limit - user.minutes_used;
  if (remaining < estimatedMinutes) {
    return {
      allowed: false,
      reason: `Insufficient minutes. ${remaining} remaining, ${estimatedMinutes} required.`,
    };
  }

  return { allowed: true };
}

export function deleteUser(userId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return result.changes > 0;
}

export function getUserUsage(userId: string): {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
} {
  const user = getUserById(userId);
  if (!user) {
    return { used: 0, limit: 500, remaining: 500, percentage: 0 };
  }

  const limit = user.minutes_limit === -1 ? Infinity : user.minutes_limit;
  const remaining = limit === Infinity ? Infinity : limit - user.minutes_used;
  const percentage =
    limit === Infinity ? 0 : Math.round((user.minutes_used / limit) * 100);

  return {
    used: user.minutes_used,
    limit: user.minutes_limit,
    remaining: remaining === Infinity ? -1 : remaining,
    percentage,
  };
}
