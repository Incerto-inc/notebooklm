# OpenRouter Video Inputs

OpenRouter APIを使用して動画ファイルをモデルに送信する方法についてのドキュメント。

## 概要

OpenRouterは、互換性のあるモデルに対してAPIを通じて動画ファイルを送信することをサポートしている。動画入力を処理できるのは、動画処理機能を持つモデルのみ。

## 動画の送信方法

OpenRouterは2種類の動画送信方法をサポート：

| 方法 | 説明 | 用途 |
|------|------|------|
| **URL** | 公開されている動画のURLを直接指定 | 公開動画（エンコード不要で効率的） |
| **Base64データURL** | ローカルファイルをBase64エンコード | ローカルファイルや非公開動画 |

### 重要な注意事項

- **APIのみ対応**: 現時点では動画入力はAPIからのみ利用可能。OpenRouterチャットルームインターフェースでは動画アップロードは未対応
- **プロバイダーによる制限**: 動画URL対応はプロバイダーによって異なる

## API使用方法

エンドポイント: `/api/v1/chat/completions`

コンテンツタイプ: `video_url`

### URL方式（TypeScript SDK）

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: 'YOUR_API_KEY',
});

const result = await openRouter.chat.send({
  model: "google/gemini-2.5-flash",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "この動画で何が起きているか説明してください。",
        },
        {
          type: "video_url",
          videoUrl: {
            url: "https://www.youtube.com/watch?v=VIDEO_ID",
          },
        },
      ],
    },
  ],
  stream: false,
});

console.log(result);
```

### URL方式（Python）

```python
import requests
import json

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "この動画で何が起きているか説明してください。"
            },
            {
                "type": "video_url",
                "video_url": {
                    "url": "https://www.youtube.com/watch?v=VIDEO_ID"
                }
            }
        ]
    }
]

payload = {
    "model": "google/gemini-2.5-flash",
    "messages": messages
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())
```

### Base64方式（Python）

```python
import requests
import base64

def encode_video_to_base64(video_path):
    with open(video_path, "rb") as video_file:
        return base64.b64encode(video_file.read()).decode('utf-8')

# 動画をエンコード
video_path = "path/to/your/video.mp4"
base64_video = encode_video_to_base64(video_path)
data_url = f"data:video/mp4;base64,{base64_video}"

messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "この動画には何が映っていますか？"
            },
            {
                "type": "video_url",
                "video_url": {
                    "url": data_url
                }
            }
        ]
    }
]

payload = {
    "model": "google/gemini-2.5-flash",
    "messages": messages
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())
```

### Base64方式（TypeScript）

```typescript
import { OpenRouter } from '@openrouter/sdk';
import * as fs from 'fs';

const openRouter = new OpenRouter({
  apiKey: 'YOUR_API_KEY',
});

async function encodeVideoToBase64(videoPath: string): Promise<string> {
  const videoBuffer = await fs.promises.readFile(videoPath);
  const base64Video = videoBuffer.toString('base64');
  return `data:video/mp4;base64,${base64Video}`;
}

const videoPath = 'path/to/your/video.mp4';
const base64Video = await encodeVideoToBase64(videoPath);

const result = await openRouter.chat.send({
  model: 'google/gemini-2.5-flash',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: "この動画には何が映っていますか？",
        },
        {
          type: 'video_url',
          videoUrl: {
            url: base64Video,
          },
        },
      ],
    },
  ],
  stream: false,
});

console.log(result);
```

## サポートされている動画フォーマット

- `video/mp4`
- `video/mpeg`
- `video/mov`
- `video/webm`

## プロバイダー別の動画URL対応状況

| プロバイダー | 動画URL対応 | 備考 |
|-------------|-------------|------|
| Google Gemini (AI Studio) | YouTubeリンクのみ | `https://www.youtube.com/watch?v=...`形式のみ |
| Google Gemini (Vertex AI) | 非対応 | Base64データURLを使用する必要あり |
| その他 | 要確認 | モデル固有のドキュメントを参照 |

## ユースケース

- **動画要約**: 動画コンテンツのテキスト要約を生成
- **オブジェクト・動作認識**: 動画内の物体、人物、アクションを識別
- **シーン理解**: 設定、環境、コンテキストの説明
- **スポーツ分析**: ゲームプレイ、動き、戦術の分析
- **監視**: セキュリティ映像の監視・分析
- **教育コンテンツ**: 教材動画の分析とインサイト提供

## ベストプラクティス

### ファイルサイズに関する考慮事項

- **動画を圧縮**: 品質を大きく損なわずにファイルサイズを削減
- **動画をトリミング**: 関連するセグメントのみを含める
- **解像度の検討**: 低解像度（例：4Kより720p）でもほとんどの分析タスクには十分
- **フレームレート**: 高い時間的解像度が不要な動画では、低いフレームレートでファイルサイズ削減可能

### 最適な動画の長さ

- モデルによって動画の最大長が異なる
- 長い動画は短いセグメントに分割を検討
- 長時間コンテンツ全体ではなく、重要な瞬間に焦点を当てる

### 品質とサイズのトレードオフ

| 品質レベル | 解像度・ビットレート | 適した用途 |
|-----------|---------------------|-----------|
| 高品質 | 1080p以上、高ビットレート | 詳細な視覚分析、物体検出、テキスト認識 |
| 中品質 | 720p、中程度のビットレート | 一般的な分析タスク |
| 低品質 | 480p、低ビットレート | 基本的なシーン理解、動作認識 |

## トラブルシューティング

### 動画が処理されない場合

1. モデルが動画入力をサポートしているか確認（`input_modalities`に`"video"`が含まれているか）
2. 動画URLを使用している場合、プロバイダーが動画URLをサポートしているか確認
3. Gemini (AI Studio)の場合、YouTubeリンクを使用しているか確認
4. 動画URLが機能しない場合、Base64データURLを試す
5. 動画フォーマットがサポートされているか確認
6. 動画ファイルが破損していないか確認

### 大きなファイルでエラーが発生する場合

1. 動画を圧縮してファイルサイズを削減
2. 動画の解像度やフレームレートを下げる
3. 動画を短くトリミング
4. モデル固有のファイルサイズ制限を確認
5. 大きなファイルの場合、Base64エンコードの代わりに動画URL（プロバイダーがサポートしている場合）の使用を検討

### 分析結果が良くない場合

1. 動画品質がタスクに十分か確認
2. 何を分析すべきか明確で具体的なプロンプトを提供
3. 動画の長さがモデルに適切か確認
4. 動画コンテンツがはっきり見えて、十分に明るいか確認

## 参考リンク

- [OpenRouter Models（動画対応モデルのフィルタリング可能）](https://openrouter.ai/models?fmt=cards&input_modalities=video)
- [OpenRouter公式ドキュメント](https://openrouter.ai/docs/guides/overview/multimodal/videos)
