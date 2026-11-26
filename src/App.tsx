import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_OPDS,
  INITIAL_TEMPLATES,
  createStarterAccountsForOpd,
} from './data/initialData';
import {
  BudgetAccount,
  MonthlyMonevMeta,
  RealizationComponent,
  WorkspaceView,
} from './types/budget';
import {
  generateId,
  getAccountMonthTotals,
  getDefaultMonevMeta,
  getMonthLabel,
  getPreviousMonthKey,
} from './utils/format';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SummaryStrip } from './components/SummaryStrip';
import { BatchGridView } from './components/BatchGridView';
import { ComponentDetailView } from './components/ComponentDetailView';
import { ImportMappingView } from './components/ImportMappingView';
import { ExportSiapSatyaView } from './components/ExportSiapSatyaView';
import { AddAccountModal } from './components/AddAccountModal';

const STORAGE_KEY = 'siap_satya_pasuruan_accounts_v4';

function loadInitialAccounts(): BudgetAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as BudgetAccount[];
      }
    }
  } catch {
    // Fallback to initial seeded data
  }
  return INITIAL_ACCOUNTS;
}

export default function App() {
  const [opds] = useState(INITIAL_OPDS);
  const [templates] = useState(INITIAL_TEMPLATES);
  const [accounts, setAccounts] = useState<BudgetAccount[]>(loadInitialAccounts);
  const [selectedOpdId, setSelectedOpdId] = useState<string>('opd-dcktr');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-11');
  const [activeView, setActiveView] = useState<WorkspaceView>('grid');
  const [focusedAccountId, setFocusedAccountId] = useState<string>(
    INITIAL_ACCOUNTS.find((a) => a.opdId === 'opd-dcktr')?.id ?? INITIAL_ACCOUNTS[0].id
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // Ignore quota errors
    }
  }, [accounts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const activeOpd = useMemo(
    () => opds.find((o) => o.id === selectedOpdId) ?? opds[0],
    [opds, selectedOpdId]
  );

  const opdAccounts = useMemo(
    () => accounts.filter((a) => a.opdId === selectedOpdId),
    [accounts, selectedOpdId]
  );

  const handleSelectOpd = (opdId: string) => {
    setSelectedOpdId(opdId);
    const existing = accounts.filter((a) => a.opdId === opdId);
    if (existing.length > 0) {
      setFocusedAccountId(existing[0].id);
      return;
    }

    const targetOpd = opds.find((o) => o.id === opdId);
    if (targetOpd) {
      const starter = createStarterAccountsForOpd(targetOpd);
      setAccounts((prev) => [...prev, ...starter]);
      setFocusedAccountId(starter[0].id);
    }
  };

  const summary = useMemo(() => {
    let totalPagu = 0;
    let totalSdLalu = 0;
    let totalBulanIni = 0;
    let totalNettoBulanIni = 0;
    let totalPajakBulanIni = 0;
    let overBudgetCount = 0;
    let filledCount = 0;
    let submittedCount = 0;
    let sumTargetFisik = 0;
    let sumRealisasiFisik = 0;

    for (const acc of opdAccounts) {
      const t = getAccountMonthTotals(acc, selectedMonthKey);
      totalPagu += acc.paguDpa;
      totalSdLalu += t.sdBulanLalu;
      totalBulanIni += t.brutoBulanIni;
      totalNettoBulanIni += t.nettoBulanIni;
      totalPajakBulanIni += t.ppnBulanIni + t.pphBulanIni;
      sumTargetFisik += t.monev.targetFisikPersen;
      sumRealisasiFisik += t.monev.realisasiFisikPersen;
      if (t.sisaPagu < 0) overBudgetCount += 1;
      if (t.brutoBulanIni > 0) filledCount += 1;
      if (acc.terinputSiapSatya[selectedMonthKey]) submittedCount += 1;
    }

    const count = opdAccounts.length || 1;

    return {
      totalPagu,
      totalSdLalu,
      totalBulanIni,
      totalNettoBulanIni,
      totalPajakBulanIni,
      avgTargetFisik: sumTargetFisik / count,
      avgRealisasiFisik: sumRealisasiFisik / count,
      overBudgetCount,
      filledCount,
      submittedCount,
    };
  }, [opdAccounts, selectedMonthKey]);

  const clonePreviousMonthItems = (
    prevItems: RealizationComponent[],
    targetMonthKey: string
  ): RealizationComponent[] => {
    return prevItems.map((item) => ({
      ...item,
      id: generateId('cmp'),
      noSp2d: '',
      tanggal: `${targetMonthKey}-15`,
      keterangan: item.keterangan
        ? `Salinan rutin (${item.keterangan})`
        : 'Salinan realisasi bulan sebelumnya',
    }));
  };

  const handleCopyAllEmptyFromPrevMonth = () => {
    const prevKey = getPreviousMonthKey(selectedMonthKey);
    if (!prevKey) return;

    let copiedCount = 0;
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.opdId !== selectedOpdId) return acc;
        const currentItems = acc.realisasiPerBulan[selectedMonthKey] ?? [];
        const prevItems = acc.realisasiPerBulan[prevKey] ?? [];
        if (currentItems.length === 0 && prevItems.length > 0) {
          copiedCount += 1;
          const totalsAfter = getAccountMonthTotals(
            {
              ...acc,
              realisasiPerBulan: {
                ...acc.realisasiPerBulan,
                [selectedMonthKey]: clonePreviousMonthItems(prevItems, selectedMonthKey),
              },
            },
            selectedMonthKey
          );
          const currentMonev = getDefaultMonevMeta(acc, selectedMonthKey);
          return {
            ...acc,
            realisasiPerBulan: {
              ...acc.realisasiPerBulan,
              [selectedMonthKey]: clonePreviousMonthItems(prevItems, selectedMonthKey),
            },
            monevPerBulan: {
              ...acc.monevPerBulan,
              [selectedMonthKey]: {
                ...currentMonev,
                realisasiFisikPersen:
                  currentMonev.realisasiFisikPersen ||
                  Number(Math.min(100, totalsAfter.persenSerapan).toFixed(1)),
              },
            },
          };
        }
        return acc;
      })
    );

    const prevLabel = getMonthLabel(prevKey);
    if (copiedCount > 0) {
      showToast(
        `${copiedCount} rekening rutin yang masih kosong disalin dari bulan ${prevLabel}.`
      );
    } else {
      showToast(
        `Semua rekening yang memiliki data di bulan ${prevLabel} sudah terisi pada bulan ini.`
      );
    }
  };

  const handleCopySingleAccountFromPrevMonth = (accountId: string) => {
    const prevKey = getPreviousMonthKey(selectedMonthKey);
    if (!prevKey) return;

    let didCopy = false;
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const prevItems = acc.realisasiPerBulan[prevKey] ?? [];
        if (prevItems.length === 0) return acc;
        didCopy = true;
        return {
          ...acc,
          realisasiPerBulan: {
            ...acc.realisasiPerBulan,
            [selectedMonthKey]: clonePreviousMonthItems(prevItems, selectedMonthKey),
          },
        };
      })
    );

    if (didCopy) {
      showToast(`Komponen realisasi disalin dari bulan ${getMonthLabel(prevKey)}.`);
    }
  };

  const handleQuickUpdateSingleComponent = (
    accountId: string,
    patch: Partial<RealizationComponent>
  ) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const currentItems = acc.realisasiPerBulan[selectedMonthKey] ?? [];
        if (currentItems.length > 1) return acc;

        const baseItem: RealizationComponent = currentItems[0] ?? {
          id: generateId('cmp'),
          uraianKomponen: `Realisasi ${acc.uraianRekening}`,
          volume: 1,
          satuan: 'Paket',
          hargaSatuan: 0,
          bruto: 0,
          jenisPencairan: acc.jenisBelanja.includes('Pegawai') ? 'LS' : 'GU',
          skemaPajak: 'bebas',
          ppn: 0,
          pph: 0,
          netto: 0,
          noSp2d: '',
          tanggal: `${selectedMonthKey}-15`,
          rekanan: '',
          keterangan: '',
        };

        const updated: RealizationComponent = {
          ...baseItem,
          ...patch,
        };

        const isEmptyRow =
          updated.bruto === 0 && !updated.noSp2d.trim() && currentItems.length <= 1;

        return {
          ...acc,
          realisasiPerBulan: {
            ...acc.realisasiPerBulan,
            [selectedMonthKey]:
              isEmptyRow && patch.bruto === 0 ? [] : [updated],
          },
        };
      })
    );
  };

  const handleUpdateMonevMeta = (
    accountId: string,
    patch: Partial<MonthlyMonevMeta>
  ) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const base = getDefaultMonevMeta(acc, selectedMonthKey);
        return {
          ...acc,
          monevPerBulan: {
            ...acc.monevPerBulan,
            [selectedMonthKey]: {
              ...base,
              ...patch,
            },
          },
        };
      })
    );
  };

  const handleSaveAccountComponents = (
    accountId: string,
    components: RealizationComponent[]
  ) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              realisasiPerBulan: {
                ...acc.realisasiPerBulan,
                [selectedMonthKey]: components,
              },
            }
          : acc
      )
    );
  };

  const handleBulkCopyFromPrevMonth = (accountIds: string[]) => {
    const prevKey = getPreviousMonthKey(selectedMonthKey);
    if (!prevKey) return;
    const idSet = new Set(accountIds);
    let copiedCount = 0;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (!idSet.has(acc.id)) return acc;
        const prevItems = acc.realisasiPerBulan[prevKey] ?? [];
        if (prevItems.length === 0) return acc;
        copiedCount += 1;
        return {
          ...acc,
          realisasiPerBulan: {
            ...acc.realisasiPerBulan,
            [selectedMonthKey]: clonePreviousMonthItems(prevItems, selectedMonthKey),
          },
        };
      })
    );

    showToast(`${copiedCount} rekening terpilih disalin dari bulan ${getMonthLabel(prevKey)}.`);
  };

  const handleBulkSyncPhysicalToFinancial = (accountIds: string[]) => {
    const idSet = new Set(accountIds);
    setAccounts((prev) =>
      prev.map((acc) => {
        if (!idSet.has(acc.id)) return acc;
        const totals = getAccountMonthTotals(acc, selectedMonthKey);
        const base = getDefaultMonevMeta(acc, selectedMonthKey);
        return {
          ...acc,
          monevPerBulan: {
            ...acc.monevPerBulan,
            [selectedMonthKey]: {
              ...base,
              realisasiFisikPersen: Number(
                Math.min(100, totals.persenSerapan).toFixed(1)
              ),
            },
          },
        };
      })
    );
    showToast(
      `Realisasi fisik (%) untuk ${accountIds.length} rekening disamakan dengan persentase serapan keuangan.`
    );
  };

  const handleBulkToggleSubmitted = (accountIds: string[], submitted: boolean) => {
    const idSet = new Set(accountIds);
    setAccounts((prev) =>
      prev.map((acc) =>
        idSet.has(acc.id)
          ? {
              ...acc,
              terinputSiapSatya: {
                ...acc.terinputSiapSatya,
                [selectedMonthKey]: submitted,
              },
            }
          : acc
      )
    );
    showToast(`${accountIds.length} rekening ditandai terinput di SIAP SATYA.`);
  };

  const handleBulkClearMonth = (accountIds: string[]) => {
    const idSet = new Set(accountIds);
    setAccounts((prev) =>
      prev.map((acc) =>
        idSet.has(acc.id)
          ? {
              ...acc,
              realisasiPerBulan: {
                ...acc.realisasiPerBulan,
                [selectedMonthKey]: [],
              },
              terinputSiapSatya: {
                ...acc.terinputSiapSatya,
                [selectedMonthKey]: false,
              },
            }
          : acc
      )
    );
    showToast(
      `Realisasi bulan ${getMonthLabel(selectedMonthKey)} untuk ${accountIds.length} rekening dikosongkan.`
    );
  };

  const handleToggleSubmitted = (accountId: string, submitted: boolean) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              terinputSiapSatya: {
                ...acc.terinputSiapSatya,
                [selectedMonthKey]: submitted,
              },
            }
          : acc
      )
    );
  };

  const handleApplyImportedComponents = (
    entries: { accountId: string; component: RealizationComponent }[],
    mode: 'append' | 'replace'
  ) => {
    const grouped = new Map<string, RealizationComponent[]>();
    for (const entry of entries) {
      const existing = grouped.get(entry.accountId) ?? [];
      existing.push(entry.component);
      grouped.set(entry.accountId, existing);
    }

    setAccounts((prev) =>
      prev.map((acc) => {
        const incoming = grouped.get(acc.id);
        if (!incoming) return acc;
        const current = acc.realisasiPerBulan[selectedMonthKey] ?? [];
        const nextItems = mode === 'replace' ? incoming : [...current, ...incoming];
        return {
          ...acc,
          realisasiPerBulan: {
            ...acc.realisasiPerBulan,
            [selectedMonthKey]: nextItems,
          },
        };
      })
    );

    showToast(`${entries.length} komponen hasil impor diterapkan ke ${getMonthLabel(selectedMonthKey)}.`);
  };

  const handleAddAccount = (newAccount: BudgetAccount) => {
    setAccounts((prev) => [...prev, newAccount]);
    setFocusedAccountId(newAccount.id);
    showToast(`Rekening ${newAccount.kodeRekening} berhasil ditambahkan.`);
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccounts(INITIAL_ACCOUNTS);
    setSelectedOpdId('opd-dcktr');
    setSelectedMonthKey('2026-11');
    setFocusedAccountId(
      INITIAL_ACCOUNTS.find((a) => a.opdId === 'opd-dcktr')?.id ?? INITIAL_ACCOUNTS[0].id
    );
    showToast('Data DPPA-SKPD DCKTR & SKPD Kab. Pasuruan dikembalikan ke kondisi awal.');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      <Sidebar
        opds={opds}
        selectedOpdId={selectedOpdId}
        onSelectOpd={handleSelectOpd}
        selectedMonthKey={selectedMonthKey}
        onSelectMonth={setSelectedMonthKey}
        activeView={activeView}
        onChangeView={setActiveView}
        filledCount={summary.filledCount}
        totalAccounts={opdAccounts.length}
        submittedCount={summary.submittedCount}
        onResetDemoData={handleResetDemoData}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          opdShortName={activeOpd.singkatan}
          monthKey={selectedMonthKey}
          activeView={activeView}
          onCopyFromPreviousMonth={handleCopyAllEmptyFromPrevMonth}
          onOpenAddAccount={() => setIsAddModalOpen(true)}
        />

        <main className="flex-1 p-5 lg:p-6 space-y-5 max-w-[1440px] w-full mx-auto">
          {toastMessage && (
            <div
              role="status"
              className="px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-md flex items-center justify-between gap-3 text-xs font-medium text-teal-900"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                aria-label="Tutup notifikasi"
                className="text-teal-700 hover:text-teal-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <SummaryStrip
            totalPagu={summary.totalPagu}
            totalSdLalu={summary.totalSdLalu}
            totalBulanIni={summary.totalBulanIni}
            totalNettoBulanIni={summary.totalNettoBulanIni}
            totalPajakBulanIni={summary.totalPajakBulanIni}
            avgTargetFisik={summary.avgTargetFisik}
            avgRealisasiFisik={summary.avgRealisasiFisik}
            overBudgetCount={summary.overBudgetCount}
            monthLabel={getMonthLabel(selectedMonthKey)}
          />

          {activeView === 'grid' && (
            <BatchGridView
              accounts={opdAccounts}
              monthKey={selectedMonthKey}
              onQuickUpdateSingleComponent={handleQuickUpdateSingleComponent}
              onUpdateMonevMeta={handleUpdateMonevMeta}
              onCopyAccountFromPrevMonth={handleCopySingleAccountFromPrevMonth}
              onOpenAccountDetail={(accountId) => {
                setFocusedAccountId(accountId);
                setActiveView('components');
              }}
              onBulkCopyFromPrevMonth={handleBulkCopyFromPrevMonth}
              onBulkSyncPhysicalToFinancial={handleBulkSyncPhysicalToFinancial}
              onBulkToggleSubmitted={handleBulkToggleSubmitted}
              onBulkClearMonth={handleBulkClearMonth}
            />
          )}

          {activeView === 'components' && (
            <ComponentDetailView
              accounts={opdAccounts}
              selectedAccountId={focusedAccountId}
              onSelectAccount={setFocusedAccountId}
              monthKey={selectedMonthKey}
              templates={templates}
              onSaveAccountComponents={handleSaveAccountComponents}
              onUpdateMonevMeta={handleUpdateMonevMeta}
              onCopyAccountFromPrevMonth={handleCopySingleAccountFromPrevMonth}
              onToggleSubmitted={handleToggleSubmitted}
            />
          )}

          {activeView === 'import' && (
            <ImportMappingView
              accounts={opdAccounts}
              monthKey={selectedMonthKey}
              onApplyImportedComponents={handleApplyImportedComponents}
            />
          )}

          {activeView === 'export' && (
            <ExportSiapSatyaView
              opd={activeOpd}
              accounts={opdAccounts}
              monthKey={selectedMonthKey}
              onToggleSubmitted={handleToggleSubmitted}
            />
          )}
        </main>
      </div>

      <AddAccountModal
        isOpen={isAddModalOpen}
        opdId={selectedOpdId}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddAccount}
      />
    </div>
  );
}
