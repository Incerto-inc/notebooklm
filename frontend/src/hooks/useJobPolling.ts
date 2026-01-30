import { useState, useEffect, useCallback } from 'react';

interface JobStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: string;
  result?: any;
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

        // ジョブが完了または失敗したらポーリングを停止
        if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
          setIsPolling(false);
        }
      } catch (err: any) {
        setError(err.message);
        setIsPolling(false);
      }
    };

    // 初回チェック
    checkStatus();

    // 定期的なポーリング
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
