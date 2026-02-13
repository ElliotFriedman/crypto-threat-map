/**
 * Map layers: country choropleth, US state layer, incident markers.
 */
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import * as topojson from 'topojson-client';
import { TIER_COLORS, TIER_LABELS, SEVERITY_COLORS, SEVERITY_LABELS, ISO_A2_TO_NUMERIC, FIPS_TO_STATE, formatDate, severityBadge } from './utils.js';
import { getMap, zoomToUS, zoomToCountry, getViewMode } from './map.js';
import { showCountryDetail, showStateDetail } from './sidebar.js';

let countryLayer = null;
let stateLayer = null;
let markerClusterGroup = null;
let allMarkers = [];

let countryRisk = {};
let stateRisk = {};
let incidents = [];
let conflictZones = {};
let meta = {};

// Build lookup: numeric ID → alpha-2 code
const NUMERIC_TO_A2 = {};
for (const [a2, num] of Object.entries(ISO_A2_TO_NUMERIC)) {
  NUMERIC_TO_A2[num] = a2;
  NUMERIC_TO_A2[parseInt(num, 10).toString()] = a2; // handle with/without leading zeros
}

// Filter state
let filters = {
  yearRange: [2014, 2026],
  severities: new Set([1, 2, 3, 4, 5]),
  showMarkers: true,
  showConflictZones: true,
};

export function setFilters(newFilters) {
  Object.assign(filters, newFilters);
  updateLayers();
}

export function getFilters() {
  return filters;
}

export function getCountryRisk() { return countryRisk; }
export function getStateRisk() { return stateRisk; }
export function getIncidents() { return incidents; }
export function getMeta() { return meta; }

function getFilteredIncidents() {
  return incidents.filter(inc => {
    if (inc.year < filters.yearRange[0] || inc.year > filters.yearRange[1]) return false;
    if (!filters.severities.has(inc.severity)) return false;
    return true;
  });
}

function recalcCountryTiers(filtered) {
  const byCountry = {};
  for (const inc of filtered) {
    if (!inc.country_code) continue;
    if (!byCountry[inc.country_code]) byCountry[inc.country_code] = [];
    byCountry[inc.country_code].push(inc);
  }

  const result = {};
  for (const [cc, data] of Object.entries(countryRisk)) {
    const incs = byCountry[cc] || [];
    if (data.is_conflict_zone && filters.showConflictZones) {
      result[cc] = { ...data, filtered_count: incs.length, risk_tier: 5 };
    } else if (incs.length === 0) {
      result[cc] = { ...data, filtered_count: 0, risk_tier: data.is_conflict_zone ? 0 : 0 };
    } else {
      const avg = incs.reduce((s, i) => s + i.severity, 0) / incs.length;
      const now = Date.now();
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      let recency = 0;
      for (const i of incs) {
        const age = now - new Date(i.date).getTime();
        if (age < oneYear) recency += 3;
        else if (age < 2 * oneYear) recency += 2;
        else recency += 1;
      }
      recency /= incs.length;
      const score = Math.log2(incs.length + 1) * 0.4 + avg * 0.3 + recency * 0.3;
      let tier = 1;
      if (score >= 5.0) tier = 4;
      else if (score >= 3.0) tier = 3;
      else if (score >= 1.5) tier = 2;
      result[cc] = { ...data, filtered_count: incs.length, risk_tier: tier };
    }
  }
  return result;
}

function countryStyle(feature, riskData) {
  const numId = feature.id?.toString();
  const a2 = NUMERIC_TO_A2[numId];
  const risk = a2 ? riskData[a2] : null;
  const tier = risk ? risk.risk_tier : 0;
  const isConflict = risk?.is_conflict_zone && filters.showConflictZones;

  return {
    fillColor: TIER_COLORS[tier] || TIER_COLORS[0],
    weight: 1,
    opacity: 1,
    color: '#999',
    fillOpacity: isConflict ? 0.85 : 0.7,
    className: isConflict ? 'conflict-zone-path' : '',
  };
}

function stateStyle(feature, riskData) {
  const fips = feature.id?.toString().padStart(2, '0');
  const stateCode = FIPS_TO_STATE[fips];
  const risk = stateCode ? riskData[stateCode] : null;
  const tier = risk ? risk.risk_tier : 0;

  return {
    fillColor: TIER_COLORS[tier] || TIER_COLORS[0],
    weight: 1,
    opacity: 1,
    color: '#999',
    fillOpacity: 0.7,
  };
}

function onCountryHover(e) {
  const layer = e.target;
  layer.setStyle({ weight: 3, color: '#fff', fillOpacity: 0.85 });
  layer.bringToFront();
}

function onCountryOut(e) {
  if (countryLayer) countryLayer.resetStyle(e.target);
}

function onCountryClick(e, riskData) {
  const feature = e.target.feature;
  const numId = feature.id?.toString();
  const a2 = NUMERIC_TO_A2[numId];
  const name = feature.properties?.name || 'Unknown';

  if (a2 === 'US') {
    zoomToUS();
    return;
  }

  const risk = a2 ? riskData[a2] : null;
  const countryIncidents = getFilteredIncidents().filter(i => i.country_code === a2);
  zoomToCountry(e.target.getBounds());
  showCountryDetail(name, a2, risk, countryIncidents);
}

export async function loadData() {
  const base = import.meta.env.BASE_URL;
  const [countriesRes, statesRes, incidentsRes, countryRiskRes, stateRiskRes, metaRes] = await Promise.all([
    fetch(`${base}geo/countries-110m.json`),
    fetch(`${base}geo/us-states-10m.json`),
    fetch(`${base}data/incidents.json`),
    fetch(`${base}data/country-risk.json`),
    fetch(`${base}data/us-state-risk.json`),
    fetch(`${base}data/meta.json`),
  ]);

  const countriesTopo = await countriesRes.json();
  const statesTopo = await statesRes.json();
  incidents = await incidentsRes.json();
  countryRisk = await countryRiskRes.json();
  stateRisk = await stateRiskRes.json();
  meta = await metaRes.json();

  return { countriesTopo, statesTopo };
}

export function initLayers(countriesTopo, statesTopo) {
  const map = getMap();
  const countriesGeo = topojson.feature(countriesTopo, countriesTopo.objects.countries);
  fixAntimeridian(countriesGeo);
  const statesGeo = topojson.feature(statesTopo, statesTopo.objects.states);

  // Country layer
  const riskData = recalcCountryTiers(getFilteredIncidents());
  countryLayer = L.geoJSON(countriesGeo, {
    style: (f) => countryStyle(f, riskData),
    onEachFeature: (feature, layer) => {
      const numId = feature.id?.toString();
      const a2 = NUMERIC_TO_A2[numId];
      const risk = a2 ? riskData[a2] : null;
      const name = feature.properties?.name || 'Unknown';
      const tierLabel = risk ? TIER_LABELS[risk.risk_tier] : 'No Data';
      const count = risk?.filtered_count ?? risk?.incident_count ?? 0;

      let tooltip = `<strong>${name}</strong><br>${tierLabel}`;
      if (risk?.is_conflict_zone && filters.showConflictZones) {
        tooltip += `<br><em>${risk.conflict_reason || 'Conflict zone'}</em>`;
      }
      if (count > 0) tooltip += `<br>${count} incident${count !== 1 ? 's' : ''}`;
      if (count === 0 && !risk?.is_conflict_zone) tooltip += '<br>No reported incidents';

      layer.bindTooltip(tooltip, { sticky: true, className: 'map-tooltip' });
      layer.on({ mouseover: onCountryHover, mouseout: onCountryOut });
      layer.on('click', (e) => onCountryClick(e, riskData));
    },
  }).addTo(map);

  // State layer (hidden initially)
  stateLayer = L.geoJSON(statesGeo, {
    style: (f) => stateStyle(f, stateRisk),
    onEachFeature: (feature, layer) => {
      const fips = feature.id?.toString().padStart(2, '0');
      const stateCode = FIPS_TO_STATE[fips];
      const name = feature.properties?.name || 'Unknown';
      const risk = stateCode ? stateRisk[stateCode] : null;
      const tier = risk ? risk.risk_tier : 0;
      const tierLabel = TIER_LABELS[tier] || 'No Data';
      const count = risk?.incident_count ?? 0;

      let tooltip = `<strong>${name}</strong><br>${tierLabel}`;
      if (count > 0) tooltip += `<br>${count} incident${count !== 1 ? 's' : ''}`;

      layer.bindTooltip(tooltip, { sticky: true, className: 'map-tooltip' });
      layer.on({
        mouseover: (e) => {
          e.target.setStyle({ weight: 3, color: '#fff', fillOpacity: 0.85 });
          e.target.bringToFront();
        },
        mouseout: (e) => { stateLayer.resetStyle(e.target); },
        click: (e) => {
          const stIncs = getFilteredIncidents().filter(i => i.state === stateCode);
          showStateDetail(name, stateCode, risk, stIncs);
        },
      });
    },
  });
  // Don't add to map yet — only show on US drill-down

  // Incident markers
  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count > 10) size = 'medium';
      if (count > 30) size = 'large';
      return L.divIcon({
        html: `<div><span>${count}</span></div>`,
        className: `marker-cluster marker-cluster-${size}`,
        iconSize: L.point(40, 40),
      });
    },
  });

  rebuildMarkers();
  if (filters.showMarkers) {
    map.addLayer(markerClusterGroup);
  }
}

function rebuildMarkers() {
  markerClusterGroup.clearLayers();
  allMarkers = [];

  const filtered = getFilteredIncidents();
  for (const inc of filtered) {
    if (!inc.lat || !inc.lng) continue;

    const color = SEVERITY_COLORS[inc.severity] || '#888';
    const marker = L.circleMarker([inc.lat, inc.lng], {
      radius: 6,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.85,
    });

    const popup = `
      <div class="incident-popup">
        <div class="popup-date">${formatDate(inc.date)}</div>
        <div class="popup-location">${inc.location_raw}</div>
        <div class="popup-severity">${severityBadge(inc.severity)}</div>
        <div class="popup-desc">${inc.description}</div>
        ${inc.source_urls?.[0] ? `<a href="${inc.source_urls[0]}" target="_blank" rel="noopener">Source</a>` : ''}
      </div>
    `;
    marker.bindPopup(popup, { maxWidth: 300 });
    allMarkers.push(marker);
  }

  markerClusterGroup.addLayers(allMarkers);
}

export function updateLayers() {
  const map = getMap();
  if (!map || !countryLayer) return;

  // Recalc country tiers
  const filtered = getFilteredIncidents();
  const riskData = recalcCountryTiers(filtered);

  // Update country styles
  countryLayer.eachLayer((layer) => {
    const feature = layer.feature;
    layer.setStyle(countryStyle(feature, riskData));

    // Update tooltip
    const numId = feature.id?.toString();
    const a2 = NUMERIC_TO_A2[numId];
    const risk = a2 ? riskData[a2] : null;
    const name = feature.properties?.name || 'Unknown';
    const tierLabel = risk ? TIER_LABELS[risk.risk_tier] : 'No Data';
    const count = risk?.filtered_count ?? 0;

    let tooltip = `<strong>${name}</strong><br>${tierLabel}`;
    if (risk?.is_conflict_zone && filters.showConflictZones) {
      tooltip += `<br><em>${risk.conflict_reason || 'Conflict zone'}</em>`;
    }
    if (count > 0) tooltip += `<br>${count} incident${count !== 1 ? 's' : ''}`;
    if (count === 0 && !risk?.is_conflict_zone) tooltip += '<br>No reported incidents';
    layer.setTooltipContent(tooltip);
  });

  // Rebuild markers
  rebuildMarkers();

  // Toggle marker visibility
  if (filters.showMarkers && !map.hasLayer(markerClusterGroup)) {
    map.addLayer(markerClusterGroup);
  } else if (!filters.showMarkers && map.hasLayer(markerClusterGroup)) {
    map.removeLayer(markerClusterGroup);
  }
}

export function showWorldView() {
  const map = getMap();
  if (stateLayer && map.hasLayer(stateLayer)) map.removeLayer(stateLayer);
  if (countryLayer && !map.hasLayer(countryLayer)) map.addLayer(countryLayer);
}

export function showUSView() {
  const map = getMap();
  if (countryLayer && map.hasLayer(countryLayer)) map.removeLayer(countryLayer);
  if (stateLayer && !map.hasLayer(stateLayer)) map.addLayer(stateLayer);
}

/**
 * Fix polygons that cross the ±180° antimeridian by splitting them into
 * separate east/west polygons. Without this, Leaflet draws horizontal bands
 * across the entire map for countries like Russia, Fiji, and Antarctica.
 */
function fixAntimeridian(geojson) {
  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    if (geom.type === 'Polygon') {
      if (ringCrossesAntimeridian(geom.coordinates[0])) {
        const split = splitPolygonAtAntimeridian(geom.coordinates);
        feature.geometry = { type: 'MultiPolygon', coordinates: split };
      }
    } else if (geom.type === 'MultiPolygon') {
      const newPolygons = [];
      for (const poly of geom.coordinates) {
        if (ringCrossesAntimeridian(poly[0])) {
          newPolygons.push(...splitPolygonAtAntimeridian(poly));
        } else {
          newPolygons.push(poly);
        }
      }
      geom.coordinates = newPolygons;
    }
  }
}

function ringCrossesAntimeridian(ring) {
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) return true;
  }
  return false;
}

function splitPolygonAtAntimeridian(rings) {
  const { east, west } = splitRingAtAntimeridian(rings[0]);
  const eastPoly = east.length >= 4 ? [east] : null;
  const westPoly = west.length >= 4 ? [west] : null;

  // Assign any inner rings (holes) to the polygon that contains them
  for (let h = 1; h < rings.length; h++) {
    const hole = rings[h];
    if (!hole.length) continue;
    if (ringCrossesAntimeridian(hole)) {
      const split = splitRingAtAntimeridian(hole);
      if (eastPoly && split.east.length >= 4) eastPoly.push(split.east);
      if (westPoly && split.west.length >= 4) westPoly.push(split.west);
    } else {
      // Assign hole to the side its first coordinate falls on
      const target = hole[0][0] >= 0 ? eastPoly : westPoly;
      if (target) target.push(hole);
    }
  }

  const result = [];
  if (eastPoly) result.push(eastPoly);
  if (westPoly) result.push(westPoly);
  return result.length > 0 ? result : [rings];
}

function splitRingAtAntimeridian(ring) {
  const east = [];
  const west = [];

  for (let i = 0; i < ring.length - 1; i++) {
    const curr = ring[i];
    const next = ring[i + 1];

    if (curr[0] >= 0) {
      east.push(curr);
    } else {
      west.push(curr);
    }

    if (Math.abs(curr[0] - next[0]) > 180) {
      const lat = interpolateLatAtMeridian(curr, next);
      east.push([180, lat]);
      west.push([-180, lat]);
    }
  }

  if (east.length >= 3) east.push(east[0].slice());
  if (west.length >= 3) west.push(west[0].slice());

  return { east, west };
}

function interpolateLatAtMeridian(p1, p2) {
  let [lng1, lat1] = p1;
  let [lng2, lat2] = p2;
  if (lng2 - lng1 > 180) lng2 -= 360;
  if (lng1 - lng2 > 180) lng2 += 360;
  const target = lng1 >= 0 ? 180 : -180;
  const dLng = lng2 - lng1;
  if (Math.abs(dLng) < 1e-10) return lat1;
  const t = (target - lng1) / dLng;
  return lat1 + t * (lat2 - lat1);
}
