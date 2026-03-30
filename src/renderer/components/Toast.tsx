import type { FC } from 'react';
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const icons: Record<ToastProps['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const Toast: FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast--${type} ${visible ? 'is-visible' : 'is-hidden'}`}>
      <div className="toast__icon">{icons[type]}</div>
      <div className="toast__message">{message}</div>
    </div>
  );
};

export default Toast;
