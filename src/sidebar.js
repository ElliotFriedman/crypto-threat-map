/**
 * Sidebar: header, global stats, filters, country/state detail.
 */
import { TIER_COLORS, TIER_LABELS, SEVERITY_LABELS, SEVERITY_COLORS, formatDate, severityBadge, tierBadge } from './utils.js';
import { setFilters, getFilters, getCountryRisk, getIncidents, getMeta, updateLayers } from './layers.js';

let onFilterChange = null;

export function setFilterChangeCallback(cb) {
  onFilterChange = cb;
}

export function initSidebar() {
  renderHeader();
  renderFilters();
}

export function updateStats(filteredIncidents) {
  const el = document.getElementById('sidebar-stats');
  if (!el) return;

  const meta = getMeta();
  const countryRisk = getCountryRisk();
  const incidents = filteredIncidents || getIncidents();
  const filters = getFilters();

  // Filtered stats
  const filtered = incidents.filter(i => {
    if (i.year < filters.yearRange[0] || i.year > filters.yearRange[1]) return false;
    if (!filters.severities.has(i.severity)) return false;
    return true;
  });

  const countries = new Set(filtered.map(i => i.country_code).filter(Boolean));
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const recentCount = filtered.filter(i => new Date(i.date) >= oneYearAgo).length;

  // Most dangerous country
  const byCountry = {};
  for (const i of filtered) {
    if (!i.country_code) continue;
    byCountry[i.country_code] = (byCountry[i.country_code] || 0) + 1;
  }
  const topCountry = Object.entries(byCountry).sort((a, b) => b[1] - a[1])[0];
  const topCountryName = topCountry ? (countryRisk[topCountry[0]]?.country_name || topCountry[0]) : 'N/A';

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${filtered.length}</div>
        <div class="stat-label">Total Incidents</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${countries.size}</div>
        <div class="stat-label">Countries</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${recentCount}</div>
        <div class="stat-label">Last 12 Months</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" title="${topCountryName}">${topCountryName}</div>
        <div class="stat-label">Most Affected</div>
      </div>
    </div>
  `;
}

function renderHeader() {
  const el = document.getElementById('sidebar-header');
  if (!el) return;

  const meta = getMeta();
  el.innerHTML = `
    <h1>Crypto Physical Attack Risk Map</h1>
    <p class="subtitle">Helping crypto holders stay safe: see where kidnappings, robberies, and physical attacks against cryptocurrency owners have been reported worldwide.</p>
    <p class="update-info">Data: <a href="https://github.com/jlopp/physical-bitcoin-attacks" target="_blank" rel="noopener">Jameson Lopp's Database</a> | Updated: ${meta.generated_at ? new Date(meta.generated_at).toLocaleDateString() : 'N/A'}</p>
  `;
}

function renderFilters() {
  const el = document.getElementById('sidebar-filters');
  if (!el) return;

  const filters = getFilters();

  el.innerHTML = `
    <div class="filter-section">
      <h3>Filters</h3>

      <div class="filter-group">
        <label>Date Range</label>
        <div class="range-display">
          <span id="year-min-label">${filters.yearRange[0]}</span>
          <span>-</span>
          <span id="year-max-label">${filters.yearRange[1]}</span>
        </div>
        <div class="range-sliders">
          <input type="range" id="year-min" min="2014" max="2026" value="${filters.yearRange[0]}" step="1">
          <input type="range" id="year-max" min="2014" max="2026" value="${filters.yearRange[1]}" step="1">
        </div>
      </div>

      <div class="filter-group">
        <label>Severity</label>
        <div class="checkbox-group" id="severity-filters">
          ${[1, 2, 3, 4, 5].map(s => `
            <label class="checkbox-label">
              <input type="checkbox" value="${s}" ${filters.severities.has(s) ? 'checked' : ''}>
              <span class="sev-dot" style="background:${SEVERITY_COLORS[s]}"></span>
              ${SEVERITY_LABELS[s]}
            </label>
          `).join('')}
        </div>
      </div>

      <div class="filter-group">
        <label class="checkbox-label toggle-label">
          <input type="checkbox" id="show-markers" ${filters.showMarkers ? 'checked' : ''}>
          Show incident markers
        </label>
      </div>

      <div class="filter-group">
        <label class="checkbox-label toggle-label">
          <input type="checkbox" id="show-conflicts" ${filters.showConflictZones ? 'checked' : ''}>
          Show conflict zones
        </label>
      </div>
    </div>
  `;

  // Wire up events
  const yearMin = document.getElementById('year-min');
  const yearMax = document.getElementById('year-max');
  const yearMinLabel = document.getElementById('year-min-label');
  const yearMaxLabel = document.getElementById('year-max-label');

  yearMin.addEventListener('input', () => {
    const min = parseInt(yearMin.value);
    const max = parseInt(yearMax.value);
    if (min > max) yearMin.value = max;
    yearMinLabel.textContent = yearMin.value;
    applyFilters();
  });

  yearMax.addEventListener('input', () => {
    const min = parseInt(yearMin.value);
    const max = parseInt(yearMax.value);
    if (max < min) yearMax.value = min;
    yearMaxLabel.textContent = yearMax.value;
    applyFilters();
  });

  document.querySelectorAll('#severity-filters input').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  document.getElementById('show-markers').addEventListener('change', applyFilters);
  document.getElementById('show-conflicts').addEventListener('change', applyFilters);
}

function applyFilters() {
  const yearMin = parseInt(document.getElementById('year-min').value);
  const yearMax = parseInt(document.getElementById('year-max').value);
  const severities = new Set();
  document.querySelectorAll('#severity-filters input:checked').forEach(cb => {
    severities.add(parseInt(cb.value));
  });
  const showMarkers = document.getElementById('show-markers').checked;
  const showConflictZones = document.getElementById('show-conflicts').checked;

  setFilters({
    yearRange: [yearMin, yearMax],
    severities,
    showMarkers,
    showConflictZones,
  });

  updateStats();
  if (onFilterChange) onFilterChange();
}

export function showCountryDetail(name, code, risk, incidents) {
  const el = document.getElementById('sidebar-detail');
  if (!el) return;

  const tier = risk?.risk_tier ?? 0;
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));

  el.innerHTML = `
    <div class="detail-panel">
      <div class="detail-header">
        <h2>${name}</h2>
        ${tierBadge(tier)}
        ${risk?.is_conflict_zone ? '<span class="conflict-tag">Conflict Zone</span>' : ''}
      </div>
      ${risk?.conflict_reason ? `<p class="conflict-reason">${risk.conflict_reason}</p>` : ''}
      <div class="detail-stats">
        <span><strong>${incidents.length}</strong> incidents</span>
        ${risk?.avg_severity ? `<span>Avg severity: <strong>${risk.avg_severity}</strong></span>` : ''}
      </div>
      ${renderSeverityBar(incidents)}
      <div class="incident-list">
        <h3>Incidents (${sorted.length})</h3>
        ${sorted.map(inc => `
          <div class="incident-card">
            <div class="inc-header">
              <span class="inc-date">${formatDate(inc.date)}</span>
              ${severityBadge(inc.severity)}
            </div>
            <div class="inc-location">${inc.location_raw}</div>
            <div class="inc-desc">${inc.description}</div>
            ${inc.source_urls?.[0] ? `<a class="inc-source" href="${inc.source_urls[0]}" target="_blank" rel="noopener">Source</a>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  el.classList.add('active');
}

export function showStateDetail(name, code, risk, incidents) {
  showCountryDetail(`${name} (${code})`, code, risk, incidents);
}

export function hideDetail() {
  const el = document.getElementById('sidebar-detail');
  if (el) {
    el.innerHTML = '';
    el.classList.remove('active');
  }
}

function renderSeverityBar(incidents) {
  if (incidents.length === 0) return '';

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const i of incidents) counts[i.severity]++;

  const total = incidents.length;
  const bars = [1, 2, 3, 4, 5].map(s => {
    const pct = (counts[s] / total) * 100;
    if (pct === 0) return '';
    return `<div class="sev-bar-segment" style="width:${pct}%;background:${SEVERITY_COLORS[s]}" title="${SEVERITY_LABELS[s]}: ${counts[s]}"></div>`;
  }).join('');

  return `<div class="severity-bar">${bars}</div>`;
}
