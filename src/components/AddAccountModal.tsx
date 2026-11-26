import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BudgetAccount, JenisBelanja } from '../types/budget';
import { generateId, parseNumericInput, formatNumberID } from '../utils/format';

interface AddAccountModalProps {
  isOpen: boolean;
  opdId: string;
  onClose: () => void;
  onSave: (account: BudgetAccount) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  opdId,
  onClose,
  onSave,
}) => {
  const [kodeRekening, setKodeRekening] = useState('5.1.02.01.01.0026');
  const [uraianRekening, setUraianRekening] = useState('');
  const [program, setProgram] = useState('2.16.01 · Program Penunjang Urusan Pemerintahan Daerah');
  const [subKegiatan, setSubKegiatan] = useState('');
  const [sumberDana, setSumberDana] = useState('PAD');
  const [jenisBelanja, setJenisBelanja] = useState<JenisBelanja>('Belanja Operasi - Barang & Jasa');
  const [paguInput, setPaguInput] = useState('50000000');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKode = kodeRekening.trim();
    const trimmedUraian = uraianRekening.trim();
    const paguDpa = parseNumericInput(paguInput);

    if (!trimmedKode || !trimmedUraian) {
      setError('Kode rekening dan uraian rekening wajib diisi.');
      return;
    }
    if (paguDpa <= 0) {
      setError('Pagu DPA harus lebih besar dari Rp 0.');
      return;
    }

    onSave({
      id: generateId('acc'),
      opdId,
      kodeRekening: trimmedKode,
      uraianRekening: trimmedUraian,
      program: program.trim() || 'Program Penunjang Urusan Pemerintahan Daerah',
      subKegiatan: subKegiatan.trim() || 'Kegiatan Operasional Perangkat Daerah',
      sumberDana: sumberDana.trim() || 'PAD',
      jenisBelanja,
      paguDpa,
      realisasiPerBulan: {},
      monevPerBulan: {},
      terinputSiapSatya: {},
    });

    setUraianRekening('');
    setSubKegiatan('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-account-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="modal-add-account-title" className="font-display text-base font-semibold text-slate-900">
            Tambah Rekening Belanja SKPD
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="add-kode" className="block text-xs font-medium text-slate-700 mb-1">
                Kode Rekening
              </label>
              <input
                id="add-kode"
                type="text"
                value={kodeRekening}
                onChange={(e) => setKodeRekening(e.target.value)}
                placeholder="5.1.02.01.01.0024"
                className="w-full px-3 py-2 text-xs font-mono text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label htmlFor="add-jenis" className="block text-xs font-medium text-slate-700 mb-1">
                Kelompok Belanja (APBD)
              </label>
              <select
                id="add-jenis"
                value={jenisBelanja}
                onChange={(e) => setJenisBelanja(e.target.value as JenisBelanja)}
                className="w-full px-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                <option value="Belanja Operasi - Pegawai">Belanja Operasi - Pegawai</option>
                <option value="Belanja Operasi - Barang & Jasa">Belanja Operasi - Barang & Jasa</option>
                <option value="Belanja Modal">Belanja Modal</option>
                <option value="Belanja Tidak Terduga">Belanja Tidak Terduga</option>
                <option value="Belanja Transfer">Belanja Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="add-uraian" className="block text-xs font-medium text-slate-700 mb-1">
              Uraian Rekening Belanja
            </label>
            <input
              id="add-uraian"
              type="text"
              value={uraianRekening}
              onChange={(e) => setUraianRekening(e.target.value)}
              placeholder="Contoh: Belanja Bahan Cetak dan Penggandaan"
              className="w-full px-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label htmlFor="add-program" className="block text-xs font-medium text-slate-700 mb-1">
              Program
            </label>
            <input
              id="add-program"
              type="text"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label htmlFor="add-sub" className="block text-xs font-medium text-slate-700 mb-1">
              Sub-Kegiatan
            </label>
            <input
              id="add-sub"
              type="text"
              value={subKegiatan}
              onChange={(e) => setSubKegiatan(e.target.value)}
              placeholder="Contoh: 2.16.01.2.06 · Administrasi Umum Perangkat Daerah"
              className="w-full px-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="add-sumber" className="block text-xs font-medium text-slate-700 mb-1">
                Sumber Dana
              </label>
              <select
                id="add-sumber"
                value={sumberDana}
                onChange={(e) => setSumberDana(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                <option value="PAD">PAD (Pendapatan Asli Daerah)</option>
                <option value="DAU">DAU (Dana Alokasi Umum)</option>
                <option value="DAK Fisik">DAK Fisik</option>
                <option value="DAK Non-Fisik">DAK Non-Fisik / BOK</option>
                <option value="DBH">DBH (Dana Bagi Hasil)</option>
              </select>
            </div>

            <div>
              <label htmlFor="add-pagu" className="block text-xs font-medium text-slate-700 mb-1">
                Pagu Anggaran DPA (Rp)
              </label>
              <input
                id="add-pagu"
                type="text"
                inputMode="numeric"
                value={formatNumberID(parseNumericInput(paguInput))}
                onChange={(e) => setPaguInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums text-right text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              Simpan Rekening
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
