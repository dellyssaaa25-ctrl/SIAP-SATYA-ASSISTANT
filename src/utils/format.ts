import {
  BudgetAccount,
  MonthlyMonevMeta,
  RealizationComponent,
  TaxSchemeId,
  TaxSchemeOption,
} from '../types/budget';

export const MONTHS_2026 = [
  { key: '2026-01', label: 'Januari', short: 'Jan', index: 1 },
  { key: '2026-02', label: 'Februari', short: 'Feb', index: 2 },
  { key: '2026-03', label: 'Maret', short: 'Mar', index: 3 },
  { key: '2026-04', label: 'April', short: 'Apr', index: 4 },
  { key: '2026-05', label: 'Mei', short: 'Mei', index: 5 },
  { key: '2026-06', label: 'Juni', short: 'Jun', index: 6 },
  { key: '2026-07', label: 'Juli', short: 'Jul', index: 7 },
  { key: '2026-08', label: 'Agustus', short: 'Agu', index: 8 },
  { key: '2026-09', label: 'September', short: 'Sep', index: 9 },
  { key: '2026-10', label: 'Oktober', short: 'Okt', index: 10 },
  { key: '2026-11', label: 'November', short: 'Nov', index: 11 },
  { key: '2026-12', label: 'Desember', short: 'Des', index: 12 },
] as const;

export const TAX_SCHEMES: TaxSchemeOption[] = [
  {
    id: 'bebas',
    label: 'Non-Pajak / Bebas Pungutan',
    shortLabel: 'Bebas Pajak',
    description: 'Belanja di bawah batas kena pajak atau dikecualikan',
  },
  {
    id: 'ppn11_pph22',
    label: 'Pengadaan Barang (PPN 11% + PPh 22 1,5%)',
    shortLabel: 'PPN 11% + PPh 22',
    description: 'DPP = Bruto / 1,11; PPN = 11% DPP; PPh 22 = 1,5% DPP',
  },
  {
    id: 'ppn11_pph23',
    label: 'Jasa / Sewa (PPN 11% + PPh 23 2%)',
    shortLabel: 'PPN 11% + PPh 23',
    description: 'DPP = Bruto / 1,11; PPN = 11% DPP; PPh 23 = 2% DPP',
  },
  {
    id: 'pph21_5',
    label: 'Honorarium Gol. III / Non-PNS (PPh 21 5%)',
    shortLabel: 'PPh 21 (5%)',
    description: 'PPh 21 dipotong langsung 5% dari nilai bruto',
  },
  {
    id: 'pph21_15',
    label: 'Honorarium Gol. IV (PPh 21 15%)',
    shortLabel: 'PPh 21 (15%)',
    description: 'PPh 21 dipotong langsung 15% dari nilai bruto',
  },
  {
    id: 'pph4_2',
    label: 'Sewa Tanah/Bangunan (PPh Ps. 4(2) 10%)',
    shortLabel: 'PPh 4(2) 10%',
    description: 'PPh final 10% dari nilai bruto sewa',
  },
  {
    id: 'custom',
    label: 'Input Pajak Manual',
    shortLabel: 'Manual',
    description: 'Nominal PPN dan PPh diisi manual sesuai faktur',
  },
];

export function formatIDR(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const hasDecimals = Math.abs(safe - Math.round(safe)) > 0.005;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(hasDecimals ? safe : Math.round(safe));
}

export function formatNumberID(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return new Intl.NumberFormat('id-ID').format(safe);
}

export function parseNumericInput(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  return Number.parseInt(cleaned, 10) || 0;
}

export function calculateTaxBreakdown(
  bruto: number,
  scheme: TaxSchemeId,
  manualPpn = 0,
  manualPph = 0
): { ppn: number; pph: number; netto: number } {
  const safeBruto = Math.max(0, Math.round(bruto));
  let ppn = 0;
  let pph = 0;

  switch (scheme) {
    case 'bebas':
      ppn = 0;
      pph = 0;
      break;
    case 'ppn11_pph22': {
      const dpp = safeBruto / 1.11;
      ppn = Math.round(dpp * 0.11);
      pph = Math.round(dpp * 0.015);
      break;
    }
    case 'ppn11_pph23': {
      const dpp = safeBruto / 1.11;
      ppn = Math.round(dpp * 0.11);
      pph = Math.round(dpp * 0.02);
      break;
    }
    case 'pph21_5':
      ppn = 0;
      pph = Math.round(safeBruto * 0.05);
      break;
    case 'pph21_15':
      ppn = 0;
      pph = Math.round(safeBruto * 0.15);
      break;
    case 'pph4_2':
      ppn = 0;
      pph = Math.round(safeBruto * 0.1);
      break;
    case 'custom':
      ppn = Math.max(0, Math.round(manualPpn));
      pph = Math.max(0, Math.round(manualPph));
      break;
  }

  const netto = Math.max(0, safeBruto - ppn - pph);
  return { ppn, pph, netto };
}

export function getPreviousMonthKey(monthKey: string): string | null {
  const idx = MONTHS_2026.findIndex((m) => m.key === monthKey);
  if (idx <= 0) return null;
  return MONTHS_2026[idx - 1].key;
}

export function getMonthLabel(monthKey: string): string {
  return MONTHS_2026.find((m) => m.key === monthKey)?.label ?? monthKey;
}

export function getDefaultMonevMeta(account: BudgetAccount, monthKey: string): MonthlyMonevMeta {
  const existing = account.monevPerBulan?.[monthKey];
  if (existing) return existing;

  const idx = MONTHS_2026.findIndex((m) => m.key === monthKey);
  const monthNumber = idx >= 0 ? idx + 1 : 11;
  const defaultTargetFisik = Math.min(100, Math.round((monthNumber / 12) * 100));
  const defaultTargetKeuangan = Math.round(account.paguDpa / 12);

  return {
    targetKeuangan: defaultTargetKeuangan,
    targetFisikPersen: defaultTargetFisik,
    realisasiFisikPersen: 0,
    kendala: '',
    tindakLanjut: '',
  };
}

export function getAccountMonthTotals(
  account: BudgetAccount,
  monthKey: string
): {
  brutoBulanIni: number;
  ppnBulanIni: number;
  pphBulanIni: number;
  nettoBulanIni: number;
  sdBulanLalu: number;
  totalRealisasi: number;
  sisaPagu: number;
  persenSerapan: number;
  komponenCount: number;
  monev: MonthlyMonevMeta;
  deviasiFisik: number;
} {
  const targetIdx = MONTHS_2026.findIndex((m) => m.key === monthKey);
  let sdBulanLalu = 0;

  for (let i = 0; i < targetIdx; i += 1) {
    const k = MONTHS_2026[i].key;
    const items = account.realisasiPerBulan[k] ?? [];
    sdBulanLalu += items.reduce((sum, item) => sum + item.bruto, 0);
  }

  const currentItems = account.realisasiPerBulan[monthKey] ?? [];
  const brutoBulanIni = currentItems.reduce((sum, item) => sum + item.bruto, 0);
  const ppnBulanIni = currentItems.reduce((sum, item) => sum + item.ppn, 0);
  const pphBulanIni = currentItems.reduce((sum, item) => sum + item.pph, 0);
  const nettoBulanIni = currentItems.reduce((sum, item) => sum + item.netto, 0);

  const totalRealisasi = sdBulanLalu + brutoBulanIni;
  const sisaPagu = account.paguDpa - totalRealisasi;
  const persenSerapan = account.paguDpa > 0 ? (totalRealisasi / account.paguDpa) * 100 : 0;
  const monev = getDefaultMonevMeta(account, monthKey);
  const deviasiFisik = monev.realisasiFisikPersen - monev.targetFisikPersen;

  return {
    brutoBulanIni,
    ppnBulanIni,
    pphBulanIni,
    nettoBulanIni,
    sdBulanLalu,
    totalRealisasi,
    sisaPagu,
    persenSerapan,
    komponenCount: currentItems.length,
    monev,
    deviasiFisik,
  };
}

export function summarizeComponentsText(items: RealizationComponent[]): string {
  if (items.length === 0) return '-';
  if (items.length === 1) {
    const it = items[0];
    return `${it.uraianKomponen} (${it.volume} ${it.satuan})`;
  }
  return `${items[0].uraianKomponen} (+${items.length - 1} komponen lainnya)`;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
