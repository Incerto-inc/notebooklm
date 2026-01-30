import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/chat-messages - すべてのチャットメッセージを取得
export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
}

// POST /api/chat-messages - 新しいチャットメッセージを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = await prisma.chatMessage.create({
      data: body,
    });
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json({ error: 'Failed to create chat message' }, { status: 500 });
  }
}

// DELETE /api/chat-messages - すべてのチャットメッセージを削除
export async function DELETE() {
  try {
    await prisma.chatMessage.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    return NextResponse.json({ error: 'Failed to delete chat messages' }, { status: 500 });
  }
}
