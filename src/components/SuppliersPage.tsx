import { useState, type FormEvent } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { SA_PROVINCES, type Supplier } from '../types';
import { formatCurrency } from '../utils/format';
import { Modal } from './Modal';

interface SuppliersPageProps {
  suppliers: Supplier[];
  onRefresh: () => Promise<void>;
}

const EMPTY_FORM = {
  business_name: '',
  contact_person: '',
  phone: '',
  province: 'Western Cape',
  address: '',
};

export function SuppliersPage({ suppliers, onRefresh }: SuppliersPageProps) {
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('ALL');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const filtered = suppliers.filter((s) => {
    const matchesProvince = provinceFilter === 'ALL' || s.province === provinceFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.business_name.toLowerCase().includes(q) ||
      s.contact_person.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.province.toLowerCase().includes(q);
    return matchesProvince && matchesSearch;
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setError(null);
    setModalMode('create');
  }

  function openEdit(supplier: Supplier) {
    setSelected(supplier);
    setForm({
      business_name: supplier.business_name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      province: supplier.province,
      address: supplier.address,
    });
    setError(null);
    setModalMode('edit');
  }

  async function openView(supplierId: number) {
    setBannerError(null);
    try {
      const fresh = await api.getSupplierById(supplierId);
      setSelected(fresh);
      setModalMode('view');
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to load supplier details.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setBannerSuccess(null);

    try {
      if (modalMode === 'create') {
        const created = await api.createSupplier(form);
        setBannerSuccess(`Registered supplier "${created.business_name}".`);
      } else if (modalMode === 'edit' && selected) {
        const updated = await api.updateSupplier(selected.supplier_id, form);
        setBannerSuccess(`Updated supplier "${updated.business_name}".`);
      }
      await onRefresh();
      setModalMode(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save supplier.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    setBannerError(null);
    setBannerSuccess(null);
    try {
      await api.deleteSupplier(supplier.supplier_id);
      setBannerSuccess(`Deleted supplier "${supplier.business_name}".`);
      await onRefresh();
    } catch (err) {
      setBannerError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete supplier due to existing records.'
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            South African Suppliers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage produce estates and market hubs across South African provinces
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Register Supplier</span>
        </button>
      </div>

      {bannerError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {bannerError}
        </div>
      )}
      {bannerSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {bannerSuccess}
        </div>
      )}

      {/* Search & Province Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business name, contact, or phone..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="province-filter" className="text-xs font-medium text-slate-600">
            Province
          </label>
          <select
            id="province-filter"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            <option value="ALL">All Provinces ({suppliers.length})</option>
            {SA_PROVINCES.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suppliers Data Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No matching suppliers found.</p>
            <p className="mt-1 text-xs text-slate-500">
              Adjust your search filter or register a new South African produce supplier.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-3">Business &amp; Address</th>
                  <th className="px-4 py-3">Contact Person</th>
                  <th className="px-4 py-3">Province</th>
                  <th className="px-4 py-3 text-right">Purchases</th>
                  <th className="px-4 py-3 text-right">Total Supplied</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.supplier_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-900">{s.business_name}</div>
                      <div className="text-xs text-slate-500">{s.address}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-900">{s.contact_person}</div>
                      <div className="font-mono text-xs text-slate-500 tabular-nums">{s.phone}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{s.province}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                      {s.purchase_count ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(Number(s.total_supplied ?? 0))}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openView(s.supplier_id)}
                          title="View supplier by ID"
                          aria-label={`View ${s.business_name}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          title="Edit supplier"
                          aria-label={`Edit ${s.business_name}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          title="Delete supplier"
                          aria-label={`Delete ${s.business_name}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalMode === 'create' || modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Register New Supplier' : 'Update Supplier Information'}
        subtitle="Enter verified supplier contact details and South African province"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Business Name</label>
            <input
              type="text"
              required
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              placeholder="e.g. Hex River Table Grapes"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Contact Person</label>
              <input
                type="text"
                required
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                placeholder="e.g. Johan Nel"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Phone Number</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+27 23 356 2201"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">South African Province</label>
            <select
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            >
              {SA_PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Physical Address</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, Town, Postal Code"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

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
              {submitting ? 'Saving...' : modalMode === 'create' ? 'Register Supplier' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Supplier Detail Modal */}
      <Modal
        open={modalMode === 'view' && Boolean(selected)}
        onClose={() => setModalMode(null)}
        title={selected?.business_name ?? 'Supplier Record'}
        subtitle={`Supplier ID #${selected?.supplier_id ?? ''} · ${selected?.province ?? ''}`}
      >
        {selected && (
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Contact Person</dt>
              <dd className="font-medium text-slate-900">{selected.contact_person}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-mono text-slate-900 tabular-nums">{selected.phone}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Province</dt>
              <dd className="font-medium text-slate-900">{selected.province}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Address</dt>
              <dd className="text-right text-slate-900">{selected.address}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Recorded Purchases</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {selected.purchase_count ?? 0}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500">Total Supplied Value</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatCurrency(Number(selected.total_supplied ?? 0))}
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
