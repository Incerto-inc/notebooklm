'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (url: string) => void;
  mode: 'style' | 'sources';
}

export function VideoUploadDialog({ onClose, onSubmit, mode }: Props) {
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (url) {
      onSubmit(url);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">
          {mode === 'style' ? 'スタイルを追加' : 'ソースを追加'}
        </h2>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url) {
              handleSubmit();
            }
          }}
          placeholder="YouTube動画のURLを入力..."
          className="w-full border rounded px-3 py-2 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
