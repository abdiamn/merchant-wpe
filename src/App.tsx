import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Merchant, TileLayerType } from './types';
import { INITIAL_MERCHANTS } from './data/defaultMerchants';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MapComponent } from './components/MapComponent';
import { MerchantModal } from './components/MerchantModal';
import { ImportModal } from './components/ImportModal';
import { RouteModal } from './components/RouteModal';
import { AuditReportModal } from './components/AuditReportModal';
import { exportMerchantsToExcel, downloadExcelTemplate } from './utils/excel';
import { exportMerchantsToKML } from './utils/kml';
import { geocodeLocation, batchGeocodeMerchants } from './utils/geocoding';
import { 
  fetchMerchantsFromDb, 
  saveMerchantToDb, 
  deleteMerchantFromDb, 
  batchSaveMerchantsToDb, 
  updateMerchantCoordinates,
  testFirestoreConnection 
} from './firebase';
import { Map as MapIcon, List } from 'lucide-react';

const STORAGE_KEY = 'merchant_mapping_data_v2';

export default function App() {
  // Merchant data state
  const [merchants, setMerchants] = useState<Merchant[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LocalStorage load:', e);
    }
    return INITIAL_MERCHANTS;
  });

  // Database connectivity state
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Selected merchant & filters
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [coordFilter, setCoordFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerType>('streets');

  // Modals
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Map picking mode
  const [isPickingPoint, setIsPickingPoint] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);

  // Background Geocoding states
  const [isBatchGeocoding, setIsBatchGeocoding] = useState(false);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);

  // Mobile active tab ('map' | 'list')
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  // Leaflet map instance ref
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize and Sync with Firestore Cloud Database
  useEffect(() => {
    let isMounted = true;

    async function initDatabase() {
      try {
        setIsDbLoading(true);
        const connected = await testFirestoreConnection();
        if (isMounted) setIsDbConnected(connected);

        if (connected) {
          const dbMerchants = await fetchMerchantsFromDb();
          if (isMounted) {
            if (dbMerchants.length > 0) {
              setMerchants(dbMerchants);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(dbMerchants));
            } else {
              // Seed initial sample data to Firestore
              await batchSaveMerchantsToDb(INITIAL_MERCHANTS);
              setMerchants(INITIAL_MERCHANTS);
            }
          }
        }
      } catch (err) {
        console.warn('Firestore initialization fallback to local:', err);
      } finally {
        if (isMounted) setIsDbLoading(false);
      }
    }

    initDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save to LocalStorage as cache backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merchants));
    } catch (e) {
      console.error('Failed to save merchants to localStorage', e);
    }
  }, [merchants]);

  // Unmapped count (lat = 0 and lng = 0)
  const unmappedCount = useMemo(() => {
    return merchants.filter(m => m.lat === 0 && m.lng === 0).length;
  }, [merchants]);

  // Filtered merchants based on search and coordinate filter
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const matchSearch =
        searchQuery === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(searchQuery)) ||
        (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const isZero = m.lat === 0 && m.lng === 0;
      let matchCoord = true;
      if (coordFilter === 'mapped') {
        matchCoord = !isZero;
      } else if (coordFilter === 'unmapped') {
        matchCoord = isZero;
      }

      return matchSearch && matchCoord;
    });
  }, [merchants, searchQuery, coordFilter]);

  // Handlers for Add / Edit
  const handleSaveMerchant = async (data: Omit<Merchant, 'id'>, existingId?: string) => {
    const id = existingId || `m-${Date.now()}`;
    const merchantObj: Merchant = {
      ...data,
      id
    };

    // Optimistic state update
    if (existingId) {
      setMerchants((prev) => prev.map((m) => (m.id === existingId ? merchantObj : m)));
    } else {
      setMerchants((prev) => [merchantObj, ...prev]);
    }
    setSelectedMerchantId(id);
    setIsPickingPoint(false);
    setPickedPoint(null);

    // Save to Firestore Database
    try {
      await saveMerchantToDb(merchantObj);
    } catch (err: any) {
      console.error('Failed to save to Firestore:', err);
    }
  };

  // Handler for Delete
  const handleDeleteMerchant = async (id: string) => {
    setMerchants((prev) => prev.filter((m) => m.id !== id));
    if (selectedMerchantId === id) {
      setSelectedMerchantId(null);
    }

    try {
      await deleteMerchantFromDb(id);
    } catch (err: any) {
      console.error('Failed to delete from Firestore:', err);
    }
  };

  const handleEditMerchant = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setIsMerchantModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingMerchant(null);
    setIsMerchantModalOpen(true);
  };

  // Import into Database
  const handleImportComplete = async (
    newMerchants: Merchant[],
    mode: 'append' | 'replace'
  ) => {
    let nextList: Merchant[];
    if (mode === 'replace') {
      nextList = newMerchants;
    } else {
      nextList = [...newMerchants, ...merchants];
    }

    setMerchants(nextList);

    // Persist batch to Firestore
    try {
      await batchSaveMerchantsToDb(newMerchants);
    } catch (err: any) {
      console.error('Error saving imported batch to Firestore:', err);
    }

    setTimeout(() => {
      const mapped = nextList.filter(m => m.lat !== 0 && m.lng !== 0);
      handleShowAllBounds(mapped);
    }, 300);
  };

  // Map a single merchant from its address column
  const handleGeocodeSingleMerchant = async (merchant: Merchant) => {
    if (!merchant.address && !merchant.name) {
      alert('Merchant tidak memiliki alamat atau nama untuk dicari.');
      return;
    }

    setGeocodingId(merchant.id);
    try {
      const res = await geocodeLocation(merchant.name, merchant.address, 'Makassar');
      if (res) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === merchant.id ? { ...m, lat: res.lat, lng: res.lng } : m
          )
        );
        setSelectedMerchantId(merchant.id);
        
        // Update in Firestore
        await updateMerchantCoordinates(merchant.id, res.lat, res.lng);

        alert(`✅ Berhasil memetakan "${merchant.name}"!\nTitik: ${res.lat.toFixed(5)}, ${res.lng.toFixed(5)}`);
      } else {
        alert(`⚠️ Alamat "${merchant.address || merchant.name}" tidak ditemukan di area Makassar. Anda dapat memilih titik manual di peta.`);
      }
    } catch (err: any) {
      alert(`Gagal memetakan alamat: ${err.message}`);
    } finally {
      setGeocodingId(null);
    }
  };

  // Batch map all unmapped merchants (lat = 0 && lng = 0)
  const handleBatchGeocodeUnmapped = async () => {
    const unmapped = merchants.filter(m => m.lat === 0 && m.lng === 0);
    if (unmapped.length === 0) {
      alert('Semua merchant sudah memiliki koordinat titik di peta!');
      return;
    }

    if (!confirm(`Terdapat ${unmapped.length} merchant dengan Lat/Lng: 0. Mulai pemetaan otomatis menggunakan kolom alamat?`)) {
      return;
    }

    setIsBatchGeocoding(true);

    try {
      const itemsToMap = unmapped.map((m, idx) => ({
        index: idx,
        id: m.id,
        name: m.name,
        address: m.address
      }));

      const results = await batchGeocodeMerchants(
        itemsToMap,
        'Makassar'
      );

      let successCount = 0;
      const updatedMap = new Map<string, { lat: number; lng: number }>();

      results.forEach((coord, i) => {
        const item = itemsToMap[i];
        updatedMap.set(item.id, coord);
        successCount++;
        // Update to Firestore
        updateMerchantCoordinates(item.id, coord.lat, coord.lng).catch(console.warn);
      });

      // Update state
      setMerchants((prev) =>
        prev.map((m) => {
          const found = updatedMap.get(m.id);
          return found ? { ...m, lat: found.lat, lng: found.lng } : m;
        })
      );

      alert(`🎉 Selesai! Berhasil memetakan ${successCount} dari ${unmapped.length} merchant ke peta.`);
      handleShowAllBounds();
    } catch (err: any) {
      alert('Terjadi kesalahan saat batch mapping: ' + err.message);
    } finally {
      setIsBatchGeocoding(false);
    }
  };

  const handleResetToDefault = async () => {
    if (confirm('Kembalikan data ke contoh awal Makassar? Data saat ini akan di-reset.')) {
      setMerchants(INITIAL_MERCHANTS);
      localStorage.removeItem(STORAGE_KEY);
      setSelectedMerchantId(null);
      handleResetView();
      if (isDbConnected) {
        await batchSaveMerchantsToDb(INITIAL_MERCHANTS);
      }
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-5.1477, 119.4327], 13, { animate: true });
    }
  };

  const handleShowAllBounds = (targetList = filteredMerchants) => {
    const listToFit = (targetList.length > 0 ? targetList : merchants).filter(m => m.lat !== 0 && m.lng !== 0);
    if (mapInstanceRef.current && listToFit.length > 0) {
      const bounds = L.latLngBounds(listToFit.map((m) => [m.lat, m.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  const handleStartPickOnMap = () => {
    setIsPickingPoint(true);
    setMobileTab('map');
  };

  const handlePointPicked = (lat: number, lng: number) => {
    setPickedPoint({ lat, lng });
    setIsPickingPoint(false);
    setIsMerchantModalOpen(true);
  };

  const handleExportExcel = () => {
    exportMerchantsToExcel(filteredMerchants);
  };

  const handleExportKML = () => {
    const valid = filteredMerchants.filter(m => m.lat !== 0 && m.lng !== 0);
    if (valid.length === 0) {
      alert('Tidak ada merchant dengan koordinat valid untuk diekspor ke KML.');
      return;
    }
    exportMerchantsToKML(valid);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Header with Database Connection status */}
      <Header
        onOpenAddModal={handleOpenAddModal}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenRouteModal={() => setIsRouteModalOpen(true)}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
        onResetView={handleResetView}
        onShowAll={() => handleShowAllBounds()}
        onExportExcel={handleExportExcel}
        onExportKML={handleExportKML}
        onDownloadTemplate={downloadExcelTemplate}
        merchantCount={merchants.length}
        isDbConnected={isDbConnected}
        unmappedCount={unmappedCount}
        onBatchGeocodeUnmapped={handleBatchGeocodeUnmapped}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className={`h-full z-10 md:block ${mobileTab === 'list' ? 'block w-full' : 'hidden'}`}>
          <Sidebar
            merchants={merchants}
            filteredMerchants={filteredMerchants}
            selectedMerchantId={selectedMerchantId}
            onSelectMerchant={(id) => {
              setSelectedMerchantId(id);
              setMobileTab('map');
            }}
            onEditMerchant={handleEditMerchant}
            onDeleteMerchant={handleDeleteMerchant}
            onGeocodeSingleMerchant={handleGeocodeSingleMerchant}
            onBatchGeocodeUnmapped={handleBatchGeocodeUnmapped}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            coordFilter={coordFilter}
            onCoordFilterChange={setCoordFilter}
            onShowAll={() => handleShowAllBounds()}
            onResetToDefault={handleResetToDefault}
            onOpenAddModal={handleOpenAddModal}
            isBatchGeocoding={isBatchGeocoding}
            geocodingId={geocodingId}
          />
        </div>

        {/* Map View */}
        <div className={`flex-1 h-full relative ${mobileTab === 'map' ? 'block' : 'hidden md:block'}`}>
          <MapComponent
            merchants={filteredMerchants}
            selectedMerchantId={selectedMerchantId}
            onSelectMerchant={setSelectedMerchantId}
            onEditMerchant={handleEditMerchant}
            onDeleteMerchant={handleDeleteMerchant}
            isPickingPoint={isPickingPoint}
            onPointPicked={handlePointPicked}
            pickedPoint={pickedPoint}
            activeTileLayer={activeTileLayer}
            onChangeTileLayer={setActiveTileLayer}
            onMapReadyRef={(instance) => {
              mapInstanceRef.current = instance;
            }}
          />

          {/* Floating Mobile Toggle Button */}
          <div className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] flex bg-white/95 backdrop-blur-sm p-1 rounded-full shadow-lg border border-slate-200">
            <button
              onClick={() => setMobileTab('map')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
                mobileTab === 'map' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Peta</span>
            </button>
            <button
              onClick={() => setMobileTab('list')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
                mobileTab === 'list' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Daftar ({filteredMerchants.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <MerchantModal
        isOpen={isMerchantModalOpen}
        onClose={() => {
          setIsMerchantModalOpen(false);
          setEditingMerchant(null);
        }}
        onSave={handleSaveMerchant}
        editingMerchant={editingMerchant}
        onStartPickOnMap={() => {
          setIsMerchantModalOpen(false);
          handleStartPickOnMap();
        }}
        pickedPoint={pickedPoint}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        isDbConnected={isDbConnected}
      />

      <RouteModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        merchants={filteredMerchants.filter(m => m.lat !== 0 && m.lng !== 0)}
      />

      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
