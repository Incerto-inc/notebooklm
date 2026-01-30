import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/sources - すべてのソースを取得
export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { createdAtDateTime: 'desc' },
    });
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

// POST /api/sources - 新しいソースを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source = await prisma.source.create({
      data: body,
    });
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}

// PUT /api/sources - ソースを更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const source = await prisma.source.update({
      where: { id },
      data,
    });
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

// DELETE /api/sources - ソースを削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await prisma.source.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
