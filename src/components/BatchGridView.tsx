import React, { useMemo, useState } from 'react';
import {
  Search,
  Copy,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Percent,
} from 'lucide-react';
import {
  BudgetAccount,
  JenisPencairan,
  MonthlyMonevMeta,
  RealizationComponent,
  TaxSchemeId,
} from '../types/budget';
import {
  TAX_SCHEMES,
  calculateTaxBreakdown,
  formatIDR,
  formatNumberID,
  getAccountMonthTotals,
  getMonthLabel,
  getPreviousMonthKey,
  parseNumericInput,
  summarizeComponentsText,
} from '../utils/format';

interface BatchGridViewProps {
  accounts: BudgetAccount[];
  monthKey: string;
  onQuickUpdateSingleComponent: (
    accountId: string,
    patch: Partial<RealizationComponent>
  ) => void;
  onUpdateMonevMeta: (accountId: string, patch: Partial<MonthlyMonevMeta>) => void;
  onCopyAccountFromPrevMonth: (accountId: string) => void;
  onOpenAccountDetail: (accountId: string) => void;
  onBulkCopyFromPrevMonth: (accountIds: string[]) => void;
  onBulkSyncPhysicalToFinancial: (accountIds: string[]) => void;
  onBulkToggleSubmitted: (accountIds: string[], submitted: boolean) => void;
  onBulkClearMonth: (accountIds: string[]) => void;
}

type StatusFilter = 'all' | 'unfilled' | 'filled' | 'over';

export const BatchGridView: React.FC<BatchGridViewProps> = ({
  accounts,
  monthKey,
  onQuickUpdateSingleComponent,
  onUpdateMonevMeta,
  onCopyAccountFromPrevMonth,
  onOpenAccountDetail,
  onBulkCopyFromPrevMonth,
  onBulkSyncPhysicalToFinancial,
  onBulkToggleSubmitted,
  onBulkClearMonth,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [jenisFilter, setJenisFilter] = useState<string>('all');
  const [subKegiatanFilter, setSubKegiatanFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const subKegiatanOptions = useMemo(() => {
    const set = new Set<string>();
    for (const acc of accounts) {
      if (acc.subKegiatan) set.add(acc.subKegiatan);
    }
    return Array.from(set);
  }, [accounts]);

  const effectiveSubFilter = subKegiatanOptions.includes(subKegiatanFilter)
    ? subKegiatanFilter
    : 'all';

  const prevMonthKey = getPreviousMonthKey(monthKey);
  const monthLabel = getMonthLabel(monthKey);

  const enrichedRows = useMemo(() => {
    return accounts.map((acc) => {
      const totals = getAccountMonthTotals(acc, monthKey);
      const items = acc.realisasiPerBulan[monthKey] ?? [];
      const prevItems = prevMonthKey ? acc.realisasiPerBulan[prevMonthKey] ?? [] : [];
      const isSubmitted = Boolean(acc.terinputSiapSatya[monthKey]);
      const isOver = totals.sisaPagu < 0;
      const isFilled = totals.brutoBulanIni > 0;
      return {
        acc,
        totals,
        items,
        hasPrevData: prevItems.length > 0,
        isSubmitted,
        isOver,
        isFilled,
      };
    });
  }, [accounts, monthKey, prevMonthKey]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedRows.filter((row) => {
      if (jenisFilter !== 'all' && row.acc.jenisBelanja !== jenisFilter) return false;
      if (effectiveSubFilter !== 'all' && row.acc.subKegiatan !== effectiveSubFilter) return false;
      if (statusFilter === 'unfilled' && row.isFilled) return false;
      if (statusFilter === 'filled' && !row.isFilled) return false;
      if (statusFilter === 'over' && !row.isOver) return false;

      if (!q) return true;
      const sp2dMatch = row.items.some((it) => it.noSp2d.toLowerCase().includes(q));
      return (
        row.acc.kodeRekening.toLowerCase().includes(q) ||
        row.acc.uraianRekening.toLowerCase().includes(q) ||
        row.acc.subKegiatan.toLowerCase().includes(q) ||
        sp2dMatch
      );
    });
  }, [enrichedRows, search, statusFilter, jenisFilter, effectiveSubFilter]);

  const allVisibleSelected =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selectedIds.includes(r.acc.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(filteredRows.map((r) => r.acc.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredRows.map((r) => r.acc.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleRowSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const counts = useMemo(() => {
    return {
      all: enrichedRows.length,
      unfilled: enrichedRows.filter((r) => !r.isFilled).length,
      filled: enrichedRows.filter((r) => r.isFilled).length,
      over: enrichedRows.filter((r) => r.isOver).length,
    };
  }, [enrichedRows]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode rekening, uraian, SP2D..."
              aria-label="Cari rekening belanja"
              className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            aria-label="Filter kelompok belanja"
            className="px-3 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          >
            <option value="all">Semua Kelompok Belanja</option>
            <option value="Belanja Operasi - Pegawai">Belanja Operasi - Pegawai</option>
            <option value="Belanja Operasi - Barang & Jasa">Belanja Operasi - Barang & Jasa</option>
            <option value="Belanja Modal">Belanja Modal</option>
            <option value="Belanja Tidak Terduga">Belanja Tidak Terduga</option>
            <option value="Belanja Transfer">Belanja Transfer</option>
          </select>

          <select
            value={effectiveSubFilter}
            onChange={(e) => setSubKegiatanFilter(e.target.value)}
            aria-label="Filter sub kegiatan"
            className="max-w-[280px] px-3 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 truncate"
          >
            <option value="all">Semua Sub-Kegiatan ({subKegiatanOptions.length})</option>
            {subKegiatanOptions.map((sub) => (
              <option key={sub} value={sub} title={sub}>
                {sub.length > 52 ? `${sub.slice(0, 52)}...` : sub}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(
            [
              { id: 'all', label: `Semua (${counts.all})` },
              { id: 'unfilled', label: `Belum Diisi (${counts.unfilled})` },
              { id: 'filled', label: `Sudah Diisi (${counts.filled})` },
              { id: 'over', label: `Melebihi Pagu (${counts.over})` },
            ] as { id: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="px-4 py-2.5 bg-teal-50/70 border-b border-teal-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-teal-900">
            {selectedIds.length} rekening dipilih untuk aksi massal {monthLabel}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {prevMonthKey && (
              <button
                type="button"
                onClick={() => {
                  onBulkCopyFromPrevMonth(selectedIds);
                  setSelectedIds([]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-white border border-teal-200 rounded-md hover:bg-teal-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Bulan Lalu</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onBulkSyncPhysicalToFinancial(selectedIds);
                setSelectedIds([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Percent className="w-3.5 h-3.5 text-slate-500" />
              <span>Hitung Fisik = % Keuangan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onBulkToggleSubmitted(selectedIds, true);
                setSelectedIds([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tandai Terinput SIAP SATYA</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onBulkClearMonth(selectedIds);
                setSelectedIds([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan {monthLabel}</span>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
              <th className="py-2.5 pl-4 pr-2 w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Pilih semua rekening yang tampil"
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
              </th>
              <th className="py-2.5 px-3 min-w-[260px]">Kode & Uraian Rekening</th>
              <th className="py-2.5 px-3 text-right min-w-[135px]">Pagu & Sisa</th>
              <th className="py-2.5 px-3 text-right min-w-[155px]">
                Realisasi {monthLabel} (Bruto)
              </th>
              <th className="py-2.5 px-3 text-right min-w-[125px]">
                Realisasi Fisik (%)
              </th>
              <th className="py-2.5 px-3 min-w-[85px]">Jenis</th>
              <th className="py-2.5 px-3 min-w-[150px]">Skema Pajak</th>
              <th className="py-2.5 px-3 text-right min-w-[125px]">Netto & Pajak</th>
              <th className="py-2.5 px-3 min-w-[140px]">No. SP2D / Bukti</th>
              <th className="py-2.5 pl-3 pr-4 text-right min-w-[135px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 px-6 text-center text-slate-500">
                  Tidak ada rekening belanja yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ acc, totals, items, hasPrevData, isSubmitted, isOver }) => {
                const isMultiComponent = items.length > 1;
                const firstItem = items[0];
                const activeScheme: TaxSchemeId = firstItem?.skemaPajak ?? 'bebas';
                const activeJenis: JenisPencairan = firstItem?.jenisPencairan ?? 'GU';
                const activeSp2d = firstItem?.noSp2d ?? '';

                return (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOver ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(acc.id)}
                        onChange={() => toggleRowSelect(acc.id)}
                        aria-label={`Pilih ${acc.kodeRekening}`}
                        className="mt-1 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                    </td>

                    <td className="py-2.5 px-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {acc.kodeRekening}
                        </span>
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terinput</span>
                          </span>
                        ) : totals.brutoBulanIni > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Siap Setor</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="text-slate-800 font-medium mt-0.5 leading-snug">
                        {acc.uraianRekening}
                      </div>
                      <div className="mt-1 text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span className="truncate max-w-[220px]" title={acc.subKegiatan}>
                          {acc.subKegiatan}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{acc.sumberDana}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {items.length > 0
                            ? summarizeComponentsText(items)
                            : 'Belum ada komponen'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums">
                      <div className="text-slate-900 font-medium">
                        {formatIDR(acc.paguDpa)}
                      </div>
                      <div
                        className={`mt-0.5 ${
                          isOver ? 'text-red-600 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        Sisa: {formatIDR(totals.sisaPagu)}
                      </div>
                      {isOver && (
                        <div className="mt-0.5 inline-flex items-center justify-end gap-1 text-red-600 font-sans font-medium">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Melebihi Pagu</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 align-top text-right">
                      {isMultiComponent ? (
                        <div>
                          <div className="font-mono tabular-nums font-semibold text-slate-900 py-1.5 px-2.5 bg-slate-100 rounded border border-slate-200 text-right">
                            {formatIDR(totals.brutoBulanIni)}
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenAccountDetail(acc.id)}
                            className="mt-1 text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
                          >
                            Gabungan {items.length} komponen
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Nominal bruto ${acc.kodeRekening}`}
                          value={
                            totals.brutoBulanIni > 0
                              ? formatNumberID(totals.brutoBulanIni)
                              : ''
                          }
                          placeholder="0"
                          onChange={(e) => {
                            const bruto = parseNumericInput(e.target.value);
                            const tax = calculateTaxBreakdown(bruto, activeScheme);
                            onQuickUpdateSingleComponent(acc.id, {
                              bruto,
                              hargaSatuan: bruto,
                              volume: 1,
                              ppn: tax.ppn,
                              pph: tax.pph,
                              netto: tax.netto,
                            });
                          }}
                          className={`w-full px-2.5 py-1.5 text-right font-mono tabular-nums rounded border focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 ${
                            isOver
                              ? 'border-red-300 bg-red-50 text-red-900'
                              : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      )}
                    </td>

                    <td className="py-2.5 px-3 align-top text-right">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          aria-label={`Realisasi fisik persen ${acc.kodeRekening}`}
                          value={totals.monev.realisasiFisikPersen || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            onUpdateMonevMeta(acc.id, { realisasiFisikPersen: val });
                          }}
                          className="w-20 px-2 py-1.5 text-right font-mono tabular-nums bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                      <div className="mt-1 font-mono tabular-nums text-[11px] text-slate-500">
                        Target {totals.monev.targetFisikPersen}%
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top">
                      <select
                        disabled={isMultiComponent}
                        aria-label={`Jenis pencairan ${acc.kodeRekening}`}
                        value={activeJenis}
                        onChange={(e) =>
                          onQuickUpdateSingleComponent(acc.id, {
                            jenisPencairan: e.target.value as JenisPencairan,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      >
                        <option value="GU">GU</option>
                        <option value="LS">LS</option>
                        <option value="UP">UP</option>
                        <option value="TU">TU</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-3 align-top">
                      <select
                        disabled={isMultiComponent}
                        aria-label={`Skema pajak ${acc.kodeRekening}`}
                        value={activeScheme}
                        onChange={(e) => {
                          const scheme = e.target.value as TaxSchemeId;
                          const bruto = totals.brutoBulanIni;
                          const tax = calculateTaxBreakdown(bruto, scheme);
                          onQuickUpdateSingleComponent(acc.id, {
                            skemaPajak: scheme,
                            ppn: tax.ppn,
                            pph: tax.pph,
                            netto: tax.netto,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      >
                        {TAX_SCHEMES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.shortLabel}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums">
                      <div className="text-slate-900 font-medium">
                        {formatIDR(totals.nettoBulanIni)}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Pjk: {formatIDR(totals.ppnBulanIni + totals.pphBulanIni)}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top">
                      {isMultiComponent ? (
                        <div className="px-2 py-1.5 font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded truncate max-w-[140px]">
                          {items.map((i) => i.noSp2d).filter(Boolean).join(', ') || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          aria-label={`Nomor SP2D ${acc.kodeRekening}`}
                          value={activeSp2d}
                          placeholder="No. SP2D / BKU"
                          onChange={(e) =>
                            onQuickUpdateSingleComponent(acc.id, {
                              noSp2d: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 font-mono text-xs text-slate-900 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                        />
                      )}
                    </td>

                    <td className="py-2.5 pl-3 pr-4 align-top text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {totals.brutoBulanIni === 0 && hasPrevData && (
                          <button
                            type="button"
                            onClick={() => onCopyAccountFromPrevMonth(acc.id)}
                            title="Salin rincian bulan lalu"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Salin</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenAccountDetail(acc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
