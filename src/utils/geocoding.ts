import { GeocodeResult } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Normalizes Indonesian address strings by stripping house numbers, RT/RW, block letters
 * which often cause street lookup failures in geocoding databases.
 * Example: "jl. abu bakar lambogo no 243" -> "Jalan abu bakar lambogo"
 */
export function cleanAddressForSearch(addr: string): string {
  if (!addr) return '';
  let cleaned = addr.trim();

  // Remove number patterns like "no 243", "no. 243", "nomor 243", "no 12A"
  cleaned = cleaned.replace(/\b(no\.?|nomor)\s*\d+[a-zA-Z]?/gi, '');

  // Remove trailing isolated numbers at the end of street (e.g. "Jl. Melati 45")
  cleaned = cleaned.replace(/\s+\d+[a-zA-Z]?$/g, '');

  // Remove RT/RW patterns
  cleaned = cleaned.replace(/\b(rt|rw)\s*\d+\s*\/?\s*(rw\s*)?\d*/gi, '');

  // Remove Blok / Kavling
  cleaned = cleaned.replace(/\b(blok|kav|kavling)\s*[a-zA-Z0-9]+/gi, '');

  // Normalize "jl." or "jl " to "Jalan "
  cleaned = cleaned.replace(/^\s*jl\.?\s+/gi, 'Jalan ');

  // Collapse multiple spaces and commas
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Extracts latitude and longitude from Google Maps URLs or pasted coordinates.
 * Supports:
 * - Direct coordinates: "-5.1424, 119.4341"
 * - Google Maps URL: "https://www.google.com/maps/@-5.1424287,119.4341656,17z"
 * - Google Maps Place URL: "...place/.../@-5.1424287,119.4341656..."
 */
export function extractCoordsFromTextOrUrl(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  const str = text.trim();

  // Pattern 1: Direct lat, lng decimal numbers (e.g. "-5.1424, 119.4341")
  const directMatch = str.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 2: Google Maps @lat,lng format
  const atMatch = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 3: query=lat,lng or q=lat,lng
  const queryMatch = str.match(/[?&](?:q|query)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Geocode an address/name using OpenStreetMap Nominatim with smart fallback hierarchy.
 * Successfully resolves specific street addresses like "Jl. Abu Bakar Lambogo No 243"
 * by falling back to street-level match if house number is unindexed.
 */
export async function geocodeLocation(
  name: string,
  address: string = '',
  cityContext: string = 'Makassar'
): Promise<GeocodeResult | null> {
  const queries: string[] = [];
  const cleanAddress = address.trim();
  const cleanName = name.trim();
  const strippedStreet = cleanAddressForSearch(cleanAddress);

  // 1. Try exact address + city
  if (cleanAddress) {
    queries.push(`${cleanAddress}, ${cityContext}`);
  }

  // 2. Try normalized street address (stripping "no 243" which often blocks search)
  if (strippedStreet && strippedStreet.toLowerCase() !== cleanAddress.toLowerCase()) {
    queries.push(`${strippedStreet}, ${cityContext}`);
  }

  // 3. Try name + street + city
  if (cleanName && strippedStreet) {
    queries.push(`${cleanName}, ${strippedStreet}, ${cityContext}`);
  }

  // 4. Try merchant name + city
  if (cleanName) {
    queries.push(`${cleanName}, ${cityContext}`);
  }

  // 5. Try stripped street alone
  if (strippedStreet) {
    queries.push(strippedStreet);
  }

  for (const q of queries) {
    try {
      const encoded = encodeURIComponent(q.trim());
      const isMakassar = cityContext.toLowerCase().includes('makassar');
      const boxParam = isMakassar 
        ? '&viewbox=119.35,-5.00,119.55,-5.30&bounded=0'
        : '&countrycodes=id';

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}${boxParam}&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'id,en',
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          return {
            lat,
            lng,
            displayName: item.display_name || q
          };
        }
      }
    } catch (err) {
      console.warn('Geocoding query error:', q, err);
    }

    await delay(350);
  }

  return null;
}

/**
 * Batch geocoder with rate limiting (1.1s between calls)
 */
export async function batchGeocodeMerchants<T extends { name: string; address?: string }>(
  items: T[],
  cityContext: string = 'Makassar',
  onProgress?: (current: number, total: number, itemName: string, success: boolean) => void,
  shouldCancel?: () => boolean
): Promise<Map<number, GeocodeResult>> {
  const results = new Map<number, GeocodeResult>();

  for (let i = 0; i < items.length; i++) {
    if (shouldCancel && shouldCancel()) {
      break;
    }

    const item = items[i];
    const res = await geocodeLocation(item.name, item.address || '', cityContext);
    
    if (res) {
      results.set(i, res);
      onProgress?.(i + 1, items.length, item.name || item.address || 'Merchant', true);
    } else {
      onProgress?.(i + 1, items.length, item.name || item.address || 'Merchant', false);
    }

    if (i < items.length - 1) {
      await delay(1100);
    }
  }

  return results;
}
