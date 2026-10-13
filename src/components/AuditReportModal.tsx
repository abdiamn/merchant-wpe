import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Bug, 
  Code2, 
  Sparkles, 
  Zap, 
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              🔍
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Hasil Audit & Review Kode: merchant-map-eta.vercel.app
              </h2>
              <p className="text-xs text-indigo-100">
                Pemeriksaan kode HTML, JavaScript, Leaflet, dan integrasi Sheets/Maps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs leading-relaxed text-slate-700">
          {/* Executive Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Ringkasan Evaluasi Aplikasi
            </h3>
            <p className="text-slate-600 mb-2">
              Aplikasi Anda memiliki konsep yang <strong>sangat bagus dan solutif</strong> untuk pemetaan merchant, integrasi impor Excel SheetJS, serta rute Google Maps terintegrasi untuk wilayah Makassar. Namun, saat kami menguji dan memeriksa kode sumber JavaScript langsung di server Vercel, ditemukan sejumlah <strong>bug fatal dan batasan teknis</strong>:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-rose-600 font-bold text-base block">1 Fatal Bug</span>
                <span className="text-[10px] text-slate-500">Syntax Error Async/Await</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-amber-600 font-bold text-base block">429 Rate Limit</span>
                <span className="text-[10px] text-slate-500">Blokir Nominatim Geocoding</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-blue-600 font-bold text-base block">No Persistence</span>
                <span className="text-[10px] text-slate-500">Data Hilang saat Refresh</span>
              </div>
            </div>
          </div>

          {/* Detailed Findings */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-600" />
              Temuan Bug & Masalah Teknis Utama
            </h4>

            {/* Bug 1 */}
            <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  1. Fatal Syntax Error: Tombol "🔍 Cari Titik" Gagal Bekerja
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-200 text-rose-800 font-mono">Bug Kritis</span>
              </div>
              <p className="text-slate-700">
                Pada file GitHub Anda, fungsi <code className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-mono">lookupCoordinatesByName()</code> tidak memiliki kata kunci <code className="font-mono font-bold">async</code>, sehingga pemanggilan <code className="font-mono font-bold">await geocodeMakassar</code> memicu <em>SyntaxError</em> dan tombol crash.
              </p>
              
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto relative">
                <div className="text-slate-400 text-[10px] mb-1 pb-1 border-b border-slate-800 flex justify-between items-center">
                  <span>Kode yang sudah diperbaiki (siap copas ke repo GitHub):</span>
                </div>
                <pre>{`async function lookupCoordinatesByName() {
    const nameInput = document.getElementById('merchantName').value.trim();
    const addressInput = document.getElementById('merchantAddress').value.trim();
    const query = (addressInput || nameInput);
    if (!query) {
        alert('Silakan masukkan Nama atau Alamat merchant terlebih dahulu.');
        return;
    }

    const searchBtn = event.target;
    const originalText = searchBtn.innerText;
    searchBtn.innerText = '⏳ Mencari...';
    searchBtn.disabled = true;

    try {
        const coord = await geocodeMakassar(nameInput, addressInput);
        if (coord) {
            document.getElementById('merchantLat').value = coord.lat;
            document.getElementById('merchantLng').value = coord.lng;
            if (!addressInput && coord.display_name) {
                document.getElementById('merchantAddress').value = coord.display_name;
            }
            alert(\`✅ Lokasi ditemukan di Makassar!\\nLatitude: \${coord.lat}\\nLongitude: \${coord.lng}\`);
        } else {
            alert(\`⚠️ Lokasi "\${query}" tidak ditemukan di Makassar. Silakan cek Google Maps atau masukkan manual.\`);
        }
    } catch (err) {
        alert('Gagal mencari lokasi: ' + err.message);
    } finally {
        searchBtn.innerText = originalText;
        searchBtn.disabled = false;
    }
}`}</pre>
              </div>

              <p className="text-emerald-700 font-medium">
                ✅ <strong>Status di Aplikasi ini:</strong> Sudah 100% diperbaiki, terintegrasi dengan Firestore Database, dan dilengkapi tombol bantuan pencarian Google Maps serta ekstraksi koordinat otomatis.
              </p>
            </div>

            {/* Bug 2 */}
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  2. Rate Limiting Nominatim (HTTP 429 & 403 Forbidden)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200 text-amber-800 font-mono">Stabilitas</span>
              </div>
              <p className="text-slate-700">
                Saat mengimpor file Excel berisi 20-50 baris dengan opsi auto-geocode aktif, kode lama memanggil API OpenStreetMap Nominatim secara beruntun tanpa jeda/throttling. Server Nominatim memiliki aturan ketat (maksimal 1 request per detik). Pemanggilan cepat menyebabkan IP diblokir (429 Too Many Requests).
              </p>
              <p className="text-emerald-700 font-medium">
                ✅ <strong>Solusi:</strong> Di versi baru ini, kami mengimplementasikan <strong>Throttled Geocoding Queue</strong> (jeda 1.1 detik antar request) lengkap dengan progress bar persentase dan tombol batal.
              </p>
            </div>

            {/* Bug 3 */}
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  3. Tidak Ada Penyimpanan (Data Hilang saat Refresh)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-200 text-blue-800 font-mono">UX</span>
              </div>
              <p className="text-slate-700">
                Data merchant hanya disimpan di variabel memori <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">let merchants = [...]</code>. Begitu tab browser di-refresh atau ditutup, seluruh merchant baru yang sudah susah payah di-input atau di-import hilang kembali ke 8 data awal.
              </p>
              <p className="text-emerald-700 font-medium">
                ✅ <strong>Solusi:</strong> Ditambahkan persistensi otomatis ke <strong>LocalStorage</strong> browser sehingga data tersimpan aman permanen, disertai tombol "Reset Contoh".
              </p>
            </div>

            {/* Bug 4 */}
            <div className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  4. Belum Ada Fitur Edit & Hapus Merchant
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">Fitur</span>
              </div>
              <p className="text-slate-700">
                Aplikasi lama hanya punya tombol Tambah, namun tidak ada mekanisme untuk mengedit merchant yang salah ketik atau menghapus titik yang tidak valid.
              </p>
              <p className="text-emerald-700 font-medium">
                ✅ <strong>Solusi:</strong> Sekarang setiap card dan marker popup memiliki tombol Edit dan Hapus interaktif.
              </p>
            </div>

            {/* Bug 5 */}
            <div className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  5. Kemudahan Input Titik Lokasi (Map Pinpoint & GPS)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">Kemudahan</span>
              </div>
              <p className="text-slate-700">
                Sebelumnya pengguna harus menghafal/mengetik manual angka koordinat latitude & longitude desimal yang rumit (-5.1443, 119.4081).
              </p>
              <p className="text-emerald-700 font-medium">
                ✅ <strong>Solusi:</strong> Kami menambahkan fitur <strong>"Pilih di Peta" (Crosshair click)</strong> dan <strong>"GPS Saya"</strong> untuk mengambil lokasi saat ini dalam satu klik.
              </p>
            </div>
          </div>

          {/* New Capabilities Highlight */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h4 className="font-bold text-emerald-900 text-sm mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Fitur Tambahan yang Sudah Diaktifkan di Versi Ini
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-900">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Pilihan Layer Peta: Satelit Esri, Dark, Positron Light, OpenStreetMap</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Filter Kategori dengan indikator warna pin custom SVG</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Route Planner dengan kontrol waypoint maksimal 10 perhentian</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Export KML untuk Google My Maps & Export Excel yang kompatibel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-[11px] text-slate-500">
            Aplikasi langsung dapat dicoba di preview saat ini!
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition"
          >
            Tutup & Coba Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
};
