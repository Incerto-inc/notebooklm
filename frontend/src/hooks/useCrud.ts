import { useState, useCallback } from 'react';

type ApiEndpoint = '/styles' | '/sources' | '/scenarios' | '/chat-messages';

// データ取得関数
async function fetchData(endpoint: string) {
  const response = await fetch(`/api${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
}

// データ作成関数
async function createData(endpoint: string, data: unknown) {
  const response = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create ${endpoint}`);
  }
  return response.json();
}

// データ更新関数
async function updateData(endpoint: string, data: unknown) {
  const response = await fetch(`/api${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update ${endpoint}`);
  }
  return response.json();
}

// データ削除関数
async function deleteData(endpoint: string, id?: string) {
  const url = id ? `/api${endpoint}?id=${id}` : `/api${endpoint}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete ${endpoint}`);
  }
  return response.json();
}

/**
 * ジェネリックCRUDフック
 * 指定されたエンドポイントに対するCRUD操作を提供します
 */
export function useCrud<T extends { id: string }>(endpoint: ApiEndpoint) {
  const [items, setItems] = useState<T[]>([]);

  const create = useCallback(async (data: Omit<T, 'id'>): Promise<T> => {
    const newItem = await createData(endpoint, data);
    setItems((prev) => [...prev, newItem]);
    return newItem;
  }, [endpoint]);

  const update = useCallback(async (id: string, data: Partial<T>): Promise<T> => {
    const updated = await updateData(endpoint, { id, ...data });
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, [endpoint]);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    await deleteData(endpoint, id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [endpoint]);

  const deleteAll = useCallback(async (): Promise<void> => {
    await deleteData(endpoint);
    setItems([]);
  }, [endpoint]);

  const setAll = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  return {
    items,
    setItems: setAll,
    create,
    update,
    delete: deleteItem,
    deleteAll,
  };
}

/**
 * 初期データをロードする関数
 * 複数のエンドポイントから並列でデータを取得します
 */
export async function loadInitialData<T extends Record<string, unknown>>(
  endpoints: Record<string, string>
): Promise<T> {
  const entries = Object.entries(endpoints);
  const results = await Promise.all(
    entries.map(async ([key, endpoint]) => [key, await fetchData(endpoint)] as const)
  );
  return Object.fromEntries(results) as T;
}
