import React, { useMemo, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import {
  BudgetAccount,
  JenisPencairan,
  RealizationComponent,
  TaxSchemeId,
} from '../types/budget';
import {
  calculateTaxBreakdown,
  formatIDR,
  generateId,
  getMonthLabel,
  parseNumericInput,
} from '../utils/format';

interface ImportMappingViewProps {
  accounts: BudgetAccount[];
  monthKey: string;
  onApplyImportedComponents: (
    entries: { accountId: string; component: RealizationComponent }[],
    mode: 'append' | 'replace'
  ) => void;
}

interface ParsedImportRow {
  rowIndex: number;
  rawKode: string;
  matchedAccountId: string;
  uraianKomponen: string;
  bruto: number;
  jenisPencairan: JenisPencairan;
  skemaPajak: TaxSchemeId;
  noSp2d: string;
  rekanan: string;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(';')) return ';';
  return ',';
}

function parseJenis(raw: string): JenisPencairan {
  const up = raw.trim().toUpperCase();
  if (up === 'LS' || up === 'UP' || up === 'TU' || up === 'GU') return up;
  return 'GU';
}

function parseTaxScheme(raw: string): TaxSchemeId {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('22')) return 'ppn11_pph22';
  if (lower.includes('23')) return 'ppn11_pph23';
  if (lower.includes('15')) return 'pph21_15';
  if (lower.includes('21') || lower.includes('5%')) return 'pph21_5';
  if (lower.includes('4(2)') || lower.includes('10%')) return 'pph4_2';
  if (lower.includes('ppn')) return 'ppn11_pph22';
  return 'bebas';
}

export const ImportMappingView: React.FC<ImportMappingViewProps> = ({
  accounts,
  monthKey,
  onApplyImportedComponents,
}) => {
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [manualAccountMap, setManualAccountMap] = useState<Record<number, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const monthLabel = getMonthLabel(monthKey);

  const loadSampleBku = () => {
    const sampleRows = accounts.slice(0, 4).map((acc, idx) => {
      const sampleNominal =
        idx === 0 ? 164500000 : idx === 1 ? 3250000 : idx === 2 ? 4950000 : 14500000;
      const sampleJenis = acc.jenisBelanja === 'Belanja Operasi - Pegawai' ? 'LS' : 'GU';
      const sampleTax =
        acc.kodeRekening.includes('0024')
          ? 'PPN 11% + PPh 22'
          : acc.kodeRekening.includes('0063')
          ? 'PPN 11% + PPh 23'
          : 'Bebas Pajak';
      return [
        acc.kodeRekening,
        `Realisasi BKU ${monthLabel} — ${acc.uraianRekening.slice(0, 42)}`,
        sampleNominal,
        sampleJenis,
        sampleTax,
        `058${idx + 1}/SP2D-${sampleJenis}/XI/2026`,
        idx === 0 ? 'Bendahara Gaji' : 'CV Rekanan Daerah',
      ].join('\t');
    });

    const header = [
      'Kode Rekening',
      'Uraian Komponen',
      'Nominal Bruto',
      'Jenis',
      'Pajak',
      'No SP2D',
      'Rekanan',
    ].join('\t');

    setRawText([header, ...sampleRows].join('\n'));
    setManualAccountMap({});
    setSuccessMessage('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setRawText(content);
      setManualAccountMap({});
      setSuccessMessage('');
    };
    reader.readAsText(file);
  };

  const parsedRows: ParsedImportRow[] = useMemo(() => {
    const trimmed = rawText.trim();
    if (!trimmed) return [];

    const delimiter = detectDelimiter(trimmed);
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const startIndex = lines[0].toLowerCase().includes('kode') ? 1 : 0;

    return lines.slice(startIndex).map((line, idx) => {
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      const rawKode = cols[0] ?? '';
      const normalizedKode = rawKode.replace(/\s+/g, '');
      const autoMatch = accounts.find(
        (a) => a.kodeRekening.replace(/\s+/g, '') === normalizedKode
      );

      const matchedAccountId = manualAccountMap[idx] ?? autoMatch?.id ?? '';
      const uraianKomponen = cols[1] || `Realisasi Impor ${monthLabel}`;
      const bruto = parseNumericInput(cols[2] ?? '0');
      const jenisPencairan = parseJenis(cols[3] ?? 'GU');
      const skemaPajak = parseTaxScheme(cols[4] ?? '');
      const noSp2d = cols[5] ?? '';
      const rekanan = cols[6] ?? '';

      return {
        rowIndex: idx,
        rawKode,
        matchedAccountId,
        uraianKomponen,
        bruto,
        jenisPencairan,
        skemaPajak,
        noSp2d,
        rekanan,
      };
    });
  }, [rawText, accounts, manualAccountMap, monthLabel]);

  const validRows = parsedRows.filter((r) => r.matchedAccountId && r.bruto > 0);
  const unmatchedCount = parsedRows.length - validRows.length;

  const handleApplyImport = () => {
    if (validRows.length === 0) return;

    const entries = validRows.map((row) => {
      const tax = calculateTaxBreakdown(row.bruto, row.skemaPajak);
      const component: RealizationComponent = {
        id: generateId('imp'),
        uraianKomponen: row.uraianKomponen,
        volume: 1,
        satuan: 'Paket',
        hargaSatuan: row.bruto,
        bruto: row.bruto,
        jenisPencairan: row.jenisPencairan,
        skemaPajak: row.skemaPajak,
        ppn: tax.ppn,
        pph: tax.pph,
        netto: tax.netto,
        noSp2d: row.noSp2d,
        tanggal: `${monthKey}-20`,
        rekanan: row.rekanan,
        keterangan: 'Impor BKU / Excel',
      };
      return { accountId: row.matchedAccountId, component };
    });

    onApplyImportedComponents(entries, mode);
    setSuccessMessage(
      `${entries.length} komponen realisasi berhasil diterapkan ke bulan ${monthLabel} 2026.`
    );
    setRawText('');
    setManualAccountMap({});
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Tempel Data dari Excel, BKU, atau Ekspor SIPD
            </h2>
            <p className="mt-1 text-xs text-slate-600 max-w-2xl">
              Salin baris dari Excel atau aplikasi keuangan lain dengan urutan kolom:{' '}
              <span className="font-mono text-slate-800">
                Kode Rekening | Uraian Komponen | Nominal Bruto | Jenis (UP/GU/TU/LS) | Pajak | No. SP2D | Rekanan
              </span>
              . Pemisah tab, koma, atau titik koma dideteksi otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadSampleBku}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Muat Contoh Data BKU</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors cursor-pointer whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah CSV / TSV</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {successMessage && (
          <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <textarea
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setSuccessMessage('');
          }}
          rows={6}
          placeholder={`Contoh tempel langsung dari Excel (Ctrl+V):\n5.1.02.01.01.0024\tKertas HVS & Tinta\t2450000\tGU\tPPN 11% + PPh 22\t0568/SP2D-GU/XI/2026\tCV Mitra Stationery`}
          className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-xs text-slate-700">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="text-teal-700 focus:ring-teal-700"
              />
              <span>Tambahkan ke komponen {monthLabel}</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="text-teal-700 focus:ring-teal-700"
              />
              <span>Timpa komponen rekening terkait</span>
            </label>
          </div>

          <button
            type="button"
            disabled={validRows.length === 0}
            onClick={handleApplyImport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <span>Terapkan {validRows.length} Baris ke {monthLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {parsedRows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900">
              Pratinjau Pemetaan Rekening ({parsedRows.length} baris terbaca)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 font-medium">
                {validRows.length} siap impor
              </span>
              {unmatchedCount > 0 && (
                <span className="text-amber-700 font-medium">
                  {unmatchedCount} perlu pemetaan manual / nominal 0
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <th className="py-2.5 px-4">Kode Sumber</th>
                  <th className="py-2.5 px-3">Pemetaan Rekening OPD</th>
                  <th className="py-2.5 px-3">Uraian Komponen</th>
                  <th className="py-2.5 px-3 text-right">Bruto</th>
                  <th className="py-2.5 px-3">Jenis & Pajak</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedRows.map((row) => {
                  const isReady = Boolean(row.matchedAccountId) && row.bruto > 0;
                  return (
                    <tr key={row.rowIndex} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                        {row.rawKode || '-'}
                      </td>
                      <td className="py-2.5 px-3 min-w-[230px]">
                        <select
                          value={row.matchedAccountId}
                          onChange={(e) =>
                            setManualAccountMap((prev) => ({
                              ...prev,
                              [row.rowIndex]: e.target.value,
                            }))
                          }
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            row.matchedAccountId
                              ? 'border-slate-200 text-slate-900 bg-white'
                              : 'border-amber-300 text-amber-900 bg-amber-50'
                          }`}
                        >
                          <option value="">-- Pilih Rekening Tujuan --</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.kodeRekening} — {acc.uraianRekening.slice(0, 35)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{row.uraianKomponen}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                        {formatIDR(row.bruto)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.jenisPencairan} · {row.skemaPajak}
                      </td>
                      <td className="py-2.5 px-4">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cocok</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Periksa</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
