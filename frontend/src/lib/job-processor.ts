import { createClient } from './supabase/server';
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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const CHAT_MODEL = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';
const VIDEO_MODEL = process.env.OPENROUTER_MODEL_VIDEO || 'google/gemini-2.5-flash';
const SCENARIO_MODEL = process.env.OPENROUTER_MODEL_SCENARIO || 'google/gemini-2.5-flash';

const JOB_TIMEOUT = 5 * 60 * 1000; // 5分

export async function processJobAsync(jobId: string) {
  const supabase = await createClient(); // 1回だけ呼び出し

  const timeoutId = setTimeout(async () => {
    await handleJobTimeout(supabase, jobId);
  }, JOB_TIMEOUT);

  try {
    await updateJobStatus(supabase, jobId, 'PROCESSING');
    await executeAIProcessing(supabase, jobId);
    await updateJobStatus(supabase, jobId, 'COMPLETED');
  } catch (error: unknown) {
    await handleJobError(supabase, jobId, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeAIProcessing(supabase: SupabaseClient, jobId: string) {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) throw new Error('Job not found');

  const input = job.input as unknown;

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

// ジョブステータス更新
async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  error?: string
) {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === 'PROCESSING') {
    updateData.startedAt = new Date().toISOString();
  } else if (status === 'COMPLETED' || status === 'FAILED') {
    updateData.completedAt = new Date().toISOString();
  }

  if (error) {
    updateData.error = error;
  }

  await supabase.from('jobs').update(updateData).eq('id', jobId);
}

// タイムアウト処理
async function handleJobTimeout(supabase: SupabaseClient, jobId: string) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (job && job.status === 'PROCESSING') {
    await updateJobStatus(supabase, jobId, 'FAILED', 'Job timeout');
  }
}

async function handleJobError(
  supabase: SupabaseClient,
  jobId: string,
  error: unknown
) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job) return;

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // リトライ可能か判定
  if (isRetryableError(error) && job.retryCount < job.maxRetries) {
    const delay = Math.min(1000 * Math.pow(2, job.retryCount), 30000);

    await supabase
      .from('jobs')
      .update({
        status: 'PENDING',
        retryCount: job.retryCount + 1,
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', jobId);

    setTimeout(() => processJobAsync(jobId), delay);
  } else {
    // 永続的エラーまたはリトライ回数超過
    await supabase
      .from('jobs')
      .update({
        status: 'FAILED',
        error: errorMessage,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error) && !isJobError(error)) {
    return false;
  }

  const errorMessage = error instanceof Error ? error.message : error.message;
  const errorCode = isJobError(error) ? error.code : undefined;
  const errorStatus = isJobError(error) ? error.status : undefined;

  if (errorCode === 'NETWORK_TIMEOUT') return true;
  if (errorStatus && errorStatus >= 500 && errorStatus < 600) return true;
  if (errorMessage?.includes('ECONNRESET')) return true;
  if (errorMessage?.includes('ETIMEDOUT')) return true;
  return false;
}

function isJobError(error: unknown): error is JobError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
