import { useCallback, useMemo } from 'react';
import ky, { HTTPError } from 'ky';
import type { ServerStatus, Message, WorldsResponse } from '../types';

interface ApiResponse {
  message: string;
}

export const useServerApi = (
  apiKey: string,
  setStatus: (status: ServerStatus | null) => void,
  setMessage: (message: Message | null) => void,
  setLoading: (loading: boolean) => void
) => {
  const api = useMemo(
    () =>
      ky.create({
        prefixUrl: '/api',
        headers: { 'X-API-Key': apiKey }
      }),
    [apiKey]
  );

  const handleError = useCallback(async (e: unknown) => {
    if (e instanceof HTTPError) {
      const text =
        e.response.status === 401
          ? 'Invalid API key'
          : e.response.status === 409
            ? 'Cannot stop the server while players are online.'
            : `HTTP ${e.response.status}`;
      setMessage({ text, type: 'error' });
    } else if (e instanceof Error) {
      setMessage({ text: e.message, type: 'error' });
    }
  }, [setMessage]);

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    try {
      const data = await api.get('status').json<ServerStatus>();
      setStatus(data);
      return true;
    } catch (e) {
      await handleError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [api, handleError, setStatus, setLoading]);

  const startServer = useCallback(async () => {
    try {
      const data = await api.post('start').json<ApiResponse>();
      setMessage({
        text: `${data.message} Please wait 30-60 seconds.`,
        type: 'success'
      });
      setTimeout(() => {
        void fetchStatus();
      }, 3000);
    } catch (e) {
      await handleError(e);
    }
  }, [api, handleError, setMessage, fetchStatus]);

  const stopServer = useCallback(async () => {
    if (!window.confirm('Are you sure you want to stop the server?')) return;
    try {
      const data = await api
        .post('stop', { timeout: false })
        .json<ApiResponse>();
      setMessage({ text: data.message, type: 'success' });
      setTimeout(() => {
        void fetchStatus();
      }, 2000);
    } catch (e) {
      await handleError(e);
    }
  }, [api, handleError, setMessage, fetchStatus]);

  const fetchWorlds = useCallback(async (): Promise<WorldsResponse | null> => {
    try {
      return await api.get('worlds').json<WorldsResponse>();
    } catch (e) {
      await handleError(e);
      return null;
    }
  }, [api, handleError]);

  const downloadWorld = useCallback(
    async (worldName: string): Promise<Blob | null> => {
      try {
        return await api.get(`worlds/${encodeURIComponent(worldName)}/download`).blob();
      } catch (e) {
        if (e instanceof HTTPError && e.response.status === 403) {
          setMessage({
            text: 'Stop the server completely before downloading a world.',
            type: 'error'
          });
        } else {
          await handleError(e);
        }
        return null;
      }
    },
    [api, handleError, setMessage]
  );

  return {
    fetchStatus,
    startServer,
    stopServer,
    fetchWorlds,
    downloadWorld
  };
};
