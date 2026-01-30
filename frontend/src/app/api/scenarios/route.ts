import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/scenarios - すべてのシナリオを取得
export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      orderBy: { createdAtDateTime: 'desc' },
    });
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

// POST /api/scenarios - 新しいシナリオを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scenario = await prisma.scenario.create({
      data: body,
    });
    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}

// PUT /api/scenarios - シナリオを更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const scenario = await prisma.scenario.update({
      where: { id },
      data,
    });
    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
  }
}

// DELETE /api/scenarios - シナリオを削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await prisma.scenario.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
  }
}
