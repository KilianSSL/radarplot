/**
 * TypeScript type definitions ported from radar.h C structs
 * Complete nautical radar plotting type system
 */

// ============================================================================
// Enumerations
// ============================================================================

/**
 * Maneuver types from maneuver_t enum
 */
export enum ManeuverType {
  NONE = 0,
  COURSE_FROM_CPA = 1,    // Calculate course change from desired CPA
  SPEED_FROM_CPA = 2,     // Calculate speed change from desired CPA
  CPA_FROM_COURSE = 3,    // Calculate resulting CPA from course change
  CPA_FROM_SPEED = 4      // Calculate resulting CPA from speed change
}

/**
 * Bearing type selection
 */
export type BearingType = 'rasp' | 'rakrp';  // RaSP (Relative) or RaKrP (True)

/**
 * Vector identifiers for radar display
 */
export enum RadarVectorNumber {
  HEADING = 0,
  NEW_HEADING = 1
}

/**
 * Vector identifiers for target tracking
 */
export enum TargetVectorNumber {
  REL_EXT = 0,      // Relative motion extended
  NEW_REL0 = 1,     // New relative motion (start)
  NEW_REL1 = 2,     // New relative motion (end)
  OWN = 3,          // Own ship vector
  CPA = 4,          // CPA indicator
  NEW_CPA = 5,      // New CPA after maneuver
  TRUE = 6,         // True motion vector
  RELATIVE = 7,     // Relative motion vector
  NEW_OWN = 8,      // New own ship vector
  POSX0 = 9,        // Position marker X (first)
  POSX1 = 10,       // Position marker X (second)
  POSY0 = 11,       // Position marker Y (first)
  POSY1 = 12,       // Position marker Y (second)
  MPOINTX = 13,     // Maneuver point X
  MPOINTY = 14      // Maneuver point Y
}

// ============================================================================
// Geometry Primitives (from radar.h lines 82-109)
// ============================================================================

/**
 * 2D point in Cartesian coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Vector in X/Y components (from vector_xy_t)
 */
export interface VectorXY {
  x: number;
  y: number;
}

/**
 * Line segment defined by two points
 */
export interface Line {
  p1: Point;
  p2: Point;
}

/**
 * Geometric segment with coordinates
 */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Trapezoid shape (for complex rendering)
 */
export interface Trapezoid {
  y1: number;   // Top edge Y
  x11: number;  // Top left X
  x21: number;  // Top right X
  y2: number;   // Bottom edge Y
  x12: number;  // Bottom left X
  x22: number;  // Bottom right X
}

// ============================================================================
// Rendering Primitives (from radar.h lines 48-109)
// ============================================================================

/**
 * Visual vector for canvas rendering
 */
export interface RenderVector {
  isVisible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lineWidth: number;
  dashPattern?: number[];
}

/**
 * Arc/circle for canvas rendering
 */
export interface RenderArc {
  isVisible: boolean;
  x: number;
  y: number;
  radius: number;
  angle1: number;  // Start angle in degrees
  angle2: number;  // End angle in degrees
  color: string;
  lineWidth: number;
}

/**
 * Polygon for canvas rendering
 */
export interface RenderPoly {
  isVisible: boolean;
  points: Point[];
  color: string;
  lineWidth: number;
}

/**
 * Text label for canvas rendering
 */
export interface RenderLabel {
  isVisible: boolean;
  cx: number;      // Center X
  cy: number;      // Center Y
  xoff: number;    // X offset
  yoff: number;    // Y offset
  xalign: number;  // Horizontal alignment (0=left, 0.5=center, 1=right)
  yalign: number;  // Vertical alignment (0=top, 0.5=middle, 1=bottom)
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
}

// ============================================================================
// Range Configuration (from radar_ranges[] in radar.c)
// ============================================================================

/**
 * Radar range setting
 */
export interface RadarRange {
  range: number;    // Range in nautical miles
  marks: number;    // Number of range ring marks
  digits: number;   // Decimal digits for display
}

// ============================================================================
// Target State (from target_t struct, radar.h lines 166-305)
// ============================================================================

/**
 * Complete target tracking state for one opponent
 */
export interface Target {
  index: number;  // 0-4 (displayed as B-F)

  // Two observation inputs
  time: [number, number];              // Clock time in minutes since midnight
  bearingType: [BearingType, BearingType];  // 'rasp' or 'rakrp'
  bearing: [number, number];           // Bearing in degrees (0-359) - user input
  bearingCourseOffset: [number, number];  // Course offset for RaSP
  distance: [number, number];          // Distance in nautical miles
  
  // Calculated compass bearings (rakrp)
  rakrp: [number, number];             // Compass bearing (true bearing) for each observation
  rasp: [number, number];              // Relative bearing for each observation

  // Time delta
  deltaTime: number;  // Minutes between observations

  // Calculated relative motion
  KBr: number;   // Direction of Relative Motion (degrees)
  vBr: number;   // Speed of Relative Motion (knots)

  // Calculated true motion
  KB: number;    // True Course of target (degrees)
  vB: number;    // True Speed of target (knots)
  aspect: number;  // Aspect angle (degrees)

  // CPA calculations
  haveCPA: boolean;
  CPA: number;     // Closest Point of Approach distance (nm)
  PCPA: number;    // True bearing at CPA (degrees)
  SPCPA: number;   // Relative bearing at CPA (degrees)
  TCPA: number;    // Time to CPA (minutes)
  tCPA: number;    // Clock time at CPA (minutes)

  // Bow crossing calculations
  haveCrossing: boolean;
  BCR: number;     // Bow Crossing Range (nm)
  BCT: number;     // Bow Crossing Time (minutes)
  BCt: number;     // Clock time of crossing (minutes)

  // Maneuver point
  mtimeRange: number;
  haveMpoint: boolean;
  mdistance: number;  // Distance to maneuver point (nm)
  mbearing: number;   // Bearing to maneuver point (degrees)

  // Post-maneuver calculations
  haveNewCPA: boolean;
  haveProblems: boolean;
  newKBr: number;
  newVBr: number;
  delta: number;      // Change in relative motion direction
  newRaSP: number;    // New relative bearing
  newAspect: number;
  newCPA: number;
  newPCPA: number;
  newSPCPA: number;
  newTCPA: number;
  newTCPA_clock: number;
  newHaveCrossing: boolean;
  newBCR: number;
  newBCT: number;
  newBCt: number;

  // Calculated vector positions (for rendering)
  sight: [VectorXY, VectorXY];  // Two observation positions
  p0SubOwn: VectorXY;
  cpa: VectorXY;
  cross: VectorXY;
  mpoint: VectorXY;
  newCpa: VectorXY;
  xpoint: VectorXY;
  newCross: VectorXY;

  // Rendering elements
  vectors: RenderVector[];
  arcs: RenderArc[];
  polys: RenderPoly[];
  labels: RenderLabel[];
}

// ============================================================================
// Radar State (from radar_t struct, radar.h lines 307-420)
// ============================================================================

/**
 * Main radar application state
 */
export interface RadarState {
  // Display settings
  northUp: boolean;      // True = North Up, False = Course Up
  showHeading: boolean;  // Display heading indicator

  // Range settings
  rangeIndex: number;    // Index into RADAR_RANGES array (0-5)
  range: number;         // Current range in nautical miles

  // Own ship data
  ownCourse: number;     // Course in degrees (0-359)
  ownSpeed: number;      // Speed in knots

  // Target tracking (5 targets: B, C, D, E, F)
  targets: [Target, Target, Target, Target, Target];

  // Maneuver planning
  selectedTarget: number;    // Index of target for maneuver (0-4)
  maneuverType: ManeuverType;
  mtimeSelected: boolean;    // True = by time, False = by distance
  mtimeSet: boolean;
  mdistSet: boolean;
  mtime: number;            // Maneuver time (minutes)
  mdistance: number;        // Maneuver distance (nm)
  exactMtime: number;       // Exact maneuver time for calculations
  mcourseChange: boolean;   // True = course change, False = speed change
  mcpaSelected: boolean;
  mcpa: number;             // Desired CPA (nm)
  direction: number;        // Direction indicator
  ncourse: number;          // New course (degrees)
  nspeed: number;           // New speed (knots)

  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  centerX: number;
  centerY: number;
  radiusPixels: number;
  step: number;  // Pixels per range ring

  // Rendering state
  doRender: boolean;
  waitExpose: boolean;
  redrawPending: boolean;
  changeLevel: number;

  // Rendering elements
  vectors: RenderVector[];

  // File management
  currentFilename?: string;
  modified: boolean;
}

// ============================================================================
// File Formats
// ============================================================================

/**
 * .rpt file format (INI-style from C version)
 */
export interface RptFileData {
  radar: {
    orientation: number;  // 0 = North Up, 1 = Course Up
    range: number;
    heading: boolean;
  };
  ownShip: {
    course: number;
    speed: number;
  };
  opponents: Array<{
    letter: string;
    time0: number;
    sideBearing0: boolean;
    rasp0: number;
    courseSP0: number;
    rakrp0: number;
    distance0: number;
    time1: number;
    sideBearing1: boolean;
    rasp1: number;
    courseSP1: number;
    rakrp1: number;
    distance1: number;
  }>;
  maneuver?: {
    byTime: boolean;
    time: number;
    distance: number;
    type: number;
    byCPA: boolean;
    cpa: number;
    course: number;
    speed: number;
  };
}

/**
 * JSON export format (modern web version)
 */
export interface RadarplotJSON {
  version: string;
  timestamp: string;
  radar: RadarState;
}

// ============================================================================
// Export/Import Options
// ============================================================================

/**
 * Image export configuration
 */
export interface ImageExportOptions {
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  quality?: number;  // For JPEG only (0-100)
  filename?: string;
}

/**
 * Print configuration
 */
export interface PrintOptions {
  includeTable: boolean;
  orientation: 'portrait' | 'landscape';
}

// ============================================================================
// Calculation Results
// ============================================================================

/**
 * Complete calculation results for display
 */
export interface CalculationResults {
  target: Target;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Constants Export
// ============================================================================

/**
 * Application constants
 */
export const CONSTANTS = {
  RADAR_NR_TARGETS: 5,
  EPSILON: 1e-12,
  STARBOARD: 1.0,
  PORT: -1.0,
  TARGET_LETTERS: ['B', 'C', 'D', 'E', 'F'] as const,
  
  // Colors from radar.h
  COLORS: {
    RED: '#800000',
    GREEN: '#008000',
    BLUE: '#0000C0',
    BLACK: '#000000',
    WHITE: '#FFFFFF',
    GREY25: '#C0C0C0',
    GREY50: '#808080'
  }
} as const;

export type TargetLetter = typeof CONSTANTS.TARGET_LETTERS[number];
