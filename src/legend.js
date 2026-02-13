/**
 * Map legend control (bottom-right).
 */
import L from 'leaflet';
import { TIER_COLORS, TIER_LABELS } from './utils.js';

export function addLegend(map) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'map-legend');

    div.innerHTML = `
      <h4>Risk Level</h4>
      ${[0, 1, 2, 3, 4, 5].map(tier => `
        <div class="legend-item">
          <span class="legend-color" style="background:${TIER_COLORS[tier]}${tier === 5 ? ';background-image:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.2) 3px,rgba(0,0,0,0.2) 6px)' : ''}"></span>
          <span class="legend-label">${TIER_LABELS[tier]}</span>
        </div>
      `).join('')}
    `;

    // Prevent map click-through
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };

  legend.addTo(map);
  return legend;
}
