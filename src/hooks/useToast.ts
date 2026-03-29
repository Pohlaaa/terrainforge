import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const useToasts = () => useToastStore((s) => s.toasts);
export const useRemoveToast = () => useToastStore((s) => s.removeToast);

function add(type: ToastType, title: string, message?: string, duration?: number) {
  useToastStore.getState().addToast({ type, title, message, duration });
}

export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    add('success', title, message, duration),
  error: (title: string, message?: string, duration?: number) =>
    add('error', title, message, duration),
  info: (title: string, message?: string, duration?: number) =>
    add('info', title, message, duration),
  warning: (title: string, message?: string, duration?: number) =>
    add('warning', title, message, duration),
};

export default useToastStore;
