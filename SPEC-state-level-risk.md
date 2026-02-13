# Spec: State/Province-Level Risk Visualization

## Overview
When a user zooms into a country, display state/province-level administrative boundaries colored by risk tier. Currently only the US has this feature — this spec extends it to all countries with incident data.

## Current State
- **US states**: Already implemented. Clicking the US triggers `zoomToUS()`, which swaps the country layer for a state layer with per-state risk coloring. 18 states have risk data.
- **Other countries**: Clicking any other country zooms in and shows a detail panel, but no sub-national boundaries are displayed.

## Requirements

### P0 — Core
1. **Sub-national boundary data**: Source admin-1 (state/province) GeoJSON/TopoJSON for countries with ≥5 incidents (currently: US, UK, India, Brazil, Canada, HK, Australia, Nigeria, Thailand, Turkey, Philippines).
2. **Per-state risk aggregation**: Extend `pipeline/04-aggregate.mjs` to compute state-level risk tiers for all countries, not just the US. Output a `state-risk.json` keyed by `{country_code}:{state_code}`.
3. **State layer per country**: On country click/zoom, fetch and render the state-level TopoJSON for that country. Color each state by its risk tier using the same `TIER_COLORS` scale.
4. **Sorted state list in sidebar**: When a country is selected, the sidebar detail panel should list all states sorted by risk tier (highest first), showing incident count and tier badge.
5. **Lazy-load state boundaries**: Only fetch state-level TopoJSON when a user zooms into a specific country (not upfront). Cache after first load.

### P1 — Polish
6. **State tooltips**: Show state name, risk tier, and incident count on hover.
7. **State click → incident list**: Clicking a state shows its incidents in the sidebar (same as current US behavior).
8. **Smooth transitions**: Animate layer swaps (country → state boundaries) to avoid visual popping.
9. **Filter integration**: State-level risk should recalculate when date range or severity filters change.
10. **Back navigation**: "Back to Country" button when viewing states, "Back to World" when viewing a country.

### P2 — Future
11. **Countries without state data**: Show a "No sub-national data available" message in the sidebar.
12. **City-level drill-down**: For states with ≥3 incidents, show city-level markers on zoom.

## Data Sources
- **Admin-1 boundaries**: [Natural Earth Admin 1 — States & Provinces](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/) (10m resolution, TopoJSON-encoded, ~2.5MB). Alternatively, per-country extracts from [world-atlas](https://github.com/topojson/world-atlas) to keep payload small.
- **State mapping**: Map Natural Earth `adm1_code` or `iso_3166_2` to our incident `state` field. Requires a mapping table in `data/sources/`.

## Architecture

```
                 ┌────────────────────┐
  User clicks    │  Country GeoJSON   │  (already loaded)
  country ──────►│  Zoom to bounds    │
                 │  Hide country layer│
                 └────────┬───────────┘
                          │
                          ▼
                 ┌────────────────────┐
                 │ Fetch state TopoJSON│  GET /geo/states/{CC}.json
                 │ (lazy, cached)      │
                 └────────┬───────────┘
                          │
                          ▼
                 ┌────────────────────┐
                 │ Render state layer  │  L.geoJSON + stateStyle()
                 │ Color by risk tier  │  Same TIER_COLORS scale
                 │ Add tooltips/clicks │
                 └────────────────────┘
```

## File Changes

| File | Change |
|------|--------|
| `data/pipeline/04-aggregate.mjs` | Extend to output per-state risk for all countries |
| `data/pipeline/05-split-states.mjs` | New — split Natural Earth admin-1 into per-country TopoJSON files |
| `data/sources/state-mapping.json` | New — maps NE admin codes to our state codes |
| `public/geo/states/{CC}.json` | New — per-country state boundary files |
| `public/data/state-risk.json` | New — all-country state risk data |
| `src/layers.js` | Generalize state layer to work for any country, add lazy loading |
| `src/sidebar.js` | Add sorted state list to country detail panel |
| `src/map.js` | Add `zoomToCountryStates()` view mode |

## Team Assignments
- **Agent 1 (Data Pipeline)**: Build `05-split-states.mjs`, create state mapping, generate per-country TopoJSON files
- **Agent 2 (Risk Aggregation)**: Extend `04-aggregate.mjs` for multi-country state risk
- **Agent 3 (Map Layers)**: Generalize `layers.js` for per-country state rendering with lazy loading
- **Agent 4 (Sidebar UI)**: Add sorted state list, back navigation, filter integration
- **Agent 5 (Testing)**: Visual regression tests for state-level rendering across countries

## Acceptance Criteria
- [ ] Clicking US shows state boundaries colored by risk (existing behavior preserved)
- [ ] Clicking UK, India, or Brazil shows state/province boundaries colored by risk
- [ ] States are sorted by risk tier (highest first) in the sidebar
- [ ] Filters (date range, severity) update state-level coloring in real-time
- [ ] State boundary files are lazy-loaded (no upfront cost)
- [ ] Total initial page weight does not increase (state data loaded on demand)
