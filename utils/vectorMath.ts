/**
 * Vector mathematics utilities for radar calculations
 * Basic geometric operations used throughout the application
 */

import type { Point, VectorXY } from './radarTypes';
import { EPSILON, degToRad, radToDeg, normalizeAngle } from './radarConstants';

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * Add two vectors
 */
export function vectorAdd(v1: VectorXY, v2: VectorXY): VectorXY {
  return {
    x: v1.x + v2.x,
    y: v1.y + v2.y
  };
}

/**
 * Subtract v2 from v1
 */
export function vectorSubtract(v1: VectorXY, v2: VectorXY): VectorXY {
  return {
    x: v1.x - v2.x,
    y: v1.y - v2.y
  };
}

/**
 * Multiply vector by scalar
 */
export function vectorScale(v: VectorXY, scalar: number): VectorXY {
  return {
    x: v.x * scalar,
    y: v.y * scalar
  };
}

/**
 * Calculate vector magnitude (length)
 */
export function vectorMagnitude(v: VectorXY): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize vector to unit length
 */
export function vectorNormalize(v: VectorXY): VectorXY {
  const mag = vectorMagnitude(v);
  if (mag < EPSILON) {
    return { x: 0, y: 0 };
  }
  return {
    x: v.x / mag,
    y: v.y / mag
  };
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(v1: VectorXY, v2: VectorXY): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Calculate cross product of two vectors (z-component in 2D)
 */
export function crossProduct(v1: VectorXY, v2: VectorXY): number {
  return v1.x * v2.y - v1.y * v2.x;
}

// ============================================================================
// Bearing and Direction
// ============================================================================

/**
 * Convert bearing (degrees) and distance (nm) to Cartesian vector
 * @param bearing - Nautical bearing in degrees (0 = North, clockwise)
 * @param distance - Distance in nautical miles
 * @returns Vector in Cartesian coordinates
 */
export function polarToCartesian(bearing: number, distance: number): VectorXY {
  // In nautical coordinates: 0° = North (up), 90° = East (right)
  // Convert to standard math coordinates where 0° = East, counter-clockwise
  const angleRad = degToRad(90 - bearing);
  return {
    x: distance * Math.cos(angleRad),
    y: distance * Math.sin(angleRad)
  };
}

/**
 * Convert Cartesian vector to bearing and distance
 * @param v - Vector in Cartesian coordinates
 * @returns { bearing (degrees), distance (nm) }
 */
export function cartesianToPolar(v: VectorXY): { bearing: number; distance: number } {
  const distance = vectorMagnitude(v);
  if (distance < EPSILON) {
    return { bearing: 0, distance: 0 };
  }
  
  // Standard atan2 gives angle from East counter-clockwise
  // Convert to nautical: North = 0°, clockwise
  const mathAngle = Math.atan2(v.y, v.x);
  const bearing = normalizeAngle(90 - radToDeg(mathAngle));
  
  return { bearing, distance };
}

/**
 * Calculate bearing from point p1 to point p2
 * @returns Bearing in degrees (0-359, 0 = North, clockwise)
 */
export function bearingBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return cartesianToPolar({ x: dx, y: dy }).bearing;
}

// ============================================================================
// Line Intersection
// ============================================================================

/**
 * Check if two line segments intersect
 * Port of lines_crossing() from radar.c
 * 
 * @param v1_0 - Start point of line 1
 * @param v1_1 - End point of line 1
 * @param v2_0 - Start point of line 2
 * @param v2_1 - End point of line 2
 * @returns Intersection point or null if lines don't intersect
 */
export function linesIntersect(
  v1_0: VectorXY,
  v1_1: VectorXY,
  v2_0: VectorXY,
  v2_1: VectorXY
): VectorXY | null {
  // Direction vectors
  const d1 = vectorSubtract(v1_1, v1_0);
  const d2 = vectorSubtract(v2_1, v2_0);
  
  // Check if lines are parallel
  const det = crossProduct(d1, d2);
  if (Math.abs(det) < EPSILON) {
    return null; // Lines are parallel or coincident
  }
  
  // Calculate intersection parameters
  const diff = vectorSubtract(v2_0, v1_0);
  const t1 = crossProduct(diff, d2) / det;
  const t2 = crossProduct(diff, d1) / det;
  
  // Check if intersection is within both line segments
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    // Calculate intersection point
    return {
      x: v1_0.x + t1 * d1.x,
      y: v1_0.y + t1 * d1.y
    };
  }
  
  return null; // Intersection is outside one or both segments
}

/**
 * Find infinite line intersection (not bounded by segments)
 */
export function infiniteLinesIntersect(
  v1_0: VectorXY,
  v1_1: VectorXY,
  v2_0: VectorXY,
  v2_1: VectorXY
): VectorXY | null {
  const d1 = vectorSubtract(v1_1, v1_0);
  const d2 = vectorSubtract(v2_1, v2_0);
  
  const det = crossProduct(d1, d2);
  if (Math.abs(det) < EPSILON) {
    return null;
  }
  
  const diff = vectorSubtract(v2_0, v1_0);
  const t1 = crossProduct(diff, d2) / det;
  
  return {
    x: v1_0.x + t1 * d1.x,
    y: v1_0.y + t1 * d1.y
  };
}

// ============================================================================
// Point-Line Distance
// ============================================================================

/**
 * Calculate perpendicular distance from point to line
 * @param point - Point to measure from
 * @param lineStart - Start of line
 * @param lineEnd - End of line
 * @returns Perpendicular distance
 */
export function pointToLineDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const lineVec = vectorSubtract(lineEnd, lineStart);
  const pointVec = vectorSubtract(point, lineStart);
  
  const lineLengthSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;
  if (lineLengthSq < EPSILON) {
    // Line is actually a point
    return distance(point, lineStart);
  }
  
  // Project point onto line
  const t = dotProduct(pointVec, lineVec) / lineLengthSq;
  
  // Find closest point on line
  const closestPoint = {
    x: lineStart.x + t * lineVec.x,
    y: lineStart.y + t * lineVec.y
  };
  
  return distance(point, closestPoint);
}

/**
 * Calculate perpendicular distance from point to line segment
 * (bounded by segment endpoints)
 */
export function pointToSegmentDistance(
  point: Point,
  segStart: Point,
  segEnd: Point
): number {
  const lineVec = vectorSubtract(segEnd, segStart);
  const pointVec = vectorSubtract(point, segStart);
  
  const lineLengthSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;
  if (lineLengthSq < EPSILON) {
    return distance(point, segStart);
  }
  
  // Project point onto line
  let t = dotProduct(pointVec, lineVec) / lineLengthSq;
  t = Math.max(0, Math.min(1, t)); // Clamp to segment
  
  const closestPoint = {
    x: segStart.x + t * lineVec.x,
    y: segStart.y + t * lineVec.y
  };
  
  return distance(point, closestPoint);
}

/**
 * Find closest point on line segment to given point
 */
export function closestPointOnSegment(
  point: Point,
  segStart: Point,
  segEnd: Point
): Point {
  const lineVec = vectorSubtract(segEnd, segStart);
  const pointVec = vectorSubtract(point, segStart);
  
  const lineLengthSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;
  if (lineLengthSq < EPSILON) {
    return { ...segStart };
  }
  
  let t = dotProduct(pointVec, lineVec) / lineLengthSq;
  t = Math.max(0, Math.min(1, t));
  
  return {
    x: segStart.x + t * lineVec.x,
    y: segStart.y + t * lineVec.y
  };
}

// ============================================================================
// Rotation
// ============================================================================

/**
 * Rotate vector by angle (degrees)
 */
export function rotateVector(v: VectorXY, angleDegrees: number): VectorXY {
  const angleRad = degToRad(angleDegrees);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}

/**
 * Rotate point around center by angle (degrees)
 */
export function rotatePointAround(
  point: Point,
  center: Point,
  angleDegrees: number
): Point {
  const translated = vectorSubtract(point, center);
  const rotated = rotateVector(translated, angleDegrees);
  return vectorAdd(rotated, center);
}

// ============================================================================
// Geometric Utilities
// ============================================================================

/**
 * Check if point is inside circle
 */
export function isPointInCircle(
  point: Point,
  center: Point,
  radius: number
): boolean {
  return distance(point, center) <= radius;
}

/**
 * Calculate angle between two vectors in degrees
 */
export function angleBetweenVectors(v1: VectorXY, v2: VectorXY): number {
  const dot = dotProduct(v1, v2);
  const mag1 = vectorMagnitude(v1);
  const mag2 = vectorMagnitude(v2);
  
  if (mag1 < EPSILON || mag2 < EPSILON) {
    return 0;
  }
  
  const cosAngle = dot / (mag1 * mag2);
  // Clamp to avoid numerical errors in acos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  return radToDeg(Math.acos(clampedCos));
}

/**
 * Interpolate between two points
 * @param t - Interpolation factor (0 = p1, 1 = p2)
 */
export function interpolatePoints(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
}

/**
 * Check if three points are collinear (on same line)
 */
export function areCollinear(p1: Point, p2: Point, p3: Point): boolean {
  const v1 = vectorSubtract(p2, p1);
  const v2 = vectorSubtract(p3, p1);
  return Math.abs(crossProduct(v1, v2)) < EPSILON;
}
