export type WorkspaceView = 'grid' | 'components' | 'import' | 'export';

export type JenisBelanja =
  | 'Belanja Operasi - Pegawai'
  | 'Belanja Operasi - Barang & Jasa'
  | 'Belanja Modal'
  | 'Belanja Tidak Terduga'
  | 'Belanja Transfer';

export type JenisPencairan = 'UP' | 'GU' | 'TU' | 'LS';

export type TaxSchemeId =
  | 'bebas'
  | 'ppn11_pph22'
  | 'ppn11_pph23'
  | 'pph21_5'
  | 'pph21_15'
  | 'pph4_2'
  | 'custom';

export type OPDKategori =
  | 'Sekretariat & Inspektorat'
  | 'Dinas Daerah'
  | 'Badan Daerah'
  | 'RSUD'
  | 'Kecamatan';

export interface OPDProfile {
  id: string;
  kodeOpd: string;
  nama: string;
  singkatan: string;
  kategori: OPDKategori;
  bendahara: string;
}

export interface RealizationComponent {
  id: string;
  uraianKomponen: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  bruto: number;
  jenisPencairan: JenisPencairan;
  skemaPajak: TaxSchemeId;
  ppn: number;
  pph: number;
  netto: number;
  noSp2d: string;
  tanggal: string;
  rekanan: string;
  keterangan: string;
}

export interface MonthlyMonevMeta {
  targetKeuangan: number;
  targetFisikPersen: number;
  realisasiFisikPersen: number;
  kendala: string;
  tindakLanjut: string;
}

export interface DpaComponentSpec {
  uraianKomponen: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  ppnPersen: number;
  jumlahDpa: number;
}

export interface BudgetAccount {
  id: string;
  opdId: string;
  kodeRekening: string;
  uraianRekening: string;
  program: string;
  subKegiatan: string;
  sumberDana: string;
  jenisBelanja: JenisBelanja;
  paguDpa: number;
  dpaItems?: DpaComponentSpec[];
  realisasiPerBulan: Record<string, RealizationComponent[]>;
  monevPerBulan: Record<string, MonthlyMonevMeta>;
  terinputSiapSatya: Record<string, boolean>;
}

export interface ComponentTemplate {
  id: string;
  nama: string;
  kategori: string;
  uraianKomponen: string;
  satuan: string;
  hargaSatuan: number;
  jenisPencairan: JenisPencairan;
  skemaPajak: TaxSchemeId;
  rekananDefault: string;
}

export interface TaxSchemeOption {
  id: TaxSchemeId;
  label: string;
  shortLabel: string;
  description: string;
}
