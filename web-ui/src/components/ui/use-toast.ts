/**
 * Re-export useToast from ToastContext
 * This provides compatibility with shadcn/ui imports
 */
export { useToast } from '../../contexts/ToastContext';

/**
 * Toast function type for compatibility
 */
export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Compatibility toast function
 * Maps to the context-based toast system
 */
export const toast = (props: ToastProps) => {
  // This is a placeholder - the actual implementation uses the ToastContext
  // Components should use the useToast hook from ToastContext directly
  console.warn('Direct toast() calls are not supported. Use useToast() hook instead.');
};
