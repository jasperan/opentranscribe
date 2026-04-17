import { NextRequest, NextResponse } from 'next/server';
import { requireUserOr401 } from '@/lib/api/guards';
import { createApiKey, getUserApiKeys, canCreateApiKey } from '@/lib/db/api-keys';

export async function GET() {
  try {
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;

    const keys = getUserApiKeys(auth.user.id);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('API keys error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserOr401();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    if (!canCreateApiKey(auth.user.id)) {
      return NextResponse.json(
        { error: 'Maximum number of API keys reached (10)' },
        { status: 400 }
      );
    }

    const { key, keyInfo } = createApiKey(auth.user.id, trimmedName);

    return NextResponse.json({ key, keyInfo });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
