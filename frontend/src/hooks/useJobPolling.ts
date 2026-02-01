import { useState, useEffect, useCallback, useRef } from 'react';
import type { Source } from '@/lib/types';

interface JobStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: string;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface UseJobPollingResult {
  jobStatus: JobStatus | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

interface JobInfo {
  itemId: string;
  targetTab: 'style' | 'sources' | 'scenario';
  loadingItem: Source;
}

interface UseMultiJobPollingOptions {
  onJobComplete?: (jobId: string, jobInfo: JobInfo, result: unknown) => void;
  onJobError?: (jobId: string, jobInfo: JobInfo, error: string) => void;
  onPendingJobsFound?: (jobs: Array<{ id: string; type: string; input: unknown }>) => void;
  interval?: number;
  restoreOnMount?: boolean; // ページロード時に進行中のジョブを検出
}

// 単一ジョブのポーリング（既存機能）
export function useJobPolling(interval: number = 2000): UseJobPollingResult {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    setJobId(null);
    setIsPolling(false);
  }, []);

  const startPolling = useCallback((newJobId: string) => {
    setJobId(newJobId);
    setJobStatus(null);
    setError(null);
    setIsPolling(true);
  }, []);

  useEffect(() => {
    if (!jobId) return;

    setIsPolling(true);

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data: JobStatus = await response.json();
        setJobStatus(data);
        setError(null);

        if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
          setIsPolling(false);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setIsPolling(false);
      }
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, interval);

    return () => clearInterval(intervalId);
  }, [jobId, interval]);

  return {
    jobStatus,
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
}

// 複数ジョブのポーリング（新機能）
export function useMultiJobPolling(options: UseMultiJobPollingOptions = {}) {
  const { onJobComplete, onJobError, onPendingJobsFound, interval = 2000, restoreOnMount = true } = options;
  const [activeJobs, setActiveJobs] = useState<Map<string, JobInfo>>(new Map());
  const isInitializedRef = useRef(false);
  const hasRestoredRef = useRef(false);

  const addJob = useCallback((jobId: string, jobInfo: JobInfo) => {
    setActiveJobs(prev => new Map(prev).set(jobId, jobInfo));
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setActiveJobs(prev => {
      const updated = new Map(prev);
      updated.delete(jobId);
      return updated;
    });
  }, []);

  // ページロード時に進行中のジョブを検出
  useEffect(() => {
    if (!restoreOnMount || hasRestoredRef.current) return;

    const restorePendingJobs = async () => {
      try {
        const response = await fetch('/api/jobs?status=PROCESSING');
        if (!response.ok) return;

        const pendingJobs = await response.json();

        if (pendingJobs.length > 0) {
          console.log(`Found ${pendingJobs.length} pending jobs after page reload`);
          onPendingJobsFound?.(pendingJobs);
        }
      } catch (error) {
        console.error('Failed to restore pending jobs:', error);
      } finally {
        hasRestoredRef.current = true;
      }
    };

    restorePendingJobs();
  }, [restoreOnMount, onPendingJobsFound]);

  // ジョブのポーリング処理
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    const intervalId = setInterval(async () => {
      const jobEntries = Array.from(activeJobs.entries());
      if (jobEntries.length === 0) return;

      const jobsToRemove: string[] = [];

      for (const [jobId, jobInfo] of jobEntries) {
        try {
          const response = await fetch(`/api/jobs/${jobId}`);
          if (!response.ok) {
            jobsToRemove.push(jobId);
            continue;
          }

          const job = await response.json();

          if (job.status === 'COMPLETED') {
            onJobComplete?.(jobId, jobInfo, job.result);
            jobsToRemove.push(jobId);
          } else if (job.status === 'FAILED') {
            onJobError?.(jobId, jobInfo, job.error || '不明なエラーが発生しました');
            jobsToRemove.push(jobId);
          }
        } catch (error) {
          console.error(`Polling error for job ${jobId}:`, error);
          jobsToRemove.push(jobId);
        }
      }

      // 完了したジョブを削除
      if (jobsToRemove.length > 0) {
        setActiveJobs(prev => {
          const updated = new Map(prev);
          for (const jobId of jobsToRemove) {
            updated.delete(jobId);
          }
          return updated;
        });
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [activeJobs, onJobComplete, onJobError, interval]);

  return {
    activeJobs,
    addJob,
    removeJob,
  };
}

