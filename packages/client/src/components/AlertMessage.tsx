import type { Message } from '../types';

interface AlertMessageProps {
  message: Message;
  onDismiss: () => void;
}

export const AlertMessage = ({ message, onDismiss }: AlertMessageProps) => (
  <div
    className={`alert alert-${
      message.type === 'success' ? 'success' : 'danger'
    } alert-dismissible fade show`}
    role="alert"
  >
    <i
      className={`bi ${
        message.type === 'success'
          ? 'bi-check-circle-fill'
          : 'bi-exclamation-circle-fill'
      } me-2`}
    ></i>
    {message.text}
    <button
      type="button"
      className="btn-close"
      onClick={onDismiss}
      aria-label="Close"
    ></button>
  </div>
);
