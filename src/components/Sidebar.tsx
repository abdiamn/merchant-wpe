import React, { useState } from 'react';
import { Merchant } from '../types';
import { 
  Search, 
  MapPin, 
  Phone, 
  Navigation, 
  Trash2, 
  Edit3, 
  Maximize2,
  Building2,
  PlusCircle,
  RotateCcw,
  Compass,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  merchants: Merchant[];
  filteredMerchants: Merchant[];
  selectedMerchantId: string | null;
  onSelectMerchant: (id: string) => void;
  onEditMerchant: (merchant: Merchant) => void;
  onDeleteMerchant: (id: string) => void;
  onGeocodeSingleMerchant: (merchant: Merchant) => Promise<void>;
  onBatchGeocodeUnmapped: () => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  coordFilter: 'all' | 'mapped' | 'unmapped';
  onCoordFilterChange: (filter: 'all' | 'mapped' | 'unmapped') => void;
  onShowAll: () => void;
  onResetToDefault: () => void;
  onOpenAddModal: () => void;
  isBatchGeocoding: boolean;
  geocodingId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  merchants,
  filteredMerchants,
  selectedMerchantId,
  onSelectMerchant,
  onEditMerchant,
  onDeleteMerchant,
  onGeocodeSingleMerchant,
  onBatchGeocodeUnmapped,
  searchQuery,
  onSearchChange,
  coordFilter,
  onCoordFilterChange,
  onShowAll,
  onResetToDefault,
  onOpenAddModal,
  isBatchGeocoding,
  geocodingId
}) => {
  const unmappedCount = merchants.filter(m => m.lat === 0 && m.lng === 0).length;
  const mappedCount = merchants.length - unmappedCount;

  return (
    <aside className="w-full md:w-96 lg:w-[420px] h-full flex flex-col bg-white border-r border-slate-200 z-10 shadow-sm overflow-hidden">
      {/* Top Search & Filter Section */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama, alamat, telepon merchant..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Semua / Terpetakan / Butuh Mapping Alamat) */}
        <div className="flex bg-slate-200/70 p-1 rounded-lg text-[11px] font-semibold text-slate-600 gap-1">
          <button
            onClick={() => onCoordFilterChange('all')}
            className={`flex-1 py-1.5 rounded-md transition text-center ${
              coordFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Semua ({merchants.length})
          </button>
          <button
            onClick={() => onCoordFilterChange('mapped')}
            className={`flex-1 py-1.5 rounded-md transition text-center ${
              coordFilter === 'mapped' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Di Peta ({mappedCount})
          </button>
          <button
            onClick={() => onCoordFilterChange('unmapped')}
            className={`flex-1 py-1.5 rounded-md transition text-center relative ${
              coordFilter === 'unmapped' ? 'bg-white text-amber-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <span>Lat/Lng 0 ({unmappedCount})</span>
            {unmappedCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-1" />
            )}
          </button>
        </div>

        {/* Alert Banner for Unmapped Merchants */}
        {unmappedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">{unmappedCount} Merchant</span>
                <span className="text-[11px] text-amber-800 block">belum ada titik (Lat/Lng: 0)</span>
              </div>
            </div>
            <button
              onClick={onBatchGeocodeUnmapped}
              disabled={isBatchGeocoding}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 shrink-0 transition shadow-xs"
            >
              {isBatchGeocoding ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Memetakan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Petakan Semua</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Map Control Buttons */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <button
            onClick={onShowAll}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-700 font-medium transition"
            title="Pusatkan peta agar merchant yang terpetakan terlihat"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Tampilkan di Peta</span>
          </button>
          <button
            onClick={onResetToDefault}
            className="flex items-center gap-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-600 font-medium transition"
            title="Kembalikan data ke contoh awal Makassar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Merchant Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredMerchants.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Tidak ada merchant ditemukan</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || coordFilter !== 'all'
                  ? 'Coba ubah kata kunci pencarian atau tab filter.' 
                  : 'Belum ada merchant yang terdaftar di database.'}
              </p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah Merchant Baru</span>
            </button>
          </div>
        ) : (
          filteredMerchants.map((merchant) => {
            const isSelected = merchant.id === selectedMerchantId;
            const isZeroCoords = merchant.lat === 0 && merchant.lng === 0;
            const isBeingGeocoded = geocodingId === merchant.id;
            const gmapsUrl = !isZeroCoords 
              ? `https://www.google.com/maps/dir/?api=1&destination=${merchant.lat},${merchant.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant.address || merchant.name)}`;

            return (
              <div
                key={merchant.id}
                onClick={() => {
                  if (!isZeroCoords) {
                    onSelectMerchant(merchant.id);
                  }
                }}
                className={`group p-3 rounded-xl border transition-all relative ${
                  isZeroCoords ? 'border-amber-200 bg-amber-50/30' : 'bg-white border-slate-200'
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-500/30 border-blue-400 bg-blue-50/50 shadow-sm'
                    : 'hover:border-blue-200 hover:shadow-xs'
                } ${isZeroCoords ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition leading-snug">
                    {merchant.name}
                  </h3>
                  {isZeroCoords && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <span>Lat/Lng: 0</span>
                    </span>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-2">
                  <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isZeroCoords ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="line-clamp-2 leading-relaxed">
                    {merchant.address || <span className="text-slate-400 italic">Belum ada alamat</span>}
                  </span>
                </div>

                {/* Phone */}
                {merchant.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${merchant.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {merchant.phone}
                    </a>
                  </div>
                )}

                {/* Notes if any */}
                {merchant.notes && (
                  <p className="text-[11px] text-slate-500 italic mb-2 line-clamp-1">
                    💬 {merchant.notes}
                  </p>
                )}

                {/* Action if Lat/Lng = 0: "Petakan Alamat Sekarang" */}
                {isZeroCoords && (
                  <div className="bg-amber-100/70 p-2.5 rounded-lg my-2 space-y-2 border border-amber-200/80">
                    <div className="flex items-center justify-between text-[11px] text-amber-900">
                      <span className="font-semibold">Titik lokasi masih 0</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${merchant.name} ${merchant.address} Makassar`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sky-700 hover:text-sky-900 underline font-semibold flex items-center gap-1"
                        title="Buka pencarian nama & alamat ini di Google Maps"
                      >
                        <span>Cek di Google Maps ↗</span>
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGeocodeSingleMerchant(merchant);
                      }}
                      disabled={isBeingGeocoded}
                      className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold text-xs rounded-md flex items-center justify-center gap-1.5 transition shadow-xs"
                      title="Cari koordinat otomatis berdasarkan nama & alamat jalan"
                    >
                      {isBeingGeocoded ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mencari koordinat...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5" />
                          <span>Petakan Alamat Otomatis ke Peta</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Coordinates & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className={`font-mono ${isZeroCoords ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                    {isZeroCoords ? '0, 0 (Belum dipetakan)' : `${merchant.lat.toFixed(4)}, ${merchant.lng.toFixed(4)}`}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Directions in GMaps */}
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-sky-600 hover:bg-sky-50 rounded"
                      title="Buka di Google Maps"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </a>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMerchant(merchant);
                      }}
                      className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                      title="Edit Data Merchant"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus "${merchant.name}" dari database?`)) {
                          onDeleteMerchant(merchant.id);
                        }
                      }}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      title="Hapus Merchant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
