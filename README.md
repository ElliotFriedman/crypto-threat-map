# Crypto Physical Attack Risk Map

Interactive world map showing physical attack risk for cryptocurrency holders. Helps crypto holders stay safe by visualizing where kidnappings, robberies, and physical violence have been reported worldwide.

**Live site**: [View Map](https://elliotfriedman.github.io/crypto-threat-map/)

## Data Sources

- **Primary**: [Jameson Lopp's Physical Bitcoin Attacks](https://github.com/jlopp/physical-bitcoin-attacks) (Unlicense) — community-maintained list of ~294 publicly reported physical attacks against crypto holders (2014–2026)
- **Conflict Zones**: [US State Department Level 4 "Do Not Travel" advisories](https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/) — 22 countries flagged regardless of crypto-specific data
- **Methodology**: Severity classification inspired by [Haseeb Qureshi's wrench attack analysis](https://haseebq.com/wrench-attacks-viz/)

All data sources are open and freely available.

## Features

- Choropleth map with 6-tier risk scale (No Data → Low → Moderate → High → Very High → Conflict Zone)
- US state-level drill-down
- Individual incident markers with clustering
- Filters: date range, severity level, attack type
- Country/state detail panel with incident list
- Conflict zone overlay (war-torn and unstable countries)
- Mobile responsive

## Tech Stack

- **Frontend**: Vanilla JS + [Leaflet](https://leafletjs.com/) + [Vite](https://vite.dev/)
- **Map Tiles**: [CartoDB Positron](https://carto.com/basemaps/) (free, no API key)
- **Geo Data**: [Natural Earth](https://www.naturalearthdata.com/) countries + [US Census](https://www.census.gov/geographies/mapping-files.html) states (TopoJSON)
- **Data Pipeline**: Node.js scripts for fetching, geocoding, classifying, and aggregating incident data

## Development

```bash
npm install
npm run dev        # Start dev server
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run pipeline   # Re-run data pipeline (fetch → geocode → classify → aggregate)
```

## Updating Data

The data pipeline is designed to run on a daily cron job to pick up new incidents from Lopp's database.

### Manual Update

```bash
npm run pipeline
cp data/generated/*.json public/data/
npm run build
```

### Automated Update (Cron)

Set up a cron job or CI schedule to run the pipeline daily:

```bash
# Example crontab entry (runs daily at midnight UTC)
0 0 * * * cd /path/to/crypto-threat-map && npm run pipeline && cp data/generated/*.json public/data/
```

Or use the GitHub Actions workflow (`.github/workflows/update-data.yml`) to run on a schedule.

### Pipeline Steps

1. **Fetch** (`01-fetch-incidents.mjs`): Downloads Lopp's README.md, parses the markdown table into structured JSON
2. **Geocode** (`02-geocode.mjs`): Applies static coordinate lookup from `data/sources/location-geocodes.json` (no external API needed)
3. **Classify** (`03-classify.mjs`): Assigns severity (1-5) and attack type tags using keyword heuristics
4. **Aggregate** (`04-aggregate.mjs`): Calculates country and US state risk tiers, merges conflict zone data

### Adding New Locations

When Lopp adds incidents in new locations, the geocode step will log unresolved locations. To fix:

1. Run `npm run pipeline` — check stderr for `UNRESOLVED` warnings
2. Add the missing location to `data/sources/location-geocodes.json` with lat/lng/country_code/state
3. Re-run `npm run pipeline`

## Limitations

- **Reporting bias**: Attacks in countries with active English-language crypto media are more likely documented
- **Zero incidents ≠ safe**: A country with no recorded attacks may simply lack reporting
- **Conflict zones**: Flagged based on US State Dept Level 4 advisories, not crypto-specific data
- **Not comprehensive**: Many attacks go unreported, especially in regions with weaker press freedom

## License

MIT
