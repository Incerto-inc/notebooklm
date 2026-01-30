import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/styles - すべてのスタイルを取得
export async function GET() {
  try {
    const styles = await prisma.style.findMany({
      orderBy: { createdAtDateTime: 'desc' },
    });
    return NextResponse.json(styles);
  } catch (error) {
    console.error('Error fetching styles:', error);
    return NextResponse.json({ error: 'Failed to fetch styles' }, { status: 500 });
  }
}

// POST /api/styles - 新しいスタイルを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const style = await prisma.style.create({
      data: body,
    });
    return NextResponse.json(style);
  } catch (error) {
    console.error('Error creating style:', error);
    return NextResponse.json({ error: 'Failed to create style' }, { status: 500 });
  }
}

// PUT /api/styles - スタイルを更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const style = await prisma.style.update({
      where: { id },
      data,
    });
    return NextResponse.json(style);
  } catch (error) {
    console.error('Error updating style:', error);
    return NextResponse.json({ error: 'Failed to update style' }, { status: 500 });
  }
}

// DELETE /api/styles - スタイルを削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await prisma.style.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting style:', error);
    return NextResponse.json({ error: 'Failed to delete style' }, { status: 500 });
  }
}
