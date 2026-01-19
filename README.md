# Radarplot - Nautical Radar Plotting Aid

A modern web-based port of the classic Radarplot application for maritime navigation and collision avoidance calculations.

## About

This project is a complete port of **Radarplot** by Eddie C. Dost (brainaid GbR) from its original C/GTK+ implementation to a modern TypeScript/Vue.js web application. The original application has been a trusted tool for maritime navigation training and radar plotting since 2005.

## Features

- **Complete Functionality Port**: Full coverage of original C application features
- **Interactive Canvas**: Real-time radar plotting with HTML5 Canvas
- **Target Tracking**: Track up to 5 targets simultaneously (A, B, C, D, E)
- **Motion Calculations**:
  - Relative Motion (DRM/KBr, SRM/vBr)
  - True Motion (True course KB, speed vB, aspect angle)
  - CPA/TCPA (Closest Point of Approach)
  - BCR/BCT (Bow Crossing Range/Time)
- **Maneuver Planning**: Calculate course/speed changes for desired CPA
- **COLREGs Rule 19 Analysis**: Guidance for restricted visibility maneuvers
- **Multiple Display Modes**: North Up and Course Up orientation
- **Hover Tooltips**: Interactive vector information on hover
- **File Import/Export**:
  - Import .rpt files from original C version
  - LocalStorage auto-save
- **Internationalization**: English and German languages
- **Responsive Design**: Works on desktop and mobile devices
- **Touch Support**: Pinch-to-zoom like Google Maps

## Technology Stack

- **Framework**: Nuxt 3 (Vue 3 Composition API)
- **UI Library**: NuxtUI
- **State Management**: Pinia
- **Canvas Rendering**: Native HTML5 Canvas 2D API
- **Internationalization**: @nuxtjs/i18n
- **Styling**: Tailwind CSS

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
   - Select a target tab (A-E)
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

### Canvas Interaction

- **Mouse wheel**: Zoom in/out
- **Double-click**: Reset zoom
- **Drag (when zoomed)**: Pan the view
- **Hover over vectors**: Show detailed information

### Touch Gestures (Mobile)

- **Pinch**: Zoom in/out
- **Single finger (when zoomed)**: Pan
- **Double-tap**: Reset zoom
- **Single finger (at 1x)**: Normal page scroll

## Key Concepts

### Relative Motion
- Direction and speed of target relative to own ship
- Shown as red vectors on canvas (solid: observed, dashed: extended to CPA)

### True Motion
- Actual course and speed of target over ground
- Shown as blue vectors on canvas

### Own Ship Vector
- Own vessel's course and speed
- Shown as green vectors on canvas

### CPA (Closest Point of Approach)
- Minimum distance target will pass from own ship
- Critical for collision avoidance
- Marked with label on canvas

### BCR (Bow Crossing Range)
- Distance at which target will cross own ship's bow
- Only calculated if crossing will occur

## Project Structure

```
radarplot/
├── components/
│   └── radar/
│       ├── RadarCanvas.vue        # Main canvas display with zoom/pan
│       ├── RadarControls.vue      # Orientation and range controls
│       ├── TargetPanel.vue        # Target observation inputs
│       ├── ManeuverPanel.vue      # Maneuver planning controls
│       └── ResultRow.vue          # Result display component
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
├── locales/
│   ├── en.json                    # English translations
│   └── de.json                    # German translations
└── pages/
    └── index.vue                  # Main application page
```

## Testing

Test files from the original application are included in `radarplot-2.0.0/Plots/`:
- `NorthUp.rpt`: North Up orientation example
- `CourseUp.rpt`: Course Up orientation example
- `DualTarget.rpt`: Multiple target scenario

Import these files to verify calculations match the original C version.

## Credits & Attribution

### Original Application

**Radarplot** - A Nautical Radar Plotting Aid  
Copyright © 2005 Eddie C. Dost (brainaid GbR)

- **Author**: Christian "Eddie" Dost <ecd@brainaid.de>
- **Original Website**: http://brainaid.de/people/ecd/radarplot
- **Original License**: GNU General Public License v2

The original Radarplot application was developed in C using GTK+ and has been a valuable tool for maritime navigation education and training.

### Web Port

This web-based implementation is a derivative work that ports the original C codebase to modern web technologies while maintaining full calculation accuracy and feature parity.

**Changes from original:**
- Ported from C/GTK+ to TypeScript/Vue.js
- Canvas-based rendering instead of GTK+ drawing
- LocalStorage persistence instead of file-based storage
- Responsive web design for desktop and mobile
- Touch gesture support
- Interactive hover tooltips
- Removed licensing/registration system

## License

This program is free software; you can redistribute it and/or modify it under the terms of the **GNU General Public License** as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, see <https://www.gnu.org/licenses/>.

### Why GPL v2?

This web application is a derivative work of the original Radarplot by Eddie C. Dost, which is licensed under GPL v2. As per the terms of the GPL, derivative works must also be distributed under the same license, ensuring that this software remains free and open source.

## Disclaimer

**This software is intended for educational and training purposes only.**

This application should NOT be used as the sole means of navigation or collision avoidance. Always use proper navigational equipment, maintain a proper lookout, and follow the International Regulations for Preventing Collisions at Sea (COLREGs).

## Contributing

Contributions are welcome! Please ensure any contributions comply with the GPL v2 license terms.

## Support

For issues or questions, please open an issue on the project repository.
