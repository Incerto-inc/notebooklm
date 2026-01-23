# OpenRouter Tool & Function Calling ガイド

OpenRouterを使用したツール呼び出し（関数呼び出し）の包括的なガイド。

## 概要

ツールコール（関数呼び出し）は、LLMに外部ツールへのアクセスを提供する機能です。LLMはツールを直接呼び出すのではなく、呼び出すべきツールを**提案**します。ユーザー（開発者）がツールを別途呼び出し、結果をLLMに返すことで、LLMが最終的な回答をフォーマットします。

OpenRouterは、モデルやプロバイダー間でツール呼び出しインターフェースを標準化しており、サポートされている任意のモデルと外部ツールを簡単に統合できます。

**対応モデル**: [openrouter.ai/models?supported_parameters=tools](https://openrouter.ai/models?supported_parameters=tools) でツール呼び出しをサポートするモデルを確認できます。

---

## 基本的なフロー（3ステップ）

### ステップ1: ツール付き推論リクエスト

```json
{
  "model": "google/gemini-3-flash-preview",
  "messages": [
    {
      "role": "user",
      "content": "What are the titles of some James Joyce books?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_gutenberg_books",
        "description": "Search for books in the Project Gutenberg library",
        "parameters": {
          "type": "object",
          "properties": {
            "search_terms": {
              "type": "array",
              "items": {"type": "string"},
              "description": "List of search terms to find books"
            }
          },
          "required": ["search_terms"]
        }
      }
    }
  ]
}
```

### ステップ2: ツール実行（クライアント側）

モデルが `tool_calls` を含むレスポンスを返したら、リクエストされたツールをローカルで実行します：

```javascript
// モデルがtool_callsで応答後、ローカルでツールを実行
const toolResult = await searchGutenbergBooks(["James", "Joyce"]);
```

### ステップ3: ツール結果を含む推論リクエスト

```json
{
  "model": "google/gemini-3-flash-preview",
  "messages": [
    {
      "role": "user",
      "content": "What are the titles of some James Joyce books?"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "search_gutenberg_books",
            "arguments": "{\"search_terms\": [\"James\", \"Joyce\"]}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "[{\"id\": 4300, \"title\": \"Ulysses\", \"authors\": [{\"name\": \"Joyce, James\"}]}]"
    }
  ],
  "tools": [
    // 同じツール定義を再度含める（必須）
  ]
}
```

> **注意**: `tools` パラメータは各リクエスト（ステップ1と3）に含める必要があります。

---

## 実装例

### Python実装

```python
import json, requests
from openai import OpenAI

OPENROUTER_API_KEY = "your-api-key"
MODEL = "google/gemini-3-flash-preview"

openai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# ツール関数の定義
def search_gutenberg_books(search_terms):
    search_query = " ".join(search_terms)
    url = "https://gutendex.com/books"
    response = requests.get(url, params={"search": search_query})

    simplified_results = []
    for book in response.json().get("results", []):
        simplified_results.append({
            "id": book.get("id"),
            "title": book.get("title"),
            "authors": book.get("authors")
        })
    return simplified_results

# ツール仕様の定義
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_gutenberg_books",
            "description": "Search for books in the Project Gutenberg library",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_terms": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of search terms"
                    }
                },
                "required": ["search_terms"]
            }
        }
    }
]

TOOL_MAPPING = {
    "search_gutenberg_books": search_gutenberg_books
}

# メッセージの初期化
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What are the titles of some James Joyce books?"}
]

# 最初のAPI呼び出し
response_1 = openai_client.chat.completions.create(
    model=MODEL,
    tools=tools,
    messages=messages
).choices[0].message

# レスポンスをメッセージに追加
messages.append(response_1)

# ツール呼び出しの処理
for tool_call in response_1.tool_calls:
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)
    tool_response = TOOL_MAPPING[tool_name](**tool_args)
    messages.append({
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(tool_response),
    })

# 2回目のAPI呼び出し（最終回答を取得）
response_2 = openai_client.chat.completions.create(
    model=MODEL,
    messages=messages,
    tools=tools
)

print(response_2.choices[0].message.content)
```

### TypeScript実装

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: "your-api-key",
});

async function searchGutenbergBooks(searchTerms: string[]): Promise<Book[]> {
  const searchQuery = searchTerms.join(' ');
  const response = await fetch(`https://gutendex.com/books?search=${searchQuery}`);
  const data = await response.json();

  return data.results.map((book: any) => ({
    id: book.id,
    title: book.title,
    authors: book.authors,
  }));
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'searchGutenbergBooks',
      description: 'Search for books in the Project Gutenberg library',
      parameters: {
        type: 'object',
        properties: {
          search_terms: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of search terms'
          }
        },
        required: ['search_terms']
      }
    }
  }
];

const TOOL_MAPPING = { searchGutenbergBooks };
```

---

## エージェントループの実装

複数のツール呼び出しを自動的に処理するループ：

```python
def call_llm(msgs):
    resp = openai_client.chat.completions.create(
        model=MODEL,
        tools=tools,
        messages=msgs
    )
    msgs.append(resp.choices[0].message.dict())
    return resp

def get_tool_response(response):
    tool_call = response.choices[0].message.tool_calls[0]
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)
    tool_result = TOOL_MAPPING[tool_name](**tool_args)

    return {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(tool_result),
    }

max_iterations = 10
iteration_count = 0

while iteration_count < max_iterations:
    iteration_count += 1
    resp = call_llm(messages)

    if resp.choices[0].message.tool_calls is not None:
        messages.append(get_tool_response(resp))
    else:
        break

if iteration_count >= max_iterations:
    print("Warning: Maximum iterations reached")

print(messages[-1]['content'])
```

---

## Interleaved Thinking（インターリーブ思考）

ツール呼び出し間でモデルが推論を行う機能。複数のツール呼び出しを推論ステップで連鎖させることができます。

### 動作例

1. **初期思考**: 「電気自動車の環境影響を調査する必要がある。まず学術論文から始めよう」
2. **最初のツール呼び出し**: `search_academic_papers(...)`
3. **結果後の思考**: 「論文では製造への影響が混在している。現在の統計が必要だ」
4. **2回目のツール呼び出し**: `get_latest_statistics(...)`
5. **最終分析**: 収集したすべての情報を統合して包括的な回答を作成

> **注意**: インターリーブ思考はトークン使用量とレスポンス遅延が増加します。

---

## ベストプラクティス

### 関数定義のガイドライン

**明確で説明的な名前を使用**:
```json
// 良い例: 明確で具体的
{ "name": "get_weather_forecast" }

// 避ける: 曖昧すぎる
{ "name": "weather" }
```

**包括的な説明を提供**:
```json
{
  "description": "特定の場所の現在の天気と5日間の予報を取得。都市、郵便番号、座標をサポート。",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "都市名、郵便番号、または座標(lat,lng)。例: 'Tokyo', '100-0001', '35.6762,139.6503'"
      },
      "units": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "温度単位の設定",
        "default": "celsius"
      }
    },
    "required": ["location"]
  }
}
```

### tool_choice パラメータ

```json
// モデルに判断させる（デフォルト）
{ "tool_choice": "auto" }

// ツール使用を無効化
{ "tool_choice": "none" }

// 特定のツールを強制
{
  "tool_choice": {
    "type": "function",
    "function": {"name": "search_database"}
  }
}
```

### parallel_tool_calls パラメータ

複数のツールを同時に呼び出すかどうかを制御：

```json
// 並列ツール呼び出しを無効化（順次実行）
{ "parallel_tool_calls": false }
```

---

## マルチツールワークフロー

連携して動作するツールの設計例：

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_products",
        "description": "カタログ内の商品を検索"
      }
    },
    {
      "type": "function",
      "function": {
        "name": "get_product_details",
        "description": "特定の商品の詳細情報を取得"
      }
    },
    {
      "type": "function",
      "function": {
        "name": "check_inventory",
        "description": "商品の現在の在庫レベルを確認"
      }
    }
  ]
}
```

これにより、モデルは自然に操作を連鎖できます：検索 → 詳細取得 → 在庫確認

---

## ストリーミングでのツール呼び出し

```typescript
const stream = await fetch('/api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5',
    messages: messages,
    tools: tools,
    stream: true
  })
});

const reader = stream.body.getReader();
let toolCalls = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.choices[0].delta.tool_calls) {
        toolCalls.push(...data.choices[0].delta.tool_calls);
      }

      if (data.choices[0].delta.finish_reason === 'tool_calls') {
        await handleToolCalls(toolCalls);
      } else if (data.choices[0].delta.finish_reason === 'stop') {
        break;
      }
    }
  }
}
```

---

## 参考リンク

- [OpenRouter API Reference](https://openrouter.ai/docs/api-reference/overview)
- [対応モデル一覧](https://openrouter.ai/models?supported_parameters=tools)
