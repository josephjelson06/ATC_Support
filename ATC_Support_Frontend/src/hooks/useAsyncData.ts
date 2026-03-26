import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../lib/api';

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);
  const dataRef = useRef<T | null>(null);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      const hasExistingData = dataRef.current !== null;

      if (hasExistingData) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

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
          setIsRefreshing(false);
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
    isRefreshing,
    error,
    reload,
  };
}
