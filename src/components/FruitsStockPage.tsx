import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { FruitWithStock, StockRow } from '../types';
import { formatCurrency } from '../utils/format';
import { Modal } from './Modal';
import { StockLevelText } from './StatusText';

interface FruitsStockPageProps {
  fruits: FruitWithStock[];
  stock: StockRow[];
  onRefresh: () => Promise<void>;
}

const EMPTY_FRUIT_FORM = {
  fruit_name: '',
  description: '',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  small_price: '80',
  medium_price: '150',
  large_price: '250',
  small_initial: '0',
  medium_initial: '0',
  large_initial: '0',
};

export function FruitsStockPage({ fruits, stock, onRefresh }: FruitsStockPageProps) {
  const [viewMode, setViewMode] = useState<'all-stock' | 'low-stock' | 'catalog'>('all-stock');
  const [threshold, setThreshold] = useState(10);
  const [lowStockRows, setLowStockRows] = useState<StockRow[]>([]);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingFruit, setEditingFruit] = useState<FruitWithStock | null>(null);
  const [form, setForm] = useState(EMPTY_FRUIT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getLowStock(threshold)
      .then((rows) => {
        if (active) setLowStockRows(rows);
      })
      .catch(() => {
        if (active) setLowStockRows([]);
      });
    return () => {
      active = false;
    };
  }, [threshold, stock]);

  function openCreate() {
    setForm(EMPTY_FRUIT_FORM);
    setEditingFruit(null);
    setError(null);
    setModalMode('create');
  }

  function openEdit(fruit: FruitWithStock) {
    setEditingFruit(fruit);
    setForm({
      fruit_name: fruit.fruit_name,
      description: fruit.description,
      status: fruit.status,
      small_price: String(fruit.packaging.small.selling_price),
      medium_price: String(fruit.packaging.medium.selling_price),
      large_price: String(fruit.packaging.large.selling_price),
      small_initial: String(fruit.packaging.small.available_quantity),
      medium_initial: String(fruit.packaging.medium.available_quantity),
      large_initial: String(fruit.packaging.large.available_quantity),
    });
    setError(null);
    setModalMode('edit');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const prices = {
        small: Number(form.small_price),
        medium: Number(form.medium_price),
        large: Number(form.large_price),
      };

      if (modalMode === 'create') {
        const created = await api.createFruit({
          fruit_name: form.fruit_name,
          description: form.description,
          status: form.status,
          prices,
          initial_stock: {
            small: Number(form.small_initial || 0),
            medium: Number(form.medium_initial || 0),
            large: Number(form.large_initial || 0),
          },
        });
        setSuccess(`Registered "${created.fruit_name}" with Small, Medium, and Large tiers.`);
      } else if (modalMode === 'edit' && editingFruit) {
        const updated = await api.updateFruit(editingFruit.fruit_id, {
          fruit_name: form.fruit_name,
          description: form.description,
          status: form.status,
          prices,
        });
        setSuccess(`Updated "${updated.fruit_name}" information and packaging selling prices.`);
      }

      await onRefresh();
      setModalMode(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save fruit configuration.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fruits &amp; Packaging Stock
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track small, medium, and large box balances and packaging-specific selling prices
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Register Fruit Type</span>
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Segmented View Controls & Low Stock Threshold */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode('all-stock')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'all-stock'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Packaging Stock ({stock.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('low-stock')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'low-stock'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Low Stock Alerts ({lowStockRows.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('catalog')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'catalog'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fruit Catalog ({fruits.length})
          </button>
        </div>

        {viewMode === 'low-stock' && (
          <div className="flex items-center gap-2">
            <label htmlFor="threshold-input" className="text-xs font-medium text-slate-600">
              Low-stock threshold (boxes):
            </label>
            <input
              id="threshold-input"
              type="number"
              min={0}
              max={500}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Stock / Low-Stock Table */}
      {(viewMode === 'all-stock' || viewMode === 'low-stock') && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-3">Stock ID</th>
                  <th className="px-4 py-3">Fruit Name</th>
                  <th className="px-4 py-3">Packaging Size</th>
                  <th className="px-4 py-3">Inventory Status</th>
                  <th className="px-4 py-3 text-right">Selling Price / Box</th>
                  <th className="px-6 py-3 text-right">Available Boxes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(viewMode === 'all-stock' ? stock : lowStockRows).map((row) => (
                  <tr key={row.stock_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500 tabular-nums">
                      STK-{String(row.stock_id).padStart(3, '0')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.fruit_name}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{row.packaging_size}</td>
                    <td className="px-4 py-3">
                      <StockLevelText quantity={row.available_quantity} threshold={threshold} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 tabular-nums">
                      {formatCurrency(row.selling_price)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {row.available_quantity}
                    </td>
                  </tr>
                ))}
                {(viewMode === 'all-stock' ? stock : lowStockRows).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                      No packaging tiers fall below {threshold} boxes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fruit Catalog View */}
      {viewMode === 'catalog' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-3">Fruit &amp; Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Small</th>
                  <th className="px-4 py-3 text-right">Medium</th>
                  <th className="px-4 py-3 text-right">Large</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fruits.map((fruit) => (
                  <tr key={fruit.fruit_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 max-w-md">
                      <div className="font-medium text-slate-900">{fruit.fruit_name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{fruit.description}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                      {fruit.status}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      <div>{formatCurrency(fruit.packaging.small.selling_price)}</div>
                      <div className="text-xs text-slate-500">
                        {fruit.packaging.small.available_quantity} boxes
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      <div>{formatCurrency(fruit.packaging.medium.selling_price)}</div>
                      <div className="text-xs text-slate-500">
                        {fruit.packaging.medium.available_quantity} boxes
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      <div>{formatCurrency(fruit.packaging.large.selling_price)}</div>
                      <div className="text-xs text-slate-500">
                        {fruit.packaging.large.available_quantity} boxes
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(fruit)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Fruit Modal */}
      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Register New Fruit Type' : `Edit ${editingFruit?.fruit_name}`}
        subtitle="Configure fruit metadata and separate selling prices for small, medium, and large boxes"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Fruit Name</label>
              <input
                type="text"
                required
                value={form.fruit_name}
                onChange={(e) => setForm({ ...form, fruit_name: e.target.value })}
                placeholder="e.g. Pears"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Grade, variety, and packing notes"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold text-slate-800">
              Selling Price per Packaging Size (LSL)
            </p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Small Box (M)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.small_price}
                  onChange={(e) => setForm({ ...form, small_price: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Medium Box (M)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.medium_price}
                  onChange={(e) => setForm({ ...form, medium_price: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Large Box (M)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.large_price}
                  onChange={(e) => setForm({ ...form, large_price: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {modalMode === 'create' && (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-800">
                Opening Stock (Optional — or add via Purchases)
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600">Small Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.small_initial}
                    onChange={(e) => setForm({ ...form, small_initial: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600">Medium Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.medium_initial}
                    onChange={(e) => setForm({ ...form, medium_initial: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600">Large Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.large_initial}
                    onChange={(e) => setForm({ ...form, large_initial: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalMode(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : modalMode === 'create' ? 'Register Fruit' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
