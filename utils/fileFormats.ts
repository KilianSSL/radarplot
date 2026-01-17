/**
 * File format utilities for .rpt and JSON import/export
 * Port of file I/O from radar.c
 */

import type { RadarState, RptFileData, RadarplotJSON } from './radarTypes';
import { RADAR_RANGES, timeStringToMinutes } from './radarConstants';

// ============================================================================
// .rpt File Parser (INI Format from C Version)
// ============================================================================

/**
 * Parse .rpt file content (INI format)
 * Port of radar_load() from radar.c
 */
export function parseRptFile(content: string): Partial<RadarState> | null {
  try {
    const lines = content.split('\n');
    const sections: Record<string, Record<string, string>> = {};
    let currentSection = '';
    
    // Parse INI format
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
        continue;
      }
      
      // Section header
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        sections[currentSection] = {};
        continue;
      }
      
      // Key-value pair
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0 && currentSection) {
        const key = trimmed.slice(0, equalIndex).trim();
        const value = trimmed.slice(equalIndex + 1).trim();
        sections[currentSection][key] = value;
      }
    }
    
    // Convert to radar state
    return convertRptToState(sections);
  } catch (error) {
    console.error('Error parsing .rpt file:', error);
    return null;
  }
}

/**
 * Convert parsed .rpt sections to RadarState
 */
function convertRptToState(sections: Record<string, Record<string, string>>): Partial<RadarState> {
  const state: Partial<RadarState> = {};
  
  // Parse Radar section
  if (sections['Radar']) {
    const radar = sections['Radar'];
    
    // Orientation: 0 = North Up, 1 = Course Up
    if (radar['Orientation'] !== undefined) {
      state.northUp = parseInt(radar['Orientation']) === 0;
    }
    
    // Range index
    if (radar['Range'] !== undefined) {
      const rangeIndex = parseInt(radar['Range']);
      if (rangeIndex >= 0 && rangeIndex < RADAR_RANGES.length) {
        state.rangeIndex = rangeIndex;
        state.range = RADAR_RANGES[rangeIndex].range;
      }
    }
    
    // Heading display
    if (radar['Heading'] !== undefined) {
      state.showHeading = radar['Heading'].toLowerCase() === 'true';
    }
  }
  
  // Parse Own Ship section
  if (sections['Own Ship']) {
    const ownShip = sections['Own Ship'];
    
    if (ownShip['Course'] !== undefined) {
      state.ownCourse = parseInt(ownShip['Course']);
    }
    
    if (ownShip['Speed'] !== undefined) {
      state.ownSpeed = parseFloat(ownShip['Speed']);
    }
  }
  
  // Parse Opponent sections (B, C, D, E, F)
  const targetLetters = ['B', 'C', 'D', 'E', 'F'];
  const targets: any[] = [];
  
  for (let i = 0; i < targetLetters.length; i++) {
    const sectionName = `Opponent ${targetLetters[i]}`;
    if (!sections[sectionName]) {
      targets.push(null);
      continue;
    }
    
    const opponent = sections[sectionName];
    const target: any = {
      index: i
    };
    
    // Observation 0
    if (opponent['Time(0)'] !== undefined) {
      target.time0 = parseInt(opponent['Time(0)']);
    }
    
    if (opponent['SideBearing(0)'] !== undefined) {
      target.bearingType0 = opponent['SideBearing(0)'].toLowerCase() === 'true' ? 'rasp' : 'rakrp';
    }
    
    if (opponent['RaSP(0)'] !== undefined) {
      target.rasp0 = parseInt(opponent['RaSP(0)']);
    }
    
    if (opponent['CourseSP(0)'] !== undefined) {
      target.courseSP0 = parseInt(opponent['CourseSP(0)']);
    }
    
    if (opponent['RaKrP(0)'] !== undefined) {
      target.rakrp0 = parseInt(opponent['RaKrP(0)']);
    }
    
    if (opponent['Distance(0)'] !== undefined) {
      target.distance0 = parseFloat(opponent['Distance(0)']);
    }
    
    // Observation 1
    if (opponent['Time(1)'] !== undefined) {
      target.time1 = parseInt(opponent['Time(1)']);
    }
    
    if (opponent['SideBearing(1)'] !== undefined) {
      target.bearingType1 = opponent['SideBearing(1)'].toLowerCase() === 'true' ? 'rasp' : 'rakrp';
    }
    
    if (opponent['RaSP(1)'] !== undefined) {
      target.rasp1 = parseInt(opponent['RaSP(1)']);
    }
    
    if (opponent['CourseSP(1)'] !== undefined) {
      target.courseSP1 = parseInt(opponent['CourseSP(1)']);
    }
    
    if (opponent['RaKrP(1)'] !== undefined) {
      target.rakrp1 = parseInt(opponent['RaKrP(1)']);
    }
    
    if (opponent['Distance(1)'] !== undefined) {
      target.distance1 = parseFloat(opponent['Distance(1)']);
    }
    
    targets.push(target);
  }
  
  state.targets = targets as any;
  
  // Parse Maneuver section
  if (sections['Maneuver']) {
    const maneuver = sections['Maneuver'];
    
    if (maneuver['ByTime'] !== undefined) {
      state.mtimeSelected = maneuver['ByTime'].toLowerCase() === 'true';
    }
    
    if (maneuver['Time'] !== undefined) {
      state.mtime = parseInt(maneuver['Time']);
    }
    
    if (maneuver['Distance'] !== undefined) {
      state.mdistance = parseFloat(maneuver['Distance']);
    }
    
    if (maneuver['Type'] !== undefined) {
      // Original C code: Type=0 means course change, Type=1 means speed change
      const typeNum = parseInt(maneuver['Type']);
      state.maneuverType = typeNum === 1 ? 'speed' : 'course';
    }
    
    if (maneuver['ByCPA'] !== undefined) {
      state.mcpaSelected = maneuver['ByCPA'].toLowerCase() === 'true';
    }
    
    if (maneuver['CPA'] !== undefined) {
      state.mcpa = parseFloat(maneuver['CPA']);
    }
    
    if (maneuver['Course'] !== undefined) {
      state.ncourse = parseFloat(maneuver['Course']);
    }
    
    if (maneuver['Speed'] !== undefined) {
      state.nspeed = parseFloat(maneuver['Speed']);
    }
  }
  
  return state;
}

// ============================================================================
// .rpt File Generator
// ============================================================================

/**
 * Generate .rpt file content from RadarState
 */
export function generateRptFile(state: RadarState): string {
  const lines: string[] = [];
  
  // Radar section
  lines.push('[Radar]');
  lines.push(`Orientation=${state.northUp ? 0 : 1}`);
  lines.push(`Range=${state.rangeIndex}`);
  lines.push(`Heading=${state.showHeading ? 'true' : 'false'}`);
  
  // Own Ship section
  lines.push('[Own Ship]');
  lines.push(`Course=${state.ownCourse}`);
  lines.push(`Speed=${state.ownSpeed.toFixed(1)}`);
  
  // Opponent sections
  const targetLetters = ['B', 'C', 'D', 'E', 'F'];
  for (let i = 0; i < state.targets.length; i++) {
    const target = state.targets[i];
    
    // Skip empty targets
    if (target.distance[0] === 0 && target.distance[1] === 0) {
      continue;
    }
    
    lines.push(`[Opponent ${targetLetters[i]}]`);
    
    // Observation 0
    lines.push(`Time(0)=${target.time[0]}`);
    lines.push(`SideBearing(0)=${target.bearingType[0] === 'rasp' ? 'true' : 'false'}`);
    if (target.bearingType[0] === 'rasp') {
      lines.push(`RaSP(0)=${target.bearing[0]}`);
      lines.push(`CourseSP(0)=${target.bearingCourseOffset[0]}`);
    }
    lines.push(`RaKrP(0)=${target.bearing[0]}`);
    lines.push(`Distance(0)=${target.distance[0].toFixed(1)}`);
    
    // Observation 1
    lines.push(`Time(1)=${target.time[1]}`);
    lines.push(`SideBearing(1)=${target.bearingType[1] === 'rasp' ? 'true' : 'false'}`);
    if (target.bearingType[1] === 'rasp') {
      lines.push(`RaSP(1)=${target.bearing[1]}`);
      lines.push(`CourseSP(1)=${target.bearingCourseOffset[1]}`);
    }
    lines.push(`RaKrP(1)=${target.bearing[1]}`);
    lines.push(`Distance(1)=${target.distance[1].toFixed(1)}`);
  }
  
  // Maneuver section
  if (state.selectedTarget >= 0 && state.maneuverType) {
    lines.push('[Maneuver]');
    lines.push(`ByTime=${state.mtimeSelected ? 'true' : 'false'}`);
    lines.push(`Time=${state.mtime}`);
    lines.push(`Distance=${state.mdistance.toFixed(1)}`);
    // Original C code: Type=0 means course change, Type=1 means speed change
    const typeNum = state.maneuverType === 'speed' ? 1 : 0;
    lines.push(`Type=${typeNum}`);
    lines.push(`ByCPA=${state.mcpaSelected ? 'true' : 'false'}`);
    lines.push(`CPA=${state.mcpa.toFixed(1)}`);
    lines.push(`Course=${state.ncourse.toFixed(1)}`);
    lines.push(`Speed=${state.nspeed.toFixed(1)}`);
  }
  
  return lines.join('\n') + '\n';
}

// ============================================================================
// JSON Format (Modern Web Version)
// ============================================================================

/**
 * Export RadarState to JSON
 */
export function exportToJSON(state: RadarState): RadarplotJSON {
  return {
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    radar: state
  };
}

/**
 * Import RadarState from JSON
 */
export function importFromJSON(json: RadarplotJSON): RadarState | null {
  try {
    // Validate version
    if (!json.version || !json.radar) {
      throw new Error('Invalid JSON format');
    }
    
    // TODO: Add migration logic for different versions
    
    return json.radar;
  } catch (error) {
    console.error('Error importing JSON:', error);
    return null;
  }
}

// ============================================================================
// LocalStorage Persistence
// ============================================================================

const STORAGE_KEY = 'radarplot_state';
const RECENT_FILES_KEY = 'radarplot_recent_files';

/**
 * Save state to localStorage
 */
export function saveToLocalStorage(state: RadarState): boolean {
  try {
    const json = exportToJSON(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

/**
 * Load state from localStorage
 */
export function loadFromLocalStorage(): RadarState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const json: RadarplotJSON = JSON.parse(stored);
    return importFromJSON(json);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

/**
 * Clear localStorage
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Save recent file reference
 */
export function addRecentFile(filename: string, timestamp: string = new Date().toISOString()): void {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    const recent: Array<{ filename: string; timestamp: string }> = stored ? JSON.parse(stored) : [];
    
    // Remove duplicate if exists
    const filtered = recent.filter(f => f.filename !== filename);
    
    // Add new file at the beginning
    filtered.unshift({ filename, timestamp });
    
    // Keep only last 10
    const trimmed = filtered.slice(0, 10);
    
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving recent file:', error);
  }
}

/**
 * Get recent files list
 */
export function getRecentFiles(): Array<{ filename: string; timestamp: string }> {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading recent files:', error);
    return [];
  }
}

// ============================================================================
// File Download Helper
// ============================================================================

/**
 * Download content as file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file content
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
