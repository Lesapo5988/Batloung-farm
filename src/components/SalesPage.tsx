import { useEffect, useState, type FormEvent } from 'react';
import { Banknote, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type {
  FruitWithStock,
  PackagingSize,
  PaymentMethod,
  PaymentStatus,
  Sale,
  Vendor,
} from '../types';
import {
  capitalizeSize,
  formatCurrency,
  formatDateTime,
  formatPaymentMethod,
} from '../utils/format';
import { Modal } from './Modal';
import { PaymentStatusText } from './StatusText';

interface SalesPageProps {
  sales: Sale[];
  vendors: Vendor[];
  fruits: FruitWithStock[];
  openModalSignal: number;
  onRefresh: () => Promise<void>;
}

interface SaleLineDraft {
  fruit_id: number;
  packaging_size: PackagingSize;
  quantity: string;
}

export function SalesPage({
  sales,
  vendors,
  fruits,
  openModalSignal,
  onRefresh,
}: SalesPageProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Sale | null>(null);

  const [vendorId, setVendorId] = useState<number>(vendors[0]?.vendor_id ?? 1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL' | 'NONE'>('FULL');
  const [partialAmount, setPartialAmount] = useState('');
  const [items, setItems] = useState<SaleLineDraft[]>([
    { fruit_id: fruits[0]?.fruit_id ?? 1, packaging_size: 'small', quantity: '2' },
  ]);

  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (openModalSignal > 0) {
      openNewSale();
    }
  }, [openModalSignal]);

  const activeFruits = fruits.filter((f) => f.status === 'ACTIVE');

  function getFruitTier(fruitId: number, size: PackagingSize) {
    const fruit = fruits.find((f) => f.fruit_id === fruitId);
    return fruit?.packaging[size] ?? { available_quantity: 0, selling_price: 0 };
  }

  function openNewSale() {
    setVendorId(vendors[0]?.vendor_id ?? 1);
    setPaymentMethod('CASH');
    setPaymentMode('FULL');
    setPartialAmount('');
    setItems([
      {
        fruit_id: activeFruits[0]?.fruit_id ?? 1,
        packaging_size: 'small',
        quantity: '2',
      },
    ]);
    setError(null);
    setSaleModalOpen(true);
  }

  function loadRollbackDemoScenario() {
    const apples = fruits.find((f) => f.fruit_name.toLowerCase() === 'apples') ?? fruits[0];
    const bananas = fruits.find((f) => f.fruit_name.toLowerCase() === 'bananas') ?? fruits[1] ?? fruits[0];
    const overRequest = (apples?.packaging.large.available_quantity ?? 6) + 4;
    setItems([
      { fruit_id: bananas.fruit_id, packaging_size: 'small', quantity: '2' },
      { fruit_id: apples.fruit_id, packaging_size: 'large', quantity: String(overRequest) },
    ]);
    setError(null);
  }

  function addItemRow() {
    setItems([
      ...items,
      {
        fruit_id: activeFruits[0]?.fruit_id ?? 1,
        packaging_size: 'medium',
        quantity: '1',
      },
    ]);
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  }

  function updateItem(index: number, patch: Partial<SaleLineDraft>) {
    setItems(items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  const automaticTotal = items.reduce((sum, item) => {
    const tier = getFruitTier(item.fruit_id, item.packaging_size);
    const qty = Number(item.quantity || 0);
    return sum + (Number.isFinite(qty) ? qty * tier.selling_price : 0);
  }, 0);

  async function handleCreateSale(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let amountPaid: number | undefined;
    if (paymentMethod === 'CREDIT' || paymentMode === 'NONE') {
      amountPaid = 0;
    } else if (paymentMode === 'PARTIAL') {
      amountPaid = Number(partialAmount || 0);
    } else {
      amountPaid = Number(automaticTotal.toFixed(2));
    }

    try {
      const created = await api.createSale({
        vendor_id: Number(vendorId),
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        items: items.map((item) => ({
          fruit_id: Number(item.fruit_id),
          packaging_size: item.packaging_size,
          quantity: Number(item.quantity),
        })),
      });
      setSuccess(
        `Sale #${created.sale_id} committed for ${created.vendor_name} · Total ${formatCurrency(created.total_amount)} · Status: ${created.payment_status}.`
      );
      await onRefresh();
      setSaleModalOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `HTTP ${err.status} Rollback: ${err.message}`
          : 'Failed to record sale.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openCollectPayment(sale: Sale) {
    setPaymentTarget(sale);
    setCollectAmount(String(sale.outstanding_balance.toFixed(2)));
    setCollectMethod('CASH');
    setError(null);
  }

  async function handleCollectPayment(e: FormEvent) {
    e.preventDefault();
    if (!paymentTarget) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.addSalePayment(paymentTarget.sale_id, {
        amount: Number(collectAmount),
        payment_method: collectMethod,
      });
      setSuccess(
        `Recorded ${formatPaymentMethod(collectMethod)} payment for Sale #${updated.sale_id}. Updated status: ${updated.payment_status}.`
      );
      await onRefresh();
      setPaymentTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSales =
    statusFilter === 'ALL'
      ? sales
      : sales.filter((s) => s.payment_status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Vendor Sales &amp; Payment Settlements
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automatic pricing by packaging size, atomic stock protection, and Cash / Mobile Money / Credit tracking
          </p>
        </div>
        <button
          type="button"
          onClick={openNewSale}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Record Sale</span>
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Segmented Payment Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['ALL', 'PAID', 'PARTIALLY_PAID', 'UNPAID'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? `All Sales (${sales.length})` : status}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-6 py-3">Sale ID</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Items Sold</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3 text-right">Total Payable</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-6 py-3 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.sale_id} className="align-top hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-700 tabular-nums">
                    INV-{String(sale.sale_id).padStart(4, '0')}
                    <div className="mt-0.5 font-sans text-slate-500">
                      {formatDateTime(sale.sale_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-900">{sale.vendor_name}</div>
                    <div className="text-xs text-slate-500">
                      {sale.vendor_location} · {formatPaymentMethod(sale.payment_method)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ul className="space-y-1 text-xs text-slate-700">
                      {sale.items.map((item) => (
                        <li key={item.sales_detail_id} className="font-mono tabular-nums">
                          {item.quantity} × {item.fruit_name} ({capitalizeSize(item.packaging_size)}) @{' '}
                          {formatCurrency(item.unit_price)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3.5">
                    <PaymentStatusText status={sale.payment_status} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(sale.amount_paid)}
                  </td>
                  <td
                    className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums ${
                      sale.outstanding_balance > 0 ? 'text-red-700' : 'text-slate-500'
                    }`}
                  >
                    {formatCurrency(sale.outstanding_balance)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {sale.outstanding_balance > 0 ? (
                      <button
                        type="button"
                        onClick={() => openCollectPayment(sale)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <Banknote className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                        <span>Record Payment</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                    No sales match the selected payment status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Multi-Item Sale Modal */}
      <Modal
        open={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        title="Record Vendor Sale"
        subtitle="Totals are calculated automatically from packaging prices; insufficient stock triggers full ROLLBACK"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleCreateSale} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="text-xs text-slate-600">
              Need to demonstrate atomic rollback on insufficient stock?
            </div>
            <button
              type="button"
              onClick={loadRollbackDemoScenario}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 whitespace-nowrap"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pre-fill Insufficient Stock Test</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Registered Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name} ({v.location})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const next = e.target.value as PaymentMethod;
                  setPaymentMethod(next);
                  if (next === 'CREDIT') {
                    setPaymentMode('NONE');
                  } else if (paymentMode === 'NONE') {
                    setPaymentMode('FULL');
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                <option value="CASH">Cash Payment</option>
                <option value="MOBILE_MONEY">Mobile Money (M-Pesa / EcoCash)</option>
                <option value="CREDIT">Credit (Outstanding Payment)</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Sale Line Items</span>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Fruit Item</span>
              </button>
            </div>

            {items.map((item, idx) => {
              const tier = getFruitTier(item.fruit_id, item.packaging_size);
              const qtyNum = Number(item.quantity || 0);
              const overStock = qtyNum > tier.available_quantity;
              const subtotal = qtyNum * tier.selling_price;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                >
                  <div className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block text-xs text-slate-600">Fruit</label>
                      <select
                        value={item.fruit_id}
                        onChange={(e) => updateItem(idx, { fruit_id: Number(e.target.value) })}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                      >
                        {activeFruits.map((f) => (
                          <option key={f.fruit_id} value={f.fruit_id}>
                            {f.fruit_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <label className="block text-xs text-slate-600">Packaging</label>
                      <select
                        value={item.packaging_size}
                        onChange={(e) =>
                          updateItem(idx, { packaging_size: e.target.value as PackagingSize })
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <label className="block text-xs text-slate-600">Boxes</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 text-right">
                      <span className="block text-xs text-slate-500">Subtotal</span>
                      <span className="mt-1.5 block font-mono text-sm font-medium text-slate-900 tabular-nums">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => removeItemRow(idx)}
                        aria-label="Remove item"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 tabular-nums">
                      Unit Price: {formatCurrency(tier.selling_price)} · Available:{' '}
                      {tier.available_quantity} boxes
                    </span>
                    {overStock && (
                      <span className="font-medium text-red-700">
                        Exceeds available stock (server will ROLLBACK entire sale)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Allocation */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Payment Settlement
              </label>
              <select
                value={paymentMethod === 'CREDIT' ? 'NONE' : paymentMode}
                disabled={paymentMethod === 'CREDIT'}
                onChange={(e) => setPaymentMode(e.target.value as 'FULL' | 'PARTIAL' | 'NONE')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm disabled:bg-slate-100"
              >
                <option value="FULL">Full Payment (PAID)</option>
                <option value="PARTIAL">Partial Deposit (PARTIALLY_PAID)</option>
                <option value="NONE">Pay Later / Credit (UNPAID)</option>
              </select>
              {paymentMode === 'PARTIAL' && paymentMethod !== 'CREDIT' && (
                <div className="mt-2">
                  <label className="block text-xs text-slate-600">Amount Paid Now (M)</label>
                  <input
                    type="number"
                    min="0.01"
                    max={automaticTotal}
                    step="0.01"
                    required
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter partial payment"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center text-right">
              <span className="text-xs font-medium text-slate-500">
                Automatic Total Payable
              </span>
              <span className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {formatCurrency(automaticTotal)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setSaleModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Collect Outstanding Payment Modal */}
      <Modal
        open={paymentTarget !== null}
        onClose={() => setPaymentTarget(null)}
        title={`Collect Payment · INV-${String(paymentTarget?.sale_id ?? 0).padStart(4, '0')}`}
        subtitle={`Vendor: ${paymentTarget?.vendor_name ?? ''} · Outstanding: ${formatCurrency(
          paymentTarget?.outstanding_balance ?? 0
        )}`}
      >
        <form onSubmit={handleCollectPayment} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Payment Method</label>
            <select
              value={collectMethod}
              onChange={(e) => setCollectMethod(e.target.value as 'CASH' | 'MOBILE_MONEY')}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="CASH">Cash Payment</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Payment Amount (M)</label>
            <input
              type="number"
              min="0.01"
              max={paymentTarget?.outstanding_balance ?? 0}
              step="0.01"
              required
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setPaymentTarget(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
