import React from 'react';
import { 
  MapPin, 
  Navigation, 
  FileSpreadsheet, 
  Plus, 
  RotateCcw, 
  FileCode, 
  Download, 
  Compass,
  Database,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenRouteModal: () => void;
  onOpenAuditModal: () => void;
  onResetView: () => void;
  onShowAll: () => void;
  onExportExcel: () => void;
  onExportKML: () => void;
  onDownloadTemplate: () => void;
  merchantCount: number;
  isDbConnected: boolean;
  unmappedCount: number;
  onBatchGeocodeUnmapped: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onOpenImportModal,
  onOpenRouteModal,
  onOpenAuditModal,
  onResetView,
  onShowAll,
  onExportExcel,
  onExportKML,
  onDownloadTemplate,
  merchantCount,
  isDbConnected,
  unmappedCount,
  onBatchGeocodeUnmapped
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Database Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                Merchant Location Mapping
              </h1>
              {isDbConnected ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1" title="Tersambung ke Cloud Firestore Database">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Cloud DB</span>
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
                  Lokal Cache
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemetaan Alamat & Koordinat Merchant Terintegrasi Google Maps
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Unmapped counter quick badge if > 0 */}
          {unmappedCount > 0 && (
            <button
              type="button"
              onClick={onBatchGeocodeUnmapped}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-xs"
              title="Klik untuk memetakan alamat semua data Lat/Lng = 0"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{unmappedCount} Butuh Mapping</span>
            </button>
          )}

          {/* Audit App Button */}
          <button
            type="button"
            onClick={onOpenAuditModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition transform hover:-translate-y-0.5"
            title="Lihat hasil audit dan status perbaikan aplikasi"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Hasil Cek & Audit</span>
          </button>

          {/* Multi-Route Button */}
          <button
            type="button"
            onClick={onOpenRouteModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Rute Multi-Merchant</span>
          </button>

          {/* Import Excel to DB */}
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          {/* Add Merchant */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Merchant</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div 
                className="absolute right-0 top-9 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => { onExportExcel(); setShowExportMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export ke Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => { onExportKML(); setShowExportMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export Google MyMaps (KML)</span>
                </button>
                <button
                  onClick={() => { onDownloadTemplate(); setShowExportMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 flex items-center gap-2 text-slate-700 font-medium border-t border-slate-100 mt-1 pt-1"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Download Template Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset View */}
          <button
            type="button"
            onClick={onResetView}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
            title="Reset Posisi Peta ke Makassar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
