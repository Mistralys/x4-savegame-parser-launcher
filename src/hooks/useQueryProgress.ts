import { useEffect, useState, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface QueryProgress {
  inProgress: boolean;
  operation: string | null;
  message: string | null;
  startTime: number | null;
}

interface ProgressEvent {
  tool: string;
  message: {
    type: string;
    name: string;
    status: 'started' | 'progress' | 'complete';
    payload?: Record<string, unknown>;
    timestamp: string;
  };
}

const PROGRESS_TIMEOUT = 30000; // 30 seconds safety timeout

/**
 * Hook to track query progress from Tauri events
 * 
 * Listens to 'query-progress' events emitted by query_save_data_with_progress
 * command and maintains state about ongoing operations.
 * 
 * @returns Progress state including operation name and status
 */
export function useQueryProgress(): QueryProgress {
  const [progress, setProgress] = useState<QueryProgress>({
    inProgress: false,
    operation: null,
    message: null,
    startTime: null,
  });

  const clearProgress = useCallback(() => {
    setProgress({
      inProgress: false,
      operation: null,
      message: null,
      startTime: null,
    });
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Set up event listener
    const setupListener = async () => {
      unlisten = await listen<ProgressEvent>('query-progress', (event) => {
        const { message } = event.payload;

        if (message.type === 'progress') {
          switch (message.status) {
            case 'started':
              setProgress({
                inProgress: true,
                operation: message.name,
                message: `Starting ${message.name}...`,
                startTime: Date.now(),
              });

              // Set safety timeout
              if (timeoutId) clearTimeout(timeoutId);
              timeoutId = setTimeout(() => {
                console.warn(`Progress timeout for operation: ${message.name}`);
                clearProgress();
              }, PROGRESS_TIMEOUT);
              break;

            case 'progress':
              setProgress((prev) => ({
                ...prev,
                message: message.payload?.message as string || prev.message,
              }));
              break;

            case 'complete':
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              clearProgress();
              break;
          }
        }
      });
    };

    setupListener();

    // Cleanup
    return () => {
      if (unlisten) {
        unlisten();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [clearProgress]);

  return progress;
}
