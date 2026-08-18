// frontend/src/components/Toast.jsx
import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

let toastId = 0;
let toastCallbacks = {};

export function showToast(message, type = "success", duration = 3000) {
  const id = ++toastId;
  const event = new CustomEvent('toast', {
    detail: { id, message, type, duration }
  });
  window.dispatchEvent(event);
  return id;
}

export function removeToast(id) {
  const event = new CustomEvent('remove-toast', {
    detail: { id }
  });
  window.dispatchEvent(event);
}

export default function Toast({ id, message, type = "success", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-green-600" />;
      case "info":
        return <Info className="w-5 h-5 text-green-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-green-50 border-green-200";
      case "info":
        return "bg-green-50 border-green-200";
      default:
        return "bg-green-50 border-green-200";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "warning":
        return "text-green-800";
      case "info":
        return "text-green-800";
      default:
        return "text-green-800";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg ${getBgColor()} min-w-[300px] max-w-md`}>
        {getIcon()}
        <p className={`text-sm font-medium flex-1 ${getTextColor()}`}>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onClose) setTimeout(onClose, 300);
          }}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}