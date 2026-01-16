/**
 * Constants ported from radar.h and radar.c
 * Core configuration values for nautical radar plotting
 */

import type { RadarRange } from './radarTypes';

// ============================================================================
// Application Constants (from radar.h)
// ============================================================================

/** Number of targets that can be tracked simultaneously */
export const RADAR_NR_TARGETS = 5;

/** Target identification letters */
export const TARGET_LETTERS = ['B', 'C', 'D', 'E', 'F'] as const;

/** Epsilon for floating-point comparisons */
export const EPSILON = 1e-12;

/** Starboard direction constant */
export const STARBOARD = 1.0;

/** Port direction constant */
export const PORT = -1.0;

// ============================================================================
// Range Settings (from radar_ranges[] in radar.c lines 65-73)
// ============================================================================

/**
 * Available radar range configurations
 * Each range has: range (nm), marks (ring count), digits (decimal places)
 */
export const RADAR_RANGES: readonly RadarRange[] = [
  { range: 0.75, marks: 3, digits: 2 },  // 0.75 nm - very close range
  { range: 1.5,  marks: 3, digits: 1 },  // 1.5 nm
  { range: 3.0,  marks: 3, digits: 0 },  // 3 nm
  { range: 6.0,  marks: 6, digits: 0 },  // 6 nm
  { range: 12.0, marks: 6, digits: 0 },  // 12 nm
  { range: 24.0, marks: 6, digits: 0 }   // 24 nm - maximum range
];

/** Default range index */
export const DEFAULT_RANGE_INDEX = 3; // 6.0 nm

// ============================================================================
// Colors - Dark Mode Compatible (using Nuxt UI theme colors)
// ============================================================================

/**
 * Light mode color scheme
 * Uses Nuxt UI's color palette for consistency
 */
export const COLORS_LIGHT = {
  // Canvas background & grid
  BACKGROUND: '#FFFFFF',
  GRID: '#cbd5e1',           // slate-300 (darker for better visibility)
  GRID_MAJOR: '#94a3b8',     // slate-400
  TEXT: '#1e293b',           // slate-800
  LABEL_BG: '#FFFFFF',       // Same as background for seamless labels
  
  // Vector colors - 3 highly distinguishable colors from Nuxt UI
  OWN_SHIP: '#22c55e',       // green-500 (Primary) - own ship vector
  RELATIVE_MOTION: '#ef4444', // red-500 (Error) - relative motion & danger
  TRUE_MOTION: '#3b82f6',    // blue-500 (Info) - true motion vector
  
  // Markers and highlights
  CPA_MARKER: '#dc2626',     // red-600 - CPA point
  CPA_LINE: '#f97316',       // orange-500 - CPA perpendicular
  MANEUVER_POINT: '#06b6d4', // cyan-500 - maneuver point
  TARGET_POSITION: '#1e293b', // slate-800 - target markers
  
  // Center marker
  CENTER: '#1e293b',         // slate-800
} as const;

/**
 * Dark mode color scheme
 * Brighter versions for visibility on dark backgrounds
 */
export const COLORS_DARK = {
  // Canvas background & grid
  BACKGROUND: '#0f172a',     // slate-900
  GRID: '#334155',           // slate-700
  GRID_MAJOR: '#64748b',     // slate-500
  TEXT: '#f1f5f9',           // slate-100
  LABEL_BG: '#0f172a',       // Same as background for seamless labels
  
  // Vector colors - brighter variants for dark mode
  OWN_SHIP: '#4ade80',       // green-400 - own ship vector
  RELATIVE_MOTION: '#f87171', // red-400 - relative motion & danger
  TRUE_MOTION: '#60a5fa',    // blue-400 - true motion vector
  
  // Markers and highlights
  CPA_MARKER: '#f87171',     // red-400 - CPA point
  CPA_LINE: '#fb923c',       // orange-400 - CPA perpendicular
  MANEUVER_POINT: '#22d3ee', // cyan-400 - maneuver point
  TARGET_POSITION: '#f1f5f9', // slate-100 - target markers
  
  // Center marker
  CENTER: '#f1f5f9',         // slate-100
} as const;

/**
 * Get colors based on color mode
 */
export function getColors(isDark: boolean = false) {
  return isDark ? COLORS_DARK : COLORS_LIGHT;
}

/**
 * Legacy COLORS export for backward compatibility
 * @deprecated Use getColors(isDark) instead
 */
export const COLORS = COLORS_LIGHT;

// ============================================================================
// Layout Constants (from radar.h lines 11-18)
// ============================================================================

/** Spacing between table rows */
export const TABLE_ROW_SPACING = 2;

/** Spacing between table columns */
export const TABLE_COL_SPACING = 2;

/** Panel border width */
export const PANEL_BORDER_WIDTH = 2;

/** Panel row spacing */
export const PANEL_ROW_SPACING = 2;

/** Panel column spacing */
export const PANEL_COL_SPACING = 2;

/** Background text side spacing */
export const BG_TEXT_SIDE_SPACING = 8;

// ============================================================================
// Alignment Constants (from radar.h lines 24-27)
// ============================================================================

/** Left alignment */
export const ALIGN_LEFT = 0.0;

/** Right alignment */
export const ALIGN_RIGHT = 1.0;

/** Top alignment */
export const ALIGN_TOP = 0.0;

/** Bottom alignment */
export const ALIGN_BOTTOM = 1.0;

/** Center alignment (horizontal) */
export const ALIGN_CENTER_H = 0.5;

/** Middle alignment (vertical) */
export const ALIGN_CENTER_V = 0.5;

// ============================================================================
// Canvas Configuration
// ============================================================================

/**
 * Default canvas size
 */
export const DEFAULT_CANVAS_SIZE = {
  width: 800,
  height: 800
};

/**
 * Minimum canvas size
 */
export const MIN_CANVAS_SIZE = {
  width: 400,
  height: 400
};

/**
 * Maximum canvas size (for export)
 */
export const MAX_CANVAS_SIZE = {
  width: 4096,
  height: 4096
};

/**
 * Canvas margin (pixels from edge)
 */
export const CANVAS_MARGIN = 60;

/**
 * Number of range rings to display
 */
export const RANGE_RINGS = 6;

/**
 * Bearing line intervals (degrees)
 */
export const BEARING_LINES = {
  MAJOR: 90,    // Cardinal directions
  MEDIUM: 30,   // Every 30 degrees
  MINOR: 10     // Every 10 degrees
};

// ============================================================================
// Font Configuration
// ============================================================================

/**
 * Font settings for canvas text
 * Uses IBM Plex Sans/Mono to match the app typography
 */
export const FONTS = {
  LABEL_BASE: "'IBM Plex Sans', system-ui, sans-serif",
  MONO_BASE: "'IBM Plex Mono', ui-monospace, monospace",
  LABEL_SIZE: 12,
  BEARING_SIZE: 13,
  RANGE_SIZE: 12,
  RESULT_SIZE: 13
};

/**
 * Get font string for canvas context
 */
export function getFont(size: number, base: string = FONTS.LABEL_BASE, weight: number = 500): string {
  return `${weight} ${size}px ${base}`;
}

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Mathematical constants
 */
export const MATH = {
  /** Degrees to radians conversion factor */
  DEG_TO_RAD: Math.PI / 180,
  
  /** Radians to degrees conversion factor */
  RAD_TO_DEG: 180 / Math.PI,
  
  /** Full circle in degrees */
  CIRCLE_DEG: 360,
  
  /** Full circle in radians */
  CIRCLE_RAD: 2 * Math.PI
} as const;

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * MATH.DEG_TO_RAD;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * MATH.RAD_TO_DEG;
}

/**
 * Normalize angle to 0-360 degrees
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % MATH.CIRCLE_DEG;
  if (normalized < 0) {
    normalized += MATH.CIRCLE_DEG;
  }
  return normalized;
}

/**
 * Normalize angle to -180 to +180 degrees
 */
export function normalizeAngleSigned(angle: number): number {
  let normalized = normalizeAngle(angle);
  if (normalized > 180) {
    normalized -= 360;
  }
  return normalized;
}

/**
 * Check if two floating-point numbers are equal within epsilon
 */
export function floatEquals(a: number, b: number, epsilon: number = EPSILON): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Check if value is effectively zero
 */
export function isZero(value: number, epsilon: number = EPSILON): boolean {
  return Math.abs(value) < epsilon;
}

// ============================================================================
// Nautical Conversions
// ============================================================================

/**
 * Nautical bearing to canvas angle
 * Nautical: 0° = North (top), clockwise
 * Canvas: 0° = East (right), counter-clockwise
 * 
 * NOTE: This is for standard canvas arc() function
 * For direct coordinate calculation, use sinCos functions below
 */
export function nauticalToCanvasAngle(bearing: number): number {
  // Nautical 0° (North) → Canvas 270° or -90°
  // Nautical 90° (East) → Canvas 0°
  // This rotates by -90° and reverses direction
  return normalizeAngle(90 - bearing);
}

/**
 * Canvas angle to nautical bearing
 */
export function canvasToNauticalAngle(angle: number): number {
  return normalizeAngle(90 - angle);
}

/**
 * Calculate sine and cosine for nautical bearing
 * Matches radar_sincos() from radar.c
 * 
 * @param bearing - Compass bearing in degrees (0-359)
 * @param northUp - If true, use absolute bearing; if false, adjust for own course
 * @param ownCourse - Own ship's course in degrees (only used when northUp=false)
 * @returns { sin, cos } for use in coordinate calculations
 */
export function nauticalSinCos(
  bearing: number,
  northUp: boolean = true,
  ownCourse: number = 0
): { sin: number; cos: number } {
  // Match C code: if Course Up mode, subtract own course from bearing
  const adjustedBearing = northUp ? bearing : (bearing - ownCourse);
  const radians = degToRad(adjustedBearing);
  return {
    sin: Math.sin(radians),
    cos: Math.cos(radians)
  };
}

/**
 * Convert nautical bearing and distance to canvas x,y coordinates
 * Matches the C code: x = cx + r * sin(bearing), y = cy - r * cos(bearing)
 * 
 * @param cx - Canvas center X
 * @param cy - Canvas center Y
 * @param bearing - Compass bearing in degrees
 * @param distance - Distance in pixels
 * @param northUp - If true, use absolute bearing; if false, adjust for own course
 * @param ownCourse - Own ship's course (only used when northUp=false)
 */
export function bearingDistanceToXY(
  cx: number,
  cy: number,
  bearing: number,
  distance: number,
  northUp: boolean = true,
  ownCourse: number = 0
): { x: number; y: number } {
  const { sin, cos } = nauticalSinCos(bearing, northUp, ownCourse);
  return {
    x: cx + distance * sin,
    y: cy - distance * cos  // Note: minus because y increases downward
  };
}

/**
 * Convert nautical miles to pixels at given scale
 */
export function nmToPixels(nm: number, pixelsPerNM: number): number {
  return nm * pixelsPerNM;
}

/**
 * Convert pixels to nautical miles at given scale
 */
export function pixelsToNM(pixels: number, pixelsPerNM: number): number {
  return pixels / pixelsPerNM;
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Convert minutes since midnight to HH:MM format
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert HH:MM string to minutes since midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return (hours % 24) * 60 + minutes;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate bearing (0-359 degrees)
 */
export function isValidBearing(bearing: number): boolean {
  return bearing >= 0 && bearing < 360;
}

/**
 * Validate speed (non-negative knots)
 */
export function isValidSpeed(speed: number): boolean {
  return speed >= 0 && speed <= 100; // Reasonable max speed
}

/**
 * Validate distance (non-negative nautical miles)
 */
export function isValidDistance(distance: number): boolean {
  return distance >= 0;
}

/**
 * Validate time (minutes since midnight, 0-1439)
 */
export function isValidTime(minutes: number): boolean {
  return minutes >= 0 && minutes < 1440;
}

/**
 * Check if observation interval is sufficient
 */
export function isValidObservationInterval(deltaTime: number): boolean {
  return deltaTime >= 1; // Minimum 1 minute
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default radar state values
 */
export const DEFAULTS = {
  NORTH_UP: false,        // Start in Course Up mode
  SHOW_HEADING: true,
  RANGE_INDEX: DEFAULT_RANGE_INDEX,
  OWN_COURSE: 0,
  OWN_SPEED: 0,
  BEARING_TYPE: 'rakrp' as const,  // Default to true bearing
  MANEUVER_TYPE: 0,       // No maneuver
  CANVAS_SIZE: DEFAULT_CANVAS_SIZE
} as const;

// ============================================================================
// Export Configuration
// ============================================================================

/**
 * Image export presets
 */
export const EXPORT_PRESETS = {
  SMALL: { width: 800, height: 800 },
  MEDIUM: { width: 1200, height: 1200 },
  LARGE: { width: 1600, height: 1600 },
  XLARGE: { width: 2048, height: 2048 }
} as const;

/**
 * JPEG quality presets
 */
export const JPEG_QUALITY = {
  LOW: 60,
  MEDIUM: 80,
  HIGH: 95,
  MAXIMUM: 100
} as const;

// ============================================================================
// LocalStorage Keys
// ============================================================================

/**
 * Keys for localStorage persistence
 */
export const STORAGE_KEYS = {
  RADAR_STATE: 'radarplot_state',
  RECENT_FILES: 'radarplot_recent_files',
  PREFERENCES: 'radarplot_preferences',
  LANGUAGE: 'radarplot_language'
} as const;
