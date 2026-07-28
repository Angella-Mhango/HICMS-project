// frontend/src/components/ToastContainer.jsx
import { useState, useEffect } from "react";
import Toast, { removeToast } from "./Toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { id, message, type, duration } = event.detail;
      setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const handleRemoveToast = (event) => {
      const { id } = event.detail;
      setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    window.addEventListener('toast', handleToast);
    window.addEventListener('remove-toast', handleRemoveToast);

    return () => {
      window.removeEventListener('toast', handleToast);
      window.removeEventListener('remove-toast', handleRemoveToast);
    };
  }, []);

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}