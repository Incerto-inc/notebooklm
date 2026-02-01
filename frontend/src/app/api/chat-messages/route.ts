import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/chat-messages - すべてのチャットメッセージを取得
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
}

// POST /api/chat-messages - 新しいチャットメッセージを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json({ error: 'Failed to create chat message' }, { status: 500 });
  }
}

// DELETE /api/chat-messages - すべてのチャットメッセージを削除
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // すべて削除（ダミー条件）

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    return NextResponse.json({ error: 'Failed to delete chat messages' }, { status: 500 });
  }
}
