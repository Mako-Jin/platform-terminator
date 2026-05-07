import { useEffect, useState } from 'react';
import './toast.scss';

interface ToastProps {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning' | 'season' | 'daynight' | 'music';
  icon?: string;
  gradient?: string;
  label?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  icon,
  gradient,
  label,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose(id);
      }, 450);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIconGradient = (): string => {
    if (gradient) return gradient;

    switch (type) {
      case 'success':
        return 'linear-gradient(145deg, #34d399, #10b981)';
      case 'error':
        return 'linear-gradient(145deg, #f87171, #ef4444)';
      case 'warning':
        return 'linear-gradient(145deg, #fbbf24, #f59e0b)';
      case 'season':
        return 'linear-gradient(145deg, #fb923c, #f97316)';
      case 'daynight':
        return 'linear-gradient(145deg, #818cf8, #6366f1)';
      case 'music':
        return 'linear-gradient(145deg, #8b5cf6, #7c3aed)';
      default:
        return 'linear-gradient(145deg, #60a5fa, #3b82f6)';
    }
  };

  const getDefaultIcon = (): string => {
    if (icon) return icon;

    switch (type) {
      case 'success':
        return 'fas fa-check';
      case 'error':
        return 'fas fa-exclamation';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'season':
        return 'fas fa-seedling';
      case 'daynight':
        return 'fas fa-sun';
      case 'music':
        return 'fas fa-music';
      default:
        return 'fas fa-info';
    }
  };

  return (
    <div className={`toast-notification ${type} ${isVisible ? 'visible' : ''}`}>
      <div
        className="toast-icon-container"
        style={{ background: getIconGradient() }}
      >
        <i className={getDefaultIcon()}/>
      </div>
      <div className="toast-content">
        {label && <div className="toast-label">{label}</div>}
        <div className="toast-message">{message}</div>
      </div>
      {type === 'music' && <div className="toast-progress-bar"/>}
    </div>
  );
};

export default ToastNotification;
