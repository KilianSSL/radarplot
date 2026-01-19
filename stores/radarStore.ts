/**
 * Main radar state store
 * Manages global radar configuration and coordinates calculations
 */

import { defineStore } from 'pinia';
import { watch } from 'vue';
import type { RadarState, Target, ManeuverType } from '~/utils/radarTypes';
import {
  RADAR_NR_TARGETS,
  RADAR_RANGES,
  DEFAULT_RANGE_INDEX,
  DEFAULTS,
  TARGET_LETTERS
} from '~/utils/radarConstants';
import { useRadarCalculations } from '~/composables/radar/useRadarCalculations';

// localStorage key for persisting state
const STORAGE_KEY = 'radarplot-state';

/**
 * Create empty target with default values
 */
function createEmptyTarget(index: number): Target {
  return {
    index,
    time: [0, 0],
    bearingType: ['rakrp', 'rakrp'],
    bearing: [0, 0],
    bearingCourseOffset: [0, 0],
    distance: [0, 0],
    
    // Calculated compass bearings
    rakrp: [0, 0],
    rasp: [0, 0],
    
    deltaTime: 0,
    
    KBr: 0,
    vBr: 0,
    KB: 0,
    vB: 0,
    aspect: 0,
    
    haveCPA: false,
    CPA: 0,
    PCPA: 0,
    SPCPA: 0,
    TCPA: 0,
    tCPA: 0,
    
    haveCrossing: false,
    BCR: 0,
    BCT: 0,
    BCt: 0,
    
    mtimeRange: 0,
    haveMpoint: false,
    mdistance: 0,
    mbearing: 0,
    
    haveNewCPA: false,
    haveProblems: false,
    newKBr: 0,
    newVBr: 0,
    delta: 0,
    newRaSP: 0,
    newAspect: 0,
    newCPA: 0,
    newPCPA: 0,
    newSPCPA: 0,
    newTCPA: 0,
    newTCPA_clock: 0,
    newHaveCrossing: false,
    newBCR: 0,
    newBCT: 0,
    newBCt: 0,
    
    sight: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    p0SubOwn: { x: 0, y: 0 },
    cpa: { x: 0, y: 0 },
    cross: { x: 0, y: 0 },
    mpoint: { x: 0, y: 0 },
    newCpa: { x: 0, y: 0 },
    xpoint: { x: 0, y: 0 },
    newCross: { x: 0, y: 0 },
    
    vectors: [],
    arcs: [],
    polys: [],
    labels: []
  };
}

/**
 * Maneuver calculation result
 * Matches the C code's "nach Manöver" (after maneuver) output section
 */
interface ManeuverResult {
  newCPA?: number;
  requiredCourse?: number;
  requiredSpeed?: number;
  error?: string;
  // New relative motion (after maneuver)
  newKBr?: number;         // New relative motion direction (°)
  newVBr?: number;         // New relative motion speed (kn)
  delta?: number;          // Change in relative motion direction (°)
  newRaSP?: number;        // New relative bearing at maneuver point (°)
  // New CPA data
  newTCPA?: number;        // Time to new CPA (minutes)
  newPCPA?: number;        // True bearing at new CPA (°)
  newSPCPA?: number;       // Relative bearing at new CPA (°)
  newTCPA_clock?: number;  // Clock time at new CPA (HHMM format)
  // New bow crossing data
  newHaveCrossing?: boolean;
  newBCR?: number;         // New bow crossing range (nm, negative = behind)
  newBCT?: number;         // Time to bow crossing (minutes)
  newBCt?: number;         // Clock time of bow crossing (HHMM format)
  // Maneuver point info
  timeToManeuver?: number; // Time to reach maneuver point (minutes)
  courseChange?: number;   // Course change in degrees
  maneuverDistance?: number; // Distance to maneuver point (nm)
}

/**
 * Create initial radar state
 */
function createInitialState(): RadarState & {
  // Global maneuver state (applies to selected target)
  maneuverTargetIndex: number;
  maneuverByTime: boolean;
  maneuverTime: number;
  maneuverDistance: number;
  maneuverType: 'course' | 'speed';
  maneuverByCPA: boolean;
  desiredCPA: number;
  newCourse: number;
  newSpeed: number;
  maneuverResult: ManeuverResult;
} {
  return {
    // Display settings
    northUp: DEFAULTS.NORTH_UP,
    showHeading: DEFAULTS.SHOW_HEADING,
    
    // Range settings
    rangeIndex: DEFAULT_RANGE_INDEX,
    range: RADAR_RANGES[DEFAULT_RANGE_INDEX].range,
    
    // Own ship
    ownCourse: DEFAULTS.OWN_COURSE,
    ownSpeed: DEFAULTS.OWN_SPEED,
    
    // Targets
    targets: [
      createEmptyTarget(0),
      createEmptyTarget(1),
      createEmptyTarget(2),
      createEmptyTarget(3),
      createEmptyTarget(4)
    ] as [Target, Target, Target, Target, Target],
    
    // Maneuver planning (legacy)
    selectedTarget: 0,
    legacyManeuverType: 0,
    mtimeSelected: true,
    mtimeSet: false,
    mdistSet: false,
    mtime: 0,
    mdistance: 0,
    exactMtime: 0,
    mcourseChange: true,
    mcpaSelected: true,
    mcpa: 0,
    direction: 0,
    ncourse: 0,
    nspeed: 0,
    
    // Global maneuver state
    maneuverTargetIndex: 0,
    maneuverByTime: false,
    maneuverTime: 0,
    maneuverDistance: 0,
    maneuverType: 'course' as 'course' | 'speed',
    maneuverByCPA: true,
    desiredCPA: 0,
    newCourse: 0,
    newSpeed: 0,
    maneuverResult: {},
    
    // Canvas dimensions
    canvasWidth: DEFAULTS.CANVAS_SIZE.width,
    canvasHeight: DEFAULTS.CANVAS_SIZE.height,
    centerX: DEFAULTS.CANVAS_SIZE.width / 2,
    centerY: DEFAULTS.CANVAS_SIZE.height / 2,
    radiusPixels: 300,
    step: 50,
    
    // Rendering state
    doRender: true,
    waitExpose: false,
    redrawPending: false,
    changeLevel: 0,
    
    vectors: [],
    
    // File management
    currentFilename: undefined,
    modified: false
  };
}

/**
 * Extract only the input values that should be persisted
 */
interface PersistedState {
  northUp: boolean;
  showHeading: boolean;
  rangeIndex: number;
  ownCourse: number;
  ownSpeed: number;
  targets: Array<{
    time: [number, number];
    bearingType: ['rasp' | 'rakrp', 'rasp' | 'rakrp'];
    bearing: [number, number];
    bearingCourseOffset: [number, number];
    distance: [number, number];
  }>;
  maneuverTargetIndex: number;
  maneuverByTime: boolean;
  maneuverTime: number;
  maneuverDistance: number;
  maneuverType: 'course' | 'speed';
  maneuverByCPA: boolean;
  desiredCPA: number;
  newCourse: number;
  newSpeed: number;
}

function extractPersistableState(state: RadarState): PersistedState {
  return {
    northUp: state.northUp,
    showHeading: state.showHeading,
    rangeIndex: state.rangeIndex,
    ownCourse: state.ownCourse,
    ownSpeed: state.ownSpeed,
    targets: state.targets.map(t => ({
      time: t.time,
      bearingType: t.bearingType,
      bearing: t.bearing,
      bearingCourseOffset: t.bearingCourseOffset,
      distance: t.distance
    })),
    maneuverTargetIndex: state.maneuverTargetIndex,
    maneuverByTime: state.maneuverByTime,
    maneuverTime: state.maneuverTime,
    maneuverDistance: state.maneuverDistance,
    maneuverType: state.maneuverType,
    maneuverByCPA: state.maneuverByCPA,
    desiredCPA: state.desiredCPA,
    newCourse: state.newCourse,
    newSpeed: state.newSpeed
  };
}

function saveToLocalStorage(state: RadarState) {
  if (typeof window === 'undefined') return;
  try {
    const persistedState = extractPersistableState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

function loadFromLocalStorage(): Partial<PersistedState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }
  return null;
}

export const useRadarStore = defineStore('radar', {
  state: (): RadarState => createInitialState(),
  
  getters: {
    /**
     * Get current range configuration
     */
    currentRange: (state) => {
      if (state.rangeIndex >= 0 && state.rangeIndex < RADAR_RANGES.length) {
        return RADAR_RANGES[state.rangeIndex];
      }
      return RADAR_RANGES[DEFAULT_RANGE_INDEX];
    },
    
    /**
     * Get currently selected target
     */
    currentTarget: (state) => state.targets[state.selectedTarget],
    
    /**
     * Get target by index
     */
    getTarget: (state) => (index: number) => {
      if (index >= 0 && index < RADAR_NR_TARGETS) {
        return state.targets[index];
      }
      return null;
    },
    
    /**
     * Get target letter (B-F)
     */
    getTargetLetter: () => (index: number) => TARGET_LETTERS[index],
    
    /**
     * Check if target has valid observations
     */
    targetHasData: (state) => (index: number) => {
      const target = state.targets[index];
      return target && target.distance[0] > 0 && target.distance[1] > 0;
    },
    
    /**
     * Count targets with data
     */
    activeTargetCount: (state) => {
      return state.targets.filter(t => t.distance[0] > 0 && t.distance[1] > 0).length;
    },
    
    /**
     * Get pixels per nautical mile for current range
     */
    pixelsPerNM: (state) => {
      return state.radiusPixels / state.range;
    },
    
    /**
     * Check if any data has been modified
     */
    hasUnsavedChanges: (state) => state.modified
  },
  
  actions: {
    /**
     * Reset to new plot
     */
    resetPlot() {
      const newState = createInitialState();
      Object.assign(this, newState);
    },
    
    /**
     * Set orientation (North Up / Course Up)
     */
    setOrientation(northUp: boolean) {
      this.northUp = northUp;
      this.modified = true;
    },
    
    /**
     * Set range by index
     */
    setRangeIndex(index: number) {
      if (index >= 0 && index < RADAR_RANGES.length) {
        this.rangeIndex = index;
        this.range = RADAR_RANGES[index].range;
        this.modified = true;
      }
    },
    
    /**
     * Toggle heading display
     */
    toggleHeading() {
      this.showHeading = !this.showHeading;
    },
    
    /**
     * Set own ship course
     */
    setOwnCourse(course: number) {
      this.ownCourse = course;
      this.modified = true;
      this.recalculateAllTargets();
    },
    
    /**
     * Set own ship speed
     */
    setOwnSpeed(speed: number) {
      this.ownSpeed = speed;
      this.modified = true;
      this.recalculateAllTargets();
    },
    
    /**
     * Update target observation data
     */
    updateTargetObservation(
      targetIndex: number,
      observationIndex: 0 | 1,
      data: Partial<{
        time: number;
        bearing: number;
        bearingType: 'rasp' | 'rakrp';
        bearingCourseOffset: number;
        distance: number;
      }>
    ) {
      const target = this.targets[targetIndex];
      if (!target) return;
      
      if (data.time !== undefined) {
        target.time[observationIndex] = data.time;
      }
      if (data.bearing !== undefined) {
        target.bearing[observationIndex] = data.bearing;
      }
      if (data.bearingType !== undefined) {
        target.bearingType[observationIndex] = data.bearingType;
      }
      if (data.bearingCourseOffset !== undefined) {
        target.bearingCourseOffset[observationIndex] = data.bearingCourseOffset;
      }
      if (data.distance !== undefined) {
        target.distance[observationIndex] = data.distance;
      }
      
      this.modified = true;
      this.recalculateTarget(targetIndex);
    },
    
    /**
     * Set selected target for maneuver planning
     */
    selectTarget(index: number) {
      if (index >= 0 && index < RADAR_NR_TARGETS) {
        this.selectedTarget = index;
      }
    },
    
    /**
     * Set maneuver target index
     */
    setManeuverTarget(index: number) {
      if (index >= 0 && index < RADAR_NR_TARGETS) {
        this.maneuverTargetIndex = index;
        this.calculateManeuver();
      }
    },
    
    /**
     * Set maneuver by time flag
     */
    setManeuverByTime(byTime: boolean) {
      this.maneuverByTime = byTime;
      this.calculateManeuver();
    },
    
    /**
     * Set maneuver type (course or speed change)
     */
    setManeuverType(type: 'course' | 'speed') {
      this.maneuverType = type;
      this.calculateManeuver();
    },
    
    /**
     * Set maneuver time
     */
    setManeuverTime(time: number) {
      this.maneuverTime = time;
      this.calculateManeuver();
    },
    
    /**
     * Set maneuver distance
     */
    setManeuverDistance(distance: number) {
      this.maneuverDistance = distance;
      this.calculateManeuver();
    },
    
    /**
     * Set maneuver by CPA flag
     */
    setManeuverByCPA(byCPA: boolean) {
      this.maneuverByCPA = byCPA;
      this.calculateManeuver();
    },
    
    /**
     * Set desired CPA for maneuver
     */
    setDesiredCPA(cpa: number) {
      this.desiredCPA = cpa;
      this.calculateManeuver();
    },
    
    /**
     * Set new course for maneuver
     */
    setNewCourse(course: number) {
      this.newCourse = course;
      this.calculateManeuver();
    },
    
    /**
     * Set new speed for maneuver
     */
    setNewSpeed(speed: number) {
      this.newSpeed = speed;
      this.calculateManeuver();
    },
    
    /**
     * Update canvas dimensions
     */
    setCanvasSize(width: number, height: number) {
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.centerX = width / 2;
      this.centerY = height / 2;
      
      // Recalculate radius and step based on new size
      const minDim = Math.min(width, height);
      this.radiusPixels = (minDim / 2) * 0.85; // 85% of half dimension
      this.step = this.radiusPixels / 6; // 6 range rings
    },
    
    /**
     * Recalculate specific target
     */
    recalculateTarget(index: number) {
      const target = this.targets[index];
      if (!target) return;
      
      // Import calculation composable
      const { calculateTarget } = useRadarCalculations();
      
      // Calculate all target parameters
      const updates = calculateTarget(target, this.ownCourse, this.ownSpeed);
      
      // Apply updates
      Object.assign(target, updates);
      
      // If this is the maneuver target, recalculate maneuver
      if (index === this.maneuverTargetIndex) {
        this.calculateManeuver();
      }
    },
    
    /**
     * Recalculate all targets
     */
    recalculateAllTargets() {
      for (let i = 0; i < RADAR_NR_TARGETS; i++) {
        this.recalculateTarget(i);
      }
    },
    
    /**
     * Recalculate maneuver (legacy)
     */
    recalculateManeuver() {
      this.calculateManeuver();
    },
    
    /**
     * Calculate maneuver result for the selected target using global maneuver settings
     * Also calculates new CPA for ALL secondary targets (like original C code)
     */
    calculateManeuver() {
      const target = this.targets[this.maneuverTargetIndex];
      
      // First, clear all secondary targets' newCPA data
      for (let i = 0; i < RADAR_NR_TARGETS; i++) {
        if (i !== this.maneuverTargetIndex) {
          this.targets[i].haveNewCPA = false;
          this.targets[i].haveMpoint = false;
        }
      }
      
      if (!target || !target.haveCPA) {
        this.maneuverResult = { error: 'No valid target data' };
        if (target) target.haveNewCPA = false;
        return;
      }
      
      const { calculateManeuverFull, calculateSecondaryTargetCPA } = useRadarCalculations();
      
      try {
        const result = calculateManeuverFull({
          target,
          ownCourse: this.ownCourse,
          ownSpeed: this.ownSpeed,
          maneuverByTime: this.maneuverByTime,
          maneuverTime: this.maneuverTime,
          maneuverDistance: this.maneuverDistance,
          maneuverType: this.maneuverType,
          maneuverByCPA: this.maneuverByCPA,
          desiredCPA: this.desiredCPA,
          newCourse: this.newCourse,
          newSpeed: this.newSpeed
        });
        
        if (result.success) {
          this.maneuverResult = {
            newCPA: result.newCPA,
            requiredCourse: result.requiredCourse,
            requiredSpeed: result.requiredSpeed,
            error: result.error,
            newKBr: result.newKBr,
            newVBr: result.newVBr,
            delta: result.delta,
            newRaSP: result.newRaSP,
            newTCPA: result.newTCPA,
            newPCPA: result.newPCPA,
            newSPCPA: result.newSPCPA,
            newTCPA_clock: result.newTCPA_clock,
            newHaveCrossing: result.newHaveCrossing,
            newBCR: result.newBCR,
            newBCT: result.newBCT,
            newBCt: result.newBCt,
            timeToManeuver: result.timeToManeuver,
            courseChange: result.courseChange,
            maneuverDistance: result.maneuverDistance
          };
          
          // Update primary target
          target.haveNewCPA = true;
          target.haveMpoint = true;
          target.mpoint = result.mpoint || { x: 0, y: 0 };
          target.newCpa = result.newCpaPoint || { x: 0, y: 0 };
          target.xpoint = result.xpoint || { x: 0, y: 0 };
          target.newKBr = result.newKBr || 0;
          target.newVBr = result.newVBr || 0;
          target.newCPA = result.newCPA || 0;
          target.delta = result.delta || 0;
          target.newRaSP = result.newRaSP || 0;
          target.newTCPA = result.newTCPA || 0;
          target.newPCPA = result.newPCPA || 0;
          target.newSPCPA = result.newSPCPA || 0;
          target.newTCPA_clock = result.newTCPA_clock || 0;
          target.newHaveCrossing = result.newHaveCrossing || false;
          target.newBCR = result.newBCR || 0;
          target.newBCT = result.newBCT || 0;
          target.newBCt = result.newBCt || 0;
          
          // ==========================================================================
          // Calculate new CPA for ALL secondary targets
          // Port of radar_calculate_secondary() from radar.c
          // ==========================================================================
          const newCourse = result.requiredCourse ?? this.ownCourse;
          const newSpeed = result.requiredSpeed ?? this.ownSpeed;
          const exactMtime = target.time[1] + (result.timeToManeuver || 0);
          
          for (let i = 0; i < RADAR_NR_TARGETS; i++) {
            if (i === this.maneuverTargetIndex) continue; // Skip primary target
            
            const secondaryTarget = this.targets[i];
            
            // Only calculate for targets with valid data
            if (!secondaryTarget.haveCPA || secondaryTarget.vBr <= 0) {
              continue;
            }
            
            const secondaryResult = calculateSecondaryTargetCPA({
              target: secondaryTarget,
              ownCourse: this.ownCourse,
              ownSpeed: this.ownSpeed,
              newCourse,
              newSpeed,
              exactMtime
            });
            
            if (secondaryResult.success) {
              secondaryTarget.haveNewCPA = true;
              secondaryTarget.haveMpoint = true;
              secondaryTarget.mpoint = secondaryResult.mpoint || { x: 0, y: 0 };
              secondaryTarget.newCpa = secondaryResult.newCpaPoint || { x: 0, y: 0 };
              secondaryTarget.xpoint = secondaryResult.xpoint || { x: 0, y: 0 };
              secondaryTarget.newKBr = secondaryResult.newKBr || 0;
              secondaryTarget.newVBr = secondaryResult.newVBr || 0;
              secondaryTarget.newCPA = secondaryResult.newCPA || 0;
              secondaryTarget.delta = secondaryResult.delta || 0;
              secondaryTarget.newTCPA = secondaryResult.newTCPA || 0;
              secondaryTarget.newPCPA = secondaryResult.newPCPA || 0;
              secondaryTarget.newSPCPA = secondaryResult.newSPCPA || 0;
            }
          }
        } else {
          this.maneuverResult = result.error ? { error: result.error } : {};
          target.haveNewCPA = false;
          target.haveMpoint = false;
        }
      } catch (error) {
        this.maneuverResult = { error: 'Calculation error' };
        target.haveNewCPA = false;
        target.haveMpoint = false;
      }
      
      this.modified = true;
    },
    
    /**
     * Load state from object
     */
    loadState(state: Partial<RadarState>) {
      Object.assign(this, state);
      this.recalculateAllTargets();
      this.modified = false;
    },
    
    /**
     * Mark as saved
     */
    markAsSaved(filename?: string) {
      this.modified = false;
      if (filename) {
        this.currentFilename = filename;
      }
    },
    
    /**
     * Save current state to localStorage
     */
    saveToStorage() {
      saveToLocalStorage(this.$state);
    },
    
    /**
     * Load state from localStorage
     */
    loadFromStorage() {
      const saved = loadFromLocalStorage();
      if (saved) {
        // Apply saved values
        if (saved.northUp !== undefined) this.northUp = saved.northUp;
        if (saved.showHeading !== undefined) this.showHeading = saved.showHeading;
        if (saved.rangeIndex !== undefined) {
          this.rangeIndex = saved.rangeIndex;
          this.range = RADAR_RANGES[saved.rangeIndex]?.range ?? this.range;
        }
        if (saved.ownCourse !== undefined) this.ownCourse = saved.ownCourse;
        if (saved.ownSpeed !== undefined) this.ownSpeed = saved.ownSpeed;
        
        // Apply target data
        if (saved.targets) {
          saved.targets.forEach((savedTarget, i) => {
            if (this.targets[i]) {
              this.targets[i].time = savedTarget.time;
              this.targets[i].bearingType = savedTarget.bearingType;
              this.targets[i].bearing = savedTarget.bearing;
              this.targets[i].bearingCourseOffset = savedTarget.bearingCourseOffset;
              this.targets[i].distance = savedTarget.distance;
            }
          });
        }
        
        // Apply maneuver settings
        if (saved.maneuverTargetIndex !== undefined) this.maneuverTargetIndex = saved.maneuverTargetIndex;
        if (saved.maneuverByTime !== undefined) this.maneuverByTime = saved.maneuverByTime;
        if (saved.maneuverTime !== undefined) this.maneuverTime = saved.maneuverTime;
        if (saved.maneuverDistance !== undefined) this.maneuverDistance = saved.maneuverDistance;
        if (saved.maneuverType !== undefined) this.maneuverType = saved.maneuverType;
        if (saved.maneuverByCPA !== undefined) this.maneuverByCPA = saved.maneuverByCPA;
        if (saved.desiredCPA !== undefined) this.desiredCPA = saved.desiredCPA;
        if (saved.newCourse !== undefined) this.newCourse = saved.newCourse;
        if (saved.newSpeed !== undefined) this.newSpeed = saved.newSpeed;
        
        // Recalculate everything
        this.recalculateAllTargets();
        this.modified = false;
      }
    },
    
    /**
     * Clear localStorage and reset
     */
    clearStorage() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      this.resetPlot();
    }
  }
});
