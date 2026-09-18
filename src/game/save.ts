import { mulberry32 } from "./rng";
import { WORLD_H, WORLD_W, World } from "./world";
import type { Building, Kingdom, Race, Unit, Weather } from "./types";

const KEY = "primordia-save-v1";
const SAVE_VERSION = 1;

interface SaveBlob {
  version: number;
  seed: number;
  tiles: string;
  heat: string;
  units: Unit[];
  buildings: Building[];
  kingdoms: Kingdom[];
  year: number;
  timeOfDay: number;
  weather: Weather;
  nextId: number;
  stats: World["stats"];
  events: World["events"];
  simTime: number;
}

function u8ToB64(data: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    s += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(s);
}

function b64ToU8(s: string, len: number): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(len);
  for (let i = 0; i < bin.length && i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function saveWorld(world: World): boolean {
  try {
    const blob: SaveBlob = {
      version: SAVE_VERSION,
      seed: world.seed,
      tiles: u8ToB64(world.tiles),
      heat: u8ToB64(world.heat),
      units: world.units,
      buildings: world.buildings,
      kingdoms: world.kingdoms,
      year: world.year,
      timeOfDay: world.timeOfDay,
      weather: world.weather,
      nextId: world.nextId,
      stats: world.stats,
      events: world.events,
      simTime: world.simTime,
    };
    const json = JSON.stringify(blob);
    localStorage.setItem(KEY + ":bak", localStorage.getItem(KEY) ?? "");
    localStorage.setItem(KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function loadWorld(): World | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw) as SaveBlob;
    if (!blob || blob.version !== SAVE_VERSION) return null;
    const world = new World(blob.seed);
    world.rng = mulberry32(blob.seed ^ 0x51ed);
    const n = WORLD_W * WORLD_H;
    world.tiles = b64ToU8(blob.tiles, n);
    world.heat = b64ToU8(blob.heat, n);
    world.units = blob.units ?? [];
    world.buildings = blob.buildings ?? [];
    world.kingdoms = blob.kingdoms ?? [];
    world.year = blob.year ?? 1;
    world.timeOfDay = blob.timeOfDay ?? 0.3;
    world.weather = blob.weather ?? "clear";
    world.nextId = blob.nextId ?? 1;
    world.stats = blob.stats ?? world.stats;
    world.events = blob.events ?? [];
    world.simTime = blob.simTime ?? 0;
    world.markDirty(0, 0, 999);
    return world;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export type { Race };
