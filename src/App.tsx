import { useCallback, useEffect, useState } from 'react';
import {
  Apple,
  BarChart3,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Receipt,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { api } from './api/client';
import { FruitsStockPage } from './components/FruitsStockPage';
import { OverviewPage } from './components/OverviewPage';
import { PurchasesPage } from './components/PurchasesPage';
import { ReportsPage } from './components/ReportsPage';
import { SalesPage } from './components/SalesPage';
import { SuppliersPage } from './components/SuppliersPage';
import { VendorsPage } from './components/VendorsPage';
import type { FruitWithStock, Purchase, Sale, StockRow, Supplier, Vendor } from './types';

type NavTab =
  | 'overview'
  | 'suppliers'
  | 'fruits'
  | 'vendors'
  | 'purchases'
  | 'sales'
  | 'reports';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'fruits', label: 'Fruits & Stock', icon: Apple },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'purchases', label: 'Purchases', icon: PackagePlus },
  { id: 'sales', label: 'Sales & Payments', icon: Receipt },
  { id: 'reports', label: 'SQL Reports', icon: BarChart3 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fruits, setFruits] = useState<FruitWithStock[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [lowStock, setLowStock] = useState<StockRow[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [purchaseModalSignal, setPurchaseModalSignal] = useState(0);
  const [saleModalSignal, setSaleModalSignal] = useState(0);

  const loadAllData = useCallback(async () => {
    try {
      const [sList, fList, stList, lowList, vList, pList, saList] = await Promise.all([
        api.getSuppliers(),
        api.getFruits(),
        api.getStock(),
        api.getLowStock(10),
        api.getVendors(),
        api.getPurchases(),
        api.getSales(),
      ]);
      setSuppliers(sList);
      setFruits(fList);
      setStock(stList);
      setLowStock(lowList);
      setVendors(vList);
      setPurchases(pList);
      setSales(saList);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to load Batloung Farm distribution data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  function openNewPurchase() {
    setActiveTab('purchases');
    setPurchaseModalSignal((n) => n + 1);
    setMobileMenuOpen(false);
  }

  function openNewSale() {
    setActiveTab('sales');
    setSaleModalSignal((n) => n + 1);
    setMobileMenuOpen(false);
  }

  const currentNavLabel = NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[248px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Batloung Farm
          </span>
        </div>
        <nav aria-label="Primary navigation" className="flex-1 space-y-1 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-slate-900/45"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex w-64 flex-col bg-white border-r border-slate-200">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                Batloung Farm
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="hidden sm:inline">Batloung Distribution</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">{currentNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openNewPurchase}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Record Purchase
            </button>
            <button
              type="button"
              onClick={openNewSale}
              className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              Record Sale
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-[1320px]">
            {loading ? (
              <div className="space-y-4">
                <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-200" />
                  ))}
                </div>
                <div className="h-72 animate-pulse rounded-lg bg-slate-200" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-red-200 bg-white p-8 text-center">
                <p className="text-base font-semibold text-red-800">
                  Unable to connect to the distribution API
                </p>
                <p className="mt-1 text-sm text-slate-600">{loadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    loadAllData();
                  }}
                  className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewPage
                    fruits={fruits}
                    lowStock={lowStock}
                    sales={sales}
                    purchases={purchases}
                    vendors={vendors}
                    onNavigate={setActiveTab}
                    onOpenNewPurchase={openNewPurchase}
                    onOpenNewSale={openNewSale}
                  />
                )}
                {activeTab === 'suppliers' && (
                  <SuppliersPage suppliers={suppliers} onRefresh={loadAllData} />
                )}
                {activeTab === 'fruits' && (
                  <FruitsStockPage fruits={fruits} stock={stock} onRefresh={loadAllData} />
                )}
                {activeTab === 'vendors' && (
                  <VendorsPage vendors={vendors} onRefresh={loadAllData} />
                )}
                {activeTab === 'purchases' && (
                  <PurchasesPage
                    purchases={purchases}
                    suppliers={suppliers}
                    fruits={fruits}
                    openModalSignal={purchaseModalSignal}
                    onRefresh={loadAllData}
                  />
                )}
                {activeTab === 'sales' && (
                  <SalesPage
                    sales={sales}
                    vendors={vendors}
                    fruits={fruits}
                    openModalSignal={saleModalSignal}
                    onRefresh={loadAllData}
                  />
                )}
                {activeTab === 'reports' && <ReportsPage />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
