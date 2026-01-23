import { NextRequest, NextResponse } from 'next/server';
import { generateScenario } from '@/lib/openrouter';

interface Source {
  name: string;
  content: string;
  selected: boolean;
}

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { styles, sources, chatHistory } = await request.json();

    const styleContents = styles
      .filter((s: Source) => s.selected)
      .map((s: Source) => `# ${s.name}\n${s.content}`);

    const sourceContents = sources
      .filter((s: Source) => s.selected)
      .map((s: Source) => `# ${s.name}\n${s.content}`);

    const chatText = chatHistory
      .map((m: ChatMessage) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const scenario = await generateScenario(styleContents, sourceContents, chatText);

    return NextResponse.json({ success: true, scenario });
  } catch (error) {
    console.error('Scenario generation error:', error);
    return NextResponse.json({ error: 'Failed to generate scenario' }, { status: 500 });
  }
}
