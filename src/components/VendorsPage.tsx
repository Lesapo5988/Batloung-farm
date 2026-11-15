import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { Vendor } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { Modal } from './Modal';

interface VendorsPageProps {
  vendors: Vendor[];
  onRefresh: () => Promise<void>;
}

const EMPTY_VENDOR = {
  vendor_name: '',
  phone_number: '',
  location: '',
  registration_date: new Date().toISOString().slice(0, 10),
};

export function VendorsPage({ vendors, onRefresh }: VendorsPageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vendor[]>(vendors);
  const [searching, setSearching] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_VENDOR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(vendors);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .getVendors(query)
        .then((rows) => {
          if (active) setResults(rows);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, vendors]);

  function openCreate() {
    setForm({
      ...EMPTY_VENDOR,
      registration_date: new Date().toISOString().slice(0, 10),
    });
    setEditing(null);
    setError(null);
    setModalMode('create');
  }

  function openEdit(vendor: Vendor) {
    setEditing(vendor);
    setForm({
      vendor_name: vendor.vendor_name,
      phone_number: vendor.phone_number,
      location: vendor.location,
      registration_date: vendor.registration_date.slice(0, 10),
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
      if (modalMode === 'create') {
        const created = await api.createVendor(form);
        setSuccess(`Registered vendor "${created.vendor_name}".`);
      } else if (modalMode === 'edit' && editing) {
        const updated = await api.updateVendor(editing.vendor_id, form);
        setSuccess(`Updated details for "${updated.vendor_name}".`);
      }
      await onRefresh();
      setModalMode(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save vendor record.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalOutstanding = results.reduce((sum, v) => sum + v.outstanding_balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Lesotho Street Vendors &amp; Retailers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Register vendors, search by name or phone number, and monitor credit balances
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Register Vendor</span>
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Search & Balance Summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendor by name or phone number (e.g. +266 5812)..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-600 font-mono tabular-nums">
          {searching ? 'Searching...' : `${results.length} vendor(s)`} · Total Outstanding:{' '}
          <span className="font-semibold text-slate-900">{formatCurrency(totalOutstanding)}</span>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {results.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No matching vendors found.</p>
            <p className="mt-1 text-xs text-slate-500">
              Try a different vendor name or phone number, or register a new vendor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-6 py-3">Vendor &amp; Location</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Total Billed</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-900">{v.vendor_name}</div>
                      <div className="text-xs text-slate-500">{v.location}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-700 tabular-nums">
                      {v.phone_number}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {formatDateTime(v.registration_date)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                      {v.total_orders}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                      {formatCurrency(v.total_purchased)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-700 tabular-nums">
                      {formatCurrency(v.total_paid)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums ${
                        v.outstanding_balance > 0 ? 'text-red-700' : 'text-slate-600'
                      }`}
                    >
                      {formatCurrency(v.outstanding_balance)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
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
        )}
      </div>

      {/* Register / Edit Vendor Modal */}
      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Register New Vendor' : `Edit ${editing?.vendor_name}`}
        subtitle="Record street vendor or small retailer details for Maseru and district distribution"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Vendor Name</label>
            <input
              type="text"
              required
              value={form.vendor_name}
              onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
              placeholder="e.g. Teyateyaneng Fresh Stall"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Phone Number</label>
              <input
                type="text"
                required
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+266 5812 9000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Registration Date</label>
              <input
                type="date"
                required
                value={form.registration_date}
                onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Market / Location</label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Maseru Central Market, Stall 22"
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
              {submitting ? 'Saving...' : modalMode === 'create' ? 'Register Vendor' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
