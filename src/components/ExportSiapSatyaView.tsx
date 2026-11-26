import React, { useMemo, useState } from 'react';
import { Download, Copy, Check, CheckCircle2, Clock } from 'lucide-react';
import { BudgetAccount, OPDProfile } from '../types/budget';
import {
  escapeCsvCell,
  formatIDR,
  getAccountMonthTotals,
  getMonthLabel,
  summarizeComponentsText,
} from '../utils/format';

interface ExportSiapSatyaViewProps {
  opd: OPDProfile;
  accounts: BudgetAccount[];
  monthKey: string;
  onToggleSubmitted: (accountId: string, submitted: boolean) => void;
}

export const ExportSiapSatyaView: React.FC<ExportSiapSatyaViewProps> = ({
  opd,
  accounts,
  monthKey,
  onToggleSubmitted,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const monthLabel = getMonthLabel(monthKey);

  const reportRows = useMemo(() => {
    return accounts.map((acc) => {
      const totals = getAccountMonthTotals(acc, monthKey);
      const items = acc.realisasiPerBulan[monthKey] ?? [];
      const isSubmitted = Boolean(acc.terinputSiapSatya[monthKey]);
      const sp2dList = items
        .map((i) => i.noSp2d)
        .filter(Boolean)
        .join('; ');
      const jenisList = Array.from(new Set(items.map((i) => i.jenisPencairan))).join('/');
      return {
        acc,
        totals,
        items,
        isSubmitted,
        sp2dList: sp2dList || '-',
        jenisList: jenisList || '-',
        ringkasanKomponen: summarizeComponentsText(items),
      };
    });
  }, [accounts, monthKey]);

  const filledRows = reportRows.filter((r) => r.totals.brutoBulanIni > 0);
  const submittedRows = filledRows.filter((r) => r.isSubmitted);

  const handleCopyAllTsv = async () => {
    const header = [
      'SKPD',
      'Bulan',
      'Program',
      'Sub-Kegiatan',
      'Kode Rekening',
      'Uraian Rekening',
      'Jenis',
      'Rincian Komponen',
      'Target Keuangan',
      'Realisasi Bruto',
      'PPN',
      'PPh',
      'Netto',
      'Target Fisik (%)',
      'Realisasi Fisik (%)',
      'Deviasi Fisik (%)',
      'No SP2D',
      'Kendala',
      'Tindak Lanjut',
    ].join('\t');

    const lines = filledRows.map((r) =>
      [
        opd.nama,
        `${monthLabel} 2026`,
        r.acc.program,
        r.acc.subKegiatan,
        r.acc.kodeRekening,
        r.acc.uraianRekening,
        r.jenisList,
        r.ringkasanKomponen,
        r.totals.monev.targetKeuangan,
        r.totals.brutoBulanIni,
        r.totals.ppnBulanIni,
        r.totals.pphBulanIni,
        r.totals.nettoBulanIni,
        r.totals.monev.targetFisikPersen,
        r.totals.monev.realisasiFisikPersen,
        r.totals.deviasiFisik.toFixed(1),
        r.sp2dList,
        r.totals.monev.kendala || '-',
        r.totals.monev.tindakLanjut || '-',
      ].join('\t')
    );

    try {
      await navigator.clipboard.writeText([header, ...lines].join('\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // Fallback if clipboard permission denied
    }
  };

  const handleDownloadCsv = () => {
    const header = [
      'Kode SKPD',
      'Nama SKPD',
      'Bulan',
      'Program',
      'Sub Kegiatan',
      'Kode Rekening',
      'Uraian Rekening',
      'Kelompok Belanja',
      'Sumber Dana',
      'Jenis Pencairan',
      'Komponen Detail',
      'Target Anggaran Kas',
      'Realisasi Bruto',
      'PPN',
      'PPh',
      'Netto',
      'Serapan Total (%)',
      'Target Fisik (%)',
      'Realisasi Fisik (%)',
      'Deviasi Fisik (%)',
      'No SP2D',
      'Kendala',
      'Tindak Lanjut',
      'Sisa Pagu',
      'Status SIAP SATYA',
    ];

    const rows = reportRows.map((r) => [
      opd.kodeOpd,
      opd.nama,
      `${monthLabel} 2026`,
      r.acc.program,
      r.acc.subKegiatan,
      r.acc.kodeRekening,
      r.acc.uraianRekening,
      r.acc.jenisBelanja,
      r.acc.sumberDana,
      r.jenisList,
      r.ringkasanKomponen,
      r.totals.monev.targetKeuangan,
      r.totals.brutoBulanIni,
      r.totals.ppnBulanIni,
      r.totals.pphBulanIni,
      r.totals.nettoBulanIni,
      r.totals.persenSerapan.toFixed(1),
      r.totals.monev.targetFisikPersen,
      r.totals.monev.realisasiFisikPersen,
      r.totals.deviasiFisik.toFixed(1),
      r.sp2dList,
      r.totals.monev.kendala || '-',
      r.totals.monev.tindakLanjut || '-',
      r.totals.sisaPagu,
      r.isSubmitted ? 'Terinput' : 'Belum Input',
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIAP-SATYA_Pasuruan_${opd.singkatan}_${monthKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyRow = async (rowId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(rowId);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Rekapitulasi & Checklist Input SIAP SATYA Kab. Pasuruan — {monthLabel} 2026
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{opd.nama}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {filledRows.length} rekening memiliki realisasi
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-teal-700 font-medium">
              {submittedRows.length}/{filledRows.length} ditandai terinput di siapsatya.pasuruankab.go.id
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={filledRows.length === 0}
            onClick={handleCopyAllTsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedAll ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copiedAll ? 'Tersalin ke Clipboard' : 'Salin Format Excel (TSV)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV Rekap</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <th className="py-2.5 px-4">Kode & Uraian Rekening</th>
                <th className="py-2.5 px-3">Jenis</th>
                <th className="py-2.5 px-3">Komponen, SP2D & Kendala</th>
                <th className="py-2.5 px-3 text-right">Bruto & Netto</th>
                <th className="py-2.5 px-3 text-right">Fisik (Real / Target)</th>
                <th className="py-2.5 px-3">Status SIAP SATYA</th>
                <th className="py-2.5 px-4 text-right">Salin Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportRows.map((row) => {
                const hasRealisasi = row.totals.brutoBulanIni > 0;
                const copyPayload = `${row.acc.kodeRekening}\t${row.totals.brutoBulanIni}\t${row.totals.monev.realisasiFisikPersen}%\t${row.totals.nettoBulanIni}\t${row.sp2dList}\t${row.ringkasanKomponen}`;
                return (
                  <tr
                    key={row.acc.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      !hasRealisasi ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 align-top max-w-[260px]">
                      <div className="font-mono tabular-nums font-semibold text-slate-900">
                        {row.acc.kodeRekening}
                      </div>
                      <div className="text-slate-700 mt-0.5 leading-snug">
                        {row.acc.uraianRekening}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top font-mono text-slate-700">
                      {row.jenisList}
                    </td>
                    <td className="py-2.5 px-3 align-top max-w-[260px]">
                      <div className="text-slate-800">{row.ringkasanKomponen}</div>
                      <div className="font-mono text-slate-500 mt-0.5">
                        SP2D: {row.sp2dList}
                      </div>
                      {row.totals.monev.kendala && (
                        <div className="text-amber-700 mt-0.5">
                          Kendala: {row.totals.monev.kendala}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums">
                      <div className="font-medium text-slate-900">
                        {formatIDR(row.totals.brutoBulanIni)}
                      </div>
                      <div className="text-teal-800 mt-0.5">
                        Netto: {formatIDR(row.totals.nettoBulanIni)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">
                        {row.totals.monev.realisasiFisikPersen}%{' '}
                        <span className="font-normal text-slate-500">
                          / {row.totals.monev.targetFisikPersen}%
                        </span>
                      </div>
                      <div
                        className={`mt-0.5 ${
                          row.totals.deviasiFisik < -10
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        Dev: {row.totals.deviasiFisik >= 0 ? '+' : ''}
                        {row.totals.deviasiFisik.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <button
                        type="button"
                        onClick={() => onToggleSubmitted(row.acc.id, !row.isSubmitted)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                          row.isSubmitted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {row.isSubmitted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Terinput</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Belum Input</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 align-top text-right">
                      <button
                        type="button"
                        disabled={!hasRealisasi}
                        onClick={() => handleCopyRow(row.acc.id, copyPayload)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedId === row.acc.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
