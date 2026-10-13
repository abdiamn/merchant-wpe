import React, { useState, useEffect } from 'react';
import { Merchant } from '../types';
import { geocodeLocation, extractCoordsFromTextOrUrl } from '../utils/geocoding';
import { 
  X, 
  Search, 
  MapPin, 
  Check, 
  Loader2, 
  Crosshair,
  Compass,
  ExternalLink,
  ClipboardPaste
} from 'lucide-react';

interface MerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (merchant: Omit<Merchant, 'id'>, existingId?: string) => void;
  editingMerchant: Merchant | null;
  onStartPickOnMap: () => void;
  pickedPoint: { lat: number; lng: number } | null;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMerchant,
  onStartPickOnMap,
  pickedPoint
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [pasteGmapsInput, setPasteGmapsInput] = useState('');
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [geocodeFeedback, setGeocodeFeedback] = useState<string | null>(null);

  // Sync form on open or when editingMerchant changes
  useEffect(() => {
    if (editingMerchant) {
      setName(editingMerchant.name);
      setAddress(editingMerchant.address);
      setLat(String(editingMerchant.lat));
      setLng(String(editingMerchant.lng));
      setPhone(editingMerchant.phone || '');
      setNotes(editingMerchant.notes || '');
    } else {
      setName('');
      setAddress('');
      setLat('');
      setLng('');
      setPhone('');
      setNotes('');
    }
    setPasteGmapsInput('');
    setGeocodeFeedback(null);
  }, [editingMerchant, isOpen]);

  // Sync when point is picked on the map
  useEffect(() => {
    if (pickedPoint && isOpen) {
      setLat(pickedPoint.lat.toFixed(6));
      setLng(pickedPoint.lng.toFixed(6));
      setGeocodeFeedback(`Titik dipilih dari peta: ${pickedPoint.lat.toFixed(5)}, ${pickedPoint.lng.toFixed(5)}`);
    }
  }, [pickedPoint, isOpen]);

  if (!isOpen) return null;

  // Auto geocode handler with smart street normalization
  const handleAutoGeocode = async () => {
    const query = address.trim() || name.trim();
    if (!query) {
      alert('Masukkan Alamat atau Nama merchant terlebih dahulu untuk mencari titik.');
      return;
    }

    setIsSearchingGeocode(true);
    setGeocodeFeedback(null);

    try {
      const result = await geocodeLocation(name, address, 'Makassar');
      if (result) {
        setLat(result.lat.toFixed(6));
        setLng(result.lng.toFixed(6));
        if (!address && result.displayName) {
          setAddress(result.displayName);
        }
        setGeocodeFeedback(`✅ Lokasi ditemukan: ${result.displayName} (${result.lat.toFixed(5)}, ${result.lng.toFixed(5)})`);
      } else {
        setGeocodeFeedback('⚠️ Alamat belum ditemukan otomatis. Anda bisa buka Google Maps atau klik "Pilih di Peta".');
      }
    } catch (err: any) {
      setGeocodeFeedback(`Gagal mencari koordinat: ${err.message}`);
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // Open Google Maps search in new tab
  const handleOpenGoogleMapsSearch = () => {
    const query = [name.trim(), address.trim(), 'Makassar'].filter(Boolean).join(' ');
    if (!query) {
      alert('Masukkan nama atau alamat terlebih dahulu');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  // Handle parsing pasted link / coordinates
  const handlePasteExtract = (text: string) => {
    setPasteGmapsInput(text);
    const coords = extractCoordsFromTextOrUrl(text);
    if (coords) {
      setLat(coords.lat.toFixed(6));
      setLng(coords.lng.toFixed(6));
      setGeocodeFeedback(`✅ Koordinat berhasil diekstrak dari Google Maps: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    }
  };

  // GPS Geolocation handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung geolokasi GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeocodeFeedback(`📍 Titik GPS perangkat didapatkan: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      (err) => {
        alert('Gagal mengambil lokasi GPS: ' + err.message);
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Mohon masukkan Latitude dan Longitude yang valid.');
      return;
    }

    onSave(
      {
        name: name.trim(),
        address: address.trim(),
        lat: latNum,
        lng: lngNum,
        phone: phone.trim(),
        notes: notes.trim()
      },
      editingMerchant?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {editingMerchant ? '✏️' : '➕'}
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {editingMerchant ? 'Edit Data Merchant' : 'Tambah Merchant Baru'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Merchant Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Merchant <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Farah Hijab, RM Nelayan, dll."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Address with Auto-Cari button */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Abu Bakar Lambogo No. 243, Makassar"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAutoGeocode}
                disabled={isSearchingGeocode}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shadow-xs"
                title="Cari koordinat otomatis berdasarkan alamat"
              >
                {isSearchingGeocode ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Cari Titik Alamat</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-500">
                Sistem otomatis memetakan nama jalan jika nomor bangunan belum terdata.
              </span>
              <button
                type="button"
                onClick={handleOpenGoogleMapsSearch}
                className="text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
                title="Buka pencarian lokasi ini di Google Maps"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Cari di Google Maps</span>
              </button>
            </div>
          </div>

          {/* Coordinates section with Map Picker, GPS, & Google Maps Paste */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Koordinat Titik Lokasi
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={onStartPickOnMap}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition"
                  title="Klik langsung titik di peta"
                >
                  <Crosshair className="w-3 h-3 text-red-500" />
                  <span>Pilih di Peta</span>
                </button>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition"
                  title="Ambil titik dari GPS perangkat"
                >
                  <Compass className="w-3 h-3 text-blue-500" />
                  <span>GPS Saya</span>
                </button>
              </div>
            </div>

            {/* Quick Paste from Google Maps */}
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <ClipboardPaste className="w-3 h-3 text-blue-600" />
                <span>Tempel Link / Angka dari Google Maps (Otomatis diekstrak):</span>
              </label>
              <input
                type="text"
                value={pasteGmapsInput}
                onChange={(e) => handlePasteExtract(e.target.value)}
                placeholder="Contoh: -5.1430, 119.4333 atau link google maps"
                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-5.1443"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="119.4081"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {geocodeFeedback && (
              <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                {geocodeFeedback}
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0411-XXXXXX / 0812..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Merchant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
