import ToastNotification from './notification';
import type { ToastConfig } from '/@/hooks/useToast';
import {type JSX} from "react";

export interface ToastContainerProps {
    toasts: ToastConfig[];
    onClose: (id: string) => void;
}

const ToastContainer: (props: ToastContainerProps) => (null | JSX.Element) = (props: ToastContainerProps) => {
    if (props.toasts.length === 0) {
        return null;
    }

    return (
        <div className="toast-container">
            {props.toasts.map((toast) => (
                <ToastNotification
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    icon={toast.icon}
                    gradient={toast.gradient}
                    label={toast.label}
                    duration={toast.duration}
                    onClose={props.onClose}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
