import type { PaymentMethod, PaymentStatus } from '../types';

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `M ${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(raw: string): string {
  if (!raw) return '—';
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    return raw.slice(0, 10);
  }
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'MOBILE_MONEY':
      return 'Mobile Money';
    case 'CREDIT':
      return 'Credit';
    default:
      return method;
  }
}

export function formatPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'PAID';
    case 'PARTIALLY_PAID':
      return 'PARTIALLY_PAID';
    case 'UNPAID':
      return 'UNPAID';
    default:
      return status;
  }
}

export function capitalizeSize(size: string): string {
  return size.charAt(0).toUpperCase() + size.slice(1);
}
