import React, { useState } from 'react';
import { Merchant } from '../types';
import { 
  X, 
  Navigation, 
  MapPin, 
  ExternalLink, 
  AlertCircle, 
  ArrowDown, 
  Copy, 
  Check,
  CheckSquare,
  Square
} from 'lucide-react';

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchants: Merchant[];
}

export const RouteModal: React.FC<RouteModalProps> = ({
  isOpen,
  onClose,
  merchants
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    merchants.slice(0, 10).map(m => m.id)
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedIds(merchants.slice(0, 10).map(m => m.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const routeMerchants = selectedIds
    .map(id => merchants.find(m => m.id === id))
    .filter((m): m is Merchant => Boolean(m));

  // Generate Google Maps Directions URL
  const generateGmapsUrl = () => {
    if (routeMerchants.length === 0) return '';
    if (routeMerchants.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${routeMerchants[0].lat},${routeMerchants[0].lng}`;
    }

    const origin = `${routeMerchants[0].lat},${routeMerchants[0].lng}`;
    const destination = `${routeMerchants[routeMerchants.length - 1].lat},${routeMerchants[routeMerchants.length - 1].lng}`;
    
    // Middle waypoints (max 8 for Google Maps URL specs)
    const waypointsList = routeMerchants.slice(1, routeMerchants.length - 1).slice(0, 8);
    const waypoints = waypointsList.map(m => `${m.lat},${m.lng}`).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    return url;
  };

  const gmapsUrl = generateGmapsUrl();

  const handleOpenGoogleMaps = () => {
    if (!gmapsUrl) return;
    window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = () => {
    if (!gmapsUrl) return;
    navigator.clipboard.writeText(gmapsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              🚗
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Generator Rute Multi-Merchant
              </h2>
              <p className="text-xs text-slate-500">
                Buat panduan navigasi perjalanan berkeliling merchant di Google Maps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Note on Google Maps limits */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Info Batasan Google Maps URL:</p>
              <p className="text-sky-800 mt-0.5 leading-relaxed">
                Google Maps mengizinkan maksimal <strong>10 titik per rute</strong> (1 titik awal, 8 perhentian / waypoints, dan 1 titik tujuan akhir). Anda dapat memilih merchant mana saja yang ingin dikunjungi.
              </p>
            </div>
          </div>

          {/* Quick selectors */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Pilih Merchant ({routeMerchants.length} terpilih):
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-blue-600 hover:underline font-medium text-[11px]"
              >
                Pilih 10 Teratas
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-slate-500 hover:underline font-medium text-[11px]"
              >
                Hapus Pilihan
              </button>
            </div>
          </div>

          {/* List of merchants to toggle */}
          <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
            {merchants.map((m, idx) => {
              const isChecked = selectedIds.includes(m.id);
              const orderIndex = selectedIds.indexOf(m.id);

              return (
                <div
                  key={m.id}
                  onClick={() => toggleSelect(m.id)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                    isChecked ? 'bg-sky-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="font-semibold text-slate-800 block truncate">{m.name}</span>
                      <span className="text-[11px] text-slate-500 block truncate">{m.address}</span>
                    </div>
                  </div>
                  {isChecked && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 font-bold text-[10px] shrink-0">
                      Stop #{orderIndex + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Route Preview Order */}
          {routeMerchants.length >= 2 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Urutan Jalur Rute:</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Mulai: {routeMerchants[0].name}
                </span>
                <span>➔</span>
                {routeMerchants.length > 2 && (
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                    +{routeMerchants.length - 2} Perhentian
                  </span>
                )}
                {routeMerchants.length > 2 && <span>➔</span>}
                <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Tujuan: {routeMerchants[routeMerchants.length - 1].name}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCopyUrl}
              disabled={!gmapsUrl}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin URL'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                disabled={routeMerchants.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Google Maps</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
