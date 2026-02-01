import { OpenRouter } from '@openrouter/sdk';
import { chatPrompts, analyzePrompts, scenarioPrompts } from './prompts';

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

// 環境変数からモデルを取得（デフォルト値を設定）
const CHAT_MODEL = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';
const VIDEO_MODEL = process.env.OPENROUTER_MODEL_VIDEO || 'google/gemini-2.5-flash';
const SCENARIO_MODEL = process.env.OPENROUTER_MODEL_SCENARIO || 'google/gemini-2.5-flash';

// ストリーミングチャット関数
export async function sendChatMessageStream(
  messages: Array<{role: string; content: string}>,
  contextSources: string[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const systemPrompt = chatPrompts.system(contextSources);

  const stream = await openRouter.chat.send({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      onChunk(content);
    }
  }
}

export async function analyzeVideo(
  videoUrl: string,
  mode: 'style' | 'source'
): Promise<string> {
  const prompt = mode === 'style' ? analyzePrompts.style : analyzePrompts.source;

  const result = await openRouter.chat.send({
    model: VIDEO_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'video_url', videoUrl: { url: videoUrl } },
        ],
      },
    ],
    stream: false,
  });

  return (result.choices[0]?.message?.content as string) || '';
}

export async function sendChatMessage(
  messages: Array<{role: string; content: string}>,
  contextSources: string[]
): Promise<string> {
  const systemPrompt = chatPrompts.system(contextSources);

  const result = await openRouter.chat.send({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    stream: false,
  });

  return (result.choices[0]?.message?.content as string) || '';
}

/**
 * シナリオ生成（2段階思考プロセス）
 * 1. 草案生成 → 2. 改善・洗練
 */
export async function generateScenario(
  styles: string[],
  sources: string[],
  chatHistory: string
): Promise<string> {
  // 1回目：草案生成
  const draftPrompt = scenarioPrompts.generateDraft(styles, sources, chatHistory);

  const draftResult = await openRouter.chat.send({
    model: SCENARIO_MODEL,
    messages: [{ role: 'user', content: draftPrompt }],
    stream: false,
  });

  const draftScenario = (draftResult.choices[0]?.message?.content as string) || '';

  // 2回目：改善・洗練（1回目の結果をコンテキストに含める）
  const refinePrompt = scenarioPrompts.refineScenario(
    styles,
    sources,
    chatHistory,
    draftScenario
  );

  const finalResult = await openRouter.chat.send({
    model: SCENARIO_MODEL,
    messages: [{ role: 'user', content: refinePrompt }],
    stream: false,
  });

  return (finalResult.choices[0]?.message?.content as string) || '';
}
