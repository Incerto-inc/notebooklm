export interface Source {
  id: string;
  name: string;
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
