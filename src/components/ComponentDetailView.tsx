import React, { useMemo, useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  BookmarkPlus,
  AlertTriangle,
  Search,
  CheckCircle2,
  Percent,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BudgetAccount,
  ComponentTemplate,
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
  generateId,
  getAccountMonthTotals,
  getMonthLabel,
  getPreviousMonthKey,
  parseNumericInput,
} from '../utils/format';

interface ComponentDetailViewProps {
  accounts: BudgetAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  monthKey: string;
  templates: ComponentTemplate[];
  onSaveAccountComponents: (accountId: string, components: RealizationComponent[]) => void;
  onUpdateMonevMeta: (accountId: string, patch: Partial<MonthlyMonevMeta>) => void;
  onCopyAccountFromPrevMonth: (accountId: string) => void;
  onToggleSubmitted: (accountId: string, submitted: boolean) => void;
}

export const ComponentDetailView: React.FC<ComponentDetailViewProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  monthKey,
  templates,
  onSaveAccountComponents,
  onUpdateMonevMeta,
  onCopyAccountFromPrevMonth,
  onToggleSubmitted,
}) => {
  const [accountQuery, setAccountQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '');

  const activeAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.kodeRekening.toLowerCase().includes(q) ||
        a.uraianRekening.toLowerCase().includes(q)
    );
  }, [accounts, accountQuery]);

  if (!activeAccount) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-500">
        Belum ada rekening belanja pada SKPD ini. Gunakan tombol Tambah Rekening di kanan atas.
      </div>
    );
  }

  const components = activeAccount.realisasiPerBulan[monthKey] ?? [];
  const totals = getAccountMonthTotals(activeAccount, monthKey);
  const prevMonthKey = getPreviousMonthKey(monthKey);
  const hasPrevMonth = prevMonthKey
    ? (activeAccount.realisasiPerBulan[prevMonthKey] ?? []).length > 0
    : false;
  const monthLabel = getMonthLabel(monthKey);
  const isSubmitted = Boolean(activeAccount.terinputSiapSatya[monthKey]);

  const handleAddEmptyComponent = () => {
    const newComp: RealizationComponent = {
      id: generateId('cmp'),
      uraianKomponen: 'Komponen Belanja Baru',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 0,
      bruto: 0,
      jenisPencairan: 'GU',
      skemaPajak: 'bebas',
      ppn: 0,
      pph: 0,
      netto: 0,
      noSp2d: '',
      tanggal: `${monthKey}-15`,
      rekanan: '',
      keterangan: '',
    };
    onSaveAccountComponents(activeAccount.id, [...components, newComp]);
  };

  const handleApplyTemplate = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const bruto = tpl.hargaSatuan;
    const tax = calculateTaxBreakdown(bruto, tpl.skemaPajak);
    const newComp: RealizationComponent = {
      id: generateId('cmp'),
      uraianKomponen: tpl.uraianKomponen,
      volume: 1,
      satuan: tpl.satuan,
      hargaSatuan: tpl.hargaSatuan,
      bruto,
      jenisPencairan: tpl.jenisPencairan,
      skemaPajak: tpl.skemaPajak,
      ppn: tax.ppn,
      pph: tax.pph,
      netto: tax.netto,
      noSp2d: '',
      tanggal: `${monthKey}-15`,
      rekanan: tpl.rekananDefault,
      keterangan: `Dari template: ${tpl.nama}`,
    };
    onSaveAccountComponents(activeAccount.id, [...components, newComp]);
  };

  const dpaItems = activeAccount.dpaItems ?? [];

  const handleLoadDpaItems = () => {
    if (dpaItems.length === 0) return;

    const inferJenisPencairan = (kode: string): JenisPencairan => {
      if (
        kode.startsWith('5.1.01') ||
        kode.startsWith('5.2') ||
        kode.startsWith('5.1.02.02.008') ||
        kode.startsWith('5.1.02.02.009')
      ) {
        return 'LS';
      }
      return 'GU';
    };

    const inferTaxScheme = (kode: string, ppnPersen: number): TaxSchemeId => {
      if (kode.startsWith('5.1.01') || kode.startsWith('5.1.02.04') || kode.includes('.00052')) {
        return 'bebas';
      }
      if (
        kode.includes('.00003') ||
        kode.includes('.00004') ||
        kode.includes('.00080') ||
        kode.includes('.00081')
      ) {
        return 'pph21_15';
      }
      if (kode.startsWith('5.1.02.02')) {
        return ppnPersen > 0 ? 'ppn11_pph23' : 'bebas';
      }
      return ppnPersen > 0 ? 'ppn11_pph22' : 'bebas';
    };

    const loaded: RealizationComponent[] = dpaItems.map((spec) => {
      const bruto = Math.round(spec.jumlahDpa);
      const hargaSatuan = Math.round(
        spec.volume > 0 ? spec.jumlahDpa / spec.volume : spec.jumlahDpa
      );
      const skemaPajak = inferTaxScheme(activeAccount.kodeRekening, spec.ppnPersen);
      const tax = calculateTaxBreakdown(bruto, skemaPajak);
      return {
        id: generateId('cmp'),
        uraianKomponen: spec.uraianKomponen,
        volume: spec.volume,
        satuan: spec.satuan,
        hargaSatuan,
        bruto,
        jenisPencairan: inferJenisPencairan(activeAccount.kodeRekening),
        skemaPajak,
        ppn: tax.ppn,
        pph: tax.pph,
        netto: tax.netto,
        noSp2d: '',
        tanggal: `${monthKey}-15`,
        rekanan: '',
        keterangan:
          spec.ppnPersen > 0
            ? `Sesuai Rincian DPPA 2026 (Termasuk PPN ${spec.ppnPersen}%)`
            : 'Sesuai Rincian DPPA-SKPD 2026',
      };
    });

    onSaveAccountComponents(activeAccount.id, [...components, ...loaded]);
  };

  const handleUpdateComponent = (
    compId: string,
    updater: (prev: RealizationComponent) => RealizationComponent
  ) => {
    const next = components.map((c) => (c.id === compId ? updater(c) : c));
    onSaveAccountComponents(activeAccount.id, next);
  };

  const handleRemoveComponent = (compId: string) => {
    const next = components.filter((c) => c.id !== compId);
    onSaveAccountComponents(activeAccount.id, next);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-900 mb-2">
            Daftar Rekening Belanja ({accounts.length})
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
              placeholder="Cari rekening..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
          {filteredAccounts.map((acc) => {
            const accTotals = getAccountMonthTotals(acc, monthKey);
            const selected = acc.id === activeAccount.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono tabular-nums text-xs font-semibold ${
                      selected ? 'text-teal-800' : 'text-slate-900'
                    }`}
                  >
                    {acc.kodeRekening}
                  </span>
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      accTotals.sisaPagu < 0
                        ? 'text-red-600 font-semibold'
                        : accTotals.komponenCount > 0
                        ? 'text-teal-700 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {accTotals.komponenCount} item
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-700 line-clamp-2">
                  {acc.uraianRekening}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs font-mono tabular-nums text-slate-500">
                  <span>{monthLabel}: {formatIDR(accTotals.brutoBulanIni)}</span>
                  <span>Fisik {accTotals.monev.realisasiFisikPersen}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono tabular-nums font-semibold text-teal-800">
                  {activeAccount.kodeRekening}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeAccount.jenisBelanja}</span>
                <span aria-hidden="true">·</span>
                <span>Sumber Dana {activeAccount.sumberDana}</span>
              </div>
              <h2 className="mt-1 font-display text-base font-semibold text-slate-900">
                {activeAccount.uraianRekening}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeAccount.program} · {activeAccount.subKegiatan}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleSubmitted(activeAccount.id, !isSubmitted)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isSubmitted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isSubmitted ? 'Sudah Terinput SIAP SATYA' : 'Tandai Sudah Input SIAP SATYA'}
              </span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-slate-500">Pagu DPA</div>
              <div className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900">
                {formatIDR(activeAccount.paguDpa)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Realisasi s.d. Lalu</div>
              <div className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900">
                {formatIDR(totals.sdBulanLalu)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Bruto {monthLabel}</div>
              <div className="mt-0.5 font-mono tabular-nums font-semibold text-teal-700">
                {formatIDR(totals.brutoBulanIni)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Sisa Pagu</div>
              <div
                className={`mt-0.5 font-mono tabular-nums font-semibold ${
                  totals.sisaPagu < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatIDR(totals.sisaPagu)}
              </div>
            </div>
          </div>

          {totals.sisaPagu < 0 && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-xs font-medium text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Total realisasi melebihi Pagu DPA sebesar {formatIDR(Math.abs(totals.sisaPagu))}.
                Periksa kembali volume atau nominal komponen sebelum setor ke SIAP SATYA.
              </span>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-900">
              Target Anggaran Kas, Progres Fisik & Catatan e-Monev ({monthLabel} 2026)
            </h3>
            <button
              type="button"
              onClick={() =>
                onUpdateMonevMeta(activeAccount.id, {
                  realisasiFisikPersen: Number(totals.persenSerapan.toFixed(1)),
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Percent className="w-3 h-3" />
              <span>Samakan Fisik = Serapan Keuangan ({totals.persenSerapan.toFixed(1)}%)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">
                Target Anggaran Kas {monthLabel} (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberID(totals.monev.targetKeuangan)}
                onChange={(e) =>
                  onUpdateMonevMeta(activeAccount.id, {
                    targetKeuangan: parseNumericInput(e.target.value),
                  })
                }
                className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Target Fisik Kumulatif (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={totals.monev.targetFisikPersen}
                onChange={(e) =>
                  onUpdateMonevMeta(activeAccount.id, {
                    targetFisikPersen: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
                className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Realisasi Fisik Kumulatif (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={totals.monev.realisasiFisikPersen}
                onChange={(e) =>
                  onUpdateMonevMeta(activeAccount.id, {
                    realisasiFisikPersen: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
                className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Deviasi Fisik</label>
              <div
                className={`px-2.5 py-1.5 font-mono tabular-nums text-right font-semibold border rounded ${
                  totals.deviasiFisik < -10
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {totals.deviasiFisik >= 0 ? '+' : ''}
                {totals.deviasiFisik.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">
                Kendala / Permasalahan (bila ada deviasi)
              </label>
              <input
                type="text"
                value={totals.monev.kendala}
                onChange={(e) =>
                  onUpdateMonevMeta(activeAccount.id, { kendala: e.target.value })
                }
                placeholder="Contoh: Menunggu verifikasi SPJ dari PPK"
                className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Tindak Lanjut / Rencana Aksi</label>
              <input
                type="text"
                value={totals.monev.tindakLanjut}
                onChange={(e) =>
                  onUpdateMonevMeta(activeAccount.id, { tindakLanjut: e.target.value })
                }
                placeholder="Contoh: Pengajuan GU Tahap II minggu depan"
                className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-900">
              Rincian Komponen Realisasi — {monthLabel} 2026 ({components.length} komponen)
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dpaItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleLoadDpaItems}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Muat Item Rincian DPA ({dpaItems.length})</span>
                </button>
              )}

              {hasPrevMonth && (
                <button
                  type="button"
                  onClick={() => onCopyAccountFromPrevMonth(activeAccount.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Bulan Lalu</span>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  aria-label="Pilih template komponen"
                  className="px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      Template: {t.nama}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyTemplate}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Terapkan</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddEmptyComponent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Komponen</span>
              </button>
            </div>
          </div>

          {components.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Belum ada komponen realisasi di bulan {monthLabel} 2026 untuk rekening ini.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {dpaItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLoadDpaItems}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Muat {dpaItems.length} Item Rincian DPA</span>
                  </button>
                )}
                {hasPrevMonth && (
                  <button
                    type="button"
                    onClick={() => onCopyAccountFromPrevMonth(activeAccount.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin dari Bulan Lalu</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddEmptyComponent}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Komponen Pertama</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {components.map((comp, idx) => (
                <div key={comp.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Komponen {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(comp.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-6">
                      <label className="block text-slate-600 mb-1">
                        Uraian Komponen / Item Belanja
                      </label>
                      <input
                        type="text"
                        value={comp.uraianKomponen}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            uraianKomponen: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">Volume</label>
                      <input
                        type="number"
                        min={0}
                        value={comp.volume}
                        onChange={(e) => {
                          const volume = Math.max(0, Number(e.target.value) || 0);
                          handleUpdateComponent(comp.id, (prev) => {
                            const bruto = Math.round(volume * prev.hargaSatuan);
                            const tax = calculateTaxBreakdown(
                              bruto,
                              prev.skemaPajak,
                              prev.ppn,
                              prev.pph
                            );
                            return { ...prev, volume, bruto, ...tax };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">Satuan</label>
                      <input
                        type="text"
                        value={comp.satuan}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            satuan: e.target.value,
                          }))
                        }
                        placeholder="Paket / Rim / OB"
                        className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">Harga Satuan (Rp)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberID(comp.hargaSatuan)}
                        onChange={(e) => {
                          const hargaSatuan = parseNumericInput(e.target.value);
                          handleUpdateComponent(comp.id, (prev) => {
                            const bruto = Math.round(prev.volume * hargaSatuan);
                            const tax = calculateTaxBreakdown(
                              bruto,
                              prev.skemaPajak,
                              prev.ppn,
                              prev.pph
                            );
                            return { ...prev, hargaSatuan, bruto, ...tax };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">Jenis Pencairan</label>
                      <select
                        value={comp.jenisPencairan}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            jenisPencairan: e.target.value as JenisPencairan,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      >
                        <option value="GU">GU</option>
                        <option value="LS">LS</option>
                        <option value="UP">UP</option>
                        <option value="TU">TU</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-slate-600 mb-1">Skema Pajak Otomatis</label>
                      <select
                        value={comp.skemaPajak}
                        onChange={(e) => {
                          const skemaPajak = e.target.value as TaxSchemeId;
                          handleUpdateComponent(comp.id, (prev) => {
                            const tax = calculateTaxBreakdown(
                              prev.bruto,
                              skemaPajak,
                              prev.ppn,
                              prev.pph
                            );
                            return { ...prev, skemaPajak, ...tax };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      >
                        {TAX_SCHEMES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">PPN (Rp)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={comp.skemaPajak !== 'custom'}
                        value={formatNumberID(comp.ppn)}
                        onChange={(e) => {
                          const ppn = parseNumericInput(e.target.value);
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            ppn,
                            netto: Math.max(0, prev.bruto - ppn - prev.pph),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">PPh (Rp)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={comp.skemaPajak !== 'custom'}
                        value={formatNumberID(comp.pph)}
                        onChange={(e) => {
                          const pph = parseNumericInput(e.target.value);
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            pph,
                            netto: Math.max(0, prev.bruto - prev.ppn - pph),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1">Bruto Total</label>
                      <div className="px-2.5 py-1.5 font-mono tabular-nums text-right font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded">
                        {formatNumberID(comp.bruto)}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 mb-1">No. SP2D / SPM / Bukti</label>
                      <input
                        type="text"
                        value={comp.noSp2d}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            noSp2d: e.target.value,
                          }))
                        }
                        placeholder="0568/SP2D-GU/XI/2026"
                        className="w-full px-2.5 py-1.5 font-mono text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 mb-1">Tanggal Transaksi</label>
                      <input
                        type="date"
                        value={comp.tanggal}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            tanggal: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 font-mono text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 mb-1">Rekanan / Penerima</label>
                      <input
                        type="text"
                        value={comp.rekanan}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, (prev) => ({
                            ...prev,
                            rekanan: e.target.value,
                          }))
                        }
                        placeholder="Nama CV / PT / Penerima"
                        className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 mb-1">Netto Dibayarkan</label>
                      <div className="px-2.5 py-1.5 font-mono tabular-nums text-right font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded">
                        {formatIDR(comp.netto)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
