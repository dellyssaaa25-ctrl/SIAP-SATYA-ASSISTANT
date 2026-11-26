import {
  BudgetAccount,
  DpaComponentSpec,
  JenisBelanja,
  MonthlyMonevMeta,
  RealizationComponent,
  TaxSchemeId,
} from '../types/budget';
import { MONTHS_2026, calculateTaxBreakdown } from '../utils/format';

interface RawDpaAccount {
  kode: string;
  uraian: string;
  pagu: number;
  dpaItems?: DpaComponentSpec[];
  rekananDefault?: string;
}

interface RawSubKegiatanSpec {
  program: string;
  subKegiatan: string;
  sumberDana: string;
  /** Rencana Realisasi Belanja per Bulan [Jan..Des] sesuai Perubahan DPPA 2026 */
  rak: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  accounts: RawDpaAccount[];
}

function inferJenisBelanja(kode: string): JenisBelanja {
  if (kode.startsWith('5.1.01')) return 'Belanja Operasi - Pegawai';
  if (kode.startsWith('5.1.02')) return 'Belanja Operasi - Barang & Jasa';
  if (kode.startsWith('5.2')) return 'Belanja Modal';
  if (kode.startsWith('5.3')) return 'Belanja Tidak Terduga';
  return 'Belanja Transfer';
}

function inferTaxForAccount(kode: string): TaxSchemeId {
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
  if (kode.startsWith('5.1.02.02.008') || kode.startsWith('5.1.02.02.009') || kode.startsWith('5.1.02.03')) {
    return 'ppn11_pph23';
  }
  if (kode.startsWith('5.1.02.01') || kode.startsWith('5.2')) {
    return 'ppn11_pph22';
  }
  return 'bebas';
}

function inferJenisPencairan(kode: string, pagu: number): 'LS' | 'GU' {
  if (
    kode.startsWith('5.1.01') ||
    kode.startsWith('5.2') ||
    kode.startsWith('5.1.02.02.008') ||
    kode.startsWith('5.1.02.02.009') ||
    pagu >= 100_000_000
  ) {
    return 'LS';
  }
  return 'GU';
}

const RAW_DCKTR_SUB_KEGIATAN: RawSubKegiatanSpec[] = [
  // =========================================================================
  // PROGRAM 1.03.01 · PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA
  // =========================================================================
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.01.0001 · Penyusunan Dokumen Perencanaan Perangkat Daerah',
    sumberDana: 'Pajak Rokok',
    rak: [4000000, 0, 0, 4000000, 0, 0, 2000000, 0, 0, 2000000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.04.001.00005',
        uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
        pagu: 12000000,
        rekananDefault: 'Tim Penyusun Renja DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Perjalanan Dinas Luar Daerah Luar Propinsi Jawa Timur (Paket Meeting)',
            volume: 2,
            satuan: 'Paket',
            hargaSatuan: 6000000,
            ppnPersen: 0,
            jumlahDpa: 12000000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.01.0002 · Koordinasi dan Penyusunan Dokumen RKA-SKPD',
    sumberDana: 'Pajak Rokok',
    rak: [3000000, 0, 0, 3000000, 0, 0, 5000000, 0, 0, 4000000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.04.001.00005',
        uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
        pagu: 15000000,
        rekananDefault: 'Tim Anggaran SKPD DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Perjalanan Dinas Luar Daerah Luar Propinsi (Penyusunan RKA/DPPA)',
            volume: 3,
            satuan: 'Ls',
            hargaSatuan: 5000000,
            ppnPersen: 0,
            jumlahDpa: 15000000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.01.0007 · Evaluasi Kinerja Perangkat Daerah',
    sumberDana: 'Pajak Rokok',
    rak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 92500000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.01.001.00024',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
        pagu: 2500000,
        rekananDefault: 'CV Mitra Stationery Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Seminar Kit Evaluasi Kinerja Perangkat Daerah',
            volume: 100,
            satuan: 'Pack',
            hargaSatuan: 25000,
            ppnPersen: 0,
            jumlahDpa: 2500000,
          },
        ],
      },
      {
        kode: '5.1.02.04.001.00005',
        uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
        pagu: 90000000,
        rekananDefault: 'Hotel & Tim Evaluasi Kinerja DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Paket Meeting Luar Kota Evaluasi Kinerja Perangkat Daerah',
            volume: 1,
            satuan: 'Ls',
            hargaSatuan: 90000000,
            ppnPersen: 0,
            jumlahDpa: 90000000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.01.0010 · Pelaksanaan Forum Perangkat Daerah/Lintas Perangkat Daerah Kabupaten/Kota',
    sumberDana: 'Pajak Rokok',
    rak: [30247500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      {
        kode: '5.1.02.01.001.00024',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
        pagu: 2497500,
        rekananDefault: 'CV Mitra Stationery Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Seminar Kit Forum Perangkat Daerah',
            volume: 90,
            satuan: 'Paket',
            hargaSatuan: 25000,
            ppnPersen: 11,
            jumlahDpa: 2497500,
          },
        ],
      },
      {
        kode: '5.1.02.04.001.00004',
        uraian: 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
        pagu: 27750000,
        rekananDefault: 'Penyelenggara Forum OPD DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Rapat Forum Perangkat Daerah / Lintas OPD',
            volume: 1,
            satuan: 'Ls',
            hargaSatuan: 25000000,
            ppnPersen: 11,
            jumlahDpa: 27750000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.02.0001 · Penyediaan Gaji dan Tunjangan ASN',
    sumberDana: 'DAU',
    rak: [2263622000, 0, 0, 1402739059, 510, 3000000, 984990200, 0, 0, 324098697, 39151819.81, 5306000],
    accounts: [
      { kode: '5.1.01.01.001.00001', uraian: 'Belanja Gaji Pokok PNS', pagu: 1272519500, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.001.00002', uraian: 'Belanja Gaji Pokok PPPK', pagu: 967964000, rekananDefault: 'Daftar Gaji PPPK DCKTR' },
      { kode: '5.1.01.01.002.00001', uraian: 'Belanja Tunjangan Keluarga PNS', pagu: 122800158, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.002.00002', uraian: 'Belanja Tunjangan Keluarga PPPK', pagu: 75516000, rekananDefault: 'Daftar Gaji PPPK DCKTR' },
      { kode: '5.1.01.01.003.00001', uraian: 'Belanja Tunjangan Jabatan PNS', pagu: 97295000, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.004.00001', uraian: 'Belanja Tunjangan Fungsional PNS', pagu: 50520000, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.005.00001', uraian: 'Belanja Tunjangan Fungsional Umum PNS', pagu: 31642000, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.005.00002', uraian: 'Belanja Tunjangan Fungsional Umum PPPK', pagu: 60414000, rekananDefault: 'Daftar Gaji PPPK DCKTR' },
      { kode: '5.1.01.01.006.00001', uraian: 'Belanja Tunjangan Beras PNS', pagu: 70102560, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.006.00002', uraian: 'Belanja Tunjangan Beras PPPK', pagu: 55609000, rekananDefault: 'Daftar Gaji PPPK DCKTR' },
      { kode: '5.1.01.01.007.00001', uraian: 'Belanja Tunjangan PPh/Tunjangan Khusus PNS', pagu: 15732213, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.007.00002', uraian: 'Belanja Tunjangan PPh/Tunjangan Khusus PPPK', pagu: 7073000, rekananDefault: 'Daftar Gaji PPPK DCKTR' },
      { kode: '5.1.01.01.008.00001', uraian: 'Belanja Pembulatan Gaji PNS', pagu: 28000, rekananDefault: 'Daftar Gaji PNS DCKTR' },
      { kode: '5.1.01.01.008.00002', uraian: 'Belanja Pembulatan Gaji PPPK', pagu: 627285.81, rekananDefault: 'Daftar Gaji PPPK DCKTR' },
      { kode: '5.1.01.01.009.00001', uraian: 'Belanja Iuran Jaminan Kesehatan PNS', pagu: 108048569, rekananDefault: 'BPJS Kesehatan Cab. Pasuruan' },
      { kode: '5.1.01.01.009.00002', uraian: 'Belanja Iuran Jaminan Kesehatan PPPK', pagu: 54511000, rekananDefault: 'BPJS Kesehatan Cab. Pasuruan' },
      { kode: '5.1.01.01.010.00001', uraian: 'Belanja Iuran Jaminan Kecelakaan Kerja PNS', pagu: 2995000, rekananDefault: 'PT Taspen (Persero)' },
      { kode: '5.1.01.01.010.00002', uraian: 'Belanja Iuran Jaminan Kecelakaan Kerja PPPK', pagu: 2324000, rekananDefault: 'PT Taspen (Persero)' },
      { kode: '5.1.01.01.011.00001', uraian: 'Belanja Iuran Jaminan Kematian PNS', pagu: 8984000, rekananDefault: 'PT Taspen (Persero)' },
      { kode: '5.1.01.01.011.00002', uraian: 'Belanja Iuran Jaminan Kematian PPPK', pagu: 6970000, rekananDefault: 'PT Taspen (Persero)' },
      { kode: '5.1.01.02.001.00001', uraian: 'Tambahan Penghasilan berdasarkan Beban Kerja PNS', pagu: 2011233000, rekananDefault: 'Daftar TPP ASN DCKTR' },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.02.0002 · Penyediaan Administrasi Pelaksanaan Tugas ASN',
    sumberDana: 'Pajak Rokok',
    rak: [38366880, 0, 0, 31500000, 0, 0, 21500000, 0, 0, 7357592, 0, 0],
    accounts: [
      {
        kode: '5.1.02.02.001.00088',
        uraian: 'Belanja Jasa PPPK Paruh Waktu Jabatan Operator Layanan Operasional',
        pagu: 86800000,
        rekananDefault: 'Daftar Upah PPPK Paruh Waktu DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Upah Jasa PPPK Paruh Waktu Operator Layanan Operasional (2 Org x 14 Bln/Tahap I)',
            volume: 28,
            satuan: 'OB',
            hargaSatuan: 1600000,
            ppnPersen: 0,
            jumlahDpa: 44800000,
          },
          {
            uraianKomponen: 'Upah Jasa PPPK Paruh Waktu Operator Layanan Operasional (Tahap II)',
            volume: 30,
            satuan: 'OB',
            hargaSatuan: 1400000,
            ppnPersen: 0,
            jumlahDpa: 42000000,
          },
        ],
      },
      {
        kode: '5.1.02.02.002.00019',
        uraian: 'Belanja Iuran Jaminan Kesehatan PPPK Paruh Waktu',
        pagu: 11057592,
        rekananDefault: 'BPJS Kesehatan Cab. Pasuruan',
      },
      {
        kode: '5.1.02.02.002.00027',
        uraian: 'Belanja Iuran Jaminan Kecelakaan Kerja PPPK Paruh Waktu',
        pagu: 201600,
        rekananDefault: 'BPJS Ketenagakerjaan',
      },
      {
        kode: '5.1.02.02.002.00035',
        uraian: 'Belanja Iuran Jaminan Kematian PPPK Paruh Waktu',
        pagu: 665280,
        rekananDefault: 'BPJS Ketenagakerjaan',
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.03.0002 · Pengamanan Barang Milik Daerah SKPD',
    sumberDana: 'Pajak Rokok',
    rak: [23600000, 24000000, 0, 4300000, 0, 0, 2500000, 0, 0, 1640000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.02.002.00008',
        uraian: 'Belanja Asuransi Barang Milik Daerah',
        pagu: 42000000,
        rekananDefault: 'PT Asuransi Jasa Indonesia',
        dpaItems: [
          {
            uraianKomponen: 'Asuransi Kendaraan Operasional Roda 4 (6 Unit)',
            volume: 6,
            satuan: 'Unit/Tahun',
            hargaSatuan: 7000000,
            ppnPersen: 0,
            jumlahDpa: 42000000,
          },
        ],
      },
      {
        kode: '5.1.02.04.001.00004',
        uraian: 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
        pagu: 14040000,
        rekananDefault: 'Tim Aset & Pengamanan BMD DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Peninjauan Lokasi Berita Acara Serah Terima Prasarana/PSU',
            volume: 108,
            satuan: 'OK',
            hargaSatuan: 130000,
            ppnPersen: 0,
            jumlahDpa: 14040000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.05.0010 · Sosialisasi Peraturan Perundang-Undangan',
    sumberDana: 'Pajak Rokok',
    rak: [45280400, 0, 0, 6000000, 0, 0, 4000000, 0, 0, 2900000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.01.001.00024',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
        pagu: 10000000,
        rekananDefault: 'CV Mitra Stationery Pasuruan',
      },
      {
        kode: '5.1.02.01.001.00052',
        uraian: 'Belanja Makanan dan Minuman Rapat',
        pagu: 28780400,
        rekananDefault: 'Catering Sari Rasa Bangil',
        dpaItems: [
          {
            uraianKomponen: 'Kue / Kudapan Rapat Sosialisasi',
            volume: 460,
            satuan: 'Kotak',
            hargaSatuan: 20000,
            ppnPersen: 0,
            jumlahDpa: 9200000,
          },
          {
            uraianKomponen: 'Nasi Dus / Makan Siang Peserta Sosialisasi',
            volume: 460,
            satuan: 'Kotak',
            hargaSatuan: 42566,
            ppnPersen: 0,
            jumlahDpa: 19580400,
          },
        ],
      },
      {
        kode: '5.1.02.02.001.00003',
        uraian: 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia',
        pagu: 19400000,
        rekananDefault: 'Narasumber Ahli Bidang Tata Ruang & Cipta Karya',
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.05.0011 · Bimbingan Teknis Implementasi Peraturan Perundang-Undangan',
    sumberDana: 'Pajak Rokok',
    rak: [84915000, 0, 0, 0, 0, 0, 0, 0, 0, 14985000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.02.012.00003',
        uraian: 'Belanja Bimbingan Teknis',
        pagu: 99900000,
        rekananDefault: 'Lembaga Diklat Teknis PU & Tata Ruang',
        dpaItems: [
          {
            uraianKomponen: 'Kontribusi Bimtek Implementasi Peraturan Teknis (20 Orang)',
            volume: 20,
            satuan: 'Orang',
            hargaSatuan: 4500000,
            ppnPersen: 11,
            jumlahDpa: 99900000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.06.0004 · Penyediaan Bahan Logistik Kantor',
    sumberDana: 'Pajak Rokok',
    rak: [68128887.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      {
        kode: '5.1.02.01.001.00024',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
        pagu: 14017220,
        rekananDefault: 'CV Mitra Stationery Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Pengadaan ATK Rutin Kantor (Ordner, Bolpoin, Binder Clip, Map, dll)',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 12628126,
            ppnPersen: 11,
            jumlahDpa: 14017220,
          },
        ],
      },
      {
        kode: '5.1.02.01.001.00025',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
        pagu: 24485767.5,
        rekananDefault: 'CV Mitra Stationery Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Kertas HVS A4 / F4 / A3 & Kertas Plotter Gambar Teknis',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 22059250,
            ppnPersen: 11,
            jumlahDpa: 24485767.5,
          },
        ],
      },
      {
        kode: '5.1.02.01.001.00029',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
        pagu: 29625900,
        rekananDefault: 'CV Teknindo Komputer Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Tinta Printer Epson/Canon, Toner LaserJet & Flashdisk Operasional',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 26690000,
            ppnPersen: 11,
            jumlahDpa: 29625900,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.06.0005 · Penyediaan Barang Cetakan dan Penggandaan',
    sumberDana: 'Pajak Rokok',
    rak: [59723550, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      {
        kode: '5.1.02.01.001.00024',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor (Cetakan)',
        pagu: 48401550,
        rekananDefault: 'Percetakan Grafika Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Cetak Kop Surat, Amplop Dinas, Map Berkop & Penggandaan Dokumen',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 43605000,
            ppnPersen: 11,
            jumlahDpa: 48401550,
          },
        ],
      },
      {
        kode: '5.1.02.01.001.00029',
        uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
        pagu: 11322000,
        rekananDefault: 'CV Teknindo Komputer Pasuruan',
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.06.0008 · Fasilitasi Kunjungan Tamu',
    sumberDana: 'Pajak Rokok',
    rak: [8000000, 1189000, 0, 8000000, 0, 0, 8000000, 0, 0, 8000000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.01.001.00045',
        uraian: 'Belanja Natura dan Pakan-Natura dan Pakan Lainnya',
        pagu: 33189000,
        rekananDefault: 'Catering & Koperasi Pegawai DCKTR',
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.06.0009 · Penyelenggaraan Rapat Koordinasi dan Konsultasi SKPD',
    sumberDana: 'Pajak Rokok',
    rak: [75000000, 0, 0, 60000000, 0, 0, 30000000, 0, 0, 15000000, 0, 0],
    accounts: [
      {
        kode: '5.1.02.04.001.00005',
        uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
        pagu: 180000000,
        rekananDefault: 'Tim Koordinasi SKPD DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Koordinasi & Konsultasi Kebijakan Teknis Cipta Karya & Tata Ruang Luar Daerah',
            volume: 12,
            satuan: 'Paket',
            hargaSatuan: 15000000,
            ppnPersen: 0,
            jumlahDpa: 180000000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.07.0005 · Pengadaan Mebel',
    sumberDana: 'Pajak Rokok',
    rak: [130551122.64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      {
        kode: '5.2.02.05.001.00004',
        uraian: 'Belanja Modal Alat Penyimpan Perlengkapan Kantor',
        pagu: 19425000,
        rekananDefault: 'CV Karya Mandiri Furniture',
        dpaItems: [
          {
            uraianKomponen: 'Lemari Arsip / Filing Cabinet Besi 4 Laci',
            volume: 5,
            satuan: 'Unit',
            hargaSatuan: 3500000,
            ppnPersen: 11,
            jumlahDpa: 19425000,
          },
        ],
      },
      {
        kode: '5.2.02.05.002.00001',
        uraian: 'Belanja Modal Mebel',
        pagu: 111126122.64,
        rekananDefault: 'CV Karya Mandiri Furniture',
        dpaItems: [
          {
            uraianKomponen: 'Meja Kerja Staf, Kursi Kerja Ergonomis & Meja Rapat',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 100113624,
            ppnPersen: 11,
            jumlahDpa: 111126122.64,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.07.0010 · Pengadaan Sarana dan Prasarana Gedung Kantor atau Bangunan Lainnya',
    sumberDana: 'Pajak Rokok',
    rak: [196903000, 0, 0, 0, 0, 0, 0, 0, 0, 300823453, 0, 0],
    accounts: [
      {
        kode: '5.2.02.05.001.00005',
        uraian: 'Belanja Modal Alat Kantor Lainnya',
        pagu: 26760000,
        rekananDefault: 'CV Jaya Abadi Elektronik',
      },
      {
        kode: '5.2.02.05.002.00006',
        uraian: 'Belanja Modal Alat Rumah Tangga Lainnya (Home Use)',
        pagu: 88355680,
        rekananDefault: 'CV Jaya Abadi Elektronik',
        dpaItems: [
          {
            uraianKomponen: 'Pengadaan AC Split 2 PK & Perlengkapan Rumah Tangga Kantor',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 79599712,
            ppnPersen: 11,
            jumlahDpa: 88355680,
          },
        ],
      },
      {
        kode: '5.2.02.06.002.00001',
        uraian: 'Belanja Modal Alat Komunikasi Telephone',
        pagu: 194241453,
        rekananDefault: 'PT Telekomunikasi Pratama',
      },
      {
        kode: '5.2.02.10.001.00002',
        uraian: 'Belanja Modal Personal Computer',
        pagu: 88369320,
        rekananDefault: 'CV Teknindo Komputer Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'PC Workstation Grafis / Laptop CAD & GIS Tata Ruang',
            volume: 4,
            satuan: 'Unit',
            hargaSatuan: 19903000,
            ppnPersen: 11,
            jumlahDpa: 88369320,
          },
        ],
      },
      {
        kode: '5.2.02.10.002.00005',
        uraian: 'Belanja Modal Peralatan Komputer Lainnya',
        pagu: 100000000,
        rekananDefault: 'CV Teknindo Komputer Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Printer Plotter A0 / Scanner Arsip Teknis & UPS',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 90090090,
            ppnPersen: 11,
            jumlahDpa: 100000000,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.08.0002 · Penyediaan Jasa Komunikasi, Sumber Daya Air dan Listrik',
    sumberDana: 'PAD',
    rak: [59492348, 0, 0, 32984000, 0, 0, 15040000, 0, 0, 27757430, 711388, 0],
    accounts: [
      { kode: '5.1.02.02.001.00059', uraian: 'Belanja Tagihan Telepon', pagu: 11040000, rekananDefault: 'PT Telkom Indonesia (Persero) Tbk' },
      { kode: '5.1.02.02.001.00060', uraian: 'Belanja Tagihan Air', pagu: 18984000, rekananDefault: 'Perumdam Giri Nawa Tirta Kab. Pasuruan' },
      { kode: '5.1.02.02.001.00061', uraian: 'Belanja Tagihan Listrik', pagu: 13492348, rekananDefault: 'PT PLN (Persero)' },
      { kode: '5.1.02.02.001.00063', uraian: 'Belanja Kawat/Faksimili/Internet/TV Berlangganan', pagu: 68620468, rekananDefault: 'PT Telkom Indonesia (Persero) Tbk' },
      { kode: '5.1.02.02.001.00065', uraian: 'Belanja Penambahan Daya', pagu: 23848350, rekananDefault: 'PT PLN (Persero)' },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.08.0003 · Penyediaan Jasa Peralatan dan Perlengkapan Kantor',
    sumberDana: 'Pajak Rokok',
    rak: [74727975, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 6693300, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00030', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor', pagu: 44928804, rekananDefault: 'Toko Sinar Abadi Bangil' },
      { kode: '5.1.02.01.001.00031', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik', pagu: 23105871, rekananDefault: 'CV Terang Jaya Elektrik' },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.08.0004 · Penyediaan Jasa Pelayanan Umum Kantor',
    sumberDana: 'Pajak Rokok',
    rak: [155885000, 145.79, 0, 104500000, 0, 0, 87900000, 0, 0, 295038100, 4740000, 29515000],
    accounts: [
      { kode: '5.1.02.01.001.00009', uraian: 'Belanja Bahan-Isi Tabung Pemadam Kebakaran', pagu: 3690000, rekananDefault: 'CV Safety Proteksi' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 7250000, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 5975400, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00032', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perlengkapan Dinas', pagu: 9945600, rekananDefault: 'CV Sinar Perlengkapan' },
      { kode: '5.1.02.01.001.00035', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Suvenir/Cendera Mata', pagu: 12487500, rekananDefault: 'CV Kreasi Nusantara' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 69120000, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.01.001.00064', uraian: 'Belanja Pakaian Dinas Lapangan (PDL)', pagu: 36400000, rekananDefault: 'Konveksi Karya Busana' },
      { kode: '5.1.02.01.004.00123', uraian: 'Belanja Peralatan dan Mesin-Alat Rumah Tangga Lainnya (Home Use)', pagu: 2399600, rekananDefault: 'Toko Sinar Abadi Bangil' },
      { kode: '5.1.02.02.001.00024', uraian: 'Belanja Jasa Tenaga Arsip dan Perpustakaan', pagu: 63270000, rekananDefault: 'Tenaga Jasa Arsip DCKTR' },
      { kode: '5.1.02.02.001.00028', uraian: 'Belanja Jasa Tenaga Pelayanan Umum', pagu: 30000000, rekananDefault: 'Tenaga Pelayanan Umum DCKTR' },
      { kode: '5.1.02.02.001.00054', uraian: 'Belanja Jasa Jalan/Tol', pagu: 27700000, rekananDefault: 'Kartu E-Toll Operasional DCKTR' },
      { kode: '5.1.02.02.001.00055', uraian: 'Belanja Jasa Iklan/Reklame, Film, dan Pemotretan', pagu: 43385145.79, rekananDefault: 'Media & Publikasi Pasuruan' },
      { kode: '5.1.02.02.001.00062', uraian: 'Belanja Langganan Jurnal/Surat Kabar/Majalah', pagu: 15600000, rekananDefault: 'Agen Koran & Publikasi Daerah' },
      {
        kode: '5.1.02.02.001.00080',
        uraian: 'Belanja Honorarium Penanggungjawaban Pengelola Keuangan',
        pagu: 240655000,
        rekananDefault: 'Tim Pengelola Keuangan SKPD DCKTR',
        dpaItems: [
          {
            uraianKomponen: 'Honorarium PA, PPK-SKPD, Bendahara Pengeluaran, Pembantu Bendahara & PPTK',
            volume: 12,
            satuan: 'Bulan',
            hargaSatuan: 20054583,
            ppnPersen: 0,
            jumlahDpa: 240655000,
          },
        ],
      },
      { kode: '5.1.02.02.001.00081', uraian: 'Belanja Honorarium Pengadaan Barang/Jasa', pagu: 7200000, rekananDefault: 'Pejabat Pengadaan Barang/Jasa DCKTR' },
      { kode: '5.1.02.02.004.00035', uraian: 'Belanja Sewa Kendaraan Dinas Bermotor Perorangan', pagu: 100500000, rekananDefault: 'PT Trans Armada Rental' },
      { kode: '5.1.02.05.001.00002', uraian: 'Belanja Penghargaan atas Suatu Prestasi', pagu: 2000000, rekananDefault: 'Penerima Penghargaan Teknis' },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.09.0001 · Penyediaan Jasa Pemeliharaan, Biaya Pemeliharaan, dan Pajak Kendaraan Perorangan/Jabatan',
    sumberDana: 'Pajak Rokok',
    rak: [59000000, 0, 0, 42000000, 0, 0, 37000000, 0, 0, 24000000, 4933966, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 124933966, rekananDefault: 'SPBU Pertamina Raci' },
      { kode: '5.1.02.02.001.00067', uraian: 'Belanja Pembayaran Pajak, Bea, dan Perizinan', pagu: 4000000, rekananDefault: 'Samsat Kab. Pasuruan' },
      { kode: '5.1.02.03.002.00036', uraian: 'Belanja Pemeliharaan Alat Angkutan-Kendaraan Bermotor Penumpang', pagu: 38000000, rekananDefault: 'Bengkel Resmi Auto2000 Pasuruan' },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.09.0002 · Penyediaan Jasa Pemeliharaan, Biaya Pemeliharaan, Pajak & Perizinan Kendaraan Operasional/Lapangan',
    sumberDana: 'PAD; Pajak Rokok',
    rak: [164990000, 0, 40000000, 55000000, 0, 0, 82777500, 0, 0, 13350004.71, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 123350004.71, rekananDefault: 'SPBU Pertamina Bangil' },
      { kode: '5.1.02.02.001.00067', uraian: 'Belanja Pembayaran Pajak, Bea, dan Perizinan', pagu: 47200000, rekananDefault: 'Samsat Kab. Pasuruan' },
      { kode: '5.1.02.03.002.00036', uraian: 'Belanja Pemeliharaan Alat Angkutan-Kendaraan Bermotor Penumpang', pagu: 150000000, rekananDefault: 'Bengkel Resmi Astra/Mitsubishi' },
      { kode: '5.1.02.03.002.00037', uraian: 'Belanja Pemeliharaan Alat Angkutan-Kendaraan Bermotor Angkutan Barang', pagu: 9990000, rekananDefault: 'Bengkel Mitra Niaga' },
      { kode: '5.1.02.03.002.00038', uraian: 'Belanja Pemeliharaan Alat Angkutan-Kendaraan Bermotor Beroda Dua', pagu: 25577500, rekananDefault: 'AHASS Motor Bangil' },
    ],
  },
  {
    program: '1.03.01 · Program Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota',
    subKegiatan: '1.03.01.2.09.0011 · Pemeliharaan/Rehabilitasi Sarana dan Prasarana Pendukung Gedung Kantor',
    sumberDana: 'Pajak Rokok',
    rak: [28500000, 0, 0, 24500000, 0, 0, 24500000, 0, 0, 12500000, 0, 0],
    accounts: [
      { kode: '5.1.02.03.002.00121', uraian: 'Belanja Pemeliharaan Alat Kantor dan Rumah Tangga-Alat Pendingin', pagu: 36000000, rekananDefault: 'CV Sejuk Teknik Mandiri' },
      { kode: '5.1.02.03.002.00123', uraian: 'Belanja Pemeliharaan Alat Rumah Tangga Lainnya (Home Use)', pagu: 12000000, rekananDefault: 'CV Sejuk Teknik Mandiri' },
      { kode: '5.1.02.03.002.00405', uraian: 'Belanja Pemeliharaan Komputer Unit-Personal Computer', pagu: 20000000, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
      { kode: '5.1.02.03.002.00409', uraian: 'Belanja Pemeliharaan Peralatan Komputer-Peralatan Personal Computer', pagu: 22000000, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
    ],
  },

  // =========================================================================
  // PROGRAM 1.03.03 · PENGELOLAAN DAN PENGEMBANGAN SISTEM PENYEDIAAN AIR MINUM
  // =========================================================================
  {
    program: '1.03.03 · Program Pengelolaan dan Pengembangan Sistem Penyediaan Air Minum',
    subKegiatan: '1.03.03.2.01.0025 · Penyusunan Rencana, Kebijakan, Strategi dan Teknis SPAM',
    sumberDana: 'PAD; Pajak Rokok; DBH',
    rak: [0, 1419593500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 4148500, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 8524000, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 1400000, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 5661000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 7370000, rekananDefault: 'Catering Sari Rasa Bangil' },
      {
        kode: '5.1.02.02.008.00008',
        uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Jasa Desain Rekayasa untuk Pekerjaan Teknik Sipil Air',
        pagu: 1286490000,
        rekananDefault: 'PT Konsultan Rekayasa Tirta',
        dpaItems: [
          {
            uraianKomponen: 'Jasa Konsultansi Review RISPAM & DED Pengembangan SPAM Kabupaten Pasuruan',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 1159000000,
            ppnPersen: 11,
            jumlahDpa: 1286490000,
          },
        ],
      },
      { kode: '5.1.02.02.008.00013', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Jasa Desain Rekayasa Lainnya', pagu: 100000000, rekananDefault: 'CV Cipta Rekayasa Nusantara' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 6000000, rekananDefault: 'Tim Teknis Bidang Air Minum' },
    ],
  },
  {
    program: '1.03.03 · Program Pengelolaan dan Pengembangan Sistem Penyediaan Air Minum',
    subKegiatan: '1.03.03.2.01.0026 · Peningkatan Sistem Penyediaan Air Minum (SPAM) Jaringan Perpipaan',
    sumberDana: 'PAD; Pajak Rokok',
    rak: [0, 219151276.5, 0, 1116393095, 0, 1088380000, 1116393095, 0, 13697312, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 44663631, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 11066276.5, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00025', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', pagu: 5680681, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 2331000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.01.001.00029', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', pagu: 5550000, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
      {
        kode: '5.1.02.01.001.00039',
        uraian: 'Belanja Barang untuk Dijual/Diserahkan kepada Masyarakat (Peningkatan SPAM)',
        pagu: 3321166190,
        rekananDefault: 'CV Tirta Konstruksi & KPSPAM',
        dpaItems: [
          {
            uraianKomponen: 'Peningkatan Jaringan Perpipaan SPAM Perdesaan & Sambungan Rumah (Diserahkan ke Masyarakat)',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 2992041613,
            ppnPersen: 11,
            jumlahDpa: 3321166190,
          },
        ],
      },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 7012000, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.008.00008', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Pekerjaan Teknik Sipil Air', pagu: 18315000, rekananDefault: 'CV Tirta Desain Konsultan' },
      { kode: '5.1.02.02.008.00021', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Teknik Sipil Air', pagu: 103230000, rekananDefault: 'CV Karya Pengawas Sipil' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 35000000, rekananDefault: 'Tim Teknis Bidang Air Minum' },
    ],
  },
  {
    program: '1.03.03 · Program Pengelolaan dan Pengembangan Sistem Penyediaan Air Minum',
    subKegiatan: '1.03.03.2.01.0028 · Pembangunan Sistem Penyediaan Air Minum (SPAM) Jaringan Perpipaan',
    sumberDana: 'DAK Fisik; Pajak Rokok; PAD',
    rak: [0, 204390000, 0, 1775000000, 0, 0, 1775000000, 0, 0, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 7920000, rekananDefault: 'SPBU Pertamina' },
      {
        kode: '5.1.02.01.001.00039',
        uraian: 'Belanja Barang untuk Dijual/Diserahkan kepada Masyarakat (Pembangunan SPAM DAK)',
        pagu: 3550000000,
        rekananDefault: 'PT Sumber Air Mandiri & Pokmas',
        dpaItems: [
          {
            uraianKomponen: 'Pembangunan SPAM Jaringan Perpipaan Baru Berbasis Masyarakat / DAK Fisik',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 3198198198,
            ppnPersen: 11,
            jumlahDpa: 3550000000,
          },
        ],
      },
      { kode: '5.1.02.02.008.00008', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Pekerjaan Teknik Sipil Air', pagu: 78810000, rekananDefault: 'CV Tirta Desain Konsultan' },
      { kode: '5.1.02.02.008.00021', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Teknik Sipil Air', pagu: 117660000, rekananDefault: 'CV Karya Pengawas Sipil' },
    ],
  },
  {
    program: '1.03.03 · Program Pengelolaan dan Pengembangan Sistem Penyediaan Air Minum',
    subKegiatan: '1.03.03.2.01.0032 · Perluasan Sistem Penyediaan Air Minum (SPAM) Jaringan Perpipaan',
    sumberDana: 'DAK Fisik; Pajak Rokok; PAD',
    rak: [0, 449898000, 0, 4341250000, 0, 0, 4341250000, 0, 173722500, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 1672500, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 11930940, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00025', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', pagu: 5646000, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 8658000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      {
        kode: '5.1.02.01.001.00039',
        uraian: 'Belanja Barang untuk Dijual/Diserahkan kepada Masyarakat (Perluasan SPAM DAK)',
        pagu: 8682500000,
        rekananDefault: 'PT Tirta Karya & KPSPAM Penerima',
        dpaItems: [
          {
            uraianKomponen: 'Perluasan Jaringan Perpipaan SPAM & Pemasangan SR (DAK Fisik Penugasan)',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 7822072072,
            ppnPersen: 11,
            jumlahDpa: 8682500000,
          },
        ],
      },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 11068060, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.008.00008', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Pekerjaan Teknik Sipil Air', pagu: 263070000, rekananDefault: 'CV Tirta Desain Konsultan' },
      { kode: '5.1.02.02.008.00021', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Teknik Sipil Air', pagu: 235875000, rekananDefault: 'CV Karya Pengawas Sipil' },
      { kode: '5.1.02.04.001.00004', uraian: 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', pagu: 35700000, rekananDefault: 'Tim Monitoring SPAM DCKTR' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 50000000, rekananDefault: 'Tim Monitoring SPAM DCKTR' },
    ],
  },
  {
    program: '1.03.03 · Program Pengelolaan dan Pengembangan Sistem Penyediaan Air Minum',
    subKegiatan: '1.03.03.2.01.0034 · Peningkatan Kapasitas Kelembagaan dan Pelaksana Penyelenggara SPAM',
    sumberDana: 'Pajak Rokok',
    rak: [0, 80000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 3400000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.02.001.00047', uraian: 'Belanja Jasa Penyelenggaraan Acara', pagu: 66600000, rekananDefault: 'EO Pelatihan Pengelola SPAM' },
      { kode: '5.1.02.02.012.00002', uraian: 'Belanja Sosialisasi', pagu: 10000000, rekananDefault: 'EO Pelatihan Pengelola SPAM' },
    ],
  },

  // =========================================================================
  // PROGRAM 1.03.05 · PENGELOLAAN DAN PENGEMBANGAN SISTEM AIR LIMBAH
  // =========================================================================
  {
    program: '1.03.05 · Program Pengelolaan dan Pengembangan Sistem Air Limbah',
    subKegiatan: '1.03.05.2.01.0022 · Pembangunan Sistem Pengelolaan Air Limbah Domestik (SPALD) Terpusat Skala Permukiman',
    sumberDana: 'PAD; Pajak Air Tanah',
    rak: [0, 173199353.4, 0, 800000000, 0, 0, 800000000, 0, 0, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 13359353.4, rekananDefault: 'SPBU Pertamina' },
      {
        kode: '5.1.02.01.001.00039',
        uraian: 'Belanja Barang untuk Dijual/Diserahkan kepada Masyarakat (IPAL Komunal SPALD-T)',
        pagu: 1600000000,
        rekananDefault: 'KSM Sanitasi Permukiman Kab. Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Pembangunan SPALD-T Skala Permukiman / IPAL Komunal Diserahkan ke Masyarakat',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 1441441441,
            ppnPersen: 11,
            jumlahDpa: 1600000000,
          },
        ],
      },
      { kode: '5.1.02.02.008.00008', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Pekerjaan Teknik Sipil Air', pagu: 89355000, rekananDefault: 'CV Konsultan Sanitasi Timur' },
      { kode: '5.1.02.02.008.00021', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Teknik Sipil Air', pagu: 70485000, rekananDefault: 'CV Pengawas Lingkungan' },
    ],
  },
  {
    program: '1.03.05 · Program Pengelolaan dan Pengembangan Sistem Air Limbah',
    subKegiatan: '1.03.05.2.01.0045 · Penyusunan Rencana, Kebijakan, Strategi dan Teknis SPALD',
    sumberDana: 'PAD; Pajak Rokok',
    rak: [0, 327560000, 0, 0, 0, 0, 0, 0, 320162000, 0, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 4239000, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 382000, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 25641000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.02.001.00029', uraian: 'Belanja Jasa Tenaga Ahli', pagu: 100000000, rekananDefault: 'Tenaga Ahli Sanitasi Lingkungan' },
      { kode: '5.1.02.02.008.00008', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Pekerjaan Teknik Sipil Air', pagu: 217660000, rekananDefault: 'CV Konsultan Sanitasi Timur' },
      { kode: '5.1.02.02.008.00013', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Jasa Desain Rekayasa Lainnya', pagu: 99900000, rekananDefault: 'CV Rekayasa Lingkungan' },
      { kode: '5.1.02.02.008.00032', uraian: 'Belanja Jasa Konsultansi Lainnya-Jasa Konsultansi Lingkungan', pagu: 100000000, rekananDefault: 'PT Konsultan Lingkungan Hijau' },
      { kode: '5.1.02.02.009.00012', uraian: 'Belanja Jasa Konsultansi Berorientasi Layanan-Jasa Studi Penelitian dan Bantuan Teknik', pagu: 99900000, rekananDefault: 'LPPM / Konsultan Studi Teknis' },
    ],
  },

  // =========================================================================
  // PROGRAM 1.03.08 · PENATAAN BANGUNAN GEDUNG
  // =========================================================================
  {
    program: '1.03.08 · Program Penataan Bangunan Gedung',
    subKegiatan: '1.03.08.2.01.0017 · Pengubahsuaian Bangunan Gedung untuk Kepentingan Strategis Daerah',
    sumberDana: 'PAD; Pajak Rokok; DBH',
    rak: [0, 305139214.45, 3788219.1, 1448596620, 0, 0, 1236031620, 0, 0, 2371149660, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 19573000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 2719944.45, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00025', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', pagu: 3788219.1, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 1500000, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 15096000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.01.001.00029', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', pagu: 8044170, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 10813620, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.008.00007', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Konstruksi Pondasi serta Struktur Bangunan', pagu: 839230000, rekananDefault: 'PT Arsitektur & Struktur Mandiri' },
      { kode: '5.1.02.02.008.00019', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Bangunan Gedung', pagu: 368380000, rekananDefault: 'CV Pengawas Konstruksi Gedung' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 32022040, rekananDefault: 'Tim Teknis Tata Bangunan DCKTR' },
      {
        kode: '5.2.03.01.001.00001',
        uraian: 'Belanja Modal Bangunan Gedung Kantor (Pengubahsuaian Gedung Strategis)',
        pagu: 4063538340,
        rekananDefault: 'PT Konstruksi Cipta Bangunan',
        dpaItems: [
          {
            uraianKomponen: 'Pekerjaan Konstruksi Pengubahsuaian / Rehabilitasi Bangunan Gedung Strategis Daerah',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 3660845351,
            ppnPersen: 11,
            jumlahDpa: 4063538340,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.08 · Program Penataan Bangunan Gedung',
    subKegiatan: '1.03.08.2.01.0018 · Pemeliharaan, Perawatan, dan Pemeriksaan Berkala Bangunan Gedung Strategis',
    sumberDana: 'PAD; Pajak Rokok; DBH',
    rak: [0, 183507747, 0, 932969500, 0, 0, 241723400, 0, 0, 210086020, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 6911953.45, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00025', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', pagu: 1507163.55, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 5000000, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 3885000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.01.001.00029', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', pagu: 6854250, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 3485400, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.008.00007', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Konstruksi Pondasi serta Struktur Bangunan', pagu: 160950000, rekananDefault: 'PT Arsitektur & Struktur Mandiri' },
      { kode: '5.1.02.02.008.00019', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Bangunan Gedung', pagu: 110515000, rekananDefault: 'CV Pengawas Konstruksi Gedung' },
      { kode: '5.1.02.03.003.00001', uraian: 'Belanja Pemeliharaan Bangunan Gedung-Bangunan Gedung Tempat Kerja-Bangunan Gedung Kantor', pagu: 205000000, rekananDefault: 'CV Karya Gedung Pasuruan' },
      {
        kode: '5.2.03.01.001.00001',
        uraian: 'Belanja Modal Bangunan Gedung Kantor (Rehab Sedang Gedung Strategis)',
        pagu: 1064177900,
        rekananDefault: 'CV Bangun Karya Sejahtera',
        dpaItems: [
          {
            uraianKomponen: 'Rehabilitasi & Perawatan Berkala Bangunan Gedung Kantor Strategis',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 958718829,
            ppnPersen: 11,
            jumlahDpa: 1064177900,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.08 · Program Penataan Bangunan Gedung',
    subKegiatan: '1.03.08.2.01.0021 · Pembangunan, Pemanfaatan, Pelestarian dan Pembongkaran Bangunan Gedung Strategis',
    sumberDana: 'PAD; DBH',
    rak: [0, 231982620, 0, 3166462600, 0, 0, 0, 0, 0, 503718780, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 13750000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 5392800, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 2490000, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 5550000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.01.001.00039', uraian: 'Belanja Barang untuk Dijual/Diserahkan kepada Masyarakat', pagu: 746818000, rekananDefault: 'CV Karya Mandiri Konstruksi' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 3887220, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.001.00004', uraian: 'Honorarium Tim Pelaksana Kegiatan dan Sekretariat Tim Pelaksana Kegiatan', pagu: 13200000, rekananDefault: 'Tim Teknis Pembangunan Gedung' },
      { kode: '5.1.02.02.001.00054', uraian: 'Belanja Jasa Jalan/Tol', pagu: 3150000, rekananDefault: 'Kartu E-Toll Operasional' },
      { kode: '5.1.02.02.008.00007', uraian: 'Belanja Jasa Konsultansi Perencanaan Rekayasa-Konstruksi Pondasi serta Struktur Bangunan', pagu: 265004000, rekananDefault: 'PT Arsitektur & Struktur Mandiri' },
      { kode: '5.1.02.02.008.00019', uraian: 'Belanja Jasa Konsultansi Pengawasan Rekayasa-Pekerjaan Konstruksi Bangunan Gedung', pagu: 222465000, rekananDefault: 'CV Pengawas Konstruksi Gedung' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 23277380, rekananDefault: 'Tim Teknis Gedung DCKTR' },
      {
        kode: '5.2.03.01.001.00001',
        uraian: 'Belanja Modal Bangunan Gedung Kantor (Pembangunan Gedung Strategis)',
        pagu: 2597179600,
        rekananDefault: 'PT Graha Konstruksi Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Pembangunan Fisik Bangunan Gedung Strategis Daerah Tahun Anggaran 2026',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 2339801441,
            ppnPersen: 11,
            jumlahDpa: 2597179600,
          },
        ],
      },
    ],
  },
  {
    program: '1.03.08 · Program Penataan Bangunan Gedung',
    subKegiatan: '1.03.08.2.01.0023 · Penyelenggaraan Penerbitan PBG, SLF, SBKBG, RTB, TPA, TPT & Pendataan via SIMBG',
    sumberDana: 'PAD; Pajak Rokok',
    rak: [0, 697978800, 0, 158400000, 0, 0, 0, 0, 0, 6660000, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 37500000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 8527840, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00025', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', pagu: 5336880, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00027', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', pagu: 5300000, rekananDefault: 'PT Pos Indonesia' },
      { kode: '5.1.02.01.001.00028', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Persediaan Dokumen/Administrasi Tender', pagu: 4440000, rekananDefault: 'Percetakan Grafika Pasuruan' },
      { kode: '5.1.02.01.001.00029', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', pagu: 14820720, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 7992000, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.001.00004', uraian: 'Honorarium Tim Pelaksana Kegiatan dan Sekretariat Tim Pelaksana Kegiatan', pagu: 38400000, rekananDefault: 'Tim Teknis / TPT SIMBG DCKTR' },
      {
        kode: '5.1.02.02.001.00029',
        uraian: 'Belanja Jasa Tenaga Ahli (Tim Profesi Ahli / TPA Bangunan Gedung)',
        pagu: 420000000,
        rekananDefault: 'Tim Profesi Ahli (TPA) PBG/SLF Kab. Pasuruan',
        dpaItems: [
          {
            uraianKomponen: 'Jasa Tim Profesi Ahli (TPA) Konsultasi PBG & SLF Gedung Non-Sederhana',
            volume: 12,
            satuan: 'Bulan',
            hargaSatuan: 35000000,
            ppnPersen: 0,
            jumlahDpa: 420000000,
          },
        ],
      },
      { kode: '5.1.02.02.009.00012', uraian: 'Belanja Jasa Konsultansi Berorientasi Layanan-Jasa Studi Penelitian dan Bantuan Teknik', pagu: 299700000, rekananDefault: 'CV Pendataan Bangunan & SIMBG' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 21021360, rekananDefault: 'Tim Verifikasi PBG/SLF DCKTR' },
    ],
  },

  // =========================================================================
  // PROGRAM 1.03.12 · PENYELENGGARAAN PENATAAN RUANG
  // =========================================================================
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.02.0004 · Penyusunan Peta Dasar',
    sumberDana: 'Pajak Rokok',
    rak: [765800000, 0, 0, 15800000, 0, 0, 15800000, 0, 0, 16444000, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 6660000, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 7184000, rekananDefault: 'Catering Sari Rasa Bangil' },
      {
        kode: '5.1.02.02.009.00013',
        uraian: 'Belanja Jasa Konsultansi Berorientasi Layanan-Jasa Konsultansi Manajemen (Pemetaan Dasar)',
        pagu: 750000000,
        rekananDefault: 'PT Geospasial Nusantara',
        dpaItems: [
          {
            uraianKomponen: 'Jasa Konsultansi Penyusunan Peta Dasar Skala Detail 1:5.000 RDTR',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 675675676,
            ppnPersen: 11,
            jumlahDpa: 750000000,
          },
        ],
      },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 50000000, rekananDefault: 'Tim Asistensi BIG / Tata Ruang' },
    ],
  },
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.02.0006 · Peningkatan Kompetensi SDM Bidang Penataan Ruang',
    sumberDana: 'Pajak Rokok',
    rak: [15000000, 0, 0, 15000000, 0, 0, 15000000, 0, 0, 15000000, 0, 0],
    accounts: [
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 60000000, rekananDefault: 'Tim SDM Penataan Ruang DCKTR' },
    ],
  },
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.02.0007 · Penyusunan RTRW Kabupaten/Kota',
    sumberDana: 'DBH; Pajak Rokok',
    rak: [1644500000, 0, 0, 201000000, 0, 0, 150000000, 0, 0, 98749600, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 39950000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 20046600, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 80253000, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.001.00003', uraian: 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia', pagu: 104000000, rekananDefault: 'Narasumber Ahli Tata Ruang & KLHS' },
      { kode: '5.1.02.02.001.00054', uraian: 'Belanja Jasa Jalan/Tol', pagu: 15000000, rekananDefault: 'Kartu E-Toll Operasional' },
      {
        kode: '5.1.02.02.008.00015',
        uraian: 'Belanja Jasa Konsultansi Perencanaan Penataan Ruang-Jasa Perencanaan Wilayah',
        pagu: 600000000,
        rekananDefault: 'PT Planologi Pratama',
        dpaItems: [
          {
            uraianKomponen: 'Jasa Konsultansi Penyusunan Materi Teknis & Ranperda Revisi RTRW/RDTR',
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: 540540541,
            ppnPersen: 11,
            jumlahDpa: 600000000,
          },
        ],
      },
      {
        kode: '5.1.02.02.009.00013',
        uraian: 'Belanja Jasa Konsultansi Berorientasi Layanan-Jasa Konsultansi Manajemen',
        pagu: 950000000,
        rekananDefault: 'PT Kajian Strategis Wilayah',
      },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 285000000, rekananDefault: 'Tim Sinkronisasi RTRW Pusat/Provinsi' },
    ],
  },
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.03.0003 · Koordinasi Penyelenggaraan Penataan Ruang',
    sumberDana: 'Pajak Rokok',
    rak: [16000000, 0, 0, 17000000, 0, 0, 17000000, 0, 0, 16655500, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 66655500, rekananDefault: 'Catering Sari Rasa Bangil' },
    ],
  },
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.03.0004 · Pelaksanaan Persetujuan Kesesuaian Kegiatan Pemanfaatan Ruang (PKKPR)',
    sumberDana: 'Pajak Rokok',
    rak: [165687820, 0, 0, 115000000, 0, 0, 113167514.5, 0, 0, 90522100, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 69500000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 40167514.5, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00025', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', pagu: 31570620, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00029', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', pagu: 16117200, rekananDefault: 'CV Teknindo Komputer Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 33466500, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.001.00029', uraian: 'Belanja Jasa Tenaga Ahli (Verifikasi PKKPR / OSS)', pagu: 240000000, rekananDefault: 'Tenaga Ahli Penataan Ruang & GIS' },
      { kode: '5.1.02.04.001.00003', uraian: 'Belanja Perjalanan Dinas Dalam Kota', pagu: 12500000, rekananDefault: 'Tim Survei Lapangan PKKPR DCKTR' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 41055600, rekananDefault: 'Tim Konsultasi OSS-RBA / ATR-BPN' },
    ],
  },
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.04.0004 · Koordinasi Pelaksanaan Penataan Ruang',
    sumberDana: 'Pajak Rokok',
    rak: [10581250, 0, 0, 17000000, 0, 0, 8000000, 0, 0, 16980100, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 3581250, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 12387600, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 18592500, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.001.00003', uraian: 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia', pagu: 18000000, rekananDefault: 'Narasumber Pengendalian Ruang' },
    ],
  },
  {
    program: '1.03.12 · Program Penyelenggaraan Penataan Ruang',
    subKegiatan: '1.03.12.2.04.0009 · Operasionalisasi Tugas dan Fungsi Forum Penataan Ruang Daerah',
    sumberDana: 'Pajak Rokok',
    rak: [47500000, 0, 0, 214700000, 0, 0, 61950000, 0, 0, 142980000, 0, 0],
    accounts: [
      { kode: '5.1.02.01.001.00004', uraian: 'Belanja Bahan-Bahan Bakar dan Pelumas', pagu: 6950000, rekananDefault: 'SPBU Pertamina' },
      { kode: '5.1.02.01.001.00024', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', pagu: 10656000, rekananDefault: 'CV Mitra Stationery Pasuruan' },
      { kode: '5.1.02.01.001.00052', uraian: 'Belanja Makanan dan Minuman Rapat', pagu: 53724000, rekananDefault: 'Catering Sari Rasa Bangil' },
      { kode: '5.1.02.02.001.00003', uraian: 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia', pagu: 1700000, rekananDefault: 'Narasumber Forum Penataan Ruang' },
      { kode: '5.1.02.02.001.00004', uraian: 'Honorarium Tim Pelaksana Kegiatan dan Sekretariat Tim Pelaksana Kegiatan', pagu: 96600000, rekananDefault: 'Sekretariat Forum Penataan Ruang (FPR)' },
      { kode: '5.1.02.02.001.00047', uraian: 'Belanja Jasa Penyelenggaraan Acara', pagu: 170000000, rekananDefault: 'EO Sidang Forum Penataan Ruang' },
      { kode: '5.1.02.04.001.00005', uraian: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', pagu: 127500000, rekananDefault: 'Tim Forum Penataan Ruang Kab. Pasuruan' },
    ],
  },
];

function buildDcktrAccounts(): BudgetAccount[] {
  const result: BudgetAccount[] = [];
  let seq = 1;

  for (const sub of RAW_DCKTR_SUB_KEGIATAN) {
    const subTotalPagu = sub.accounts.reduce((sum, a) => sum + a.pagu, 0);

    for (const raw of sub.accounts) {
      const id = `dcktr-${String(seq).padStart(3, '0')}`;
      const subKode = sub.subKegiatan.split(' · ')[0];
      const sp2dSuffix = String(seq).padStart(3, '0');
      seq += 1;

      const jenisBelanja = inferJenisBelanja(raw.kode);
      const jenisPencairan = inferJenisPencairan(raw.kode, raw.pagu);
      const skemaPajak = inferTaxForAccount(raw.kode);
      const ratio = subTotalPagu > 0 ? raw.pagu / subTotalPagu : 0;

      // Compute monthly RAK targets & cumulative physical target (%)
      const monevPerBulan: Record<string, MonthlyMonevMeta> = {};
      let cumRak = 0;

      for (let m = 0; m < MONTHS_2026.length; m += 1) {
        const monthKey = MONTHS_2026[m].key;
        const subMonthRak = sub.rak[m] ?? 0;
        cumRak += subMonthRak;
        const targetKeuangan = Math.round(subMonthRak * ratio);
        const targetFisikPersen =
          subTotalPagu > 0
            ? Math.min(100, Math.round((cumRak / subTotalPagu) * 100))
            : 0;

        monevPerBulan[monthKey] = {
          targetKeuangan,
          targetFisikPersen,
          realisasiFisikPersen: 0,
          kendala: '',
          tindakLanjut: '',
        };
      }

      // Distribute realistic Jan–Sep cumulative & Oct realizations proportional to Jan–Okt RAK
      const rakJanSep = sub.rak.slice(0, 9).reduce((a, b) => a + b, 0) * ratio;
      const rakOct = (sub.rak[9] ?? 0) * ratio;
      const rakNov = (sub.rak[10] ?? 0) * ratio;

      const realSep = Math.min(raw.pagu, Math.round(rakJanSep * 0.94));
      const remainingAfterSep = Math.max(0, raw.pagu - realSep);
      const realOct = Math.min(remainingAfterSep, Math.round(rakOct * 0.92));

      const realisasiPerBulan: Record<string, RealizationComponent[]> = {};

      if (realSep > 0) {
        const tax = calculateTaxBreakdown(realSep, skemaPajak);
        realisasiPerBulan['2026-09'] = [
          {
            id: `${id}-c09`,
            uraianKomponen: `Akumulasi Realisasi ${raw.uraian} s.d. Triwulan III`,
            volume: 1,
            satuan: 'Paket',
            hargaSatuan: realSep,
            bruto: realSep,
            jenisPencairan,
            skemaPajak,
            ppn: tax.ppn,
            pph: tax.pph,
            netto: tax.netto,
            noSp2d: `${sp2dSuffix}/SP2D-${jenisPencairan}/IX/2026`,
            tanggal: '2026-09-25',
            rekanan: raw.rekananDefault ?? 'Rekanan Pelaksana DCKTR',
            keterangan: `DPPA ${subKode} (Jan–Sep 2026)`,
          },
        ];
      }

      if (realOct > 0) {
        const tax = calculateTaxBreakdown(realOct, skemaPajak);
        realisasiPerBulan['2026-10'] = [
          {
            id: `${id}-c10`,
            uraianKomponen: `Realisasi Oktober — ${raw.uraian}`,
            volume: 1,
            satuan: raw.kode.startsWith('5.1.01') ? 'Bulan' : 'Paket',
            hargaSatuan: realOct,
            bruto: realOct,
            jenisPencairan,
            skemaPajak,
            ppn: tax.ppn,
            pph: tax.pph,
            netto: tax.netto,
            noSp2d: `${sp2dSuffix}/SP2D-${jenisPencairan}/X/2026`,
            tanggal: '2026-10-22',
            rekanan: raw.rekananDefault ?? 'Rekanan Pelaksana DCKTR',
            keterangan: 'Realisasi Bulan Oktober 2026',
          },
        ];
      }

      // Set October physical progress matching financial progress through Oct
      const sdOct = realSep + realOct;
      if (monevPerBulan['2026-10']) {
        monevPerBulan['2026-10'].realisasiFisikPersen =
          raw.pagu > 0 ? Number(Math.min(100, (sdOct / raw.pagu) * 100).toFixed(1)) : 0;
      }

      // Pre-fill November ONLY for accounts with scheduled November RAK (> 0) so staff see exact Nov RAK items ready,
      // while leaving all other operational/capital accounts empty in Nov for live batch/component editing
      const remainingAfterOct = Math.max(0, raw.pagu - sdOct);
      const terinputSiapSatya: Record<string, boolean> = {
        '2026-09': realSep > 0,
        '2026-10': realOct > 0 || rakOct === 0,
        '2026-11': false,
      };

      if (rakNov >= 1000 && remainingAfterOct >= 1000) {
        const realNov = Math.min(remainingAfterOct, Math.round(rakNov));
        const taxNov = calculateTaxBreakdown(realNov, skemaPajak);
        realisasiPerBulan['2026-11'] = [
          {
            id: `${id}-c11`,
            uraianKomponen: `Realisasi November 2026 — ${raw.uraian}`,
            volume: 1,
            satuan: raw.kode.startsWith('5.1.01') ? 'Bulan' : 'Paket',
            hargaSatuan: realNov,
            bruto: realNov,
            jenisPencairan,
            skemaPajak,
            ppn: taxNov.ppn,
            pph: taxNov.pph,
            netto: taxNov.netto,
            noSp2d: `${sp2dSuffix}/SP2D-${jenisPencairan}/XI/2026`,
            tanggal: '2026-11-18',
            rekanan: raw.rekananDefault ?? 'Pelaksana DCKTR',
            keterangan: 'Sesuai RAK November DPPA 2026',
          },
        ];
        if (monevPerBulan['2026-11']) {
          monevPerBulan['2026-11'].realisasiFisikPersen =
            raw.pagu > 0
              ? Number(Math.min(100, ((sdOct + realNov) / raw.pagu) * 100).toFixed(1))
              : 0;
        }
      } else {
        realisasiPerBulan['2026-11'] = [];
        if (monevPerBulan['2026-11']) {
          monevPerBulan['2026-11'].realisasiFisikPersen =
            monevPerBulan['2026-10']?.realisasiFisikPersen ?? 0;
        }
      }

      // Ensure realistic default single-item dpaItems if detailed breakdown wasn't explicitly set
      const dpaItems: DpaComponentSpec[] = raw.dpaItems ?? [
        {
          uraianKomponen: raw.uraian,
          volume: 1,
          satuan: raw.kode.startsWith('5.1.01') ? 'Tahun' : 'Paket',
          hargaSatuan: raw.pagu,
          ppnPersen: 0,
          jumlahDpa: raw.pagu,
        },
      ];

      result.push({
        id,
        opdId: 'opd-dcktr',
        kodeRekening: raw.kode,
        uraianRekening: raw.uraian,
        program: sub.program,
        subKegiatan: sub.subKegiatan,
        sumberDana: sub.sumberDana,
        jenisBelanja,
        paguDpa: raw.pagu,
        dpaItems,
        realisasiPerBulan,
        monevPerBulan,
        terinputSiapSatya,
      });
    }
  }

  return result;
}

export const DCKTR_DPPA_2026_ACCOUNTS: BudgetAccount[] = buildDcktrAccounts();
