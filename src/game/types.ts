export const TILE = {
  VOID: 0,
  WATER: 1,
  SAND: 2,
  GRASS: 3,
  FOREST: 4,
  MOUNTAIN: 5,
  SNOW: 6,
  LAVA: 7,
  ICE: 8,
  SWAMP: 9,
  FARM: 10,
  ASH: 11,
} as const;

export type Tile = (typeof TILE)[keyof typeof TILE];

export const RACES = [
  "human",
  "orc",
  "elf",
  "dwarf",
  "wolf",
  "sheep",
  "dragon",
  "undead",
] as const;

export type Race = (typeof RACES)[number];

export type Job = "idle" | "wander" | "forage" | "farm" | "build" | "fight" | "flee" | "sleep" | "hunt" | "follow";

export type Weather = "clear" | "rain" | "storm" | "snow";

export type BuildingKind = "house" | "farm" | "barracks" | "temple" | "castle" | "mine" | "wonder";

export type Decree = "expand" | "defend" | "war" | "worship";

export type DisasterKind = "tornado" | "meteor" | "stormcell";

export interface Unit {
  id: number;
  race: Race;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  hp: number;
  maxHp: number;
  hunger: number;
  age: number;
  lifespan: number;
  kingdomId: number;
  job: Job;
  targetX: number;
  targetY: number;
  targetId: number;
  cooldown: number;
  king: boolean;
  infected: number;
  homeId: number;
  stamina: number;
  gold: number;
  kills: number;
  walkPhase: number;
  blessed: number;
  hue: number;
  gen: number;
}

export interface Building {
  id: number;
  kind: BuildingKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kingdomId: number;
  stored: number;
}

export interface Kingdom {
  id: number;
  name: string;
  color: string;
  race: Race;
  gold: number;
  wars: number[];
  founderId: number;
  age: number;
  decree: Decree;
  dead: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
  kind: "spark" | "smoke" | "rain" | "blood" | "glow";
}

export interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  ownerId: number;
  race: Race;
}

export interface Disaster {
  kind: DisasterKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  r: number;
  g: number;
  b: number;
}

export interface WorldEvent {
  t: number;
  text: string;
}

export interface InspectUnit {
  id: number;
  name: string;
  race: Race;
  hp: number;
  maxHp: number;
  hunger: number;
  age: number;
  job: Job;
  kingdom: string;
  king: boolean;
  kills: number;
  gold: number;
  infected: boolean;
  blessed: boolean;
  traits: string[];
}

export interface InspectPayload {
  kind: "unit" | "tile" | "building";
  tileX: number;
  tileY: number;
  biome: string;
  unit?: InspectUnit;
  building?: { kind: BuildingKind; hp: number; kingdom: string };
}

export interface HudSnapshot {
  year: number;
  timeOfDay: number;
  weather: Weather;
  pop: number;
  animals: number;
  kingdoms: { id: number; name: string; color: string; pop: number; gold: number; race: Race; decree: Decree }[];
  events: WorldEvent[];
  inspect: InspectPayload | null;
  possess: InspectUnit | null;
  stats: { births: number; deaths: number; wars: number; miracles: number };
  paused: boolean;
  speed: number;
}
