import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { usePoleStore } from '@/store/poleStore';
import { useNavigate } from 'react-router-dom';
import type { Pole } from '@/types';
import 'leaflet/dist/leaflet.css';

const statusColorHex: Record<Pole['uiStatus'], string> = {
  safe: '#22c55e',
  warning: '#f59e0b',
  fault: '#ef4444',
  offline: '#6b7280',
};

function FitBounds({ poles }: { poles: Pole[] }) {
  const map = useMap();
  if (poles.length > 0) {
    const lats = poles.map((p) => p.meta.location.lat);
    const lngs = poles.map((p) => p.meta.location.lng);
    map.fitBounds([
      [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
    ]);
  }
  return null;
}

// ─── Tile layer config ────────────────────────────────────────────────────────
// OpenStreetMap standard tiles — completely free, no API key, no watermark.
// A CSS filter is applied to convert the light tiles to a dark style that
// matches the app's navy theme, using the industry-standard invert + hue-rotate
// technique. CircleMarkers are placed ABOVE the filtered tile layer so their
// status colors are unaffected by the filter.
const TILE_URL        = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

// filter values tuned to match bg-navy-900 (#0d1428)
const TILE_FILTER =
  'invert(92%) hue-rotate(180deg) brightness(0.85) saturate(0.4) contrast(0.9)';

export function PoleMap() {
  const poles = Object.values(usePoleStore((s) => s.poles));
  const navigate = useNavigate();

  const validPoles = poles.filter((p) => p.meta.location?.lat && p.meta.location?.lng);

  if (validPoles.length === 0) {
    return (
      <div
        className="rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center"
        style={{ height: 340 }}
      >
        <p className="text-gray-500 text-sm">No pole locations available. Start simulator to see map.</p>
      </div>
    );
  }

  const centerLat = validPoles.reduce((sum, p) => sum + p.meta.location.lat, 0) / validPoles.length;
  const centerLng = validPoles.reduce((sum, p) => sum + p.meta.location.lng, 0) / validPoles.length;

  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: 340 }}>
      <MapContainer
        key={`map-${validPoles.length}`}
        center={[centerLat, centerLng]}
        zoom={14}
        style={{ height: '100%', width: '100%', background: '#0d1428' }}
        scrollWheelZoom={false}
      >
        {/*
          OSM tiles with dark CSS filter applied via className on the tile pane.
          The filter is scoped to .leaflet-tile-pane so markers, popups, and
          controls are unaffected and keep their original colors.
        */}
        <style>{`.leaflet-tile-pane { filter: ${TILE_FILTER}; }`}</style>

        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
        />

        {validPoles.map((pole) => (
          <CircleMarker
            key={pole.id}
            center={[pole.meta.location.lat, pole.meta.location.lng]}
            radius={pole.uiStatus === 'fault' ? 14 : 10}
            pathOptions={{
              color: statusColorHex[pole.uiStatus],
              fillColor: statusColorHex[pole.uiStatus],
              fillOpacity: 0.85,
              weight: pole.uiStatus === 'fault' ? 3 : 2,
            }}
            eventHandlers={{ click: () => navigate(`/dashboard/pole/${pole.id}`) }}
          >
            <Popup>
              <div style={{ minWidth: 160, color: '#fff', background: '#111d38', padding: 8, borderRadius: 8 }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{pole.meta.name}</p>
                <p><small>Area: {pole.meta.area ?? 'N/A'}</small></p>
                <p>Status: <b style={{ color: statusColorHex[pole.uiStatus] }}>{pole.uiStatus.toUpperCase()}</b></p>
                <p>Leakage: {pole.live.leakageCurrent_mA.toFixed(1)} mA</p>
                <p>Voltage: {pole.live.voltage_V.toFixed(1)} V</p>
                <p>Moisture: {pole.live.moisture_percent.toFixed(0)}%</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {validPoles.length > 0 && <FitBounds poles={validPoles} />}
      </MapContainer>
    </div>
  );
}
