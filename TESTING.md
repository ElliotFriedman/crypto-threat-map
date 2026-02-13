# Visual Testing Checklist

Each test involves taking a screenshot of the site and verifying specific elements. Run `npm run preview` (or `npm run dev`) and walk through each test.

## Test 1: World View — Initial Load
- **Screenshot**: Full browser 1440x900
- **Verify**:
  - [ ] Map renders and fills viewport (no white gaps)
  - [ ] Sidebar visible on left with title, stats, and filters
  - [ ] Countries are colored by risk tier (4+ distinct colors visible)
  - [ ] Legend visible in bottom-right corner
  - [ ] CartoDB Positron basemap tiles loaded (light gray background)
  - [ ] No JavaScript console errors

## Test 2: Conflict Zones
- **Screenshot**: Zoom to Middle East/Africa region
- **Verify**:
  - [ ] Syria, Yemen, Sudan, Somalia, Afghanistan show dark maroon (#862e2e)
  - [ ] Conflict zones visually distinct from Tier 4 red countries
  - [ ] Tooltip shows "Conflict Zone" label with reason text
  - [ ] At least 15 conflict zone countries visible

## Test 3: High-Risk Countries (France)
- **Screenshot**: Hover over France
- **Verify**:
  - [ ] France fills red (#e03131) indicating Tier 4
  - [ ] Border highlights white on hover
  - [ ] Tooltip shows "France", "Very High Risk", and "32" (approx) incidents
  - [ ] Correct incident count matches data

## Test 4: Country Detail Panel
- **Screenshot**: Click France, sidebar detail visible
- **Verify**:
  - [ ] Sidebar shows "France" heading with tier badge
  - [ ] Incident count displayed
  - [ ] Severity distribution bar visible (colored segments)
  - [ ] Chronological incident list with dates and severity badges
  - [ ] Source links present and clickable
  - [ ] Panel is scrollable for long lists

## Test 5: US State Drill-Down
- **Screenshot**: Click United States
- **Verify**:
  - [ ] Map zooms to continental US
  - [ ] Individual states colored by risk tier
  - [ ] "Back to World" button visible top-left
  - [ ] California shows elevated risk (orange or higher)
  - [ ] New York shows elevated risk
  - [ ] State tooltips work on hover

## Test 6: Incident Markers
- **Screenshot**: Zoom to Western Europe, markers enabled
- **Verify**:
  - [ ] Cluster bubbles show numbers at low zoom
  - [ ] Individual circle markers visible when zoomed in
  - [ ] Marker colors correspond to severity scale (green→yellow→orange→red→dark red)
  - [ ] Clicking a marker shows popup with date, location, severity, description
  - [ ] Source link in popup is clickable

## Test 7: Filter — Severity
- **Screenshot**: Uncheck severity 1 and 2, show only 3-5
- **Verify**:
  - [ ] Choropleth updates (some countries become gray/lighter)
  - [ ] Incident marker count decreases
  - [ ] Stats panel updates with filtered numbers
  - [ ] Filter checkboxes reflect current state

## Test 8: Filter — Date Range
- **Screenshot**: Slide date range to 2024-2026 only
- **Verify**:
  - [ ] Countries with only older incidents go gray
  - [ ] France and Thailand remain highlighted (recent activity)
  - [ ] Stats section shows reduced total count
  - [ ] Marker count reflects filtered date range

## Test 9: Mobile Responsive (375x812)
- **Screenshot**: Resize browser to 375x812
- **Verify**:
  - [ ] Map fills the screen
  - [ ] Sidebar collapses to bottom sheet
  - [ ] Sidebar toggle button visible
  - [ ] Legend still readable
  - [ ] Text is not truncated or overlapping

## Test 10: Key Country Validation
Cross-reference choropleth colors against expected tiers:

| Country | Expected Tier | Expected Color | Check |
|---------|--------------|----------------|-------|
| United States | 4 (Very High) | Red | [ ] |
| France | 4 (Very High) | Red | [ ] |
| United Kingdom | 3 (High) | Orange | [ ] |
| Thailand | 3 (High) | Orange | [ ] |
| Canada | 3 (High) | Orange | [ ] |
| India | 2 (Moderate) | Yellow | [ ] |
| Hong Kong | 2 (Moderate) | Yellow | [ ] |
| Brazil | 2 (Moderate) | Yellow | [ ] |
| Afghanistan | 5 (Conflict) | Dark Maroon | [ ] |
| Syria | 5 (Conflict) | Dark Maroon | [ ] |
| Sudan | 5 (Conflict) | Dark Maroon | [ ] |
| Japan | 1 (Low) | Blue | [ ] |
| Australia | 2 (Moderate) | Yellow | [ ] |
| Switzerland | 0 (No Data) | Gray | [ ] |

## Test 11: No-Data Countries
- **Screenshot**: Hover over a country with zero incidents (e.g., Mongolia, Greenland)
- **Verify**:
  - [ ] Shows gray fill (#d4d4d4)
  - [ ] Tooltip says "No Data" and "No reported incidents"
  - [ ] NOT labeled as "safe" or "Low Risk"

## Test 12: Footer & Attribution
- **Screenshot**: Scroll sidebar to bottom
- **Verify**:
  - [ ] "About This Map" section visible
  - [ ] Lopp database credited with working link to GitHub
  - [ ] Haseeb Qureshi methodology credit present
  - [ ] Limitations section lists reporting bias, zero ≠ safe, conflict zones
  - [ ] Disclaimer visible: "informational purposes only"
