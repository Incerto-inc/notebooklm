'use client';

import { useCallback, useState } from 'react';

interface Props {
  onFileUpload: (file: File) => void;
  onNewFile: (content: string) => void;
  onClose: () => void;
  mode: 'style' | 'sources';
}

export function FileUploadZone({ onFileUpload, onNewFile, onClose, mode }: Props) {
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileContent, setNewFileContent] = useState('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileUpload(file);
      onClose();
    }
  }, [onFileUpload, onClose]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      onClose();
    }
  };

  const handleCreateNewFile = () => {
    if (newFileContent.trim()) {
      onNewFile(newFileContent);
      onClose();
    }
  };

  if (showNewFile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
          <h2 className="text-lg font-semibold mb-4">
            {mode === 'style' ? '新しいスタイルファイルを作成' : '新しいソースファイルを作成'}
          </h2>
          <textarea
            value={newFileContent}
            onChange={(e) => setNewFileContent(e.target.value)}
            placeholder="ここにMarkdown形式でテキストを入力..."
            className="flex-1 min-h-[400px] border rounded p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            autoFocus
          />
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => {
                setShowNewFile(false);
                setNewFileContent('');
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
            >
              戻る
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateNewFile}
                disabled={!newFileContent.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">
          {mode === 'style' ? 'スタイルファイルを追加' : 'ソースファイルを追加'}
        </h2>

        {/* 新規ファイル作成ボタン */}
        <button
          onClick={() => setShowNewFile(true)}
          className="w-full border-2 border-dashed border-blue-500 rounded-lg p-4 text-center hover:bg-blue-50 transition-colors mb-4"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-blue-600">新しいファイルを作成</span>
          </div>
        </button>

        <div className="text-center text-xs text-gray-400 mb-4">または</div>

        {/* ファイルアップロードエリア */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        >
          <input
            type="file"
            onChange={handleFileInput}
            accept=".pdf,.md,.txt"
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">
              ファイルをドラッグ&ドロップ または クリックして選択
            </p>
            <p className="text-xs text-gray-400 mt-2">
              PDF, Markdown, テキストファイル対応
            </p>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
