import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processJobAsync } from '@/lib/job-processor';

// GET /api/jobs - ジョブ一覧取得（statusフィルター対応）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const supabase = await createClient();
    let query = supabase
      .from('jobs')
      .select('*')
      .order('createdAt', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
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
    const supabase = await createClient();
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        type,
        status: 'PENDING',
        input,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

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
