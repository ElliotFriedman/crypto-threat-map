/**
 * Entry point: initialize map, load data, wire UI.
 */
import './style.css';
import { initMap, zoomToWorld, onViewChange } from './map.js';
import { loadData, initLayers, showWorldView, showUSView, updateLayers, getIncidents } from './layers.js';
import { initSidebar, updateStats, hideDetail, setFilterChangeCallback } from './sidebar.js';
import { addLegend } from './legend.js';

async function main() {
  // Init map
  const map = initMap('map');

  // Load all data
  const { countriesTopo, statesTopo } = await loadData();

  // Init sidebar (header + filters)
  initSidebar();

  // Init map layers
  initLayers(countriesTopo, statesTopo);

  // Add legend
  addLegend(map);

  // Update stats
  updateStats(getIncidents());

  // Back to world button
  const backBtn = document.getElementById('back-to-world');
  backBtn.addEventListener('click', () => {
    zoomToWorld();
  });

  // View change handler
  onViewChange((mode) => {
    if (mode === 'us-states') {
      showUSView();
      backBtn.classList.remove('hidden');
    } else {
      showWorldView();
      backBtn.classList.add('hidden');
      hideDetail();
    }
  });

  // Filter change handler
  setFilterChangeCallback(() => {
    updateLayers();
  });

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

main().catch(console.error);
