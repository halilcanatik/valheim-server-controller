import { useEffect, useState } from 'react';
import type { ServerStatus, Message } from './types';
import { useServerApi } from './hooks/useServerApi';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AlertMessage } from './components/AlertMessage';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ServerStatus as ServerStatusDisplay } from './components/ServerStatus';
import { ServerControls } from './components/ServerControls';
import { PageHeader } from './components/PageHeader';
import 'bootswatch/dist/darkly/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export const App = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');

  const { fetchStatus, startServer, stopServer } = useServerApi(
    savedApiKey || apiKeyInput,
    setStatus,
    setMessage,
    setLoading
  );

  useEffect(() => {
    if (!savedApiKey) return;
    const interval = setInterval(() => {
      void fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [savedApiKey]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput) return;
    setLoading(true);
    const ok = await fetchStatus();
    if (ok) {
      setSavedApiKey(apiKeyInput);
      setMessage({ text: 'Access granted', type: 'success' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-vh-100 d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-xl-5">
            <PageHeader />

            <div className="card shadow-lg">
              <div className="card-body p-4">
                {message && (
                  <AlertMessage
                    message={message}
                    onDismiss={() => setMessage(null)}
                  />
                )}

                <ApiKeyInput
                  apiKey={apiKeyInput}
                  onChange={setApiKeyInput}
                  onSave={handleSaveApiKey}
                />

                <hr />

                {status ? (
                  <>
                    <ServerStatusDisplay status={status} />
                    <hr />
                    <ServerControls
                      running={status.running}
                      onStart={startServer}
                      onStop={stopServer}
                      onRefresh={fetchStatus}
                    />
                  </>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-info-circle fs-1 text-muted mb-3 d-block"></i>
                    <p className="text-muted">
                      Enter your API key to view server status
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mt-3">
              <small className="text-muted">
                Auto-refresh every 30 seconds
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
