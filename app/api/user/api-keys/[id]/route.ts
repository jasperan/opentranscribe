import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteApiKey, getApiKeyById } from '@/lib/db/api-keys';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const key = getApiKeyById(id);
    if (!key || key.user_id !== user.id) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    deleteApiKey(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
