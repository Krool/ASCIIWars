/**
 * Map definitions for all game modes.
 * Each MapDef fully describes a map's layout — player positions, lanes, shape, resources.
 *
 * DUEL_MAP: Portrait 80×120, 2v2, top vs bottom (original map)
 * SKIRMISH_MAP: Landscape 160×90, 3v3, left vs right (3 bases stacked vertically per side)
 */

import {
  MapDef, Vec2, ResourceType,
  MAP_WIDTH, MAP_HEIGHT, HQ_WIDTH, HQ_HEIGHT,
  BUILD_GRID_COLS, BUILD_GRID_ROWS,
  SHARED_ALLEY_COLS, SHARED_ALLEY_ROWS,
  ZONES, CROSS_BASE_MARGIN, CROSS_BASE_WIDTH,
  DIAMOND_CENTER_X, DIAMOND_CENTER_Y, DIAMOND_HALF_W, DIAMOND_HALF_H,
  WOOD_NODE_X, STONE_NODE_X,
  LANE_PATHS,
  getMarginAtRow,
} from './types';

// ============================================================
// DUEL MAP — Portrait 80×120, 2v2, top vs bottom
// ============================================================

export const DUEL_MAP: MapDef = {
  id: 'duel',
  name: 'Duel',
  width: MAP_WIDTH,    // 80
  height: MAP_HEIGHT,  // 120
  maxPlayers: 4,
  playersPerTeam: 2,
  shapeAxis: 'y',

  teams: [
    // Team 0 (Bottom)
    {
      hqPosition: {
        x: Math.floor(MAP_WIDTH / 2) - Math.floor(HQ_WIDTH / 2),  // 36
        y: ZONES.BOTTOM_BASE.start + 1,                            // 105
      },
      towerAlleyOrigin: { x: 30, y: 82 },
    },
    // Team 1 (Top)
    {
      hqPosition: {
        x: Math.floor(MAP_WIDTH / 2) - Math.floor(HQ_WIDTH / 2),  // 36
        y: ZONES.TOP_BASE.end - HQ_HEIGHT - 1,                     // 12
      },
      towerAlleyOrigin: { x: 30, y: 26 },
    },
  ],

  playerSlots: [
    // P0: Bottom-Left
    {
      teamIndex: 0,
      buildGridOrigin: (() => {
        const gap = 2;
        const totalW = BUILD_GRID_COLS * 2 + gap;
        const startX = CROSS_BASE_MARGIN + Math.floor((CROSS_BASE_WIDTH - totalW) / 2);
        const y = ZONES.BOTTOM_BASE.start + Math.floor((ZONES.BOTTOM_BASE.end - ZONES.BOTTOM_BASE.start - BUILD_GRID_ROWS) / 2);
        return { x: startX, y };
      })(),
      hutGridOrigin: { x: 29, y: ZONES.BOTTOM_BASE.end - 2 },
    },
    // P1: Bottom-Right
    {
      teamIndex: 0,
      buildGridOrigin: (() => {
        const gap = 2;
        const totalW = BUILD_GRID_COLS * 2 + gap;
        const startX = CROSS_BASE_MARGIN + Math.floor((CROSS_BASE_WIDTH - totalW) / 2);
        const y = ZONES.BOTTOM_BASE.start + Math.floor((ZONES.BOTTOM_BASE.end - ZONES.BOTTOM_BASE.start - BUILD_GRID_ROWS) / 2);
        return { x: startX + BUILD_GRID_COLS + gap, y };
      })(),
      hutGridOrigin: { x: 41, y: ZONES.BOTTOM_BASE.end - 2 },
    },
    // P2: Top-Left
    {
      teamIndex: 1,
      buildGridOrigin: (() => {
        const gap = 2;
        const totalW = BUILD_GRID_COLS * 2 + gap;
        const startX = CROSS_BASE_MARGIN + Math.floor((CROSS_BASE_WIDTH - totalW) / 2);
        const y = ZONES.TOP_BASE.start + Math.floor((ZONES.TOP_BASE.end - ZONES.TOP_BASE.start - BUILD_GRID_ROWS) / 2);
        return { x: startX, y };
      })(),
      hutGridOrigin: { x: 29, y: ZONES.TOP_BASE.start + 1 },
    },
    // P3: Top-Right
    {
      teamIndex: 1,
      buildGridOrigin: (() => {
        const gap = 2;
        const totalW = BUILD_GRID_COLS * 2 + gap;
        const startX = CROSS_BASE_MARGIN + Math.floor((CROSS_BASE_WIDTH - totalW) / 2);
        const y = ZONES.TOP_BASE.start + Math.floor((ZONES.TOP_BASE.end - ZONES.TOP_BASE.start - BUILD_GRID_ROWS) / 2);
        return { x: startX + BUILD_GRID_COLS + gap, y };
      })(),
      hutGridOrigin: { x: 41, y: ZONES.TOP_BASE.start + 1 },
    },
  ],

  lanePaths: [
    // Team 0 (Bottom) paths
    { left: [...LANE_PATHS.bottom.left], right: [...LANE_PATHS.bottom.right] },
    // Team 1 (Top) paths
    { left: [...LANE_PATHS.top.left], right: [...LANE_PATHS.top.right] },
  ],

  diamondCenter: { x: DIAMOND_CENTER_X, y: DIAMOND_CENTER_Y },
  diamondHalfW: DIAMOND_HALF_W,
  diamondHalfH: DIAMOND_HALF_H,

  resourceNodes: [
    { type: ResourceType.Wood, x: WOOD_NODE_X, y: 60 },
    { type: ResourceType.Stone, x: STONE_NODE_X, y: 60 },
  ],

  isPlayable(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    const margin = getMarginAtRow(y);
    return x >= margin && x < MAP_WIDTH - margin;
  },

  getPlayableRange(row: number): { min: number; max: number } {
    const margin = getMarginAtRow(row);
    return { min: margin, max: MAP_WIDTH - margin };
  },
};

// ============================================================
// SKIRMISH MAP — Landscape 160×90, 3v3, left vs right
// ============================================================

// Skirmish constants
const SK_W = 160;
const SK_H = 90;
const SK_BASE_DEPTH = 18;       // base zone depth (x-direction)
const SK_PLAYER_STRIP_H = 26;   // each player's vertical strip height
const SK_STRIP_GAP = 3;         // gap between player strips
const SK_STRIP_START = 4;       // top margin before first strip

// Base zone x-ranges
const SK_LEFT_BASE_END = SK_BASE_DEPTH;           // 18
const SK_RIGHT_BASE_START = SK_W - SK_BASE_DEPTH;  // 142

// Player strip Y positions (3 strips stacked vertically)
function skPlayerStripY(slotInTeam: number): number {
  return SK_STRIP_START + slotInTeam * (SK_PLAYER_STRIP_H + SK_STRIP_GAP);
}

// Shape: peanut rotated 90° — wide at bases, narrow necks, widest at diamond center
// Shape varies along X axis (columns), returns Y margin (void tiles top/bottom)
const SK_NECK_X_LEFT = 45;     // left neck narrowest column
const SK_NECK_X_RIGHT = 115;   // right neck narrowest column
const SK_DIAMOND_X = 80;       // diamond center x
const SK_DIAMOND_Y = 45;       // diamond center y
const SK_SHAPE_BASE_H = 82;    // playable height at base zones
const SK_SHAPE_NECK_H = 50;    // playable height at necks
const SK_SHAPE_CENTER_H = 86;  // playable height at diamond center

function skGetMarginAtCol(x: number): number {
  // Left base zone
  if (x <= SK_LEFT_BASE_END) return (SK_H - SK_SHAPE_BASE_H) / 2;
  // Right base zone
  if (x >= SK_RIGHT_BASE_START) return (SK_H - SK_SHAPE_BASE_H) / 2;
  // Left base → left neck
  if (x <= SK_NECK_X_LEFT) {
    const t = (x - SK_LEFT_BASE_END) / (SK_NECK_X_LEFT - SK_LEFT_BASE_END);
    const h = SK_SHAPE_BASE_H + (SK_SHAPE_NECK_H - SK_SHAPE_BASE_H) * t;
    return (SK_H - h) / 2;
  }
  // Left neck → center
  if (x <= SK_DIAMOND_X) {
    const t = (x - SK_NECK_X_LEFT) / (SK_DIAMOND_X - SK_NECK_X_LEFT);
    const h = SK_SHAPE_NECK_H + (SK_SHAPE_CENTER_H - SK_SHAPE_NECK_H) * t;
    return (SK_H - h) / 2;
  }
  // Center → right neck
  if (x <= SK_NECK_X_RIGHT) {
    const t = (x - SK_DIAMOND_X) / (SK_NECK_X_RIGHT - SK_DIAMOND_X);
    const h = SK_SHAPE_CENTER_H + (SK_SHAPE_NECK_H - SK_SHAPE_CENTER_H) * t;
    return (SK_H - h) / 2;
  }
  // Right neck → right base
  const t = (x - SK_NECK_X_RIGHT) / (SK_RIGHT_BASE_START - SK_NECK_X_RIGHT);
  const h = SK_SHAPE_NECK_H + (SK_SHAPE_BASE_H - SK_SHAPE_NECK_H) * t;
  return (SK_H - h) / 2;
}

// Lane Y positions: top lane in gap between strips 0-1, bottom lane in gap between strips 1-2
const SK_TOP_LANE_Y = skPlayerStripY(0) + SK_PLAYER_STRIP_H + Math.floor(SK_STRIP_GAP / 2); // 4+26+1 = 31
const SK_BOT_LANE_Y = skPlayerStripY(1) + SK_PLAYER_STRIP_H + Math.floor(SK_STRIP_GAP / 2); // 33+26+1 = 60

// Build grid origins for skirmish (each player gets 14×3 build area)
function skBuildGridOrigin(side: 'left' | 'right', slotInTeam: number): Vec2 {
  const stripY = skPlayerStripY(slotInTeam);
  const x = side === 'left'
    ? 2  // left side: near left edge
    : SK_RIGHT_BASE_START + 2;  // right side: near right edge
  const y = stripY + Math.floor((SK_PLAYER_STRIP_H - BUILD_GRID_ROWS) / 2);
  return { x, y };
}

function skHutGridOrigin(side: 'left' | 'right', slotInTeam: number): Vec2 {
  const stripY = skPlayerStripY(slotInTeam);
  const x = side === 'left'
    ? SK_LEFT_BASE_END - 2  // left side: inner edge of base
    : SK_RIGHT_BASE_START;  // right side: inner edge of base
  const y = stripY + Math.floor((SK_PLAYER_STRIP_H - 1) / 2);  // centered vertically
  return { x, y };
}

// Horizontal lane paths for skirmish — lanes run left-to-right (Team 0 perspective)
function skLanePathLR(laneY: number, forkDir: 'top' | 'bottom'): Vec2[] {
  const startX = 10;               // left base edge
  const endX = SK_W - 10;          // right base edge
  const diamondForkY = forkDir === 'top'
    ? SK_DIAMOND_Y - 18  // fork above diamond
    : SK_DIAMOND_Y + 18; // fork below diamond
  return [
    { x: startX, y: laneY },      // left base
    { x: startX + 20, y: laneY }, // through left territory
    { x: startX + 35, y: laneY }, // convergence before diamond
    { x: SK_DIAMOND_X - 15, y: diamondForkY }, // fork around diamond
    { x: SK_DIAMOND_X, y: diamondForkY },       // alongside diamond
    { x: SK_DIAMOND_X + 15, y: diamondForkY },  // past diamond
    { x: endX - 35, y: laneY },   // reconvergence
    { x: endX - 20, y: laneY },   // through right territory
    { x: endX, y: laneY },        // right base
  ];
}

// Team 0 paths (left→right), Team 1 gets these reversed
const SK_LANE_TOP_LR = skLanePathLR(SK_TOP_LANE_Y, 'top');
const SK_LANE_BOT_LR = skLanePathLR(SK_BOT_LANE_Y, 'bottom');

export const SKIRMISH_MAP: MapDef = {
  id: 'skirmish',
  name: 'Skirmish',
  width: SK_W,      // 160
  height: SK_H,     // 90
  maxPlayers: 6,
  playersPerTeam: 3,
  shapeAxis: 'x',

  teams: [
    // Team 0 (Left)
    {
      hqPosition: {
        x: 1,
        y: Math.floor(SK_H / 2) - Math.floor(HQ_HEIGHT / 2),  // centered vertically
      },
      towerAlleyOrigin: { x: SK_LEFT_BASE_END + 4, y: Math.floor(SK_H / 2) - Math.floor(SHARED_ALLEY_ROWS / 2) },
    },
    // Team 1 (Right)
    {
      hqPosition: {
        x: SK_W - HQ_WIDTH - 1,
        y: Math.floor(SK_H / 2) - Math.floor(HQ_HEIGHT / 2),
      },
      towerAlleyOrigin: { x: SK_RIGHT_BASE_START - SHARED_ALLEY_COLS - 4, y: Math.floor(SK_H / 2) - Math.floor(SHARED_ALLEY_ROWS / 2) },
    },
  ],

  playerSlots: [
    // Team 0 (Left): P0=top, P1=mid, P2=bottom
    { teamIndex: 0, buildGridOrigin: skBuildGridOrigin('left', 0), hutGridOrigin: skHutGridOrigin('left', 0) },
    { teamIndex: 0, buildGridOrigin: skBuildGridOrigin('left', 1), hutGridOrigin: skHutGridOrigin('left', 1) },
    { teamIndex: 0, buildGridOrigin: skBuildGridOrigin('left', 2), hutGridOrigin: skHutGridOrigin('left', 2) },
    // Team 1 (Right): P3=top, P4=mid, P5=bottom
    { teamIndex: 1, buildGridOrigin: skBuildGridOrigin('right', 0), hutGridOrigin: skHutGridOrigin('right', 0) },
    { teamIndex: 1, buildGridOrigin: skBuildGridOrigin('right', 1), hutGridOrigin: skHutGridOrigin('right', 1) },
    { teamIndex: 1, buildGridOrigin: skBuildGridOrigin('right', 2), hutGridOrigin: skHutGridOrigin('right', 2) },
  ],

  lanePaths: [
    // Team 0 (Left→Right) paths
    { left: [...SK_LANE_TOP_LR], right: [...SK_LANE_BOT_LR] },
    // Team 1 (Right→Left) paths — same waypoints, reversed order
    { left: [...SK_LANE_TOP_LR].reverse(), right: [...SK_LANE_BOT_LR].reverse() },
  ],

  diamondCenter: { x: SK_DIAMOND_X, y: SK_DIAMOND_Y },
  diamondHalfW: 12,
  diamondHalfH: 14,

  resourceNodes: [
    { type: ResourceType.Wood, x: SK_DIAMOND_X, y: 6 },     // top of map
    { type: ResourceType.Stone, x: SK_DIAMOND_X, y: SK_H - 6 }, // bottom of map
  ],

  isPlayable(x: number, y: number): boolean {
    if (x < 0 || x >= SK_W || y < 0 || y >= SK_H) return false;
    const margin = skGetMarginAtCol(x);
    return y >= margin && y < SK_H - margin;
  },

  getPlayableRange(col: number): { min: number; max: number } {
    const margin = skGetMarginAtCol(col);
    return { min: margin, max: SK_H - margin };
  },
};

// All available maps
export const ALL_MAPS: MapDef[] = [DUEL_MAP, SKIRMISH_MAP];

export function getMapById(id: string): MapDef {
  const map = ALL_MAPS.find(m => m.id === id);
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}
