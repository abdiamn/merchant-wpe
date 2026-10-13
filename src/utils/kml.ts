import { Merchant } from '../types';

export function exportMerchantsToKML(merchants: Merchant[], filename?: string) {
  if (merchants.length === 0) {
    throw new Error('Tidak ada merchant untuk diekspor ke KML.');
  }

  const placemarks = merchants.map(m => `
    <Placemark>
      <name><![CDATA[${m.name}]]></name>
      <description><![CDATA[Alamat: ${m.address}\nTelepon: ${m.phone || '-'}\nCatatan: ${m.notes || '-'}]]></description>
      <ExtendedData>
        <Data name="address"><value>${m.address}</value></Data>
        <Data name="phone"><value>${m.phone || ''}</value></Data>
      </ExtendedData>
      <Point>
        <coordinates>${m.lng},${m.lat},0</coordinates>
      </Point>
    </Placemark>`).join('');

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Merchant Mapping Locations</name>
    <description>Exported from Merchant Map Pro</description>
    ${placemarks}
  </Document>
</kml>`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `merchants_mymaps_${new Date().toISOString().split('T')[0]}.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMerchantsToJSON(merchants: Merchant[]) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(merchants, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `merchants_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}
