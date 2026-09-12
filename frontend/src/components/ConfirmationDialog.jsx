import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

export default function ConfirmationDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-2 text-green-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 id="confirmation-title" className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>
        <p id="confirmation-message" className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
        <button autoFocus type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
