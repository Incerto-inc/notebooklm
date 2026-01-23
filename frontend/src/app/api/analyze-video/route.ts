import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideo } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
  try {
    const { url, mode } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const analysisResult = await analyzeVideo(url, mode);

    return NextResponse.json({ success: true, content: analysisResult });
  } catch (error) {
    console.error('Video analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze video' }, { status: 500 });
  }
}
