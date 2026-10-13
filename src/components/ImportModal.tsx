import React, { useState, useRef } from 'react';
import { Merchant } from '../types';
import { parseExcelFile, downloadExcelTemplate, ParsedMerchantRow } from '../utils/excel';
import { batchGeocodeMerchants } from '../utils/geocoding';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Search,
  Check,
  Database,
  MapPin
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (merchants: Merchant[], mode: 'append' | 'replace') => Promise<void>;
  isDbConnected: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  isDbConnected
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedMerchantRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [autoGeocode, setAutoGeocode] = useState(true);
  const [cityContext, setCityContext] = useState('Makassar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const cancelGeocodeRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    try {
      const rows = await parseExcelFile(selected);
      setParsedRows(rows);
    } catch (err: any) {
      alert('Gagal membaca file Excel/CSV: ' + err.message);
      setFile(null);
      setParsedRows([]);
    }
  };

  const handleProcessImport = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    cancelGeocodeRef.current = false;
    setProgressPercent(0);

    const itemsToGeocode: { index: number; name: string; address?: string }[] = [];
    parsedRows.forEach((row, idx) => {
      // If no valid coordinates (lat 0, lng 0 or empty) and autoGeocode is checked
      if (!row.hasCoordinates && autoGeocode) {
        itemsToGeocode.push({
          index: idx,
          name: row.name,
          address: row.address
        });
      }
    });

    let geocodedMap = new Map<number, { lat: number; lng: number }>();

    if (itemsToGeocode.length > 0) {
      setProgressText(`Memetakan ${itemsToGeocode.length} alamat merchant ke koordinat (dengan jeda aman)...`);
      
      const results = await batchGeocodeMerchants(
        itemsToGeocode,
        cityContext,
        (current, total, itemName, success) => {
          const pct = Math.round((current / total) * 100);
          setProgressPercent(pct);
          setProgressText(`(${current}/${total}) ${success ? '✅ Terpetakan' : '⚠️ Pending'}: ${itemName}`);
        },
        () => cancelGeocodeRef.current
      );

      results.forEach((coord, i) => {
        const originalIndex = itemsToGeocode[i].index;
        geocodedMap.set(originalIndex, coord);
      });
    }

    const finalMerchants: Merchant[] = [];
    let mappedCount = 0;
    let unmappedCount = 0;

    parsedRows.forEach((row, idx) => {
      let finalLat = row.lat;
      let finalLng = row.lng;

      if (!row.hasCoordinates) {
        const found = geocodedMap.get(idx);
        if (found) {
          finalLat = found.lat;
          finalLng = found.lng;
          mappedCount++;
        } else {
          // Keep as 0,0 in database so it can be mapped later!
          finalLat = 0;
          finalLng = 0;
          unmappedCount++;
        }
      } else {
        mappedCount++;
      }

      finalMerchants.push({
        id: `m-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name: row.name,
        address: row.address,
        lat: finalLat,
        lng: finalLng,
        phone: row.phone,
        notes: ''
      });
    });

    setProgressText('Menyimpan data ke Cloud Firestore Database...');

    try {
      await onImportComplete(finalMerchants, importMode);
      setIsProcessing(false);
      onClose();

      let msg = `🎉 Sukses mengimpor ${finalMerchants.length} merchant ke Cloud Database!\n` +
                `• ${mappedCount} lokasi terpetakan di peta.\n`;
      if (unmappedCount > 0) {
        msg += `• ${unmappedCount} merchant tersimpan dengan Lat/Lng 0 (bisa dipetakan kapan saja via tombol "Petakan Alamat").`;
      }
      alert(msg);
    } catch (err: any) {
      setIsProcessing(false);
      alert('Gagal menyimpan ke database: ' + err.message);
    }
  };

  const readyWithCoords = parsedRows.filter(r => r.hasCoordinates).length;
  const zeroCoords = parsedRows.length - readyWithCoords;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              📥
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Import Data Merchant ke Database</span>
                {isDbConnected && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                    🟢 Firestore
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Data akan tersimpan permanen di cloud database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload file <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.xlsx</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.xls</code>, atau <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.csv</code>.
            Kolom yang didukung: <strong>Nama</strong>, <strong>Alamat</strong>, <strong>Latitude / Lat</strong>, <strong>Longitude / Lng</strong>, <strong>Telepon</strong> (tanpa perlu kolom catatan). Jika nilai Latitude & Longitude adalah <strong>0 atau kosong</strong>, sistem akan otomatis melakukan mapping menggunakan kolom <strong>Alamat</strong>.
          </p>

          {/* Template Download Button */}
          <div className="flex items-center justify-between bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs">
            <div className="text-amber-800 font-medium">
              Contoh file dengan baris koordinat terisi & koordinat 0 (via alamat):
            </div>
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih File Excel / CSV
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-1"
            />
          </div>

          {/* Import Mode & Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mode Penambahan ke Database
              </label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                disabled={isProcessing}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="append">Tambahkan ke Database (Append)</option>
                <option value="replace">Ganti Seluruh Data (Replace)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Konteks Wilayah Mapping Alamat
              </label>
              <select
                value={cityContext}
                onChange={(e) => setCityContext(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="Makassar">Kota Makassar (Sulsel)</option>
                <option value="Indonesia">Seluruh Indonesia</option>
                <option value="Jakarta">DKI Jakarta</option>
                <option value="Surabaya">Kota Surabaya</option>
              </select>
            </div>
          </div>

          {/* Auto Geocode Checkbox */}
          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGeocode}
                onChange={(e) => setAutoGeocode(e.target.checked)}
                disabled={isProcessing}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-blue-900 block">
                  Auto-Mapping Alamat ke Koordinat saat Import untuk Lat/Lng = 0
                </span>
                <span className="text-[11px] text-blue-700 leading-tight block mt-0.5">
                  Jika tidak dicentang, data tetap tersimpan di database dengan koordinat 0 dan dapat dipetakan satu per satu nanti.
                </span>
              </div>
            </label>
          </div>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 flex justify-between items-center">
                <span>Total Data Terbaca: {parsedRows.length} baris</span>
                <div className="flex gap-2 text-[11px]">
                  <span className="text-emerald-700 font-bold">✅ {readyWithCoords} Ada Koordinat</span>
                  {zeroCoords > 0 && (
                    <span className="text-amber-700 font-bold">🗺️ {zeroCoords} Lat/Lng 0 (Via Alamat)</span>
                  )}
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                {parsedRows.slice(0, 6).map((row, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50">
                    <div className="truncate max-w-[280px]">
                      <span className="font-semibold text-slate-800">{row.name}</span>
                      <span className="text-slate-500 block truncate">📍 {row.address || 'Alamat kosong'}</span>
                    </div>
                    <div>
                      {row.hasCoordinates ? (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                          Lat: {row.lat.toFixed(3)}, Lng: {row.lng.toFixed(3)}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                          Lat/Lng: 0 (Petakan via Alamat)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {parsedRows.length > 6 && (
                  <div className="p-2 text-center text-slate-500 italic bg-slate-50">
                    ... dan {parsedRows.length - 6} baris lainnya
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress bar during geocoding */}
          {isProcessing && (
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Sedang memproses & menyimpan...</span>
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 truncate">{progressText}</p>
              {autoGeocode && (
                <button
                  type="button"
                  onClick={() => { cancelGeocodeRef.current = true; }}
                  className="text-[11px] text-red-600 hover:underline font-medium"
                >
                  Lewati sisa pencarian koordinat (tetap simpan ke database)
                </button>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleProcessImport}
              disabled={parsedRows.length === 0 || isProcessing}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Import ke Database ({parsedRows.length} Merchant)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
