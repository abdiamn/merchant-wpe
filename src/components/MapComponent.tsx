import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Merchant, TileLayerType } from '../types';
import { Layers, Crosshair } from 'lucide-react';

interface MapComponentProps {
  merchants: Merchant[];
  selectedMerchantId: string | null;
  onSelectMerchant: (id: string | null) => void;
  onEditMerchant: (merchant: Merchant) => void;
  onDeleteMerchant: (id: string) => void;
  isPickingPoint: boolean;
  onPointPicked?: (lat: number, lng: number) => void;
  pickedPoint?: { lat: number; lng: number } | null;
  activeTileLayer: TileLayerType;
  onChangeTileLayer: (layer: TileLayerType) => void;
  onMapReadyRef?: (mapInstance: L.Map | null) => void;
}

const TILE_LAYERS: Record<TileLayerType, { url: string; attribution: string; maxZoom: number }> = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  },
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB & OpenStreetMap',
    maxZoom: 20
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB & OpenStreetMap',
    maxZoom: 20
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & OpenStreetMap contributors',
    maxZoom: 19
  }
};

// Create sleek uniform marker icon
const createCustomIcon = (isSelected: boolean = false) => {
  const size = isSelected ? 38 : 30;
  const pinColor = isSelected ? '#1d4ed8' : '#2563eb';
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
            fill="${pinColor}" 
            stroke="#ffffff" 
            stroke-width="${isSelected ? '2.5' : '1.5'}"
            filter="url(#shadow)"/>
      <circle cx="12" cy="9" r="3.5" fill="#ffffff" />
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4]
  });
};

const pickIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center animate-bounce">
      <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-sm">
        📍
      </div>
    </div>
  `,
  className: 'pick-point-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

export const MapComponent: React.FC<MapComponentProps> = ({
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  onEditMerchant,
  onDeleteMerchant,
  isPickingPoint,
  onPointPicked,
  pickedPoint,
  activeTileLayer,
  onChangeTileLayer,
  onMapReadyRef
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const pickMarkerRef = useRef<L.Marker | null>(null);
  const [showLayerMenu, setShowLayerMenu] = React.useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: Makassar (-5.1477, 119.4327)
    const map = L.map(mapContainerRef.current, {
      center: [-5.1477, 119.4327],
      zoom: 13,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const initialLayerConfig = TILE_LAYERS[activeTileLayer];
    const tileLayer = L.tileLayer(initialLayerConfig.url, {
      attribution: initialLayerConfig.attribution,
      maxZoom: initialLayerConfig.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    onMapReadyRef?.(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const layerConfig = TILE_LAYERS[activeTileLayer];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom
    }).addTo(mapInstanceRef.current);
  }, [activeTileLayer]);

  // Click on map to pick coordinate
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingPoint && onPointPicked) {
        onPointPicked(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickingPoint, onPointPicked]);

  // Handle picked point marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }

    if (pickedPoint) {
      const marker = L.marker([pickedPoint.lat, pickedPoint.lng], { icon: pickIcon }).addTo(map);
      marker.bindPopup(`<b>Titik Terpilih</b><br>Lat: ${pickedPoint.lat.toFixed(6)}<br>Lng: ${pickedPoint.lng.toFixed(6)}`).openPopup();
      pickMarkerRef.current = marker;
      map.panTo([pickedPoint.lat, pickedPoint.lng]);
    }
  }, [pickedPoint]);

  // Render & sync markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Only render markers for merchants with valid coordinates (lat & lng != 0)
    const validMerchants = merchants.filter(m => m.lat !== 0 && m.lng !== 0);

    validMerchants.forEach(m => {
      const isSelected = m.id === selectedMerchantId;
      const marker = L.marker([m.lat, m.lng], {
        icon: createCustomIcon(isSelected),
        title: m.name
      }).addTo(map);

      const gmapsDir = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`;
      const gmapsPin = `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;

      const popupHtml = document.createElement('div');
      popupHtml.className = 'p-1 text-slate-800 text-sm font-sans min-w-[240px]';
      popupHtml.innerHTML = `
        <div class="border-b pb-2 mb-2">
          <h4 class="font-bold text-base text-slate-900 leading-tight">${m.name}</h4>
        </div>
        <p class="text-xs text-slate-600 mb-2 leading-relaxed">
          <span class="font-semibold text-slate-700">📍 Alamat:</span> ${m.address || '-'}
        </p>
        ${m.phone ? `
          <p class="text-xs text-slate-600 mb-2">
            <span class="font-semibold text-slate-700">📞 Telp:</span> 
            <a href="tel:${m.phone}" class="text-blue-600 hover:underline">${m.phone}</a>
          </p>
        ` : ''}
        ${m.notes ? `
          <p class="text-xs text-slate-500 italic mb-2">
            💬 ${m.notes}
          </p>
        ` : ''}
        <div class="bg-slate-100 rounded p-1.5 text-[11px] font-mono text-slate-600 mb-2.5 flex items-center justify-between">
          <span>Lat: ${m.lat.toFixed(5)}, Lng: ${m.lng.toFixed(5)}</span>
        </div>
        <div class="space-y-1.5 pt-1 border-t border-slate-100">
          <a href="${gmapsDir}" target="_blank" rel="noopener noreferrer" 
             class="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition">
            🚗 Navigasi Rute (Google Maps)
          </a>
          <a href="${gmapsPin}" target="_blank" rel="noopener noreferrer" 
             class="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition">
            📍 Buka Pin di Google Maps
          </a>
          <div class="flex gap-1.5 pt-1">
            <button id="edit-btn-${m.id}" class="flex-1 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded">
              ✏️ Edit
            </button>
            <button id="delete-btn-${m.id}" class="flex-1 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded">
              🗑️ Hapus
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 320,
        className: 'rounded-xl shadow-xl'
      });

      marker.on('popupopen', () => {
        onSelectMerchant(m.id);
        const editBtn = document.getElementById(`edit-btn-${m.id}`);
        const deleteBtn = document.getElementById(`delete-btn-${m.id}`);
        if (editBtn) {
          editBtn.onclick = (e) => {
            e.preventDefault();
            marker.closePopup();
            onEditMerchant(m);
          };
        }
        if (deleteBtn) {
          deleteBtn.onclick = (e) => {
            e.preventDefault();
            marker.closePopup();
            if (confirm(`Yakin ingin menghapus "${m.name}"?`)) {
              onDeleteMerchant(m.id);
            }
          };
        }
      });

      marker.on('click', () => {
        onSelectMerchant(m.id);
      });

      markersRef.current.set(m.id, marker);
    });
  }, [merchants, selectedMerchantId]);

  // Pan to selected merchant
  useEffect(() => {
    if (!selectedMerchantId || !mapInstanceRef.current) return;
    const marker = markersRef.current.get(selectedMerchantId);
    const target = merchants.find(m => m.id === selectedMerchantId);
    if (marker && target && target.lat !== 0 && target.lng !== 0) {
      mapInstanceRef.current.setView([target.lat, target.lng], 15, { animate: true });
      if (!marker.isPopupOpen()) {
        marker.openPopup();
      }
    }
  }, [selectedMerchantId, merchants]);

  return (
    <div className={`relative w-full h-full ${isPickingPoint ? 'cursor-crosshair' : ''}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {isPickingPoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold border border-blue-400 animate-pulse pointer-events-none">
          <Crosshair className="w-4 h-4 animate-spin text-amber-300" />
          <span>Mode Pilih Titik Aktif: Klik pada peta untuk mengambil koordinat lokasi</span>
        </div>
      )}

      {/* Layer Switcher */}
      <div className="absolute top-4 left-4 z-[990]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            title="Ganti Jenis Peta"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="capitalize font-semibold">{activeTileLayer}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute left-0 top-11 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-44 z-[1001] space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Layer Peta</div>
              {(['streets', 'positron', 'dark', 'satellite'] as TileLayerType[]).map(layer => (
                <button
                  key={layer}
                  onClick={() => {
                    onChangeTileLayer(layer);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition ${
                    activeTileLayer === layer 
                      ? 'bg-blue-50 text-blue-700 font-bold' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="capitalize">
                    {layer === 'streets' && '🗺️ OpenStreetMap'}
                    {layer === 'positron' && '🏙️ Clean Light'}
                    {layer === 'dark' && '🌙 Dark Mode'}
                    {layer === 'satellite' && '🛰️ Satelit Esri'}
                  </span>
                  {activeTileLayer === layer && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
