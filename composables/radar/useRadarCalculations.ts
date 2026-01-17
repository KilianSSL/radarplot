/**
 * Radar calculations composable
 * Port of core mathematical functions from radar.c
 * 
 * Implements:
 * - Relative motion calculations (DRM, SRM)
 * - True motion calculations (True course, true speed, aspect)
 * - CPA/TCPA calculations (Closest Point of Approach)
 * - BCR/BCT calculations (Bow Crossing Range/Time)
 * - Maneuver calculations (new course/speed from desired CPA)
 */

import type { Target, VectorXY, ManeuverType } from '~/utils/radarTypes';
import {
  EPSILON,
  degToRad,
  radToDeg,
  normalizeAngle,
  normalizeAngleSigned,
  isZero
} from '~/utils/radarConstants';
import {
  polarToCartesian,
  cartesianToPolar,
  vectorAdd,
  vectorSubtract,
  vectorScale,
  vectorMagnitude,
  vectorNormalize,
  dotProduct,
  pointToLineDistance,
  closestPointOnSegment,
  linesIntersect,
  infiniteLinesIntersect
} from '~/utils/vectorMath';

export function useRadarCalculations() {
  
  // ==========================================================================
  // Relative Motion Calculations
  // ==========================================================================
  
  /**
   * Calculate relative motion from two observations
   * Port of relative motion calculation logic from radar.c
   * 
   * @param pos1 - First observation position (Cartesian)
   * @param pos2 - Second observation position (Cartesian)
   * @param deltaTime - Time interval in minutes
   * @returns { KBr: direction, vBr: speed } in degrees and knots
   */
  function calculateRelativeMotion(
    pos1: VectorXY,
    pos2: VectorXY,
    deltaTime: number
  ): { KBr: number; vBr: number } | null {
    if (deltaTime <= 0 || isZero(deltaTime)) {
      return null;
    }
    
    // Relative motion vector
    const relativeVector = vectorSubtract(pos2, pos1);
    const { bearing, distance } = cartesianToPolar(relativeVector);
    
    // Speed = distance / time (convert minutes to hours)
    const speed = (distance / deltaTime) * 60;
    
    return {
      KBr: bearing,      // Direction of Relative Motion
      vBr: speed         // Speed of Relative Motion
    };
  }
  
  /**
   * Calculate true motion from relative motion and own ship motion
   * Port of true motion calculation from radar.c
   * 
   * True motion = Relative motion + Own motion
   * vB = vBr + vA
   * 
   * @param KBr - Direction of relative motion (degrees)
   * @param vBr - Speed of relative motion (knots)
   * @param ownCourse - Own ship course (degrees)
   * @param ownSpeed - Own ship speed (knots)
   * @returns { KB: true course, vB: true speed, aspect: aspect angle }
   */
  function calculateTrueMotion(
    KBr: number,
    vBr: number,
    ownCourse: number,
    ownSpeed: number
  ): { KB: number; vB: number; aspect: number } | null {
    // Convert to Cartesian vectors
    const relativeVec = polarToCartesian(KBr, vBr);
    const ownVec = polarToCartesian(ownCourse, ownSpeed);
    
    // True motion = Relative + Own
    const trueVec = vectorAdd(relativeVec, ownVec);
    const { bearing: KB, distance: vB } = cartesianToPolar(trueVec);
    
    // Calculate aspect angle
    // Aspect is the angle between target's heading and line of sight from target to observer
    // Aspect = target heading - reciprocal bearing
    const reciprocalBearing = normalizeAngle(ownCourse + 180);
    const aspect = normalizeAngle(KB - reciprocalBearing);
    
    return {
      KB,         // True course of target
      vB,         // True speed of target
      aspect      // Aspect angle
    };
  }
  
  // ==========================================================================
  // CPA Calculations (Closest Point of Approach)
  // ==========================================================================
  
  /**
   * Calculate CPA and TCPA from relative motion
   * Port of CPA calculation from radar.c
   * 
   * CPA is the closest distance the target will come to own ship
   * if both vessels maintain course and speed.
   * 
   * @param currentPos - Current target position relative to own ship
   * @param KBr - Direction of relative motion (degrees)
   * @param vBr - Speed of relative motion (knots)
   * @param ownCourse - Own ship course for bearing calculations
   * @returns CPA data or null if no CPA exists
   */
  function calculateCPA(
    currentPos: VectorXY,
    KBr: number,
    vBr: number,
    ownCourse: number,
    currentTime: number
  ): {
    CPA: number;      // Distance at CPA (nm)
    TCPA: number;     // Time to CPA (minutes)
    tCPA: number;     // Clock time at CPA (minutes)
    PCPA: number;     // True bearing at CPA (degrees)
    SPCPA: number;    // Relative bearing at CPA (degrees)
    cpaPoint: VectorXY;  // Position at CPA
  } | null {
    // If no relative motion, no CPA calculation possible
    if (isZero(vBr)) {
      return null;
    }
    
    // Own ship is at origin (0, 0)
    const ownPos: VectorXY = { x: 0, y: 0 };
    
    // Direction of relative motion as unit vector
    const relativeDir = polarToCartesian(KBr, 1.0);
    
    // Project own ship position onto relative motion line
    // to find closest point
    const toOwn = vectorSubtract(ownPos, currentPos);
    const projection = dotProduct(toOwn, relativeDir);
    
    // If projection is negative, CPA is in the past or target is moving away
    if (projection < -EPSILON) {
      return null;
    }
    
    // Calculate CPA point
    const cpaPoint = vectorAdd(
      currentPos,
      vectorScale(relativeDir, projection)
    );
    
    // CPA distance
    const CPA = vectorMagnitude(cpaPoint);
    
    // Time to CPA (distance along relative motion line / relative speed)
    const TCPA = (projection / vBr) * 60; // Convert hours to minutes
    
    // Clock time at CPA
    const tCPA = currentTime + TCPA;
    
    // Bearings at CPA
    const { bearing: PCPA } = cartesianToPolar(cpaPoint);
    const SPCPA = normalizeAngle(PCPA - ownCourse);
    
    return {
      CPA,
      TCPA,
      tCPA,
      PCPA,
      SPCPA,
      cpaPoint
    };
  }
  
  // ==========================================================================
  // Bow Crossing Calculations
  // ==========================================================================
  
  /**
   * Calculate Bow Crossing Range and Time
   * Port of BCR/BCT calculation from radar.c
   * 
   * BCR is the distance at which the target will cross own ship's bow
   * (heading line). Only applies if target will actually cross.
   * 
   * @param currentPos - Current target position
   * @param KBr - Direction of relative motion
   * @param vBr - Speed of relative motion
   * @param ownCourse - Own ship heading
   * @param currentTime - Current time
   * @returns BCR/BCT data or null if no crossing
   */
  function calculateBowCrossing(
    currentPos: VectorXY,
    KBr: number,
    vBr: number,
    ownCourse: number,
    currentTime: number
  ): {
    BCR: number;   // Bow Crossing Range (nm)
    BCT: number;   // Bow Crossing Time (minutes)
    BCt: number;   // Clock time of crossing
    crossPoint: VectorXY;
  } | null {
    if (isZero(vBr)) {
      return null;
    }
    
    // Own ship heading line: from origin along heading direction
    const ownPos: VectorXY = { x: 0, y: 0 };
    const headingDir = polarToCartesian(ownCourse, 100); // Extend far ahead
    
    // Target's relative motion line
    const relativeDir = polarToCartesian(KBr, 100);
    const targetFuture = vectorAdd(currentPos, relativeDir);
    
    // Find intersection of heading line and relative motion line
    const crossPoint = infiniteLinesIntersect(
      ownPos,
      headingDir,
      currentPos,
      targetFuture
    );
    
    if (!crossPoint) {
      return null; // Lines are parallel, no crossing
    }
    
    // Check if crossing is ahead of own ship
    const headingUnitDir = polarToCartesian(ownCourse, 1.0);
    const toCross = vectorSubtract(crossPoint, ownPos);
    const projection = dotProduct(toCross, headingUnitDir);
    
    if (projection < EPSILON) {
      return null; // Crossing is behind us
    }
    
    // Check if crossing is in future for target
    const relativeUnitDir = polarToCartesian(KBr, 1.0);
    const targetToCross = vectorSubtract(crossPoint, currentPos);
    const targetProjection = dotProduct(targetToCross, relativeUnitDir);
    
    if (targetProjection < EPSILON) {
      return null; // Crossing is in target's past
    }
    
    // Calculate BCR (distance from own ship to crossing point)
    const BCR = vectorMagnitude(toCross);
    
    // Calculate BCT (time for target to reach crossing point)
    const distanceToCross = vectorMagnitude(targetToCross);
    const BCT = (distanceToCross / vBr) * 60; // Convert to minutes
    
    // Clock time of crossing
    const BCt = currentTime + BCT;
    
    return {
      BCR,
      BCT,
      BCt,
      crossPoint
    };
  }
  
  // ==========================================================================
  // Maneuver Calculations
  // ==========================================================================
  
  /**
   * Calculate new course to achieve desired CPA
   * Port of maneuver calculation from radar.c
   * 
   * @param targetPos - Target position at maneuver time
   * @param targetCourse - Target true course
   * @param targetSpeed - Target true speed
   * @param ownSpeed - Own ship speed (maintained)
   * @param desiredCPA - Desired closest approach distance
   * @returns { newCourse: degrees, achievable: boolean }
   */
  function calculateCourseForCPA(
    targetPos: VectorXY,
    targetCourse: number,
    targetSpeed: number,
    ownSpeed: number,
    desiredCPA: number
  ): { newCourse: number; achievable: boolean; direction: number } | null {
    // Target motion vector
    const targetVec = polarToCartesian(targetCourse, targetSpeed);
    
    // Distance to target
    const range = vectorMagnitude(targetPos);
    
    // If desired CPA is greater than current range, not achievable
    if (desiredCPA >= range) {
      return null;
    }
    
    // Calculate required relative motion direction
    // This is complex trigonometry - simplified version here
    // Full implementation would port exact C algorithm
    
    const { bearing: targetBearing } = cartesianToPolar(targetPos);
    
    // Calculate angle off from direct approach to achieve CPA
    const sinAngle = desiredCPA / range;
    if (Math.abs(sinAngle) > 1.0) {
      return {
        newCourse: 0,
        achievable: false,
        direction: 0
      };
    }
    
    const angleOff = radToDeg(Math.asin(sinAngle));
    
    // Two possible courses (port or starboard of target)
    const course1 = normalizeAngle(targetBearing + angleOff);
    const course2 = normalizeAngle(targetBearing - angleOff);
    
    // Choose the course that results in valid solution
    // (detailed selection logic from C version would go here)
    
    return {
      newCourse: course1,
      achievable: true,
      direction: 1
    };
  }
  
  /**
   * Calculate new speed to achieve desired CPA
   * 
   * @param targetPos - Target position at maneuver time
   * @param targetCourse - Target true course
   * @param targetSpeed - Target true speed
   * @param ownCourse - Own ship course (maintained)
   * @param desiredCPA - Desired closest approach distance
   * @returns { newSpeed: knots, achievable: boolean }
   */
  function calculateSpeedForCPA(
    targetPos: VectorXY,
    targetCourse: number,
    targetSpeed: number,
    ownCourse: number,
    desiredCPA: number
  ): { newSpeed: number; achievable: boolean } | null {
    // Implementation would port C algorithm for speed calculation
    // This is a simplified placeholder
    
    const range = vectorMagnitude(targetPos);
    if (desiredCPA >= range) {
      return { newSpeed: 0, achievable: false };
    }
    
    // Complex calculation involving relative velocity triangles
    // Full port would implement exact C algorithm
    
    return {
      newSpeed: 10.0, // Placeholder
      achievable: true
    };
  }
  
  /**
   * Calculate resulting CPA from course change
   */
  function calculateCPAFromCourse(
    targetPos: VectorXY,
    targetCourse: number,
    targetSpeed: number,
    newOwnCourse: number,
    ownSpeed: number,
    maneuverTime: number
  ): {
    newKBr: number;
    newVBr: number;
    newCPA: number;
    newTCPA: number;
    newPCPA: number;
    newSPCPA: number;
    delta: number;
  } | null {
    // Calculate new relative motion
    const targetVec = polarToCartesian(targetCourse, targetSpeed);
    const ownVec = polarToCartesian(newOwnCourse, ownSpeed);
    const newRelativeVec = vectorSubtract(targetVec, ownVec);
    
    const { bearing: newKBr, distance: newVBr } = cartesianToPolar(newRelativeVec);
    
    // Calculate new CPA with new relative motion
    const cpaResult = calculateCPA(targetPos, newKBr, newVBr, newOwnCourse, maneuverTime);
    
    if (!cpaResult) {
      return null;
    }
    
    return {
      newKBr,
      newVBr,
      newCPA: cpaResult.CPA,
      newTCPA: cpaResult.TCPA,
      newPCPA: cpaResult.PCPA,
      newSPCPA: cpaResult.SPCPA,
      delta: 0 // Calculate actual delta
    };
  }
  
  // ==========================================================================
  // Complete Target Calculation
  // ==========================================================================
  
  /**
   * Calculate all target parameters from observations
   * Main calculation function that processes a target's complete state
   * 
   * @param target - Target with observation data
   * @param ownCourse - Own ship course
   * @param ownSpeed - Own ship speed
   * @param currentTime - Current time for calculations
   * @returns Updated target with all calculated values
   */
  function calculateTarget(
    target: Target,
    ownCourse: number,
    ownSpeed: number
  ): Partial<Target> {
    const updates: Partial<Target> = {
      rakrp: [0, 0],
      rasp: [0, 0]
    };
    
    // Calculate RaKrP (compass bearing) and RaSP (relative bearing) for each observation
    // Port of logic from radar.c where RaKrP is calculated based on bearing type
    for (let i = 0; i < 2; i++) {
      if (target.bearingType[i] === 'rakrp') {
        // User entered compass bearing directly
        updates.rakrp![i] = normalizeAngle(target.bearing[i]);
        updates.rasp![i] = normalizeAngle(target.bearing[i] - ownCourse);
      } else {
        // User entered relative bearing (RaSP)
        // RaKrP = RaSP + course_at_time_of_observation
        const courseAtObservation = normalizeAngle(target.bearingCourseOffset[i] || ownCourse);
        updates.rakrp![i] = normalizeAngle(target.bearing[i] + courseAtObservation);
        updates.rasp![i] = normalizeAngle(target.bearing[i]);
      }
    }
    
    // Check if we have valid observations
    if (target.distance[0] <= 0 || target.distance[1] <= 0) {
      updates.haveCPA = false;
      updates.haveCrossing = false;
      return updates;
    }
    
    // Calculate time interval
    updates.deltaTime = target.time[1] - target.time[0];
    if (updates.deltaTime <= 0) {
      updates.haveCPA = false;
      return updates;
    }
    
    // Convert observations to Cartesian positions using RaKrP (compass bearings)
    const bearing1 = updates.rakrp![0];
    const bearing2 = updates.rakrp![1];
    
    const pos1 = polarToCartesian(bearing1, target.distance[0]);
    const pos2 = polarToCartesian(bearing2, target.distance[1]);
    
    updates.sight = [pos1, pos2];
    
    // Calculate relative motion
    const relMotion = calculateRelativeMotion(pos1, pos2, updates.deltaTime);
    if (!relMotion) {
      updates.haveCPA = false;
      return updates;
    }
    
    updates.KBr = relMotion.KBr;
    updates.vBr = relMotion.vBr;
    
    // Calculate true motion
    const trueMotion = calculateTrueMotion(
      relMotion.KBr,
      relMotion.vBr,
      ownCourse,
      ownSpeed
    );
    
    if (trueMotion) {
      updates.KB = trueMotion.KB;
      updates.vB = trueMotion.vB;
      updates.aspect = trueMotion.aspect;
    }
    
    // Calculate CPA
    const cpaData = calculateCPA(
      pos2,  // Current position
      relMotion.KBr,
      relMotion.vBr,
      ownCourse,
      target.time[1]
    );
    
    if (cpaData) {
      updates.haveCPA = true;
      updates.CPA = cpaData.CPA;
      updates.TCPA = cpaData.TCPA;
      updates.tCPA = cpaData.tCPA;
      updates.PCPA = cpaData.PCPA;
      updates.SPCPA = cpaData.SPCPA;
      updates.cpa = cpaData.cpaPoint;
    } else {
      updates.haveCPA = false;
    }
    
    // Calculate bow crossing
    const bowCrossing = calculateBowCrossing(
      pos2,
      relMotion.KBr,
      relMotion.vBr,
      ownCourse,
      target.time[1]
    );
    
    if (bowCrossing) {
      updates.haveCrossing = true;
      updates.BCR = bowCrossing.BCR;
      updates.BCT = bowCrossing.BCT;
      updates.BCt = bowCrossing.BCt;
      updates.cross = bowCrossing.crossPoint;
    } else {
      updates.haveCrossing = false;
    }
    
    return updates;
  }
  
  // ==========================================================================
  // Unified Maneuver Calculation
  // ==========================================================================
  
  /**
   * Calculate maneuver result based on input parameters
   * This is the main entry point for maneuver calculations
   */
  function calculateManeuver(params: {
    target: Target;
    ownCourse: number;
    ownSpeed: number;
    maneuverByTime: boolean;
    maneuverTime: number;
    maneuverDistance: number;
    maneuverType: 'course' | 'speed';
    maneuverByCPA: boolean;
    desiredCPA: number;
    newCourse: number;
    newSpeed: number;
  }): {
    newCPA?: number;
    requiredCourse?: number;
    requiredSpeed?: number;
    error?: string;
  } {
    const {
      target, ownCourse, ownSpeed,
      maneuverByTime, maneuverTime, maneuverDistance,
      maneuverType, maneuverByCPA, desiredCPA,
      newCourse, newSpeed
    } = params;
    
    // Check if target has valid data
    if (!target.haveCPA || target.vBr <= 0) {
      return { error: 'Target has no valid CPA data' };
    }
    
    // Get target position at maneuver point
    // For now, use the second observation as the reference
    const targetPos = target.sight[1];
    
    if (!targetPos) {
      return { error: 'Invalid target position' };
    }
    
    // Determine what to calculate based on settings
    if (maneuverByCPA) {
      // Calculate required course or speed to achieve desired CPA
      if (maneuverType === 'course') {
        // Calculate required course for desired CPA
        const result = calculateCourseForCPA(
          targetPos,
          target.KB,
          target.vB,
          ownSpeed,
          desiredCPA
        );
        
        if (!result || !result.achievable) {
          return { error: 'Desired CPA not achievable with course change' };
        }
        
        return {
          requiredCourse: result.newCourse,
          newCPA: desiredCPA
        };
      } else {
        // Calculate required speed for desired CPA
        const result = calculateSpeedForCPA(
          targetPos,
          target.KB,
          target.vB,
          ownCourse,
          desiredCPA
        );
        
        if (!result || !result.achievable) {
          return { error: 'Desired CPA not achievable with speed change' };
        }
        
        return {
          requiredSpeed: result.newSpeed,
          newCPA: desiredCPA
        };
      }
    } else {
      // Calculate resulting CPA from specified course or speed
      const effectiveCourse = maneuverType === 'course' ? newCourse : ownCourse;
      const effectiveSpeed = maneuverType === 'speed' ? newSpeed : ownSpeed;
      
      const result = calculateCPAFromCourse(
        targetPos,
        target.KB,
        target.vB,
        effectiveCourse,
        effectiveSpeed,
        maneuverTime
      );
      
      if (!result) {
        return { error: 'Could not calculate CPA for given parameters' };
      }
      
      if (maneuverType === 'course') {
        return {
          newCPA: result.newCPA,
          requiredCourse: newCourse
        };
      } else {
        return {
          newCPA: result.newCPA,
          requiredSpeed: newSpeed
        };
      }
    }
  }
  
  // ==========================================================================
  // Line-Circle Intersection (port of circle_crossing from radar.c)
  // ==========================================================================
  
  /**
   * Find intersection points of a line (defined by two points) with a circle centered at origin
   * Port of circle_crossing() from radar.c
   * 
   * @param v0 - First point on line
   * @param v1 - Second point on line  
   * @param r - Radius of circle centered at origin
   * @returns Array of intersection points (0, 1, or 2 points)
   */
  function circleLineCrossing(v0: VectorXY, v1: VectorXY, r: number): VectorXY[] {
    const results: VectorXY[] = [];
    
    // Handle vertical line case
    if (Math.abs(v1.x - v0.x) < EPSILON) {
      const discriminant = r * r - v1.x * v1.x;
      if (Math.abs(discriminant) < EPSILON) {
        // Tangent point
        results.push({ x: v1.x, y: 0 });
      } else if (discriminant > 0) {
        // Two intersection points
        const sqrtD = Math.sqrt(discriminant);
        results.push({ x: v1.x, y: sqrtD });
        results.push({ x: v1.x, y: -sqrtD });
      }
      return results;
    }
    
    // General case: use quadratic formula
    const m = (v1.y - v0.y) / (v1.x - v0.x);
    const a = m * m + 1.0;
    const b = 2.0 * m * (v1.y - m * v1.x);
    const c = (m * v1.x - v1.y) * (m * v1.x - v1.y) - r * r;
    
    const p = b / a;
    const q = c / a;
    const discriminant = p * p / 4.0 - q;
    
    if (Math.abs(discriminant) < EPSILON) {
      // One intersection (tangent)
      const x = -p / 2.0;
      const y = m * (x - v1.x) + v1.y;
      results.push({ x, y });
    } else if (discriminant > 0) {
      // Two intersections
      const sqrtD = Math.sqrt(discriminant);
      const x1 = -p / 2.0 + sqrtD;
      const y1 = m * (x1 - v1.x) + v1.y;
      results.push({ x: x1, y: y1 });
      
      const x2 = -p / 2.0 - sqrtD;
      const y2 = m * (x2 - v1.x) + v1.y;
      results.push({ x: x2, y: y2 });
    }
    
    return results;
  }
  
  /**
   * Calculate time to travel from start to end at given relative motion
   * Port of dtime() from radar.c
   */
  function calculateTravelTime(start: VectorXY, end: VectorXY, course: number, speed: number): number {
    if (isZero(speed)) return Infinity;
    
    const delta = vectorSubtract(end, start);
    const dist = vectorMagnitude(delta);
    
    // Check if end is in the direction of travel
    const dir = polarToCartesian(course, 1.0);
    const proj = dotProduct(delta, dir);
    
    // Return positive or negative time based on direction
    const time = (dist / speed) * 60; // Convert to minutes
    return proj >= 0 ? time : -time;
  }
  
  /**
   * Advance a point along the line from current position toward CPA
   * Port of advance() from radar.c
   */
  function advancePosition(current: VectorXY, cpa: VectorXY, fraction: number): VectorXY {
    const delta = vectorSubtract(cpa, current);
    const scaled = vectorScale(delta, fraction);
    return vectorAdd(current, scaled);
  }
  
  /**
   * Find intersection point of two lines
   * Port of lines_crossing() from radar.c
   * 
   * @param v1_0 - First point on line 1
   * @param v1_1 - Second point on line 1
   * @param v2_0 - First point on line 2
   * @param v2_1 - Second point on line 2
   * @returns Intersection point or null if parallel
   */
  function linesCrossing(
    v1_0: VectorXY, v1_1: VectorXY,
    v2_0: VectorXY, v2_1: VectorXY
  ): VectorXY | null {
    // Both lines vertical - parallel
    if (Math.abs(v1_1.x - v1_0.x) < EPSILON && Math.abs(v2_1.x - v2_0.x) < EPSILON) {
      return null;
    }
    
    // Line 1 is vertical
    if (Math.abs(v1_1.x - v1_0.x) < EPSILON) {
      const m2 = (v2_1.y - v2_0.y) / (v2_1.x - v2_0.x);
      const b2 = v2_1.y - m2 * v2_1.x;
      return { x: v1_1.x, y: m2 * v1_1.x + b2 };
    }
    
    // Line 2 is vertical
    if (Math.abs(v2_1.x - v2_0.x) < EPSILON) {
      const m1 = (v1_1.y - v1_0.y) / (v1_1.x - v1_0.x);
      const b1 = v1_1.y - m1 * v1_1.x;
      return { x: v2_1.x, y: m1 * v2_1.x + b1 };
    }
    
    // General case
    const m1 = (v1_1.y - v1_0.y) / (v1_1.x - v1_0.x);
    const b1 = v1_1.y - m1 * v1_1.x;
    
    const m2 = (v2_1.y - v2_0.y) / (v2_1.x - v2_0.x);
    const b2 = v2_1.y - m2 * v2_1.x;
    
    // Parallel lines
    if (Math.abs(m2 - m1) < EPSILON) {
      return null;
    }
    
    const x = (b2 - b1) / (m1 - m2);
    const y = m1 * x + b1;
    
    return { x, y };
  }
  
  /**
   * Check if a point lies on a line segment
   * Port of point_on_line() from radar.c
   * 
   * @param l0 - First endpoint of segment
   * @param l1 - Second endpoint of segment
   * @param p - Point to check
   * @returns true if point is on segment
   */
  function pointOnLine(l0: VectorXY, l1: VectorXY, p: VectorXY): boolean {
    const x0 = Math.min(l0.x, l1.x);
    const x1 = Math.max(l0.x, l1.x);
    const y0 = Math.min(l0.y, l1.y);
    const y1 = Math.max(l0.y, l1.y);
    
    // Add small tolerance for numerical precision
    const tolerance = EPSILON * 10;
    return (x0 - tolerance <= p.x && p.x <= x1 + tolerance &&
            y0 - tolerance <= p.y && p.y <= y1 + tolerance);
  }
  
  /**
   * Calculate speed from distance and time
   * Port of speed() from radar.c
   */
  function calculateSpeed(p0: VectorXY, p1: VectorXY, deltaTime: number): number {
    const dist = vectorMagnitude(vectorSubtract(p1, p0));
    return dist / (deltaTime / 60); // nm per hour (knots)
  }
  
  // ==========================================================================
  // Full Maneuver Calculation with Rendering Data
  // ==========================================================================
  
  /**
   * Calculate full maneuver result including all data needed for rendering vectors
   * Port of radar_calculate_mpoint() and radar_calculate_new_course() from radar.c
   * 
   * Key geometry:
   * - mpoint: Position on relative motion line at distance mdistance from origin
   * - new_cpa: Tangent point on mcpa circle, distance m from mpoint where m = sqrt(mdistance² - mcpa²)
   * - xpoint: End of new own ship vector, found by circle intersection
   */
  function calculateManeuverFull(params: {
    target: Target;
    ownCourse: number;
    ownSpeed: number;
    maneuverByTime: boolean;
    maneuverTime: number;
    maneuverDistance: number;
    maneuverType: 'course' | 'speed';
    maneuverByCPA: boolean;
    desiredCPA: number;
    newCourse: number;
    newSpeed: number;
  }): {
    success: boolean;
    newCPA?: number;
    requiredCourse?: number;
    requiredSpeed?: number;
    error?: string;
    // Rendering data
    mpoint?: VectorXY;      // Maneuver point position
    newCpaPoint?: VectorXY; // New CPA position (tangent point)
    xpoint?: VectorXY;      // End point of new own ship vector
    newKBr?: number;        // New relative motion direction (KBr after maneuver)
    newVBr?: number;        // New relative motion speed (vBr after maneuver)
    // Additional results (matching C code "nach Manöver" output)
    newTCPA?: number;       // Time to new CPA (minutes)
    newPCPA?: number;       // True bearing at new CPA
    newSPCPA?: number;      // Relative bearing at new CPA
    newTCPA_clock?: number; // Clock time at new CPA (minutes since midnight)
    delta?: number;         // Change in relative motion direction
    newRaSP?: number;       // New relative bearing at maneuver point
    newHaveCrossing?: boolean; // Whether bow crossing exists
    newBCR?: number;        // New bow crossing range
    newBCT?: number;        // Time to bow crossing (minutes)
    newBCt?: number;        // Clock time of bow crossing (minutes since midnight)
    timeToManeuver?: number;// Time to reach maneuver point (minutes)
    courseChange?: number;  // Course change in degrees
    maneuverDistance?: number; // Distance to maneuver point (nm)
  } {
    const {
      target, ownCourse, ownSpeed,
      maneuverByTime, maneuverTime, maneuverDistance,
      maneuverType, maneuverByCPA, desiredCPA,
      newCourse, newSpeed
    } = params;
    
    // Check if target has valid data
    if (!target.haveCPA || target.vBr <= 0) {
      return { success: false, error: 'Target has no valid CPA data' };
    }
    
    // Get observation positions
    const pos0 = target.sight[0];
    const pos1 = target.sight[1];
    if (!pos0 || !pos1) {
      return { success: false, error: 'Invalid target positions' };
    }
    
    // ==========================================================================
    // Check if we have valid maneuver parameters (like C code's have_mpoint check)
    // Only proceed if user has entered meaningful maneuver parameters
    // ==========================================================================
    const hasManeuverTimeInput = maneuverByTime && maneuverTime > 0;
    const hasManeuverDistanceInput = !maneuverByTime && maneuverDistance > 0;
    
    if (!hasManeuverTimeInput && !hasManeuverDistanceInput) {
      // No valid maneuver parameters - don't show maneuver visualization
      return { success: false };
    }
    
    // For CPA-based calculations, we also need a valid desired CPA
    if (maneuverByCPA && desiredCPA <= 0) {
      return { success: false };
    }
    
    // For direct course/speed input, check those values
    if (!maneuverByCPA) {
      if (maneuverType === 'course' && newCourse === ownCourse) {
        // No course change requested
        return { success: false };
      }
      if (maneuverType === 'speed' && newSpeed === ownSpeed) {
        // No speed change requested  
        return { success: false };
      }
    }
    
    // Calculate p0_sub_own: apex of original velocity triangle
    // Port of radar.c: p0_sub_own = sight[0] + own_velocity_reversed
    // This is B₀ position plus (own ship reverse course × observation time)
    const ownDistDuringObs = ownSpeed * (target.deltaTime / 60);
    const reverseCourseOrig = normalizeAngle(ownCourse + 180);
    const reverseOwnVec = polarToCartesian(reverseCourseOrig, ownDistDuringObs);
    const p0SubOwn = vectorAdd(pos0, reverseOwnVec);
    
    // Own ship travel distance during observation interval (for circle intersection)
    const l = ownDistDuringObs;
    
    // ==========================================================================
    // Step 1: Calculate maneuver point (mpoint)
    // Port of circle_crossing(sight[0], sight[1], mdistance, ...) from radar.c
    // ==========================================================================
    let mpoint: VectorXY;
    let mdistance: number; // Distance from origin to mpoint
    
    if (maneuverByTime && maneuverTime > 0) {
      // Calculate position at maneuver time using advance along relative motion
      const timeFromObs = maneuverTime - target.time[1];
      if (timeFromObs > 0 && target.TCPA > 0) {
        const fraction = timeFromObs / target.TCPA;
        mpoint = advancePosition(pos1, target.cpa, fraction);
      } else {
        mpoint = { ...pos1 };
      }
      mdistance = vectorMagnitude(mpoint);
    } else if (maneuverDistance > 0) {
      // Find where relative motion LINE crosses circle of radius mdistance
      // The line is the extension of B₀→B₁ (not just the segment)
      const crossings = circleLineCrossing(pos0, pos1, maneuverDistance);
      
      if (crossings.length === 0) {
        return { success: false, error: 'Maneuver distance not achievable - line does not cross circle' };
      }
      
      // Select the crossing point that is in the direction of relative motion (positive time)
      // We want the point that the target will reach in the future
      if (crossings.length === 2) {
        const t0 = calculateTravelTime(pos1, crossings[0], target.KBr, target.vBr);
        const t1 = calculateTravelTime(pos1, crossings[1], target.KBr, target.vBr);
        
        // Choose the one with the smaller positive time (nearest future point)
        if (t0 >= -EPSILON && t1 >= -EPSILON) {
          mpoint = t0 < t1 ? crossings[0] : crossings[1];
        } else if (t0 >= -EPSILON) {
          mpoint = crossings[0];
        } else if (t1 >= -EPSILON) {
          mpoint = crossings[1];
        } else {
          return { success: false, error: 'Maneuver point is in the past' };
        }
      } else {
        mpoint = crossings[0];
      }
      mdistance = maneuverDistance;
    } else {
      // This case should not be reached due to early return above
      return { success: false, error: 'Invalid maneuver parameters' };
    }
    
    console.log('[Maneuver] mpoint:', mpoint, 'mdistance:', mdistance);
    
    // ==========================================================================
    // Step 2: Handle CPA_FROM_COURSE/SPEED mode (user specifies course/speed directly)
    // Port of radar_calculate_new_cpa() from radar.c
    // 
    // When maneuverByCPA is false, user enters course/speed and we calculate resulting CPA
    // ==========================================================================
    
    if (!maneuverByCPA) {
      console.log('[Maneuver] CPA_FROM mode: calculating CPA from user-specified course/speed');
      
      // Use user-provided course/speed
      const userCourse = maneuverType === 'course' ? newCourse : ownCourse;
      const userSpeed = maneuverType === 'speed' ? newSpeed : ownSpeed;
      
      console.log('[Maneuver] User course:', userCourse, 'User speed:', userSpeed);
      
      // Calculate new travel distance during observation interval
      const newL = userSpeed * (target.deltaTime / 60);
      
      // Calculate xpoint = p0_sub_own + new_velocity
      const newOwnVec = polarToCartesian(userCourse, newL);
      const xpoint = vectorAdd(p0SubOwn, newOwnVec);
      
      console.log('[Maneuver] xpoint:', xpoint);
      
      // Calculate new relative motion direction: course from xpoint to sight[1]
      const relVec = vectorSubtract(pos1, xpoint);
      const { bearing: newKBr, distance: relDist } = cartesianToPolar(relVec);
      const newVBr = relDist / (target.deltaTime / 60); // Relative speed
      
      console.log('[Maneuver] New KBr:', newKBr, 'New vBr:', newVBr);
      
      // Calculate CPA as perpendicular distance from origin to new relative motion line
      // Line passes through mpoint with direction newKBr
      // CPA = perpendicular distance from origin to this line
      
      // Use the formula: distance from point to line
      // Line through mpoint with direction newKBr
      const newKBrRad = degToRad(newKBr);
      const dirX = Math.sin(newKBrRad);
      const dirY = Math.cos(newKBrRad);
      
      // Perpendicular distance from origin to line through mpoint with direction (dirX, dirY)
      // d = |mpoint × dir| / |dir| where × is cross product
      // For 2D: cross product = mpoint.x * dirY - mpoint.y * dirX
      const crossProduct = Math.abs(mpoint.x * dirY - mpoint.y * dirX);
      const calculatedCPA = crossProduct; // |dir| = 1 since it's a unit direction
      
      // New CPA point is the perpendicular projection of origin onto the line
      // newCpa = mpoint + t * dir where t = -dot(mpoint, dir) / |dir|²
      const dotProduct = mpoint.x * dirX + mpoint.y * dirY;
      const t = -dotProduct; // |dir|² = 1
      const newCpaPoint: VectorXY = {
        x: mpoint.x + t * dirX,
        y: mpoint.y + t * dirY
      };
      
      console.log('[Maneuver] Calculated CPA:', calculatedCPA, 'CPA point:', newCpaPoint);
      
      // Calculate after-maneuver values
      const newPCPA = cartesianToPolar(newCpaPoint).bearing;
      const newSPCPA = normalizeAngle(newPCPA - userCourse);
      const newTCPA = newVBr > 0 ? (vectorMagnitude(vectorSubtract(mpoint, newCpaPoint)) / newVBr) * 60 : 0;
      const newTCPA_clock = target.time[1] + Math.round(newTCPA);
      
      // Bow crossing calculations
      const newHaveCrossing = Math.abs(calculatedCPA) < mdistance && newVBr > 0;
      let newBCR = 0;
      let newBCT = 0;
      let newBCt = 0;
      if (newHaveCrossing) {
        // Simplified BCR calculation
        newBCR = calculatedCPA > 0 ? calculatedCPA : -calculatedCPA;
        newBCT = newTCPA;
        newBCt = newTCPA_clock;
      }
      
      // Delta (change amount)
      const delta = maneuverType === 'course' 
        ? normalizeAngleSigned(userCourse - ownCourse)
        : userSpeed - ownSpeed;
      
      // New RaSP
      const newRaSP = normalizeAngle(cartesianToPolar(mpoint).bearing - userCourse);
      
      return {
        success: true,
        newCPA: calculatedCPA,
        requiredCourse: maneuverType === 'course' ? userCourse : undefined,
        requiredSpeed: maneuverType === 'speed' ? userSpeed : undefined,
        newKBr,
        newVBr,
        delta,
        newRaSP,
        newTCPA,
        newPCPA,
        newSPCPA,
        newTCPA_clock,
        newHaveCrossing,
        newBCR,
        newBCT,
        newBCt,
        timeToManeuver: 0, // Not applicable in this mode
        courseChange: maneuverType === 'course' ? delta : undefined,
        maneuverDistance: mdistance
      };
    }
    
    // ==========================================================================
    // Step 2b: Calculate tangent to desired CPA circle (CPA-based mode)
    // Port of radar_calculate_new_course() from radar.c
    // 
    // Formula:
    // - alpha = asin(mcpa / mdistance) - angle offset for tangent
    // - m = sqrt(mdistance² - mcpa²) - distance from mpoint to tangent point
    // - KBr = bearing(mpoint→origin) ± alpha - direction to tangent point
    // - new_cpa = mpoint + m × direction(KBr)
    // ==========================================================================
    
    if (desiredCPA >= mdistance - EPSILON) {
      return { success: false, error: 'Desired CPA must be less than maneuver distance' };
    }
    
    // Calculate tangent angle: alpha = asin(mcpa / mdistance) in degrees
    const alpha = radToDeg(Math.asin(desiredCPA / mdistance));
    
    // Bearing from mpoint to origin (center of radar)
    // In C code: course(radar, &s->mpoint, &vector_xy_null)
    const negMpoint = vectorScale(mpoint, -1); // Vector from mpoint to origin
    const { bearing: mpointToOrigin } = cartesianToPolar(negMpoint);
    
    // Two possible tangent directions: bearing ± alpha
    const KBr0 = normalizeAngle(mpointToOrigin + alpha);
    const KBr1 = normalizeAngle(mpointToOrigin - alpha);
    
    // Distance from mpoint to tangent point: m = sqrt(mdistance² - mcpa²)
    const m = Math.sqrt(mdistance * mdistance - desiredCPA * desiredCPA);
    
    // Calculate both tangent points
    const newCpaPoint0 = vectorAdd(mpoint, polarToCartesian(KBr0, m));
    const newCpaPoint1 = vectorAdd(mpoint, polarToCartesian(KBr1, m));
    
    console.log('[Maneuver] alpha:', alpha, 'm:', m);
    console.log('[Maneuver] mpointToOrigin:', mpointToOrigin);
    console.log('[Maneuver] KBr0:', KBr0, 'KBr1:', KBr1);
    console.log('[Maneuver] newCpaPoint0:', newCpaPoint0, 'dist from origin:', vectorMagnitude(newCpaPoint0));
    console.log('[Maneuver] newCpaPoint1:', newCpaPoint1, 'dist from origin:', vectorMagnitude(newCpaPoint1));
    
    // ==========================================================================
    // Step 3: Find xpoint - DIFFERENT for course vs speed change!
    // 
    // COURSE CHANGE (radar_calculate_new_course):
    //   Speed is fixed, course changes. xpoint is on a circle of radius l.
    //   Uses circle-line intersection.
    // 
    // SPEED CHANGE (radar_calculate_new_speed):
    //   Course is fixed, speed changes. xpoint is on line from p0_sub_own to sight[0].
    //   Uses line-line intersection.
    // ==========================================================================
    
    // Determine preferred turning direction (PORT or STARBOARD)
    // Port of C code: bearing from origin to mpoint, relative to own course
    const mpointBearing = cartesianToPolar(mpoint).bearing;
    const bearingRelativeToOwnCourse = normalizeAngle(mpointBearing - ownCourse);
    
    // C code: if (90 <= bearing < 180) direction = PORT (-1), else STARBOARD (+1)
    const direction = (bearingRelativeToOwnCourse >= 90 && bearingRelativeToOwnCourse < 180) ? -1 : 1;
    const directionName = direction === 1 ? 'STARBOARD' : 'PORT';
    
    console.log('[Maneuver] Mpoint bearing:', mpointBearing.toFixed(1), 
                'relative to course:', bearingRelativeToOwnCourse.toFixed(1),
                'direction:', directionName);
    console.log('[Maneuver] Maneuver type:', maneuverType);
    
    // Interface for possible solutions
    interface ManeuverSolution {
      kbr: number;
      newCpa: VectorXY;
      xpoint: VectorXY;
      candidateCourse: number;
      candidateSpeed: number;
      deviation: number;  // Course or speed change metric
      solutionValid: boolean;
    }
    
    const possibleSolutions: ManeuverSolution[] = [];
    
    if (maneuverType === 'speed') {
      // ==========================================================================
      // SPEED CHANGE: Port of radar_calculate_new_speed() from radar.c
      // 
      // Find where line (sight[1] → v0) crosses line (p0_sub_own → sight[0])
      // The crossing point gives xpoint, and speed = distance(p0_sub_own, xpoint) / deltaTime
      // ==========================================================================
      console.log('[Maneuver] Using SPEED CHANGE algorithm (line-line intersection)');
      
      console.log('[Maneuver] SPEED CHANGE - Input data:');
      console.log('  p0SubOwn:', p0SubOwn);
      console.log('  pos0 (sight[0]):', pos0);
      console.log('  pos1 (sight[1]):', pos1);
      console.log('  m (tangent distance):', m);
      
      for (const [testKBr, testNewCpa] of [[KBr0, newCpaPoint0], [KBr1, newCpaPoint1]] as [number, VectorXY][]) {
        // Tangent offset: m × direction(KBr)
        const tangentOffset = polarToCartesian(testKBr, m);
        
        // v0 = sight[1] - tangent_offset
        // This is the adjusted position for the new relative motion line
        const v0 = vectorSubtract(pos1, tangentOffset);
        
        console.log('[Maneuver] Testing KBr:', testKBr.toFixed(1));
        console.log('  tangentOffset:', tangentOffset);
        console.log('  v0:', v0);
        console.log('  Line 1: p0SubOwn -> pos0');
        console.log('  Line 2: pos1 -> v0');
        
        // Find intersection of:
        // Line 1: p0_sub_own → sight[0] (the velocity triangle base - all possible own speeds)
        // Line 2: sight[1] → v0 (the adjusted relative motion line)
        const crossing = linesCrossing(p0SubOwn, pos0, pos1, v0);
        
        console.log('  crossing result:', crossing);
        
        if (crossing) {
          // Check if crossing is on the line segment (valid speed range)
          const onSegment = pointOnLine(p0SubOwn, pos0, crossing);
          
          // Calculate resulting speed
          const candidateSpeed = calculateSpeed(p0SubOwn, crossing, target.deltaTime);
          
          // For speed change, deviation is how much we need to slow down (prefer higher speeds)
          // C code selects s0 > s1 (prefers higher speed)
          const deviation = ownSpeed - candidateSpeed; // Positive means slowing down
          
          // Valid solution: speed >= 0 and point is on the segment
          const solutionValid = candidateSpeed >= 0 && onSegment;
          
          possibleSolutions.push({
            kbr: testKBr,
            newCpa: testNewCpa,
            xpoint: crossing,
            candidateCourse: ownCourse, // Course stays the same for speed change
            candidateSpeed,
            deviation,
            solutionValid
          });
          
          console.log('[Maneuver]   Speed:', candidateSpeed.toFixed(1), 
                      'kn, onSegment:', onSegment,
                      'valid:', solutionValid);
        }
      }
      
      // Note: solution selection happens after this block
      
    } else {
      // ==========================================================================
      // COURSE CHANGE: Port of radar_calculate_new_course() from radar.c
      // 
      // Find where line crosses circle of radius l (own ship travel distance)
      // ==========================================================================
      console.log('[Maneuver] Using COURSE CHANGE algorithm (circle-line intersection)');
      
      for (const [testKBr, testNewCpa] of [[KBr0, newCpaPoint0], [KBr1, newCpaPoint1]] as [number, VectorXY][]) {
        // v0 = sight[1] - p0_sub_own (relative to p0_sub_own, this is the true motion vector)
        const v0 = vectorSubtract(pos1, p0SubOwn);
        
        // Tangent offset: m × direction(KBr)
        const tangentOffset = polarToCartesian(testKBr, m);
        
        // v1 = sight[1] - tangent_offset - p0_sub_own
        const v1 = vectorSubtract(vectorSubtract(pos1, tangentOffset), p0SubOwn);
        
        // Find where line v0→v1 crosses circle of radius l centered at origin
        const crossings = circleLineCrossing(v0, v1, l);
        
        console.log('[Maneuver] Testing KBr:', testKBr.toFixed(1), 'crossings:', crossings.length);
        
        if (crossings.length > 0) {
          for (const crossing of crossings) {
            // Convert back to absolute coordinates
            const candidateXpoint = vectorAdd(crossing, p0SubOwn);
            
            // Calculate the resulting new course
            const newOwnVec = vectorSubtract(candidateXpoint, p0SubOwn);
            const { bearing: candidateCourse } = cartesianToPolar(newOwnVec);
            
            // Deviation calculation for course change
            const deviation = normalizeAngle(direction * (candidateCourse - ownCourse));
            const solutionValid = deviation <= 180;
            
            possibleSolutions.push({
              kbr: testKBr,
              newCpa: testNewCpa,
              xpoint: candidateXpoint,
              candidateCourse,
              candidateSpeed: ownSpeed,
              deviation,
              solutionValid
            });
            
            console.log('[Maneuver]   Crossing course:', candidateCourse.toFixed(1), 
                        'deviation:', deviation.toFixed(1), 
                        'valid:', solutionValid);
          }
        }
      }
    }
    
    console.log('[Maneuver] Possible solutions after filtering:', possibleSolutions.length);
    
    // Select the best solution
    let selectedSolution: ManeuverSolution | undefined;
    
    const validSolutions = possibleSolutions.filter(s => s.solutionValid);
    console.log('[Maneuver] Valid solutions:', validSolutions.length, 'of', possibleSolutions.length, 'total');
    
    if (validSolutions.length > 0) {
      // Sort by deviation (smallest first)
      // For course change: smaller deviation = less turning
      // For speed change: smaller deviation (ownSpeed - candidateSpeed) = higher speed
      validSolutions.sort((a, b) => a.deviation - b.deviation);
      selectedSolution = validSolutions[0];
      console.log('[Maneuver] Selected valid solution with deviation:', selectedSolution.deviation.toFixed(2));
    } else if (possibleSolutions.length > 0) {
      // Fallback to any solution (even if not on segment)
      // Sort to get best candidate
      possibleSolutions.sort((a, b) => a.deviation - b.deviation);
      selectedSolution = possibleSolutions[0];
      console.log('[Maneuver] WARNING: Using invalid solution with deviation:', selectedSolution.deviation.toFixed(2));
    }
    
    // If still no solution, create a fallback
    if (!selectedSolution) {
      console.log('[Maneuver] Using fallback xpoint calculation');
      
      if (maneuverType === 'speed') {
        // Fallback for speed: stop (speed = 0)
        selectedSolution = {
          kbr: KBr0,
          newCpa: newCpaPoint0,
          xpoint: { ...p0SubOwn },
          candidateCourse: ownCourse,
          candidateSpeed: 0,
          deviation: ownSpeed,
          solutionValid: true
        };
      } else {
        // Fallback for course: extend toward mpoint
        const toMpoint = vectorSubtract(mpoint, p0SubOwn);
        const { bearing: toMpointBearing } = cartesianToPolar(toMpoint);
        const xpoint = vectorAdd(p0SubOwn, polarToCartesian(toMpointBearing, l));
        const fallbackDeviation = normalizeAngle(direction * (toMpointBearing - ownCourse));
        
        selectedSolution = {
          kbr: KBr0,
          newCpa: newCpaPoint0,
          xpoint: xpoint,
          candidateCourse: toMpointBearing,
          candidateSpeed: ownSpeed,
          deviation: fallbackDeviation,
          solutionValid: true
        };
      }
    }
    
    const { kbr: selectedKBr, newCpa: selectedNewCpa, xpoint, candidateCourse: requiredCourse, candidateSpeed: requiredSpeed } = selectedSolution;
    
    console.log('[Maneuver] Selected solution - KBr:', selectedKBr.toFixed(1), 
                'course:', requiredCourse.toFixed(1), 
                'speed:', requiredSpeed.toFixed(1));
    
    // ==========================================================================
    // Calculate new relative motion correctly using velocity triangle
    // This is the CORRECT way: new relative = target true motion - new own motion
    // ==========================================================================
    
    // Target's true motion vector (stays unchanged)
    const targetTrueVec = polarToCartesian(target.KB, target.vB);
    
    // New own ship motion vector (after maneuver)
    const newOwnMotionVec = polarToCartesian(requiredCourse, requiredSpeed);
    
    // New relative motion = target true motion - new own motion
    const newRelativeVec = vectorSubtract(targetTrueVec, newOwnMotionVec);
    const { bearing: newKBr, distance: newVBr } = cartesianToPolar(newRelativeVec);
    
    console.log('[Maneuver] New relative motion - KBr:', newKBr, 'vBr:', newVBr);
    console.log('[Maneuver] Target true motion - KB:', target.KB, 'vB:', target.vB);
    console.log('[Maneuver] New own motion - course:', requiredCourse, 'speed:', requiredSpeed);
    
    // ==========================================================================
    // Calculate additional results: TCPA, delta, timeToManeuver, BCR, BCT
    // Port of C code calculations for "nach Manöver" section
    // ==========================================================================
    
    // Delta: change in relative motion direction
    const delta = normalizeAngleSigned(newKBr - target.KBr);
    
    // Time to reach maneuver point from current position (along old relative motion)
    let timeToManeuver = 0;
    if (target.vBr > 0) {
      const currentToMpoint = vectorSubtract(mpoint, pos1);
      const { distance: distToMpoint } = cartesianToPolar(currentToMpoint);
      timeToManeuver = (distToMpoint / target.vBr) * 60; // Minutes
    }
    
    // Maneuver time (clock time)
    const maneuverClockTime = target.time[1] + timeToManeuver;
    
    // Calculate CPA from maneuver point with new relative motion
    const cpaFromMpoint = calculateCPA(
      mpoint,
      newKBr,
      newVBr,
      requiredCourse,
      maneuverClockTime
    );
    
    // Time from mpoint to new CPA
    let newTCPA = 0;
    let newPCPA = 0;
    let newSPCPA = 0;
    let newTCPA_clock = 0;
    
    if (cpaFromMpoint) {
      newTCPA = cpaFromMpoint.TCPA;
      newPCPA = cpaFromMpoint.PCPA;
      newSPCPA = cpaFromMpoint.SPCPA;
      newTCPA_clock = cpaFromMpoint.tCPA;
    }
    
    // Calculate new bow crossing from mpoint with new relative motion
    const newBowCrossing = calculateBowCrossing(
      mpoint,
      newKBr,
      newVBr,
      requiredCourse,
      maneuverClockTime
    );
    
    let newBCR = 0;
    let newBCT = 0;
    let newBCt = 0;
    let newHaveCrossing = false;
    
    if (newBowCrossing) {
      newHaveCrossing = true;
      newBCR = newBowCrossing.BCR;
      newBCT = newBowCrossing.BCT;
      newBCt = newBowCrossing.BCt;
    }
    
    // New relative bearing (RaSP) at maneuver point
    const mpointBearingForRaSP = cartesianToPolar(mpoint).bearing;
    const newRaSP = normalizeAngle(mpointBearingForRaSP - requiredCourse);
    
    // Course/speed change amount
    const courseChange = normalizeAngleSigned(requiredCourse - ownCourse);
    
    console.log('[Maneuver] After maneuver values:');
    console.log('  newKBr:', newKBr.toFixed(1), 'newVBr:', newVBr.toFixed(1));
    console.log('  delta:', delta.toFixed(1), 'newRaSP:', newRaSP.toFixed(1));
    console.log('  newTCPA:', newTCPA.toFixed(1), 'newPCPA:', newPCPA.toFixed(1), 'newSPCPA:', newSPCPA.toFixed(1));
    console.log('  newBCR:', newBCR.toFixed(1), 'newBCT:', newBCT.toFixed(1));
    
    return {
      success: true,
      newCPA: desiredCPA,
      requiredCourse: maneuverType === 'course' ? requiredCourse : undefined,
      requiredSpeed: maneuverType === 'speed' ? requiredSpeed : undefined,
      mpoint,
      newCpaPoint: selectedNewCpa,
      xpoint,
      newKBr,
      newVBr,
      // Additional results (matching C code "nach Manöver" output)
      newTCPA,
      newPCPA,
      newSPCPA,
      newTCPA_clock,
      delta,
      newRaSP,
      newHaveCrossing,
      newBCR,
      newBCT,
      newBCt,
      timeToManeuver,
      courseChange,
      maneuverDistance: mdistance
    };
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  return {
    calculateRelativeMotion,
    calculateTrueMotion,
    calculateCPA,
    calculateBowCrossing,
    calculateCourseForCPA,
    calculateSpeedForCPA,
    calculateCPAFromCourse,
    calculateTarget,
    calculateManeuver,
    calculateManeuverFull
  };
}
