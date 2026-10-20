import React from 'react';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'warning';
}

interface NotificationToastProps {
  toasts: ToastMessage[];
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto p-3.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl text-white animate-in slide-in-from-right fade-in duration-300"
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`w-2 h-2 mt-1.5 rounded-full ${
                toast.type === 'warning'
                  ? 'bg-amber-400'
                  : toast.type === 'info'
                  ? 'bg-blue-400'
                  : 'bg-emerald-400'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-white leading-snug">{toast.title}</div>
              {toast.description && (
                <div className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                  {toast.description}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
