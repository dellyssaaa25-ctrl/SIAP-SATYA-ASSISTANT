import React from 'react';
import {
  FileSpreadsheet,
  Layers,
  Upload,
  CheckSquare,
  RotateCcw,
  Building2,
  Calendar,
} from 'lucide-react';
import { OPDProfile, WorkspaceView } from '../types/budget';
import { MONTHS_2026 } from '../utils/format';

interface SidebarProps {
  opds: OPDProfile[];
  selectedOpdId: string;
  onSelectOpd: (opdId: string) => void;
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  filledCount: number;
  totalAccounts: number;
  submittedCount: number;
  onResetDemoData: () => void;
}

const NAV_ITEMS: { id: WorkspaceView; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'grid', label: 'Input Cepat (Grid)', icon: FileSpreadsheet },
  { id: 'components', label: 'Rincian Komponen', icon: Layers },
  { id: 'import', label: 'Impor BKU / Excel', icon: Upload },
  { id: 'export', label: 'Rekap & Ekspor', icon: CheckSquare },
];

export const Sidebar: React.FC<SidebarProps> = ({
  opds,
  selectedOpdId,
  onSelectOpd,
  selectedMonthKey,
  onSelectMonth,
  activeView,
  onChangeView,
  filledCount,
  totalAccounts,
  submittedCount,
  onResetDemoData,
}) => {
  const activeOpd = opds.find((o) => o.id === selectedOpdId) ?? opds[0];

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
      <div>
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            SIAP SATYA
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            e-Monev SKPD · Kab. Pasuruan
          </p>
        </div>

        <div className="p-4 space-y-4 border-b border-slate-200">
          <div>
            <label
              htmlFor="opd-select"
              className="flex items-center justify-between gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
            >
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Perangkat Daerah (SKPD)</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-400">
                {opds.length} SKPD
              </span>
            </label>
            <select
              id="opd-select"
              value={selectedOpdId}
              onChange={(e) => onSelectOpd(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              {(
                [
                  'Sekretariat & Inspektorat',
                  'Dinas Daerah',
                  'Badan Daerah',
                  'RSUD',
                  'Kecamatan',
                ] as const
              ).map((groupName) => {
                const items = opds.filter((o) => o.kategori === groupName);
                if (items.length === 0) return null;
                return (
                  <optgroup key={groupName} label={`${groupName} (${items.length})`}>
                    {items.map((opd) => (
                      <option key={opd.id} value={opd.id}>
                        {opd.singkatan} — {opd.nama}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {activeOpd && (
              <p className="mt-1.5 text-xs text-slate-500 truncate" title={activeOpd.bendahara}>
                Bendahara: {activeOpd.bendahara}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="month-select"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Bulan Pelaporan (2026)</span>
            </label>
            <select
              id="month-select"
              value={selectedMonthKey}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              {MONTHS_2026.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} 2026
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="p-3 space-y-1" aria-label="Menu Ruang Kerja">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Rekening Terisi</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {filledCount}/{totalAccounts}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Sudah Setor SIAP SATYA</span>
            <span className="font-mono tabular-nums font-semibold text-teal-700">
              {submittedCount}/{totalAccounts}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-700 transition-all duration-200"
              style={{
                width: `${totalAccounts > 0 ? Math.min(100, (submittedCount / totalAccounts) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onResetDemoData}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Data Contoh</span>
        </button>
      </div>
    </aside>
  );
};
