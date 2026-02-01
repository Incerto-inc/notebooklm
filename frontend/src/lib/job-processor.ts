import { prisma } from './prisma';
import { OpenRouter } from '@openrouter/sdk';
import type { ChatGenerationParamsPluginFileParser } from '@openrouter/sdk/models';
import type { AnalyzeVideoInput, AnalyzeFileInput, GenerateScenarioInput, JobError } from './types';
import { isAnalyzeVideoInput, isAnalyzeFileInput, isGenerateScenarioInput } from './types';
import { scenarioPrompts } from './prompts';

// OpenRouter SDKに含まれていないファイルコンテンツ型を拡張
type FileContentItem = {
  type: 'file';
  file: {
    filename: string;
    fileData: string;
  };
};

type ExtendedMessageContent = Array<
  { type: 'text'; text: string } | FileContentItem
>;

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const CHAT_MODEL = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';
const VIDEO_MODEL = process.env.OPENROUTER_MODEL_VIDEO || 'google/gemini-2.5-flash';
const SCENARIO_MODEL = process.env.OPENROUTER_MODEL_SCENARIO || 'google/gemini-2.5-flash';

const JOB_TIMEOUT = 5 * 60 * 1000; // 5分

export async function processJobAsync(jobId: string) {
  // タイムアウト設定
  const timeoutId = setTimeout(async () => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (job && job.status === 'PROCESSING') {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: 'Job timeout',
          completedAt: new Date(),
        },
      });
    }
  }, JOB_TIMEOUT);

  try {
    // ステータスをPROCESSINGに更新
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // AI処理実行
    const result = await executeAIProcessing(jobId);

    // 完了
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        result,
        completedAt: new Date(),
      },
    });
  } catch (error: any) {
    // エラーハンドリング（リトライ or 失敗）
    await handleJobError(jobId, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeAIProcessing(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');

  const input = job.input;

  switch (job.type) {
    case 'ANALYZE_VIDEO':
      if (!isAnalyzeVideoInput(input)) {
        throw new Error('Invalid input for ANALYZE_VIDEO');
      }
      return await processAnalyzeVideo(input);
    case 'ANALYZE_FILE':
      if (!isAnalyzeFileInput(input)) {
        throw new Error('Invalid input for ANALYZE_FILE');
      }
      return await processAnalyzeFile(input);
    case 'GENERATE_SCENARIO':
      if (!isGenerateScenarioInput(input)) {
        throw new Error('Invalid input for GENERATE_SCENARIO');
      }
      return await processGenerateScenario(input);
    default:
      throw new Error('Unknown job type');
  }
}

async function processAnalyzeVideo(input: AnalyzeVideoInput) {
  const { url, mode } = input;
  const prompt = mode === 'style'
    ? `このYouTuber動画のスタイルを分析してください。編集テクニック、話し方、雰囲気、構成を日本語でMarkdown形式で抽出してください。`
    : `この動画の内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。`;

  const result = await openRouter.chat.send({
    model: VIDEO_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'video_url', videoUrl: { url } },
        ],
      },
    ],
    stream: false,
  });

  const content = (result.choices[0]?.message?.content as string) || '';
  return { content };
}

async function processAnalyzeFile(input: AnalyzeFileInput) {
  // PDFファイルの場合（base64エンコード）
  if (input.fileData && input.fileType === 'application/pdf') {
    const prompt = input.mode === 'style'
      ? `このPDFドキュメントのスタイルを分析してください。構成、トーン、フォーマット、重要なポイントを日本語でMarkdown形式で抽出してください。`
      : `このPDFドキュメントの内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。`;

    const content: ExtendedMessageContent = [
      { type: 'text', text: prompt },
      {
        type: 'file',
        file: {
          filename: input.filename || 'document.pdf',
          fileData: input.fileData,
        },
      },
    ];

    const fileParserPlugin: ChatGenerationParamsPluginFileParser = {
      id: 'file-parser',
      pdf: {
        engine: 'pdf-text',
      },
    };

    // OpenRouter SDKはファイル型を正式サポートしていないため型変換
    const result = await openRouter.chat.send({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: content as never, // TODO: SDKがファイル型をサポートしたら削除
        },
      ],
      stream: false,
      plugins: [fileParserPlugin],
    });

    const responseContent = (result.choices[0]?.message?.content as string) || '';
    return { content: responseContent };
  }

  // テキストファイルの場合
  if (input.content) {
    const prompt = input.mode === 'style'
      ? `以下のドキュメントのスタイルを分析してください。構成、トーン、フォーマット、重要なポイントを日本語でMarkdown形式で抽出してください。\n\n${input.content}`
      : `以下のドキュメントの内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。\n\n${input.content}`;

    const result = await openRouter.chat.send({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    const content = (result.choices[0]?.message?.content as string) || '';
    return { content };
  }

  throw new Error('Invalid file input');
}

async function processGenerateScenario(input: GenerateScenarioInput) {
  const { styles, sources, chatHistory } = input;

  const styleContents = styles
    .filter((s) => s.selected)
    .map((s) => `# ${s.name}\n${s.content}`);

  const sourceContents = sources
    .filter((s) => s.selected)
    .map((s) => `# ${s.name}\n${s.content}`);

  const chatText = chatHistory
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n');

  // 1回目：草案生成
  const draftPrompt = scenarioPrompts.generateDraft(
    styleContents,
    sourceContents,
    chatText
  );

  const draftResult = await openRouter.chat.send({
    model: SCENARIO_MODEL,
    messages: [{ role: 'user', content: draftPrompt }],
    stream: false,
  });

  const draftScenario = (draftResult.choices[0]?.message?.content as string) || '';

  // 2回目：改善・洗練（1回目の結果をコンテキストに含める）
  const refinePrompt = scenarioPrompts.refineScenario(
    styleContents,
    sourceContents,
    chatText,
    draftScenario
  );

  const finalResult = await openRouter.chat.send({
    model: SCENARIO_MODEL,
    messages: [{ role: 'user', content: refinePrompt }],
    stream: false,
  });

  const scenario = (finalResult.choices[0]?.message?.content as string) || '';
  return { scenario };
}

async function handleJobError(jobId: string, error: JobError | Error) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  // リトライ可能か判定
  if (isRetryableError(error) && job.retryCount < job.maxRetries) {
    const delay = Math.min(1000 * Math.pow(2, job.retryCount), 30000);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        error: error.message,
      },
    });

    setTimeout(() => processJobAsync(jobId), delay);
  } else {
    // 永続的エラーまたはリトライ回数超過
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: error.message,
        completedAt: new Date(),
      },
    });
  }
}

function isRetryableError(error: JobError | Error): boolean {
  const errorMessage = error instanceof Error ? error.message : error.message;
  const errorCode = 'code' in error ? error.code : undefined;
  const errorStatus = 'status' in error ? error.status : undefined;

  if (errorCode === 'NETWORK_TIMEOUT') return true;
  if (errorStatus && errorStatus >= 500 && errorStatus < 600) return true;
  if (errorMessage?.includes('ECONNRESET')) return true;
  if (errorMessage?.includes('ETIMEDOUT')) return true;
  return false;
}
