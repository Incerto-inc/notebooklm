import { useEffect, useState } from 'react';
import type { Source } from '@/lib/types';

interface JobInfo {
  itemId: string;
  targetTab: 'style' | 'sources' | 'scenario';
  loadingItem: Source;
}

interface RestoreResult {
  loadingItems: Source[];
  activeJobs: Map<string, JobInfo>;
}

export function useJobRestore() {
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreResult, setRestoreResult] = useState<RestoreResult>({
    loadingItems: [],
    activeJobs: new Map(),
  });

  useEffect(() => {
    const restoreJobs = async () => {
      try {
        // 進行中のジョブを取得
        const jobsResponse = await fetch('/api/jobs?status=PROCESSING');
        if (!jobsResponse.ok) return;

        const jobs = await jobsResponse.json();

        if (jobs.length === 0) {
          setIsRestoring(false);
          return;
        }

        // 各ジョブに対応するローディングアイテムを取得
        const loadingItems: Source[] = [];
        const activeJobs = new Map<string, JobInfo>();

        for (const job of jobs) {
          // Job.inputからitemIdを抽出（事前に保存しておく必要がある）
          const { itemId, targetTab } = job.input?._metadata || {};

          if (!itemId) continue;

          // DBからローディングアイテムを取得
          let endpoint: string;
          if (targetTab === 'style') {
            endpoint = '/api/styles';
          } else if (targetTab === 'sources') {
            endpoint = '/api/sources';
          } else if (targetTab === 'scenario') {
            endpoint = '/api/scenarios';
          } else {
            continue;
          }

          const itemsResponse = await fetch(endpoint);
          if (!itemsResponse.ok) continue;

          const items = await itemsResponse.json();
          const loadingItem = items.find((item: Source) => item.id === itemId);

          if (loadingItem && loadingItem.loading) {
            loadingItems.push(loadingItem);
            activeJobs.set(job.id, { itemId, targetTab, loadingItem });
          }
        }

        setRestoreResult({ loadingItems, activeJobs });
      } catch (error) {
        console.error('Failed to restore jobs:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreJobs();
  }, []);

  return { isRestoring, restoreResult };
}
