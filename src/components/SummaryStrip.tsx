import React from 'react';
import { formatIDR } from '../utils/format';

interface SummaryStripProps {
  totalPagu: number;
  totalSdLalu: number;
  totalBulanIni: number;
  totalNettoBulanIni: number;
  totalPajakBulanIni: number;
  avgTargetFisik: number;
  avgRealisasiFisik: number;
  overBudgetCount: number;
  monthLabel: string;
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({
  totalPagu,
  totalSdLalu,
  totalBulanIni,
  totalNettoBulanIni,
  totalPajakBulanIni,
  avgTargetFisik,
  avgRealisasiFisik,
  overBudgetCount,
  monthLabel,
}) => {
  const totalRealisasi = totalSdLalu + totalBulanIni;
  const sisaPagu = totalPagu - totalRealisasi;
  const persenSerapan = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;
  const deviasiFisik = avgRealisasiFisik - avgTargetFisik;

  return (
    <section
      aria-label="Ringkasan Realisasi Keuangan dan Fisik SKPD"
      className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
    >
      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">Total Pagu DPA SKPD</div>
        <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
          {formatIDR(totalPagu)}
        </div>
        <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
          s.d. Bulan Lalu: {formatIDR(totalSdLalu)}
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">
          Realisasi Keuangan {monthLabel}
        </div>
        <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-teal-700">
          {formatIDR(totalBulanIni)}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
          <span>Netto {formatIDR(totalNettoBulanIni)}</span>
          <span aria-hidden="true">·</span>
          <span>Pajak {formatIDR(totalPajakBulanIni)}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">
          Capaian Fisik vs Target ({monthLabel})
        </div>
        <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
          <span className="text-lg font-semibold text-slate-900">
            {avgRealisasiFisik.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-500">
            / Target {avgTargetFisik.toFixed(1)}%
          </span>
        </div>
        <div
          className={`mt-1 text-xs font-mono tabular-nums ${
            deviasiFisik < -10
              ? 'text-amber-700 font-medium'
              : 'text-emerald-700 font-medium'
          }`}
        >
          Deviasi Fisik: {deviasiFisik >= 0 ? '+' : ''}
          {deviasiFisik.toFixed(1)}%
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">Sisa Pagu & Serapan APBD</div>
        <div
          className={`mt-1 font-mono tabular-nums text-lg font-semibold ${
            sisaPagu < 0 || overBudgetCount > 0 ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          {formatIDR(sisaPagu)}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="font-mono tabular-nums text-slate-600">
            Serapan {persenSerapan.toFixed(1)}%
          </span>
          {overBudgetCount > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-medium text-red-600">
                {overBudgetCount} melebihi pagu
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
