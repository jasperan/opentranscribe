import { NextRequest, NextResponse } from 'next/server';
import { requireUserOr401 } from '@/lib/api/guards';
import { deleteApiKey, getApiKeyById } from '@/lib/db/api-keys';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const key = getApiKeyById(id);
    if (!key || key.user_id !== auth.user.id) {
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
