import React from 'react';
import { Copy, Plus } from 'lucide-react';
import { WorkspaceView } from '../types/budget';
import { getMonthLabel, getPreviousMonthKey } from '../utils/format';

interface TopBarProps {
  opdShortName: string;
  monthKey: string;
  activeView: WorkspaceView;
  onCopyFromPreviousMonth: () => void;
  onOpenAddAccount: () => void;
}

const VIEW_TITLES: Record<WorkspaceView, string> = {
  grid: 'Input Cepat (Grid Massal)',
  components: 'Rincian Komponen & SP2D',
  import: 'Impor & Pemetaan Data BKU',
  export: 'Rekap & Ekspor SIAP SATYA',
};

export const TopBar: React.FC<TopBarProps> = ({
  opdShortName,
  monthKey,
  activeView,
  onCopyFromPreviousMonth,
  onOpenAddAccount,
}) => {
  const prevKey = getPreviousMonthKey(monthKey);
  const currentMonthLabel = getMonthLabel(monthKey);
  const prevMonthLabel = prevKey ? getMonthLabel(prevKey) : null;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
        <span className="font-medium text-slate-700 whitespace-nowrap shrink-0">
          {opdShortName}
        </span>
        <span aria-hidden="true">/</span>
        <span className="whitespace-nowrap shrink-0">{currentMonthLabel} 2026</span>
        <span aria-hidden="true">/</span>
        <h1 className="font-display font-semibold text-slate-900 truncate">
          {VIEW_TITLES[activeView]}
        </h1>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {prevMonthLabel && (
          <button
            type="button"
            onClick={onCopyFromPreviousMonth}
            title={`Salin realisasi rekening rutin yang masih kosong dari bulan ${prevMonthLabel}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Salin Bulan {prevMonthLabel}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenAddAccount}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Rekening</span>
        </button>
      </div>
    </header>
  );
};
