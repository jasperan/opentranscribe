import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getTranscriptionById } from '@/lib/db/transcriptions';

interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

function formatSRT(segments: Segment[]): string {
  return segments
    .map((segment, index) => {
      const startTime = formatSRTTime(segment.start);
      const endTime = formatSRTTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

function formatVTT(segments: Segment[]): string {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((segment) => {
      const startTime = formatVTTTime(segment.start);
      const endTime = formatVTTTime(segment.end);
      return `${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
  return header + body;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
}

function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, '0');
}

function formatMarkdown(
  text: string,
  segments: Segment[],
  metadata: Record<string, unknown>
): string {
  let md = `# Transcription\n\n`;
  md += `**Model:** ${metadata.model || 'Unknown'}\n`;
  md += `**Language:** ${metadata.language || 'Unknown'}\n`;
  md += `**Duration:** ${metadata.duration || 0} seconds\n\n`;
  md += `---\n\n`;
  md += `## Full Text\n\n${text}\n\n`;

  if (segments.length > 0) {
    md += `## Timestamped Segments\n\n`;
    segments.forEach((segment) => {
      const time = formatVTTTime(segment.start);
      const speaker = segment.speaker ? `**${segment.speaker}:** ` : '';
      md += `- \`${time}\` ${speaker}${segment.text}\n`;
    });
  }

  return md;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { transcriptionId, format } = body;

    if (!transcriptionId || !format) {
      return NextResponse.json(
        { error: 'transcriptionId and format are required' },
        { status: 400 }
      );
    }

    const transcription = getTranscriptionById(transcriptionId);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    if (transcription.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (transcription.status !== 'completed' || !transcription.result_text) {
      return NextResponse.json(
        { error: 'Transcription not ready for export' },
        { status: 400 }
      );
    }

    const text = transcription.result_text;
    const segments: Segment[] = transcription.result_segments
      ? JSON.parse(transcription.result_segments)
      : [];

    let content: string;
    let contentType: string;
    let extension: string;

    switch (format) {
      case 'txt':
        content = text;
        contentType = 'text/plain';
        extension = 'txt';
        break;

      case 'srt':
        content = formatSRT(segments);
        contentType = 'application/x-subrip';
        extension = 'srt';
        break;

      case 'vtt':
        content = formatVTT(segments);
        contentType = 'text/vtt';
        extension = 'vtt';
        break;

      case 'json':
        content = JSON.stringify(
          {
            id: transcription.id,
            text,
            segments,
            model: transcription.model_used,
            language: transcription.language,
            duration: transcription.duration_seconds,
            created_at: transcription.created_at,
          },
          null,
          2
        );
        contentType = 'application/json';
        extension = 'json';
        break;

      case 'md':
        content = formatMarkdown(text, segments, {
          model: transcription.model_used,
          language: transcription.language,
          duration: transcription.duration_seconds,
        });
        contentType = 'text/markdown';
        extension = 'md';
        break;

      case 'docx':
        // For DOCX, we return a simple text format
        // Full DOCX generation would require a library like docx
        content = `Transcription\n\nModel: ${transcription.model_used}\nLanguage: ${transcription.language}\nDuration: ${transcription.duration_seconds} seconds\n\n---\n\n${text}`;
        contentType = 'text/plain';
        extension = 'txt';
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="transcription.${extension}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
