import { invoke } from '@tauri-apps/api/core';
import { useCallback, useState } from 'react';
import { useConfig, getToolPaths } from '../context/ConfigContext';

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  version: string;
  command: string;
  timestamp: string;
  data: T;
  pagination?: Pagination;
  // Error fields
  message?: string;
  code?: number;
  type?: string;
  errors?: Array<{
    message: string;
    code?: number;
    class?: string;
    trace?: string;
    details?: string;
  }>;
  actions?: string[];
}

export interface QueryOptions {
  filter?: string;
  limit?: number;
  offset?: number;
  cacheKey?: string;
}

export const useSaveData = () => {
  const { config } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async <T>(
    save: string,
    command: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      const toolPaths = getToolPaths(config.installPath);
      
      if (!toolPaths.query) {
        throw new Error('Query script path not configured');
      }

      const response = await invoke<ApiResponse<T>>('query_save_data', {
        phpPath: config.phpPath,
        scriptPath: toolPaths.query,
        command,
        save,
        filter: options.filter,
        limit: options.limit,
        offset: options.offset,
        cacheKey: options.cacheKey,
      });

      if (!response.success) {
        throw new Error(response.message || 'API request failed');
      }

      return response;
    } catch (err: any) {
      const message = err.message || String(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  return {
    query,
    isLoading,
    error,
  };
};
