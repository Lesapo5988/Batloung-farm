import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { FruitWithStock, PackagingSize, Purchase, Supplier } from '../types';
import { capitalizeSize, formatCurrency, formatDateTime } from '../utils/format';
import { Modal } from './Modal';

interface PurchasesPageProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  fruits: FruitWithStock[];
  openModalSignal: number;
  onRefresh: () => Promise<void>;
}

interface PurchaseLineDraft {
  fruit_id: number;
  packaging_size: PackagingSize;
  quantity: string;
  unit_cost: string;
}

export function PurchasesPage({
  purchases,
  suppliers,
  fruits,
  openModalSignal,
  onRefresh,
}: PurchasesPageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<number>(suppliers[0]?.supplier_id ?? 1);
  const [items, setItems] = useState<PurchaseLineDraft[]>([
    { fruit_id: fruits[0]?.fruit_id ?? 1, packaging_size: 'large', quantity: '10', unit_cost: '165' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (openModalSignal > 0) {
      openNewPurchase();
    }
  }, [openModalSignal]);

  function openNewPurchase() {
    setSupplierId(suppliers[0]?.supplier_id ?? 1);
    setItems([
      {
        fruit_id: fruits[0]?.fruit_id ?? 1,
        packaging_size: 'small',
        quantity: '10',
        unit_cost: '55',
      },
    ]);
    setError(null);
    setModalOpen(true);
  }

  function addItemRow() {
    setItems([
      ...items,
      {
        fruit_id: fruits[0]?.fruit_id ?? 1,
        packaging_size: 'medium',
        quantity: '5',
        unit_cost: '95',
      },
    ]);
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  }

  function updateItem(index: number, patch: Partial<PurchaseLineDraft>) {
    setItems(items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  const computedTotal = items.reduce((sum, item) => {
    const q = Number(item.quantity || 0);
    const c = Number(item.unit_cost || 0);
    return sum + (Number.isFinite(q) && Number.isFinite(c) ? q * c : 0);
  }, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await api.createPurchase({
        supplier_id: Number(supplierId),
        items: items.map((item) => ({
          fruit_id: Number(item.fruit_id),
          packaging_size: item.packaging_size,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
        })),
      });
      setSuccess(
        `Recorded Purchase #${created.purchase_id} (${created.total_boxes} boxes, total ${formatCurrency(created.total_amount)}) and incremented stock.`
      );
      await onRefresh();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record purchase.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Supplier Purchases &amp; Restocking
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Record multi-fruit inbound shipments from South Africa and update packaging-specific stock
          </p>
        </div>
        <button
          type="button"
          onClick={openNewPurchase}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Record Purchase</span>
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Purchases Ledger */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-6 py-3">Purchase ID</th>
                <th className="px-4 py-3">Supplier &amp; Province</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Line Items</th>
                <th className="px-4 py-3 text-right">Boxes</th>
                <th className="px-6 py-3 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <tr key={p.purchase_id} className="align-top hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-700 tabular-nums">
                    PO-{String(p.purchase_id).padStart(4, '0')}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-900">{p.business_name}</div>
                    <div className="text-xs text-slate-500">{p.province}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                    {formatDateTime(p.purchase_date)}
                  </td>
                  <td className="px-4 py-3.5">
                    <ul className="space-y-1 text-xs text-slate-700">
                      {p.items.map((item) => (
                        <li key={item.purchase_detail_id} className="font-mono tabular-nums">
                          {item.quantity} × {item.fruit_name} ({capitalizeSize(item.packaging_size)}) @{' '}
                          {formatCurrency(item.unit_cost)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                    {p.total_boxes}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(p.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Multi-Item Purchase Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Supplier Purchase"
        subtitle="Total cost is calculated automatically and stock increases atomically on commit"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            >
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.business_name} ({s.province})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Purchase Line Items</span>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Fruit Item</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-xs text-slate-600">Fruit</label>
                  <select
                    value={item.fruit_id}
                    onChange={(e) => updateItem(idx, { fruit_id: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  >
                    {fruits.map((f) => (
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

                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-xs text-slate-600">Unit Cost</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={item.unit_cost}
                    onChange={(e) => updateItem(idx, { unit_cost: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums"
                  />
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
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">
              Automatic Total Purchase Amount
            </span>
            <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
              {formatCurrency(computedTotal)}
            </span>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Commit Purchase'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
