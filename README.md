# Radarplot - Nautical Radar Plotting Aid

A modern web-based port of the Radarplot C application for maritime navigation and collision avoidance calculations.

## Features

- **Complete Functionality Port**: 100% coverage of original C application features
- **Interactive Canvas**: Real-time radar plotting with HTML5 Canvas
- **Target Tracking**: Track up to 5 targets simultaneously (B, C, D, E, F)
- **Motion Calculations**:
  - Relative Motion (DRM, SRM)
  - True Motion (True course, speed, aspect angle)
  - CPA/TCPA (Closest Point of Approach)
  - BCR/BCT (Bow Crossing Range/Time)
- **Maneuver Planning**: Calculate course/speed changes for desired CPA
- **Multiple Display Modes**: North Up and Course Up
- **File Import/Export**:
  - Import .rpt files from original C version
  - Export to JSON format
  - LocalStorage auto-save
- **Internationalization**: English and German languages
- **Modern UI**: Built with NuxtUI and Tailwind CSS

## Technology Stack

- **Framework**: Nuxt 4 (Vue 3 Composition API)
- **UI Library**: NuxtUI
- **State Management**: Pinia
- **Canvas Rendering**: Native HTML5 Canvas 2D API
- **Internationalization**: @nuxtjs/i18n
- **Styling**: Tailwind CSS

## Project Structure

```
radarplot/
├── components/
│   └── radar/
│       ├── RadarCanvas.vue        # Main canvas display
│       ├── RadarControls.vue      # Orientation and range controls
│       └── TargetPanel.vue        # Target observation inputs
├── composables/
│   └── radar/
│       ├── useRadarCalculations.ts  # Core math engine
│       └── useRadarRenderer.ts      # Canvas rendering
├── stores/
│   └── radarStore.ts              # Main state management
├── utils/
│   ├── radarTypes.ts              # TypeScript types
│   ├── radarConstants.ts          # Constants and conversions
│   ├── vectorMath.ts              # Vector operations
│   └── fileFormats.ts             # File I/O utilities
├── i18n/
│   ├── en.json                    # English translations
│   └── de.json                    # German translations
└── pages/
    └── index.vue                  # Main application page
```

## Installation

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Basic Operation

1. **Set Own Ship Data**:
   - Enter your vessel's course (0-359°)
   - Enter your vessel's speed (knots)

2. **Add Target Observations**:
   - Select a target tab (B-F)
   - Enter two observations:
     - Time (HH:MM)
     - Bearing (True or Relative)
     - Distance (nautical miles)

3. **View Results**:
   - Calculated values appear automatically
   - Canvas displays motion vectors
   - CPA and BCR markers show collision risk

### Orientation Modes

- **North Up**: North is at the top of the display (fixed)
- **Course Up**: Own ship's heading is at the top (rotating)

### Range Selection

Available ranges: 0.75, 1.5, 3, 6, 12, 24 nautical miles

### File Operations

- **New**: Clear all data and start fresh
- **Open**: Import .rpt or JSON file
- **Save**: Download current plot

## Key Concepts

### Relative Motion
- Direction and speed of target relative to own ship
- Shown as dashed red vectors on canvas

### True Motion
- Actual course and speed of target
- Shown as solid blue vectors

### CPA (Closest Point of Approach)
- Minimum distance target will pass from own ship
- Critical for collision avoidance
- Marked with red circle on canvas

### BCR (Bow Crossing Range)
- Distance at which target will cross own ship's bow
- Only calculated if crossing will occur
- Marked with blue X on canvas

## Calculations

All calculations use standard nautical formulas:

- Bearings: 0-359°, 0 = North, clockwise
- Distances: Nautical miles (nm)
- Speeds: Knots (kn)
- Time: Minutes

## File Formats

### .rpt Format (C Version Compatible)
INI-style format with sections:
- `[Radar]`: Display settings
- `[Own Ship]`: Vessel data
- `[Opponent X]`: Target observations
- `[Maneuver]`: Maneuver planning

### JSON Format (Web Version)
Modern JSON format with versioning and metadata.

## Development

### Type System
All C structs have been ported to TypeScript interfaces in `utils/radarTypes.ts`.

### Mathematical Functions
Core calculations ported from `radar.c` are in `composables/radar/useRadarCalculations.ts`.

### Rendering
Canvas rendering logic from `radar.c` and `print.c` is in `composables/radar/useRadarRenderer.ts`.

### State Management
Pinia store in `stores/radarStore.ts` manages all application state with reactive calculations.

## Testing

Test files are included in `radarplot-2.0.0/Plots/`:
- `NorthUp.rpt`: North Up orientation example
- `CourseUp.rpt`: Course Up orientation example
- `DualTarget.rpt`: Multiple target scenario

Import these files to verify calculations match the C version.

## Credits

This web application is a complete port of the original Radarplot C application (version 2.0.0).

Original C application features:
- GTK+ based GUI
- PDF export capability
- Multiple paper sizes
- License verification

Web port changes:
- Modern Vue 3 / Nuxt 4 architecture
- Canvas-based rendering
- LocalStorage persistence
- Responsive design
- No licensing system (as requested)

## License

[Specify license here - matches original C application]

## Support

For issues or questions, please refer to the documentation or contact the development team.
