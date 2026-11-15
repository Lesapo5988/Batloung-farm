import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { PaymentStatus } from '../types';

export function PaymentStatusText({ status }: { status: PaymentStatus }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>PAID</span>
      </span>
    );
  }
  if (status === 'PARTIALLY_PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>PARTIALLY_PAID</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>UNPAID</span>
    </span>
  );
}

export function StockLevelText({ quantity, threshold = 10 }: { quantity: number; threshold?: number }) {
  if (quantity === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Out of Stock</span>
      </span>
    );
  }
  if (quantity <= threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Low Stock</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Healthy</span>
    </span>
  );
}
