import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../lib/api';

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetcherRef.current();

        if (isActive) {
          setData(result);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(getErrorMessage(fetchError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [reloadKey, ...deps]);

  return {
    data,
    setData,
    isLoading,
    error,
    reload,
  };
}
