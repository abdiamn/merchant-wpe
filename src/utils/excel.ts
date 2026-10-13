import * as XLSX from 'xlsx';
import { Merchant } from '../types';

export interface ParsedMerchantRow {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hasCoordinates: boolean;
}

export function downloadExcelTemplate() {
  const templateData = [
    {
      "Nama": "Coto Nusantara Makassar",
      "Alamat": "Jl. Nusantara No. 360, Makassar",
      "Latitude": -5.1242,
      "Longitude": 119.4090,
      "Telepon": "0411-3617789"
    },
    {
      "Nama": "Mall Ratu Indah",
      "Alamat": "Jl. Dr. Sam Ratulangi No. 35, Makassar",
      "Latitude": 0,
      "Longitude": 0,
      "Telepon": "0411-852222"
    },
    {
      "Nama": "Aroma Coto Gagak",
      "Alamat": "Jl. Gagak No. 27, Mariso, Makassar",
      "Latitude": "",
      "Longitude": "",
      "Telepon": "0811440012"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template_Merchants");
  XLSX.writeFile(wb, "template_merchant_mapping.xlsx");
}

export function exportMerchantsToExcel(merchants: Merchant[], filename?: string) {
  const exportData = merchants.map(m => ({
    "Nama": m.name,
    "Alamat": m.address,
    "Latitude": m.lat,
    "Longitude": m.lng,
    "Telepon": m.phone || ''
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Merchants");
  const name = filename || `merchant_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, name);
}

export async function parseExcelFile(file: File): Promise<ParsedMerchantRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const parsed: ParsedMerchantRow[] = [];

  for (const row of rawRows) {
    let name = '';
    let address = '';
    let lat: number | null = null;
    let lng: number | null = null;
    let phone = '';

    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const valStr = String(val).trim();

      if (['nama', 'name', 'merchant', 'nama merchant', 'merchant name', 'store', 'toko'].includes(cleanKey)) {
        name = valStr;
      } else if (['alamat', 'address', 'lokasi', 'location'].includes(cleanKey)) {
        address = valStr;
      } else if (['latitude', 'lat', 'lintang', 'y'].includes(cleanKey)) {
        const num = parseFloat(valStr);
        if (!isNaN(num)) lat = num;
      } else if (['longitude', 'lng', 'lon', 'long', 'bujur', 'x'].includes(cleanKey)) {
        const num = parseFloat(valStr);
        if (!isNaN(num)) lng = num;
      } else if (['telepon', 'phone', 'telp', 'no telepon', 'no hp', 'kontak', 'contact', 'whatsapp', 'wa'].includes(cleanKey)) {
        phone = valStr;
      }
    }

    if (name || address) {
      // Coordinates are considered valid only if not 0 and within geo bounds
      const hasValidCoords = lat !== null && lng !== null && lat !== 0 && lng !== 0 &&
                             lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

      parsed.push({
        name: name || 'Merchant Tanpa Nama',
        address: address || '',
        lat: hasValidCoords ? (lat as number) : 0,
        lng: hasValidCoords ? (lng as number) : 0,
        phone,
        hasCoordinates: hasValidCoords
      });
    }
  }

  return parsed;
}
