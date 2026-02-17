import { useCallback } from 'react';
import ky, { HTTPError } from 'ky';
import type { ServerStatus, Message } from '../types';

interface ApiResponse {
  message: string;
}

export const useServerApi = (
  apiKey: string,
  setStatus: (status: ServerStatus | null) => void,
  setMessage: (message: Message | null) => void,
  setLoading: (loading: boolean) => void
) => {
  const api = ky.create({
    prefixUrl: '/api',
    headers: { 'X-API-Key': apiKey }
  });

  const handleError = async (e: unknown) => {
    if (e instanceof HTTPError) {
      const text =
        e.response.status === 401
          ? 'Invalid API key'
          : `HTTP ${e.response.status}`;
      setMessage({ text, type: 'error' });
    } else if (e instanceof Error) {
      setMessage({ text: e.message, type: 'error' });
    }
  };

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
  }, [apiKey, setStatus, setMessage, setLoading]);

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
  }, [apiKey, setMessage, fetchStatus]);

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
  }, [apiKey, setMessage, fetchStatus]);

  return { fetchStatus, startServer, stopServer };
};
