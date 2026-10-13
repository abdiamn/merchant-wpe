export interface Merchant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

export type TileLayerType = 'streets' | 'satellite' | 'positron' | 'dark';

export interface TileLayerOption {
  id: TileLayerType;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}
