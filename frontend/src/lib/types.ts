export interface Source {
  id: string;
  title: string; // タイトル
  type: string;
  selected: boolean;
  content: string;
  createdAt: string;
  videoUrl?: string; // YouTube動画URL（オプション）
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// Job Processor Types
export interface AnalyzeVideoInput {
  url: string;
  mode: 'style' | 'sources';
}

export interface AnalyzeFileInput {
  content?: string;
  fileData?: string;
  fileType?: string;
  filename?: string;
  mode: 'style' | 'sources';
}

export interface GenerateScenarioInput {
  styles: Array<{ name: string; content: string; selected: boolean }>;
  sources: Array<{ name: string; content: string; selected: boolean }>;
  chatHistory: ChatMessage[];
}

export interface JobError {
  message: string;
  code?: string;
  status?: number;
}

// Type Guards for Job Input Validation
export function isAnalyzeVideoInput(input: unknown): input is AnalyzeVideoInput {
  if (!input || typeof input !== 'object') return false;
  return 'url' in input && 'mode' in input;
}

export function isAnalyzeFileInput(input: unknown): input is AnalyzeFileInput {
  if (!input || typeof input !== 'object') return false;
  return 'mode' in input;
}

export function isGenerateScenarioInput(input: unknown): input is GenerateScenarioInput {
  if (!input || typeof input !== 'object') return false;
  return 'styles' in input && 'sources' in input && 'chatHistory' in input;
}
