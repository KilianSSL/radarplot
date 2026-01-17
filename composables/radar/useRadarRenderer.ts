/**
 * Canvas rendering composable for radar display
 * Port of drawing functions from radar.c and print.c
 */

import type { Ref } from 'vue';
import type { RadarState, Target } from '~/utils/radarTypes';
import {
  getColors,
  BEARING_LINES,
  RANGE_RINGS,
  getFont,
  FONTS,
  degToRad,
  normalizeAngle,
  nauticalToCanvasAngle,
  nauticalSinCos,
  bearingDistanceToXY,
  minutesToTimeString,
  TARGET_LETTERS
} from '~/utils/radarConstants';

export function useRadarRenderer(canvasRef: Ref<HTMLCanvasElement | null>, isDark: boolean = false) {
  // Get color scheme based on mode
  const COLORS = getColors(isDark);
  
  /**
   * Rotate coordinates for Course Up mode
   * In Course Up mode, all positions need to be rotated by -ownCourse around the origin
   * so that the own ship's heading appears at the top of the display.
   * 
   * Port of radar_sincos logic from radar.c for position transformation
   * 
   * @param x - X coordinate in true (North Up) coordinates (nautical: positive = East)
   * @param y - Y coordinate in true (North Up) coordinates (nautical: positive = North)
   * @param northUp - Whether North Up mode is active
   * @param ownCourse - Own ship course in degrees
   * @returns Rotated coordinates for display
   */
  function rotateForCourseUp(
    x: number,
    y: number,
    northUp: boolean,
    ownCourse: number
  ): { x: number; y: number } {
    if (northUp) {
      return { x, y };
    }
    
    // Rotate by -ownCourse (to put own heading at top)
    // Using rotation matrix for counter-clockwise rotation by ownCourse
    // (which is equivalent to clockwise rotation of the point, making heading appear at top)
    const radians = degToRad(ownCourse);
    const sinC = Math.sin(radians);
    const cosC = Math.cos(radians);
    
    return {
      x: x * cosC - y * sinC,
      y: y * cosC + x * sinC
    };
  }
  
  /**
   * Convert true nautical coordinates to canvas pixel coordinates with Course Up support
   * @param cx - Canvas center X
   * @param cy - Canvas center Y
   * @param trueX - X in true nautical miles (positive = East)
   * @param trueY - Y in true nautical miles (positive = North)
   * @param pixelsPerNM - Scale factor
   * @param northUp - Whether North Up mode is active
   * @param ownCourse - Own ship course in degrees
   */
  function trueToCanvas(
    cx: number,
    cy: number,
    trueX: number,
    trueY: number,
    pixelsPerNM: number,
    northUp: boolean,
    ownCourse: number
  ): { x: number; y: number } {
    const rotated = rotateForCourseUp(trueX, trueY, northUp, ownCourse);
    return {
      x: cx + rotated.x * pixelsPerNM,
      y: cy - rotated.y * pixelsPerNM  // Canvas Y is inverted
    };
  }
  
  /**
   * Get 2D context with error handling
   */
  function getContext(): CanvasRenderingContext2D | null {
    if (!canvasRef.value) return null;
    return canvasRef.value.getContext('2d');
  }
  
  // ==========================================================================
  // Background Rendering (Static Elements)
  // ==========================================================================
  
  /**
   * Clear canvas
   */
  function clearCanvas() {
    const ctx = getContext();
    if (!ctx || !canvasRef.value) return;
    
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  }
  
  /**
   * Draw range rings (concentric circles)
   * Port of range ring drawing from radar.c
   */
  function drawRangeRings(
    cx: number,
    cy: number,
    radius: number,
    step: number,
    marks: number
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 0.5;
    
    // Draw 6 range rings
    for (let i = 1; i <= RANGE_RINGS; i++) {
      const r = step * i;
      
      // Half-rings between main rings
      if (i < RANGE_RINGS) {
        ctx.strokeStyle = COLORS.GRID;
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.arc(cx, cy, r - step / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Main ring
      ctx.strokeStyle = COLORS.GRID_MAJOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  /**
   * Draw bearing lines (radial lines)
   * Port of bearing line drawing from radar.c using outer_sincos()
   * Uses nautical coordinate system: 0° = North, clockwise
   * 
   * IMPORTANT: Background (grid, labels) NEVER rotates - always shows true bearings
   * in fixed positions. Only the foreground (targets, vectors) rotates in Course Up mode.
   * This matches the original C code which uses outer_sincos() for background elements.
   */
  function drawBearingLines(
    cx: number,
    cy: number,
    radius: number
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    // Background NEVER rotates - always use true bearings (northUp=true, ownCourse=0)
    // This matches the original C code's outer_sincos() function
    
    // Minor bearing lines (every 10°)
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 0.25;
    for (let angle = 0; angle < 360; angle += BEARING_LINES.MINOR) {
      if (angle % BEARING_LINES.MEDIUM === 0) continue; // Skip medium lines
      
      const pos1 = bearingDistanceToXY(cx, cy, angle, radius * 0.25, true, 0);
      const pos2 = bearingDistanceToXY(cx, cy, angle, radius, true, 0);
      
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
    }
    
    // Medium bearing lines (every 30°, not on cardinal)
    ctx.strokeStyle = COLORS.GRID_MAJOR;
    ctx.lineWidth = 0.5;
    for (let angle = 0; angle < 360; angle += BEARING_LINES.MEDIUM) {
      if (angle % BEARING_LINES.MAJOR === 0) continue; // Skip major lines
      
      const pos1 = bearingDistanceToXY(cx, cy, angle, radius * 0.25, true, 0);
      const pos2 = bearingDistanceToXY(cx, cy, angle, radius, true, 0);
      
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
    }
    
    // Major bearing lines (cardinal directions: 0°, 90°, 180°, 270°)
    ctx.strokeStyle = COLORS.GRID_MAJOR;
    ctx.lineWidth = 1;
    for (let angle = 0; angle < 360; angle += BEARING_LINES.MAJOR) {
      const pos = bearingDistanceToXY(cx, cy, angle, radius, true, 0);
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  }
  
  /**
   * Draw bearing labels around perimeter
   * Port of bearing label drawing from radar.c using outer_sincos()
   * Uses nautical coordinate system: 0° = North, clockwise
   * 
   * IMPORTANT: Background (grid, labels) NEVER rotates - always shows true bearings
   * in fixed positions. This matches the original C code's outer_sincos() function.
   */
  function drawBearingLabels(
    cx: number,
    cy: number,
    radius: number
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.font = getFont(FONTS.BEARING_SIZE);
    ctx.fillStyle = COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelRadius = radius + 20; // Position outside rings
    
    // Draw labels every 10 degrees
    // Background NEVER rotates - always use true bearings (northUp=true, ownCourse=0)
    // This matches the original C code's outer_sincos() function
    for (let angle = 0; angle < 360; angle += 10) {
      const pos = bearingDistanceToXY(cx, cy, angle, labelRadius, true, 0);
      
      const label = angle.toString().padStart(3, '0');
      ctx.fillText(label, pos.x, pos.y);
    }
  }
  
  /**
   * Draw range labels on cardinal directions
   * Port of range label drawing from radar.c using outer_sincos()
   * Uses nautical coordinate system: 0° = North, clockwise
   * 
   * IMPORTANT: Background (grid, labels) NEVER rotates - always shows true bearings
   * in fixed positions. This matches the original C code's outer_sincos() function.
   */
  function drawRangeLabels(
    cx: number,
    cy: number,
    step: number,
    range: number,
    marks: number,
    digits: number
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.font = getFont(FONTS.RANGE_SIZE);
    ctx.fillStyle = COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw labels on cardinal directions (N, E, S, W)
    const cardinalAngles = [0, 90, 180, 270];
    
    for (const angle of cardinalAngles) {
      for (let i = 1; i <= RANGE_RINGS; i++) {
        // Skip some labels based on marks setting
        if (marks === 3 && i % 2 === 1 && i !== RANGE_RINGS) continue;
        
        const r = step * i;
        const distance = (i * range) / RANGE_RINGS;
        
        // Background NEVER rotates - always use true bearings
        const pos = bearingDistanceToXY(cx, cy, angle, r, true, 0);
        
        // Format distance based on digits
        const label = digits > 0 
          ? distance.toFixed(digits)
          : Math.round(distance).toString();
        
        // Draw background for readability
        ctx.save();
        ctx.fillStyle = COLORS.LABEL_BG;
        const metrics = ctx.measureText(label);
        const padding = 2;
        ctx.fillRect(
          pos.x - metrics.width / 2 - padding,
          pos.y - 6 - padding,
          metrics.width + padding * 2,
          12 + padding * 2
        );
        ctx.restore();
        
        // Draw label
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText(label, pos.x, pos.y);
      }
    }
  }
  
  /**
   * Draw center marker (own ship position)
   */
  function drawCenterMarker(cx: number, cy: number) {
    const ctx = getContext();
    if (!ctx) return;
    
    const size = 8;
    
    ctx.strokeStyle = COLORS.CENTER;
    ctx.lineWidth = 2;
    
    // Draw cross
    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.stroke();
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  /**
   * Draw heading indicator (if Course Up mode)
   * Uses nautical coordinate system
   * In Course Up mode, the heading always points up (since grid is rotated)
   */
  function drawHeadingIndicator(
    cx: number,
    cy: number,
    radius: number,
    heading: number,
    show: boolean,
    northUp: boolean = true,
    ownCourse: number = 0
  ) {
    if (!show) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // In Course Up mode, the heading is adjusted so own ship heading points up
    const pos = bearingDistanceToXY(cx, cy, heading, radius, northUp, ownCourse);
    
    ctx.strokeStyle = COLORS.OWN_SHIP;
    ctx.fillStyle = COLORS.OWN_SHIP;
    ctx.lineWidth = 2;
    
    // Draw line from center
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    // Draw arrow at end
    // Calculate angle for arrow head (pointing away from center)
    const angle = Math.atan2(pos.y - cy, pos.x - cx);
    const arrowSize = 10;
    const arrowAngle1 = angle + Math.PI * 0.75;
    const arrowAngle2 = angle - Math.PI * 0.75;
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + arrowSize * Math.cos(arrowAngle1), pos.y + arrowSize * Math.sin(arrowAngle1));
    ctx.lineTo(pos.x + arrowSize * Math.cos(arrowAngle2), pos.y + arrowSize * Math.sin(arrowAngle2));
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * Draw complete background (static elements)
   * Main function that renders all background elements
   * In Course Up mode, the entire grid rotates so own ship heading is at top
   */
  function drawBackground(state: RadarState) {
    clearCanvas();
    
    const cx = state.centerX;
    const cy = state.centerY;
    const radius = state.radiusPixels;
    const step = state.step;
    const range = state.range;
    const marks = state.currentRange?.marks ?? 6;
    const digits = state.currentRange?.digits ?? 0;
    const northUp = state.northUp;
    const ownCourse = state.ownCourse;
    
    // Draw in order (back to front)
    // IMPORTANT: Background (grid, labels) NEVER rotates - always shows true bearings
    // Only the foreground (targets, vectors) rotates in Course Up mode
    // This matches the original C code's outer_sincos() vs radar_sincos() separation
    drawRangeRings(cx, cy, radius, step, marks);
    drawBearingLines(cx, cy, radius);
    drawRangeLabels(cx, cy, step, range, marks, digits);
    drawBearingLabels(cx, cy, radius);
    drawCenterMarker(cx, cy);
    
    // Draw heading indicator when enabled
    // This DOES rotate with course-up mode to show own ship heading direction
    if (state.showHeading) {
      drawHeadingIndicator(cx, cy, radius, ownCourse, true, northUp, ownCourse);
    }
  }
  
  // ==========================================================================
  // Foreground Rendering (Dynamic Elements)
  // ==========================================================================
  
  /**
   * Draw vector line
   */
  function drawVector(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth: number = 1,
    dashPattern?: number[]
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    if (dashPattern) {
      ctx.setLineDash(dashPattern);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset
  }
  
  /**
   * Draw arc
   */
  function drawArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string,
    lineWidth: number = 1
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Convert nautical angles to canvas angles
    const startRad = degToRad(nauticalToCanvasAngle(startAngle));
    const endRad = degToRad(nauticalToCanvasAngle(endAngle));
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startRad, endRad, false);
    ctx.stroke();
  }
  
  /**
   * Draw course change arc for maneuver visualization
   * Port of ARC_COURSE from radar.c (lines 4390-4395)
   * Shows the rotation from old course to new course
   * 
   * Original C code uses:
   *   angle1 = -fmod(crs + 270.0, 360.0)  <- start angle (in GDK degrees)
   *   angle2 = delta (sweep angle)
   */
  function drawCourseChangeArc(
    cx: number,
    cy: number,
    radius: number,
    ownCourse: number,
    courseChange: number,
    color: string,
    northUp: boolean
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]); // Dashed arc like in original
    
    // In course-up mode, the heading is always up (0°), so the arc starts there
    // In north-up mode, the arc starts at own course
    const crs = northUp ? ownCourse : 0;
    
    // Convert nautical angle to canvas angle
    // Nautical: 0=North, clockwise positive
    // Canvas: 0=East, counter-clockwise positive
    // So nautical N (0°) = canvas 90° (up)
    // Conversion: canvas = 90 - nautical
    const startAngleCanvas = 90 - crs;
    const endAngleCanvas = 90 - (crs + courseChange);
    
    const startRad = degToRad(startAngleCanvas);
    const endRad = degToRad(endAngleCanvas);
    
    // For starboard turn (positive courseChange): we turn clockwise in nautical terms
    // In canvas: from 90° to 60° (for +30° turn), we need to go CLOCKWISE (short way)
    // Canvas clockwise = anticlockwise:false
    // For port turn (negative courseChange): we turn counter-clockwise in nautical
    // In canvas: from 90° to 120° (for -30° turn), we need to go COUNTER-CLOCKWISE (short way)
    // Canvas counter-clockwise = anticlockwise:true
    const anticlockwise = courseChange < 0;
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startRad, endRad, anticlockwise);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
  }
  
  /**
   * Draw filled polygon
   */
  function drawPolygon(
    points: { x: number; y: number }[],
    color: string
  ) {
    const ctx = getContext();
    if (!ctx || points.length < 3) return;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * Draw text label with optional background
   */
  function drawLabel(
    x: number,
    y: number,
    text: string,
    color: string,
    fontSize: number = FONTS.LABEL_SIZE,
    backgroundColor?: string,
    align: 'left' | 'center' | 'right' = 'center',
    baseline: 'top' | 'middle' | 'bottom' = 'middle'
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    ctx.font = getFont(fontSize);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    
    // Draw background if specified
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      const metrics = ctx.measureText(text);
      const padding = 2;
      
      let xOffset = 0;
      if (align === 'center') xOffset = -metrics.width / 2;
      else if (align === 'right') xOffset = -metrics.width;
      
      let yOffset = 0;
      if (baseline === 'middle') yOffset = -fontSize / 2;
      else if (baseline === 'bottom') yOffset = -fontSize;
      
      ctx.fillRect(
        x + xOffset - padding,
        y + yOffset - padding,
        metrics.width + padding * 2,
        fontSize + padding * 2
      );
    }
    
    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  
  /**
   * Find the best label position from 12 candidate positions around a point.
   * Scores each position based on distance from lines and other points to avoid.
   */
  function findBestLabelPosition(
    markerX: number,
    markerY: number,
    offset: number,
    linesToAvoid: Array<{ x1: number; y1: number; x2: number; y2: number }>,
    pointsToAvoid: Array<{ x: number; y: number }>
  ): { x: number; y: number; align: 'left' | 'center' | 'right' } {
    // Generate 12 candidate positions around the marker (every 30°)
    const candidates: Array<{ x: number; y: number; score: number; align: 'left' | 'center' | 'right' }> = [];
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6; // 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330 degrees
      const x = markerX + offset * Math.cos(angle);
      const y = markerY + offset * Math.sin(angle);
      
      // Determine text alignment based on angle
      let align: 'left' | 'center' | 'right' = 'center';
      const angleDeg = (angle * 180) / Math.PI;
      if (angleDeg > 60 && angleDeg < 120) {
        align = 'center'; // Bottom
      } else if (angleDeg > 240 && angleDeg < 300) {
        align = 'center'; // Top
      } else if (angleDeg >= 120 && angleDeg <= 240) {
        align = 'right'; // Left side
      } else {
        align = 'left'; // Right side
      }
      
      let score = 0;
      
      // Score based on distance from lines (higher = better)
      // Use squared distance for stronger avoidance of nearby lines
      for (const line of linesToAvoid) {
        const dist = distancePointToLine(x, y, line.x1, line.y1, line.x2, line.y2);
        // Penalize positions very close to lines more heavily
        if (dist < 15) {
          score -= 100; // Strong penalty for being too close
        } else {
          score += Math.min(dist, 60);
        }
      }
      
      // Score based on distance from points to avoid
      for (const pt of pointsToAvoid) {
        const dist = Math.hypot(x - pt.x, y - pt.y);
        if (dist < 20) {
          score -= 50; // Penalty for being too close to a point
        } else {
          score += Math.min(dist, 40);
        }
      }
      
      candidates.push({ x, y, score, align });
    }
    
    // Return the candidate with the highest score
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }
  
  /**
   * Calculate perpendicular distance from a point to a line segment
   */
  function distancePointToLine(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) {
      // Line is a point
      return Math.hypot(px - x1, py - y1);
    }
    
    // Project point onto line, clamped to segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    
    return Math.hypot(px - nearestX, py - nearestY);
  }
  
  /**
   * Draw target position marker
   */
  function drawTargetMarker(
    x: number,
    y: number,
    label: string,
    color: string = COLORS.TARGET_POSITION
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    const size = 6;
    
    // Draw X marker
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
    
    // Draw label
    if (label) {
      drawLabel(x, y - size - 10, label, color, FONTS.LABEL_SIZE, COLORS.LABEL_BG);
    }
  }
  
  /**
   * Draw CPA marker with default label position
   */
  function drawCPAMarker(
    x: number,
    y: number,
    label: string
  ) {
    drawCPAMarkerAt(x, y, x, y + 20, label);
  }
  
  /**
   * Draw CPA label at specified position
   * Note: Original radarplot does not draw a circle marker at CPA, only the CPA line
   */
  function drawCPAMarkerAt(
    markerX: number,
    markerY: number,
    labelX: number,
    labelY: number,
    label: string
  ) {
    // Draw label at specified position (no circle marker - matches original radarplot)
    if (label) {
      drawLabel(labelX, labelY, label, COLORS.CPA_MARKER, FONTS.LABEL_SIZE, COLORS.LABEL_BG);
    }
  }
  
  /**
   * Convert nautical miles to canvas pixels
   */
  function nmToPixels(nm: number, pixelsPerNM: number): number {
    return nm * pixelsPerNM;
  }
  
  /**
   * Convert bearing and distance to canvas coordinates
   * Uses the correct nautical coordinate system:
   * - 0° = North (top)
   * - Angles increase clockwise
   * - Matches C code: x = cx + r * sin(bearing), y = cy - r * cos(bearing)
   * 
   * @param northUp - If false (Course Up mode), adjusts bearing by own course
   * @param ownCourse - Own ship course for Course Up mode adjustment
   */
  function polarToCanvas(
    cx: number,
    cy: number,
    bearing: number,
    distanceNM: number,
    pixelsPerNM: number,
    northUp: boolean = true,
    ownCourse: number = 0
  ): { x: number; y: number } {
    const distancePixels = nmToPixels(distanceNM, pixelsPerNM);
    return bearingDistanceToXY(cx, cy, bearing, distancePixels, northUp, ownCourse);
  }
  
  /**
   * Draw complete foreground (dynamic elements)
   * Renders all target data, vectors, CPA markers, etc.
   */
  function drawForeground(state: RadarState) {
    const cx = state.centerX;
    const cy = state.centerY;
    const pixelsPerNM = state.radiusPixels / state.range;
    
    // Draw each target
    for (const target of state.targets) {
      if (target.distance[0] <= 0 && target.distance[1] <= 0) {
        continue; // Skip empty targets
      }
      
      drawTargetData(target, cx, cy, pixelsPerNM, state);
    }
  }
  
  /**
   * Draw all data for a single target
   */
  function drawTargetData(
    target: Target,
    cx: number,
    cy: number,
    pixelsPerNM: number,
    state: RadarState
  ) {
    const targetLetter = TARGET_LETTERS[target.index];
    
    // Calculate observation positions
    // IMPORTANT: Use radar orientation mode (northUp) and ownCourse for proper positioning
    let pos0 = null;
    let pos1 = null;
    
    if (target.distance[0] > 0) {
      pos0 = polarToCanvas(cx, cy, target.rakrp[0], target.distance[0], pixelsPerNM, state.northUp, state.ownCourse);
      drawTargetMarker(pos0.x, pos0.y, `${targetLetter}₀`, COLORS.TARGET_POSITION);
    }
    
    if (target.distance[1] > 0) {
      pos1 = polarToCanvas(cx, cy, target.rakrp[1], target.distance[1], pixelsPerNM, state.northUp, state.ownCourse);
      drawTargetMarker(pos1.x, pos1.y, `${targetLetter}₁`, COLORS.TARGET_POSITION);
      
      // Draw relative motion vector (line between observations)
      // C code: radar_set_vector(radar, &s->vectors[VECTOR_RELATIVE], ...)
      if (pos0 && target.vBr > 0) {
        drawVector(pos0.x, pos0.y, pos1.x, pos1.y, COLORS.RELATIVE_MOTION, 2);
        // C code: radar_mark_vector(radar, s, VECTOR_RELATIVE, ...) - arrow + circle marker
        drawMidArrowRelative(pos0.x, pos0.y, pos1.x, pos1.y, COLORS.RELATIVE_MOTION);
        
        // Extend relative motion vector forward toward CPA
        // C code: radar_set_vector(radar, &s->vectors[VECTOR_REL_EXT], ...)
        if (target.haveCPA) {
          // Use trueToCanvas for Course Up support
          const cpaPos = trueToCanvas(cx, cy, target.cpa.x, target.cpa.y, pixelsPerNM, state.northUp, state.ownCourse);
          drawVector(pos1.x, pos1.y, cpaPos.x, cpaPos.y, COLORS.RELATIVE_MOTION, 1, [3, 3]);
        }
      }
    }
    
    // Draw CPA marker and line from center (perpendicular to target track)
    // C code: radar_set_vector(radar, &s->vectors[VECTOR_CPA], s->cpa_gc, radar->cx, radar->cy, x, y);
    if (target.haveCPA && target.CPA >= 0) {
      // Use trueToCanvas for Course Up support
      const cpaCanvas = trueToCanvas(cx, cy, target.cpa.x, target.cpa.y, pixelsPerNM, state.northUp, state.ownCourse);
      const cpaX = cpaCanvas.x;
      const cpaY = cpaCanvas.y;
      
      // Draw perpendicular line from center (own position) to CPA point
      // This shows the closest point of approach on the target's relative track
      drawVector(cx, cy, cpaX, cpaY, COLORS.CPA_MARKER, 1.5);
      
      // Smart label positioning: find best spot avoiding all nearby lines
      const linesToAvoid: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
        { x1: cx, y1: cy, x2: cpaX, y2: cpaY }, // CPA line from center
        { x1: cx, y1: 0, x2: cx, y2: cy * 2 }   // Heading line (vertical)
      ];
      
      // Add relative motion line if available (extended)
      if (pos0 && pos1) {
        const dx = pos1.x - pos0.x;
        const dy = pos1.y - pos0.y;
        linesToAvoid.push({ 
          x1: pos0.x - dx * 3, y1: pos0.y - dy * 3, 
          x2: pos1.x + dx * 3, y2: pos1.y + dy * 3 
        });
      }
      
      const pointsToAvoid = [{ x: cx, y: cy }]; // Center point
      if (pos0) pointsToAvoid.push({ x: pos0.x, y: pos0.y });
      if (pos1) pointsToAvoid.push({ x: pos1.x, y: pos1.y });
      
      // Position label away from the CPA point to avoid line overlaps
      const bestPos = findBestLabelPosition(cpaX, cpaY, 30, linesToAvoid, pointsToAvoid);
      
      drawCPAMarkerAt(cpaX, cpaY, bestPos.x, bestPos.y, `CPA ${target.CPA.toFixed(1)}nm`);
    }
    
    // Draw velocity triangle if we have both observations
    // Port of C code from radar.c lines 4246-4275
    if (pos0 && pos1 && target.deltaTime > 0 && target.vBr > 0) {
      // Calculate own ship distance traveled during observation interval
      const ownDistanceNM = state.ownSpeed * (target.deltaTime / 60);
      
      if (ownDistanceNM > 0) {
        // Calculate the triangle apex (p0_sub_own in C code)
        // This is B₀ position plus the REVERSE of own ship motion
        // C code: radar_sincos(radar, (180 + radar->own_course) % 360, &sina, &cosa)
        const reverseBearing = normalizeAngle(state.ownCourse + 180);
        const ownDistancePixels = ownDistanceNM * pixelsPerNM;
        
        // Get sin/cos for reverse bearing with proper orientation handling
        const { sin: sinReverse, cos: cosReverse } = nauticalSinCos(
          reverseBearing,
          state.northUp,
          state.ownCourse
        );
        
        // Calculate apex position (p0_sub_own)
        // C code: x = radar->cx + dx[0] + r * sina; y = radar->cy - (dy[0] + r * cosa);
        const apexX = pos0.x + ownDistancePixels * sinReverse;
        const apexY = pos0.y - ownDistancePixels * cosReverse;
        
        // Draw VECTOR_OWN: from apex to B₀ (blue line with mid-arrow)
        // C code: radar_mark_vector(radar, s, VECTOR_OWN, s->own_mark_gc, x, y, xs[0], ys[0]);
        drawVector(apexX, apexY, pos0.x, pos0.y, COLORS.OWN_SHIP, 2);
        drawMidArrowOwn(apexX, apexY, pos0.x, pos0.y, COLORS.OWN_SHIP);
        
        // Draw VECTOR_TRUE: from apex to B₁ (green line with mid-arrow)
        // C code: radar_mark_vector(radar, s, VECTOR_TRUE, s->true_mark_gc, x, y, xs[1], ys[1]);
        if (target.vB > 0) {
          drawVector(apexX, apexY, pos1.x, pos1.y, COLORS.TRUE_MOTION, 2);
          drawMidArrowTrue(apexX, apexY, pos1.x, pos1.y, COLORS.TRUE_MOTION);
        }
      }
    }
    
    // Note: BCR (Bow Crossing Range) is shown in the data panel only, not on the radar canvas
    // (matches original radarplot behavior)
    
    // Draw post-maneuver vectors if exists
    if (target.haveNewCPA && target.index === state.maneuverTargetIndex) {
      const ctx = getContext();
      if (!ctx) return;
      
      // Get maneuver point position (on the mdistance circle, on the relative motion line)
      // Use trueToCanvas for Course Up support
      const mpoint = trueToCanvas(cx, cy, target.mpoint.x, target.mpoint.y, pixelsPerNM, state.northUp, state.ownCourse);
      const mpointX = mpoint.x;
      const mpointY = mpoint.y;
      
      // Get new CPA position (tangent point to the desired CPA circle)
      const newCpa = trueToCanvas(cx, cy, target.newCpa.x, target.newCpa.y, pixelsPerNM, state.northUp, state.ownCourse);
      const newCpaX = newCpa.x;
      const newCpaY = newCpa.y;
      
      // Get xpoint position (end of new own vector - apex of new velocity triangle)
      const xpointPos = trueToCanvas(cx, cy, target.xpoint.x, target.xpoint.y, pixelsPerNM, state.northUp, state.ownCourse);
      const xpointX = xpointPos.x;
      const xpointY = xpointPos.y;
      
      // ==========================================================================
      // Draw maneuver point marker (+ cross symbol only, no label)
      // Matches C code: VECTOR_MPOINTX and VECTOR_MPOINTY (simple +4/-4 pixel cross)
      // ==========================================================================
      ctx.strokeStyle = COLORS.MANEUVER_POINT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mpointX - 4, mpointY);
      ctx.lineTo(mpointX + 4, mpointY);
      ctx.moveTo(mpointX, mpointY - 4);
      ctx.lineTo(mpointX, mpointY + 4);
      ctx.stroke();
      
      // ==========================================================================
      // Draw new relative motion line (from mpoint through newCpa, tangent to CPA circle)
      // This line is solid and extends beyond newCpa - no arrow marker (matches C code)
      // ==========================================================================
      
      // Calculate direction from mpoint to newCpa
      const dx = newCpaX - mpointX;
      const dy = newCpaY - mpointY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        // Extend the line beyond newCpa to the edge of radar
        const extendFactor = state.radiusPixels / dist * 1.5;
        const extEndX = mpointX + dx * extendFactor;
        const extEndY = mpointY + dy * extendFactor;
        
        // Draw the new relative motion line (solid, same style as original relative motion)
        ctx.strokeStyle = COLORS.RELATIVE_MOTION;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mpointX, mpointY);
        ctx.lineTo(extEndX, extEndY);
        ctx.stroke();
      }
      
      // ==========================================================================
      // Draw line from own ship to new CPA (perpendicular to new relative motion)
      // This shows the new CPA distance - use same color as original CPA (red)
      // ==========================================================================
      ctx.strokeStyle = COLORS.CPA_MARKER;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(newCpaX, newCpaY);
      ctx.stroke();
      
      // ==========================================================================
      // Draw new CPA' label (no marker - matches original radarplot)
      // ==========================================================================
      
      // Smart new CPA' label positioning
      const newCpaLinesToAvoid: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
        { x1: cx, y1: cy, x2: newCpaX, y2: newCpaY }, // New CPA line from center
        { x1: cx, y1: 0, x2: cx, y2: cy * 2 }         // Heading line (vertical)
      ];
      
      // Add new relative motion line
      if (dist > 0) {
        newCpaLinesToAvoid.push({ 
          x1: mpointX - dx, y1: mpointY - dy, 
          x2: newCpaX + dx * 2, y2: newCpaY + dy * 2 
        });
      }
      
      // Add original CPA line if exists
      if (target.haveCPA) {
        const origCpaPos = trueToCanvas(cx, cy, target.cpa.x, target.cpa.y, pixelsPerNM, state.northUp, state.ownCourse);
        newCpaLinesToAvoid.push({ x1: cx, y1: cy, x2: origCpaPos.x, y2: origCpaPos.y });
      }
      
      // Add original relative motion line if exists
      if (pos0 && pos1) {
        const relDx = pos1.x - pos0.x;
        const relDy = pos1.y - pos0.y;
        newCpaLinesToAvoid.push({ 
          x1: pos0.x - relDx, y1: pos0.y - relDy, 
          x2: pos1.x + relDx, y2: pos1.y + relDy 
        });
      }
      
      const newCpaPointsToAvoid = [
        { x: cx, y: cy },
        { x: mpointX, y: mpointY }
      ];
      
      // Also avoid original CPA marker position
      if (target.haveCPA) {
        const origCpaAvoidPos = trueToCanvas(cx, cy, target.cpa.x, target.cpa.y, pixelsPerNM, state.northUp, state.ownCourse);
        newCpaPointsToAvoid.push({ x: origCpaAvoidPos.x, y: origCpaAvoidPos.y });
      }
      
      const newCpaBestPos = findBestLabelPosition(newCpaX, newCpaY, 30, newCpaLinesToAvoid, newCpaPointsToAvoid);
      
      drawLabel(
        newCpaBestPos.x, newCpaBestPos.y,
        `CPA' ${target.newCPA.toFixed(1)}nm`,
        COLORS.CPA_MARKER,
        FONTS.LABEL_SIZE - 1,
        COLORS.LABEL_BG,
        newCpaBestPos.align
      );
      
      // ==========================================================================
      // Draw new own ship vector (from p0_sub_own to xpoint) - shows new heading/course
      // Port of VECTOR_NEW_OWN from radar.c: from p0_sub_own (apex) to xpoint
      // ==========================================================================
      
      // Calculate p0_sub_own (apex of velocity triangle) - same as in velocity triangle drawing
      // First, get B₀ position in canvas coordinates with Course Up support
      const pos0Canvas = trueToCanvas(cx, cy, target.sight[0].x, target.sight[0].y, pixelsPerNM, state.northUp, state.ownCourse);
      
      // Calculate own ship vector offset using nauticalSinCos (handles Course Up)
      const ownDistNM = state.ownSpeed * (target.deltaTime / 60);
      const reverseBrg = normalizeAngle(state.ownCourse + 180);
      const { sin: sinRev, cos: cosRev } = nauticalSinCos(reverseBrg, state.northUp, state.ownCourse);
      const ownDistPx = ownDistNM * pixelsPerNM;
      
      // Apex position (p0_sub_own) - starting from B₀
      const apexX = pos0Canvas.x + ownDistPx * sinRev;
      const apexY = pos0Canvas.y - ownDistPx * cosRev;
      
      // Draw from apex (p0_sub_own) to xpoint
      ctx.strokeStyle = COLORS.OWN_SHIP;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(xpointX, xpointY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw arrow on new own ship vector (single arrow like POLY_NEW_OWN_ARROW)
      drawMidArrowOwn(apexX, apexY, xpointX, xpointY, COLORS.OWN_SHIP);
      
      // ==========================================================================
      // Draw course change arc (ARC_COURSE) - only for course change maneuvers
      // Port of radar.c arc drawing: shows rotation from old course to new course
      // Arc is centered at p0_sub_own (apex) with radius = own ship travel distance
      // ==========================================================================
      if (state.maneuverType === 'course' && state.maneuverByCPA && state.maneuverResult?.courseChange !== undefined) {
        const arcRadius = ownDistPx; // Radius = distance own ship travels during observation
        const courseChange = state.maneuverResult.courseChange;
        
        if (Math.abs(courseChange) > 0.5 && arcRadius > 10) {
          // Draw the arc showing course change
          // Parameters match original C code: ownCourse, courseChange, northUp mode
          drawCourseChangeArc(
            apexX, 
            apexY, 
            arcRadius, 
            state.ownCourse,
            courseChange,
            COLORS.OWN_SHIP,
            state.northUp
          );
        }
      }
      
      // ==========================================================================
      // Draw dashed line from B₁ to mpoint if they differ significantly
      // This shows the continuation of relative motion to maneuver point
      // ==========================================================================
      if (target.sight && target.sight[1]) {
        const b1 = target.sight[1]; // B₁ position in nautical miles (true coords)
        const mpx = target.mpoint.x;
        const mpy = target.mpoint.y;
        
        // Check if mpoint is different from B₁
        if (Math.abs(b1.x - mpx) > 0.1 || Math.abs(b1.y - mpy) > 0.1) {
          // Convert B₁ to canvas with Course Up support
          const b1Canvas = trueToCanvas(cx, cy, b1.x, b1.y, pixelsPerNM, state.northUp, state.ownCourse);
          
          ctx.strokeStyle = COLORS.RELATIVE_MOTION;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(b1Canvas.x, b1Canvas.y);
          ctx.lineTo(mpointX, mpointY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }
  
  /**
   * Draw arrow head at end of vector
   */
  function drawArrowHead(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    size: number = 10
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const angle1 = angle + Math.PI * 0.75;
    const angle2 = angle - Math.PI * 0.75;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + size * Math.cos(angle1), y2 + size * Math.sin(angle1));
    ctx.lineTo(x2 + size * Math.cos(angle2), y2 + size * Math.sin(angle2));
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * Draw mid-arrow marker for VECTOR_OWN style (arrow in middle of line)
   * Port of radar_mark_vector for VECTOR_OWN case from radar.c
   */
  function drawMidArrowOwn(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.sqrt(dx * dx + dy * dy);
    
    if (l < 10) return; // Too short to draw arrow
    
    const alpha = Math.atan2(dy, dx);
    const sina = Math.sin(alpha);
    const cosa = Math.cos(alpha);
    
    // Center of the line
    const cx = x1 + l / 2.0 * cosa;
    const cy = y1 + l / 2.0 * sina;
    
    // Arrow points (matching C code exactly)
    const sx = cx + 5.0 * cosa;  // Tip
    const sy = cy + 5.0 * sina;
    const ex = cx - 3.66 * cosa; // Base center
    const ey = cy - 3.66 * sina;
    
    // Triangle vertices
    const p0x = ex - 3.66 * sina;
    const p0y = ey + 3.66 * cosa;
    const p1x = sx;
    const p1y = sy;
    const p2x = ex + 3.66 * sina;
    const p2y = ey - 3.66 * cosa;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * Draw mid-arrow marker for VECTOR_RELATIVE style (arrow + circle in middle)
   * Port of radar_mark_vector for VECTOR_RELATIVE case from radar.c
   */
  function drawMidArrowRelative(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.sqrt(dx * dx + dy * dy);
    
    if (l < 14) return; // Too short to draw arrow
    
    const alpha = Math.atan2(dy, dx);
    const sina = Math.sin(alpha);
    const cosa = Math.cos(alpha);
    
    // Center of the line
    const cx = x1 + l / 2.0 * cosa;
    const cy = y1 + l / 2.0 * sina;
    
    // Arrow points (matching C code exactly)
    const sx = cx + 5.0 * cosa;  // Tip
    const sy = cy + 5.0 * sina;
    const ex = cx - 3.66 * cosa; // Base center
    const ey = cy - 3.66 * sina;
    
    // Triangle vertices
    const p0x = ex - 3.66 * sina;
    const p0y = ey + 3.66 * cosa;
    const p1x = sx;
    const p1y = sy;
    const p2x = ex + 3.66 * sina;
    const p2y = ey - 3.66 * cosa;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.closePath();
    ctx.fill();
    
    // Draw circle (ARC_RELATIVE_ARROW)
    // C code: radar_set_arc(radar, &s->arcs[ARC_RELATIVE_ARROW], gc, cx - cosa, cy - sina, 7.0, 0.0, 360.0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - cosa, cy - sina, 7.0, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  /**
   * Draw mid-arrow marker for VECTOR_TRUE style (TWO arrows in >> pattern)
   * Port of radar_mark_vector for VECTOR_TRUE case from radar.c
   * C code draws TWO triangles: POLY_TRUE_ARROW0 and POLY_TRUE_ARROW1
   */
  function drawMidArrowTrue(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string
  ) {
    const ctx = getContext();
    if (!ctx) return;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.sqrt(dx * dx + dy * dy);
    
    if (l < 18) return; // Too short to draw arrows
    
    const alpha = Math.atan2(dy, dx);
    const sina = Math.sin(alpha);
    const cosa = Math.cos(alpha);
    
    // Center of the line
    const cx = x1 + l / 2.0 * cosa;
    const cy = y1 + l / 2.0 * sina;
    
    ctx.fillStyle = color;
    
    // FIRST ARROW (POLY_TRUE_ARROW0) - front arrow
    // C code: sx = cx + 8.0 * cosa, ex = cx - 0.66 * cosa
    {
      const sx = cx + 8.0 * cosa;
      const sy = cy + 8.0 * sina;
      const ex = cx - 0.66 * cosa;
      const ey = cy - 0.66 * sina;
      
      ctx.beginPath();
      ctx.moveTo(ex - 4.0 * sina, ey + 4.0 * cosa);
      ctx.lineTo(sx, sy);
      ctx.lineTo(ex + 4.0 * sina, ey - 4.0 * cosa);
      ctx.closePath();
      ctx.fill();
    }
    
    // SECOND ARROW (POLY_TRUE_ARROW1) - back arrow
    // C code: sx = cx + 0.0 * cosa, ex = cx - 8.66 * cosa
    {
      const sx = cx + 0.0 * cosa;
      const sy = cy + 0.0 * sina;
      const ex = cx - 8.66 * cosa;
      const ey = cy - 8.66 * sina;
      
      ctx.beginPath();
      ctx.moveTo(ex - 4.0 * sina, ey + 4.0 * cosa);
      ctx.lineTo(sx, sy);
      ctx.lineTo(ex + 4.0 * sina, ey - 4.0 * cosa);
      ctx.closePath();
      ctx.fill();
    }
  }
  
  // ==========================================================================
  // Main Render Function
  // ==========================================================================
  
  /**
   * Render complete radar display
   * @param state - Radar state
   * @param zoom - Zoom scale factor (default 1)
   * @param panX - Pan X offset in pixels (default 0)
   * @param panY - Pan Y offset in pixels (default 0)
   */
  function render(state: RadarState, zoom: number = 1, panX: number = 0, panY: number = 0) {
    if (!state.doRender) return;
    if (!canvasRef.value) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Get canvas dimensions
    const width = canvasRef.value.width;
    const height = canvasRef.value.height;
    
    // Create state with correct dimensions
    const renderState: RadarState = {
      ...state,
      canvasWidth: width,
      canvasHeight: height,
      centerX: width / 2,
      centerY: height / 2,
      radiusPixels: (Math.min(width, height) / 2) * 0.85,
      step: ((Math.min(width, height) / 2) * 0.85) / 6
    };
    
    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity
    ctx.clearRect(0, 0, width, height);
    ctx.restore();
    
    // Apply zoom and pan transformations
    ctx.save();
    
    // Translate to center, apply zoom, then translate back with pan
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX + panX, -centerY + panY);
    
    // Draw all content with transformation applied
    drawBackground(renderState);
    drawForeground(renderState);
    
    ctx.restore();
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  return {
    clearCanvas,
    drawBackground,
    drawForeground,
    render,
    
    // Utility functions
    drawVector,
    drawArc,
    drawPolygon,
    drawLabel,
    drawTargetMarker,
    drawCPAMarker,
    nmToPixels,
    polarToCanvas
  };
}
