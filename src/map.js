/**
 * Leaflet map initialization, tile layer, and view state management.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const WORLD_CENTER = [20, 0];
const WORLD_ZOOM = 2;
const US_BOUNDS = [[24.396308, -125.0], [49.384358, -66.93457]];

let map = null;
let viewMode = 'world'; // 'world' | 'us-states'
const viewChangeCallbacks = [];

export function initMap(containerId) {
  map = L.map(containerId, {
    center: WORLD_CENTER,
    zoom: WORLD_ZOOM,
    minZoom: 2,
    maxZoom: 12,
    zoomControl: true,
    worldCopyJump: true,
  });

  // CartoDB Positron - clean, muted basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);

  return map;
}

export function getMap() {
  return map;
}

export function getViewMode() {
  return viewMode;
}

export function onViewChange(cb) {
  viewChangeCallbacks.push(cb);
}

export function zoomToUS() {
  if (!map) return;
  viewMode = 'us-states';
  map.fitBounds(US_BOUNDS, { padding: [20, 20] });
  viewChangeCallbacks.forEach(cb => cb(viewMode));
}

export function zoomToWorld() {
  if (!map) return;
  viewMode = 'world';
  map.setView(WORLD_CENTER, WORLD_ZOOM);
  viewChangeCallbacks.forEach(cb => cb(viewMode));
}

export function zoomToCountry(bounds) {
  if (!map) return;
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
}
