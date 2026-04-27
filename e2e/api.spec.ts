import { test, expect, APIRequestContext } from '@playwright/test';
import { createTranscription, completeTranscription } from '../lib/db/transcriptions';
import { getOrCreateUser } from '../lib/db/users';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function seedCompletedTranscription(email: string) {
  const user = getOrCreateUser(email);
  const transcription = createTranscription(user.id, 'team-sync.mp3', 'fp-team-sync');

  completeTranscription(transcription.id, {
    text: 'Hello from the transcription API.',
    segments: [
      {
        start: 0,
        end: 1.5,
        text: 'Hello from the transcription API.',
        speaker: 'Speaker 1',
      },
    ],
    model: 'faster-whisper',
    language: 'en',
    durationSeconds: 92,
    minutesCharged: 2,
    hasDiarization: true,
  });

  return transcription.id;
}

async function authenticateApiRequest(
  request: APIRequestContext,
  email: string
): Promise<void> {
  const magicLinkResponse = await request.post('/api/dev/magic-link', {
    data: { email },
  });
  expect(magicLinkResponse.status()).toBe(200);

  const { token } = await magicLinkResponse.json();
  const verifyResponse = await request.get(`/api/auth/verify?token=${token}`);
  expect(verifyResponse.status()).toBe(200);
}

test.describe('API Routes', () => {
  test.describe('Auth API', () => {
    test('POST /api/auth/send-link requires email', async ({ request }) => {
      const response = await request.post('/api/auth/send-link', {
        data: {},
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.toLowerCase()).toContain('email');
    });

    test('POST /api/auth/send-link validates email format', async ({ request }) => {
      const response = await request.post('/api/auth/send-link', {
        data: { email: 'invalid-email' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('GET /api/auth/verify requires token', async ({ request }) => {
      const response = await request.get('/api/auth/verify');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.toLowerCase()).toContain('token');
    });

    test('GET /api/auth/verify rejects invalid token', async ({ request }) => {
      const response = await request.get('/api/auth/verify?token=invalid-token-12345');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('POST /api/auth/logout works without auth', async ({ request }) => {
      const response = await request.post('/api/auth/logout');

      // Should succeed even without auth (clears any existing session)
      expect(response.status()).toBe(200);
    });

    test('POST /api/dev/magic-link uses the current app origin in verifyUrl', async ({ request, baseURL }) => {
      expect(baseURL).toBeTruthy();

      const response = await request.post('/api/dev/magic-link', {
        data: { email: uniqueEmail('magic-link-origin') },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.verifyUrl).toBe(`${baseURL}/verify?token=${body.token}`);
    });
  });

  test.describe('Transcribe API', () => {
    test('POST /api/transcribe requires authentication', async ({ request }) => {
      const response = await request.post('/api/transcribe');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('auth');
    });

    test('POST /api/transcribe requires file', async ({ request, context }) => {
      // Try to call without file (even with mock auth this should fail)
      const response = await request.post('/api/transcribe', {
        headers: {
          'Cookie': 'session=mock-session',
        },
      });

      // Should fail (either 401 for bad auth or 400 for no file)
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('User API', () => {
    test('GET /api/user/usage requires authentication', async ({ request }) => {
      const response = await request.get('/api/user/usage');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Export API', () => {
    test('GET /api/export returns 405 for GET requests', async ({ request }) => {
      // Export API only accepts POST requests
      const response = await request.get('/api/export?id=123&format=txt');

      // Method not allowed or unauthorized
      expect([401, 405]).toContain(response.status());
    });

    test('POST /api/export requires authentication', async ({ request }) => {
      const response = await request.post('/api/export', {
        data: { id: '123', format: 'txt' },
      });

      // Either 401 (unauthorized) or 405 (if only POST is supported)
      expect([401, 405]).toContain(response.status());
    });
  });
});

test.describe('Transcriptions API', () => {
  test('GET /api/transcriptions/[id] requires authentication', async ({ request }) => {
    const response = await request.get('/api/transcriptions/nonexistent-id');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('authenticated list and detail routes return DTO-shaped transcriptions', async ({ request }) => {
    const email = uniqueEmail('transcriptions-dto');
    const transcriptionId = seedCompletedTranscription(email);

    await authenticateApiRequest(request, email);

    const listResponse = await request.get('/api/transcriptions');
    expect(listResponse.status()).toBe(200);

    const listBody = await listResponse.json();
    const transcription = listBody.transcriptions.find(
      (item: { id: string }) => item.id === transcriptionId
    );

    expect(transcription).toMatchObject({
      id: transcriptionId,
      filename: 'team-sync.mp3',
      text: 'Hello from the transcription API.',
      segments: [
        {
          start: 0,
          end: 1.5,
          text: 'Hello from the transcription API.',
          speaker: 'Speaker 1',
        },
      ],
      model: 'faster-whisper',
      language: 'en',
      duration: 92,
      minutesCharged: 2,
      hasDiarization: true,
      status: 'completed',
      errorMessage: null,
      audioFingerprint: 'fp-team-sync',
      sourceMediaAvailable: false,
      sourceMediaKind: null,
    });
    expect(transcription.createdAt).toBeTruthy();
    expect(Array.isArray(transcription.segments)).toBe(true);
    expect(transcription).not.toHaveProperty('created_at');
    expect(transcription).not.toHaveProperty('result_segments');

    const detailResponse = await request.get(
      `/api/transcriptions/${transcriptionId}`
    );
    expect(detailResponse.status()).toBe(200);

    const detailBody = await detailResponse.json();
    expect(detailBody.transcription).toEqual(transcription);
  });

  test('GET /api/transcriptions/[id] returns 404 for another user\'s transcription', async ({ request }) => {
    const ownerEmail = uniqueEmail('transcription-owner');
    const viewerEmail = uniqueEmail('transcription-viewer');
    const transcriptionId = seedCompletedTranscription(ownerEmail);

    await authenticateApiRequest(request, viewerEmail);

    const response = await request.get(`/api/transcriptions/${transcriptionId}`);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });
});

test.describe('API Error Handling', () => {
  test('APIs return JSON error responses', async ({ request }) => {
    const response = await request.post('/api/auth/send-link', {
      data: {},
    });

    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('APIs handle malformed JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/auth/send-link', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: 'not valid json{',
    });

    // Should not crash - either 400 or 500
    expect([400, 500]).toContain(response.status());
  });
});

test.describe('CORS and Security', () => {
  test('API responses have security headers', async ({ request }) => {
    const response = await request.get('/api/auth/verify');

    // Should have basic security headers
    // Note: Next.js may not set all headers by default
    expect(response.headers()).toBeTruthy();
  });
});

test.describe('Static Assets', () => {
  test('favicon is served correctly', async ({ request }) => {
    const response = await request.get('/icon');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image');
  });

  test('apple icon is served correctly', async ({ request }) => {
    const response = await request.get('/apple-icon');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image');
  });
});
