import { NextRequest } from 'next/server';
import { sendChatMessageStream } from '@/lib/openrouter';

interface Source {
  name: string;
  content: string;
  selected: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, sources } = await request.json();

    const contextSources = sources
      .filter((s: Source) => s.selected)
      .map((s: Source) => `# ${s.name}\n${s.content}`);

    // ストリーミングレスポンスを作成
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await sendChatMessageStream(messages, contextSources, (chunk) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
