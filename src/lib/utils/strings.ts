/** User-friendly error messages for common API error codes */
export const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Session expired. Please log in again.',
  forbidden: 'You don\'t have permission for this action.',
  not_found: 'The requested item was not found.',
  bad_request: 'Invalid request. Please check your input.',
  subscription_inactive: 'Your subscription is inactive. Contact your store admin.',
  rate_limited: 'Too many requests. Please wait a moment.',
  whatsapp_not_configured: 'WhatsApp is not set up. Ask your manager to configure it.',
};

export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    // Check if it's an API error message that maps to a known code
    const msg = err.message;
    for (const [code, friendly] of Object.entries(ERROR_MESSAGES)) {
      if (msg.includes(code)) return friendly;
    }
    return msg;
  }
  return 'Something went wrong. Please try again.';
}

export function formatCurrency(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
