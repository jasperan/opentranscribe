import { NextResponse } from 'next/server';
import { requireUserOr401 } from '@/lib/api/guards';
import { logout } from '@/lib/auth';
import { deleteUser } from '@/lib/db/users';

export async function DELETE() {
  try {
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    await logout();
    deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
