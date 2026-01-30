import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processJobAsync } from '@/lib/job-processor';

// GET /api/jobs - ジョブ一覧取得（statusフィルター対応）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status: status as any } : {};

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, input } = await request.json();

    if (!type || !input) {
      return NextResponse.json(
        { error: 'type and input are required' },
        { status: 400 }
      );
    }

    // ジョブ作成（status=PENDING）
    const job = await prisma.job.create({
      data: {
        type,
        status: 'PENDING',
        input,
      },
    });

    // バックグラウンドで非同期実行（レスポンス送信後）
    processJobAsync(job.id).catch(console.error);

    // 即座にjobIdを返却
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
