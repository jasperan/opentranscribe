import { NextResponse } from 'next/server';
import { requireAuth, logout } from '@/lib/auth';
import { deleteUser } from '@/lib/db/users';

export async function DELETE() {
  try {
    const user = await requireAuth();

    await logout();
    deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
