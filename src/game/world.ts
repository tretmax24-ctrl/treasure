import { fbm, hash2, mulberry32, pick, randInt, randRange, xmur3, type Rng } from "./rng";
import { KINGDOM_COLORS, kingdomName, unitName } from "./names";
import type { ToolId } from "./tools";
import {
  TILE,
  type Bolt,
  type Building,
  type BuildingKind,
  type Decree,
  type Disaster,
  type FloatText,
  type InspectPayload,
  type InspectUnit,
  type Kingdom,
  type Particle,
  type Race,
  type Tile,
  type Unit,
  type Weather,
  type WorldEvent,
} from "./types";

export const WORLD_W = 112;
export const WORLD_H = 112;
export const MAX_UNITS = 420;
export const MAX_PARTICLES = 520;
export const MAX_BUILDINGS = 180;

const SAPIENT: Race[] = ["human", "orc", "elf", "dwarf"];

const TILE_FROM_TOOL: Partial<Record<ToolId, Tile>> = {
  grass: TILE.GRASS,
  forest: TILE.FOREST,
  sand: TILE.SAND,
  water: TILE.WATER,
  mountain: TILE.MOUNTAIN,
  snow: TILE.SNOW,
  lava: TILE.LAVA,
  farm: TILE.FARM,
  erase: TILE.VOID,
};

export const TILE_NAME = [
  "void",
  "water",
  "sand",
  "grass",
  "forest",
  "mountain",
  "snow",
  "lava",
  "ice",
  "swamp",
  "farm",
  "ash",
];

const STATS: Record<
  Race,
  { hp: number; speed: number; dmg: number; life: number; size: number; hunger: number }
> = {
  human: { hp: 42, speed: 1.7, dmg: 8, life: 70, size: 1, hunger: 7 },
  orc: { hp: 58, speed: 1.55, dmg: 12, life: 55, size: 1.1, hunger: 9 },
  elf: { hp: 36, speed: 2.15, dmg: 9, life: 140, size: 0.95, hunger: 5 },
  dwarf: { hp: 62, speed: 1.25, dmg: 11, life: 110, size: 0.9, hunger: 8 },
  wolf: { hp: 28, speed: 2.45, dmg: 10, life: 18, size: 0.85, hunger: 12 },
  sheep: { hp: 16, speed: 1.15, dmg: 2, life: 14, size: 0.8, hunger: 6 },
  dragon: { hp: 200, speed: 3.3, dmg: 28, life: 400, size: 2.2, hunger: 4 },
  undead: { hp: 34, speed: 1.35, dmg: 9, life: 200, size: 1, hunger: 0 },
};

function idx(x: number, y: number) {
  return (y | 0) * WORLD_W + (x | 0);
}

function inBounds(x: number, y: number) {
  return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
}

export function walkableTile(t: Tile): boolean {
  return t === TILE.SAND || t === TILE.GRASS || t === TILE.FOREST || t === TILE.MOUNTAIN || t === TILE.SNOW || t === TILE.ICE || t === TILE.SWAMP || t === TILE.FARM || t === TILE.ASH;
}

export class World {
  w = WORLD_W;
  h = WORLD_H;
  seed: number;
  tiles: Uint8Array;
  heat: Uint8Array;
  units: Unit[] = [];
  buildings: Building[] = [];
  kingdoms: Kingdom[] = [];
  particles: Particle[] = [];
  bolts: Bolt[] = [];
  disasters: Disaster[] = [];
  floats: FloatText[] = [];
  events: WorldEvent[] = [];
  year = 1;
  timeOfDay = 0.28;
  weather: Weather = "clear";
  weatherT = 40;
  nextId = 1;
  rng: Rng;
  possessedId = 0;
  selectedId = 0;
  selectedTileX = -1;
  selectedTileY = -1;
  stats = { births: 0, deaths: 0, wars: 0, miracles: 0 };
  simTime = 0;
  birthGate = 0;
  foundGate = 0;
  dirty = true;
  dirtyMinX = 0;
  dirtyMinY = 0;
  dirtyMaxX = WORLD_W;
  dirtyMaxY = WORLD_H;
  trauma = 0;
  flash = 0;
  private cell: number[][] = [];
  private cellSize = 4;

  constructor(seed = 1) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.tiles = new Uint8Array(WORLD_W * WORLD_H);
    this.heat = new Uint8Array(WORLD_W * WORLD_H);
  }

  markDirty(x: number, y: number, r = 1) {
    this.dirty = true;
    this.dirtyMinX = Math.max(0, Math.min(this.dirtyMinX, (x | 0) - r));
    this.dirtyMinY = Math.max(0, Math.min(this.dirtyMinY, (y | 0) - r));
    this.dirtyMaxX = Math.min(this.w, Math.max(this.dirtyMaxX, (x | 0) + r + 1));
    this.dirtyMaxY = Math.min(this.h, Math.max(this.dirtyMaxY, (y | 0) + r + 1));
  }

  resetDirty() {
    this.dirty = false;
    this.dirtyMinX = this.w;
    this.dirtyMinY = this.h;
    this.dirtyMaxX = 0;
    this.dirtyMaxY = 0;
  }

  tileAt(x: number, y: number): Tile {
    if (!inBounds(x, y)) return TILE.VOID;
    return this.tiles[idx(x, y)] as Tile;
  }

  setTile(x: number, y: number, t: Tile) {
    if (!inBounds(x, y)) return;
    this.tiles[idx(x, y)] = t;
    this.markDirty(x, y, 1);
    if (t === TILE.LAVA) this.heat[idx(x, y)] = 200;
  }

  walkable(x: number, y: number, race: Race): boolean {
    if (race === "dragon") return inBounds(x, y);
    const t = this.tileAt(x, y);
    if (race === "undead" && t === TILE.WATER) return false;
    return walkableTile(t);
  }

  log(text: string) {
    this.events.unshift({ t: this.simTime, text });
    if (this.events.length > 28) this.events.length = 28;
  }

  addTrauma(v: number) {
    this.trauma = Math.min(1, this.trauma + v);
  }

  burst(x: number, y: number, n: number, r: number, g: number, b: number, kind: Particle["kind"] = "spark", speed = 3) {
    for (let i = 0; i < n; i++) {
      let p: Particle | undefined;
      for (let k = 0; k < this.particles.length; k++) {
        if (this.particles[k]!.life <= 0) {
          p = this.particles[k];
          break;
        }
      }
      if (!p) {
        if (this.particles.length >= MAX_PARTICLES) continue;
        p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, r: 0, g: 0, b: 0, kind: "spark" };
        this.particles.push(p);
      }
      const a = this.rng() * Math.PI * 2;
      const s = this.rng() * speed;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0.35 + this.rng() * 0.55;
      p.maxLife = p.life;
      p.size = kind === "smoke" ? 1.4 : 0.5 + this.rng() * 0.7;
      p.r = r;
      p.g = g;
      p.b = b;
      p.kind = kind;
    }
  }

  float(x: number, y: number, text: string, r = 230, g = 220, b = 200) {
    this.floats.push({ x, y, text, life: 1.1, r, g, b });
    if (this.floats.length > 40) this.floats.shift();
  }

  spawn(race: Race, x: number, y: number, kingdomId = 0): Unit | null {
    if (this.units.length >= MAX_UNITS) return null;
    const st = STATS[race];
    const u: Unit = {
      id: this.nextId++,
      race,
      name: unitName(this.rng, race),
      x,
      y,
      vx: 0,
      vy: 0,
      facing: this.rng() * Math.PI * 2,
      hp: st.hp,
      maxHp: st.hp,
      hunger: 20 + this.rng() * 20,
      age: race === "dragon" ? 40 + this.rng() * 80 : 8 + this.rng() * 18,
      lifespan: st.life * (0.8 + this.rng() * 0.4),
      kingdomId,
      job: "wander",
      targetX: x,
      targetY: y,
      targetId: 0,
      cooldown: this.rng(),
      king: false,
      infected: 0,
      homeId: 0,
      stamina: 100,
      gold: race === "sheep" || race === "wolf" ? 0 : randInt(this.rng, 0, 4),
      kills: 0,
      walkPhase: this.rng() * 6,
      blessed: 0,
      hue: this.rng(),
      gen: 1,
    };
    this.units.push(u);
    this.stats.births++;
    return u;
  }

  kill(u: Unit, reason = "fell") {
    const i = this.units.indexOf(u);
    if (i < 0) return;
    this.units.splice(i, 1);
    this.stats.deaths++;
    this.burst(u.x, u.y, u.race === "dragon" ? 28 : 10, 160, 30, 30, "blood", 2.2);
    if (u.race === "dragon") this.burst(u.x, u.y, 18, 40, 40, 40, "smoke", 1.4);
    if (this.possessedId === u.id) this.possessedId = 0;
    if (this.selectedId === u.id) this.selectedId = 0;
    if (SAPIENT.includes(u.race) || u.race === "dragon") {
      this.log(`${u.name} ${reason}.`);
    }
    if (u.king) {
      const k = this.kingdoms.find((g) => g.id === u.kingdomId);
      if (k) {
        const heir = this.units.find((o) => o.kingdomId === k.id && o.id !== u.id && SAPIENT.includes(o.race));
        if (heir) {
          heir.king = true;
          k.founderId = heir.id;
          this.log(`${heir.name} takes the crown of ${k.name}.`);
        } else {
          k.dead = true;
          this.log(`${k.name} has fallen.`);
        }
      }
    }
  }

  buildingAt(x: number, y: number): Building | undefined {
    const tx = x | 0;
    const ty = y | 0;
    return this.buildings.find((b) => b.x === tx && b.y === ty);
  }

  placeBuilding(kind: BuildingKind, x: number, y: number, kingdomId: number): Building | null {
    const tx = x | 0;
    const ty = y | 0;
    if (!inBounds(tx, ty) || !walkableTile(this.tileAt(tx, ty))) return null;
    if (this.buildingAt(tx, ty)) return null;
    if (this.buildings.length >= MAX_BUILDINGS) return null;
    const hp = kind === "castle" ? 220 : kind === "wonder" ? 260 : kind === "house" ? 70 : 90;
    const b: Building = { id: this.nextId++, kind, x: tx, y: ty, hp, maxHp: hp, kingdomId, stored: 0 };
    this.buildings.push(b);
    return b;
  }

  paint(cx: number, cy: number, tool: ToolId, brush: number) {
    const t = TILE_FROM_TOOL[tool];
    if (t === undefined) return;
    const ox = cx | 0;
    const oy = cy | 0;
    const r = Math.max(0, brush);
    const r2 = r * r;
    for (let y = oy - r; y <= oy + r; y++) {
      for (let x = ox - r; x <= ox + r; x++) {
        const dx = x - ox;
        const dy = y - oy;
        if (dx * dx + dy * dy > r2 + 0.2) continue;
        if (!inBounds(x, y)) continue;
        this.setTile(x, y, t);
        if (t !== TILE.LAVA && t !== TILE.FOREST) this.heat[idx(x, y)] = 0;
      }
    }
  }

  genesis(kind: "living" | "isles" | "blank" = "living") {
    this.units = [];
    this.buildings = [];
    this.kingdoms = [];
    this.particles = [];
    this.bolts = [];
    this.disasters = [];
    this.floats = [];
    this.events = [];
    this.possessedId = 0;
    this.selectedId = 0;
    this.year = 1;
    this.timeOfDay = 0.28;
    this.weather = "clear";
    this.stats = { births: 0, deaths: 0, wars: 0, miracles: 0 };
    this.heat.fill(0);
    this.markDirty(0, 0, 999);

    if (kind === "blank") {
      this.tiles.fill(TILE.VOID);
      this.log("The void waits.");
      return;
    }

    const elevSeed = this.seed;
    const moistSeed = this.seed ^ 0x9e3779b9;
    const warpSeed = this.seed ^ 0x85ebca6b;
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;
    const isles = kind === "isles";

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const wx = fbm(x * 0.03, y * 0.03, warpSeed, 3);
        const wy = fbm(x * 0.03 + 40, y * 0.03, warpSeed + 3, 3);
        const nx = (x + (wx - 0.5) * 14) / this.w;
        const ny = (y + (wy - 0.5) * 14) / this.h;
        let e = fbm(nx * 6.2, ny * 6.2, elevSeed, 5);
        const m = fbm(nx * 5.4 + 20, ny * 5.4, moistSeed, 4);
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const island = Math.max(0, 1 - Math.pow(dist, isles ? 1.15 : 1.45));
        if (isles) {
          const dots = fbm(x * 0.045, y * 0.045, elevSeed + 9, 3);
          e = e * 0.55 + dots * 0.45;
        }
        e = Math.pow(e * island, isles ? 1.05 : 1.25);
        const lat = y / this.h;
        let t: Tile = TILE.WATER;
        if (e < 0.34) t = TILE.WATER;
        else if (e < 0.38) t = TILE.SAND;
        else if (e < 0.55) t = m > 0.58 ? TILE.FOREST : m < 0.32 ? TILE.SAND : TILE.GRASS;
        else if (e < 0.68) t = m > 0.5 ? TILE.FOREST : TILE.GRASS;
        else if (e < 0.8) t = TILE.MOUNTAIN;
        else t = TILE.SNOW;
        if (lat < 0.18 && e > 0.4) t = e > 0.62 ? TILE.SNOW : TILE.ICE;
        if (lat > 0.82 && e > 0.42 && m < 0.4) t = TILE.SAND;
        if (e > 0.72 && m < 0.22 && lat > 0.55) t = TILE.LAVA;
        if (m > 0.78 && e > 0.36 && e < 0.5) t = TILE.SWAMP;
        this.tiles[idx(x, y)] = t;
        if (t === TILE.LAVA) this.heat[idx(x, y)] = 180;
      }
    }

    this.seedLife(kind);
    this.log(kind === "isles" ? "Archipelagos rise from the deep." : "A continent wakes.");
  }

  private landSpots(pred: (t: Tile, x: number, y: number) => boolean): [number, number][] {
    const spots: [number, number][] = [];
    for (let y = 4; y < this.h - 4; y += 2) {
      for (let x = 4; x < this.w - 4; x += 2) {
        if (pred(this.tileAt(x, y), x, y)) spots.push([x, y]);
      }
    }
    return spots;
  }

  private seedLife(kind: "living" | "isles") {
    const grass = this.landSpots((t) => t === TILE.GRASS || t === TILE.FARM || t === TILE.SAND);
    const forest = this.landSpots((t) => t === TILE.FOREST);
    const mtn = this.landSpots((t) => t === TILE.MOUNTAIN || t === TILE.SNOW);
    const anyLand = this.landSpots((t) => walkableTile(t));
    if (anyLand.length < 20) return;

    const tribe = (race: Race, n: number, pool: [number, number][], spread: number) => {
      const src = pool.length ? pool : anyLand;
      const origin = pick(this.rng, src);
      for (let i = 0; i < n; i++) {
        let x = origin[0] + randRange(this.rng, -spread, spread);
        let y = origin[1] + randRange(this.rng, -spread, spread);
        x = Math.max(2, Math.min(this.w - 3, x));
        y = Math.max(2, Math.min(this.h - 3, y));
        if (!this.walkable(x, y, race)) {
          const fb = pick(this.rng, src);
          x = fb[0];
          y = fb[1];
        }
        this.spawn(race, x + this.rng(), y + this.rng());
      }
      return origin;
    };

    const c1 = tribe("human", kind === "isles" ? 14 : 22, grass, 5);
    tribe("orc", kind === "isles" ? 12 : 18, grass, 5);
    tribe("elf", kind === "isles" ? 10 : 16, forest.length ? forest : grass, 4);
    tribe("dwarf", 10, mtn.length ? mtn : grass, 4);

    for (let i = 0; i < (kind === "isles" ? 10 : 16); i++) {
      const p = pick(this.rng, grass.length ? grass : anyLand);
      this.spawn("sheep", p[0] + this.rng(), p[1] + this.rng());
    }
    for (let i = 0; i < 10; i++) {
      const p = pick(this.rng, forest.length ? forest : anyLand);
      this.spawn("wolf", p[0] + this.rng(), p[1] + this.rng());
    }
    const peaks = mtn.length ? mtn : anyLand;
    for (let i = 0; i < 2; i++) {
      const p = pick(this.rng, peaks);
      this.spawn("dragon", p[0], p[1]);
    }

    // a starter hamlet near humans
    for (let i = 0; i < 4; i++) {
      this.placeBuilding("house", c1[0] + randInt(this.rng, -3, 3), c1[1] + randInt(this.rng, -3, 3), 0);
    }
    this.placeBuilding("farm", c1[0] + 2, c1[1], 0);
  }

  unitAt(x: number, y: number, r = 0.7): Unit | undefined {
    let best: Unit | undefined;
    let bestD = r * r;
    for (const u of this.units) {
      const dx = u.x - x;
      const dy = u.y - y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  nearest(x: number, y: number, pred: (u: Unit) => boolean): Unit | undefined {
    let best: Unit | undefined;
    let bestD = 1e9;
    for (const u of this.units) {
      if (!pred(u)) continue;
      const dx = u.x - x;
      const dy = u.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  inspectAt(x: number, y: number): InspectPayload {
    const u = this.unitAt(x, y, 0.85);
    const b = this.buildingAt(x, y);
    const biome = TILE_NAME[this.tileAt(x, y)] ?? "void";
    const payload: InspectPayload = { kind: "tile", tileX: x | 0, tileY: y | 0, biome };
    if (u) {
      payload.kind = "unit";
      payload.unit = this.toInspect(u);
      this.selectedId = u.id;
    } else if (b) {
      payload.kind = "building";
      const k = this.kingdoms.find((g) => g.id === b.kingdomId);
      payload.building = { kind: b.kind, hp: b.hp, kingdom: k?.name ?? "none" };
      this.selectedId = 0;
    } else {
      this.selectedId = 0;
    }
    this.selectedTileX = x | 0;
    this.selectedTileY = y | 0;
    return payload;
  }

  toInspect(u: Unit): InspectUnit {
    const k = this.kingdoms.find((g) => g.id === u.kingdomId);
    const traits: string[] = [];
    if (u.king) traits.push("crowned");
    if (u.blessed > 0) traits.push("blessed");
    if (u.infected > 0) traits.push("plagued");
    if (u.age > u.lifespan * 0.7) traits.push("elder");
    if (u.kills >= 5) traits.push("blooded");
    if (u.hunger > 70) traits.push("starving");
    if (u.gen > 1) traits.push(`line ${u.gen}`);
    return {
      id: u.id,
      name: u.name,
      race: u.race,
      hp: Math.round(u.hp),
      maxHp: u.maxHp,
      hunger: Math.round(u.hunger),
      age: Math.round(u.age),
      job: u.job,
      kingdom: k?.name ?? "wild",
      king: u.king,
      kills: u.kills,
      gold: u.gold | 0,
      infected: u.infected > 0,
      blessed: u.blessed > 0,
      traits,
    };
  }

  possessAt(x: number, y: number): Unit | null {
    const u = this.unitAt(x, y, 1.1);
    if (!u) return null;
    this.possessedId = u.id;
    this.selectedId = u.id;
    this.burst(u.x, u.y, 16, 200, 210, 230, "glow", 1.6);
    this.float(u.x, u.y - 0.6, "possessed", 210, 220, 235);
    this.log(`You wear the flesh of ${u.name}.`);
    this.stats.miracles++;
    return u;
  }

  unpossess() {
    const u = this.units.find((o) => o.id === this.possessedId);
    this.possessedId = 0;
    if (u) this.log(`You leave ${u.name}.`);
  }

  possessed(): Unit | undefined {
    return this.units.find((u) => u.id === this.possessedId);
  }

  applyTool(tool: ToolId, x: number, y: number, brush: number) {
    switch (tool) {
      case "grass":
      case "forest":
      case "sand":
      case "water":
      case "mountain":
      case "snow":
      case "lava":
      case "farm":
      case "erase":
        this.paint(x, y, tool, brush);
        break;
      case "human":
      case "orc":
      case "elf":
      case "dwarf":
      case "wolf":
      case "sheep":
      case "dragon":
      case "undead":
        this.spawn(tool, x, y);
        this.burst(x, y, 8, 180, 200, 160, "glow", 1.2);
        break;
      case "lightning":
        this.lightning(x, y);
        break;
      case "meteor":
        this.disasters.push({ kind: "meteor", x: x - 4, y: y - 10, vx: 5, vy: 12, life: 1.05, radius: 3.2 });
        break;
      case "tornado":
        this.disasters.push({ kind: "tornado", x, y, vx: randRange(this.rng, -1.2, 1.2), vy: randRange(this.rng, -1.2, 1.2), life: 9, radius: 2.4 });
        this.log("A gale walks the land.");
        break;
      case "quake":
        this.quake(x, y);
        break;
      case "volcano":
        this.volcano(x, y);
        break;
      case "bless":
        this.bless(x, y, brush);
        break;
      case "plague":
        this.plague(x, y);
        break;
      case "storm":
        this.weather = "storm";
        this.weatherT = 18;
        this.disasters.push({ kind: "stormcell", x, y, vx: 0.4, vy: 0.2, life: 14, radius: 8 });
        this.log("The heavens open.");
        break;
      case "magnet":
        this.magnet(x, y);
        break;
      case "inspect":
        this.inspectAt(x, y);
        break;
      case "possess":
        this.possessAt(x, y);
        break;
      case "kill": {
        const u = this.unitAt(x, y, 0.9);
        if (u) this.kill(u, "was smitten");
        break;
      }
      case "heal": {
        const u = this.unitAt(x, y, 1);
        if (u) {
          u.hp = u.maxHp;
          u.hunger = Math.min(u.hunger, 20);
          u.infected = 0;
          this.burst(u.x, u.y, 10, 140, 210, 150, "glow", 1);
          this.float(u.x, u.y, "mended", 140, 210, 150);
        }
        break;
      }
      case "crown":
        this.crownAt(x, y);
        break;
      case "nudge": {
        const u = this.unitAt(x, y, 1.2);
        if (u) {
          const a = Math.atan2(u.y - y, u.x - x);
          u.vx += Math.cos(a) * 6;
          u.vy += Math.sin(a) * 6;
          this.burst(u.x, u.y, 6, 220, 220, 220, "spark", 2);
        }
        break;
      }
      default:
        break;
    }
  }

  lightning(x: number, y: number) {
    this.flash = 0.55;
    this.addTrauma(0.55);
    this.burst(x, y, 22, 220, 230, 255, "spark", 4);
    this.stats.miracles++;
    for (const u of [...this.units]) {
      const d = Math.hypot(u.x - x, u.y - y);
      if (d < 2.2) {
        u.hp -= 50;
        if (u.hp <= 0) this.kill(u, "was struck by lightning");
      }
    }
    const t = this.tileAt(x, y);
    if (t === TILE.FOREST || t === TILE.GRASS || t === TILE.FARM) {
      this.heat[idx(x, y)] = 220;
    }
    this.log("Lightning splits the sky.");
  }

  quake(x: number, y: number) {
    this.addTrauma(0.8);
    this.stats.miracles++;
    for (let oy = -5; oy <= 5; oy++) {
      for (let ox = -5; ox <= 5; ox++) {
        if (this.rng() > 0.28) continue;
        const tx = x + ox;
        const ty = y + oy;
        const t = this.tileAt(tx, ty);
        if (t === TILE.MOUNTAIN) this.setTile(tx, ty, TILE.ASH);
        else if (t === TILE.GRASS || t === TILE.FOREST) this.setTile(tx, ty, this.rng() > 0.5 ? TILE.SAND : TILE.ASH);
        else if (t === TILE.WATER && this.rng() > 0.7) this.setTile(tx, ty, TILE.SAND);
      }
    }
    for (const b of [...this.buildings]) {
      if (Math.hypot(b.x - x, b.y - y) < 6) {
        b.hp -= 40;
        if (b.hp <= 0) this.removeBuilding(b);
      }
    }
    for (const u of this.units) {
      if (Math.hypot(u.x - x, u.y - y) < 6) {
        u.hp -= 8;
        u.vx += randRange(this.rng, -2, 2);
        u.vy += randRange(this.rng, -2, 2);
      }
    }
    this.log("The ground breaks.");
  }

  volcano(x: number, y: number) {
    this.addTrauma(0.7);
    this.stats.miracles++;
    for (let oy = -3; oy <= 3; oy++) {
      for (let ox = -3; ox <= 3; ox++) {
        const d = Math.hypot(ox, oy);
        if (d > 3.2) continue;
        if (d < 1.2) this.setTile(x + ox, y + oy, TILE.LAVA);
        else if (d < 2.2) this.setTile(x + ox, y + oy, TILE.MOUNTAIN);
        else if (walkableTile(this.tileAt(x + ox, y + oy))) this.setTile(x + ox, y + oy, TILE.ASH);
      }
    }
    this.log("A caldera wakes.");
  }

  bless(x: number, y: number, brush: number) {
    this.stats.miracles++;
    const r = Math.max(2, brush + 1);
    for (const u of this.units) {
      if (Math.hypot(u.x - x, u.y - y) < r) {
        u.blessed = 24;
        u.hp = Math.min(u.maxHp, u.hp + 18);
        u.hunger = Math.max(0, u.hunger - 30);
        u.infected = 0;
      }
    }
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (ox * ox + oy * oy > r * r) continue;
        const t = this.tileAt(x + ox, y + oy);
        if (t === TILE.ASH || t === TILE.SAND) this.setTile(x + ox, y + oy, TILE.GRASS);
        if (t === TILE.GRASS && this.rng() > 0.7) this.setTile(x + ox, y + oy, TILE.FOREST);
      }
    }
    this.burst(x, y, 14, 180, 220, 160, "glow", 1.4);
  }

  plague(x: number, y: number) {
    this.stats.miracles++;
    for (const u of this.units) {
      if (SAPIENT.includes(u.race) && Math.hypot(u.x - x, u.y - y) < 4) u.infected = 18;
    }
    this.log("A blight takes hold.");
  }

  magnet(x: number, y: number) {
    for (const u of this.units) {
      const dx = x - u.x;
      const dy = y - u.y;
      const d = Math.hypot(dx, dy) + 0.01;
      if (d < 10) {
        u.vx += (dx / d) * 4;
        u.vy += (dy / d) * 4;
      }
    }
  }

  crownAt(x: number, y: number) {
    const u = this.unitAt(x, y, 1);
    if (!u || !SAPIENT.includes(u.race)) return;
    if (u.kingdomId && !u.king) {
      for (const o of this.units) if (o.kingdomId === u.kingdomId) o.king = false;
      u.king = true;
      const k = this.kingdoms.find((g) => g.id === u.kingdomId);
      if (k) {
        k.founderId = u.id;
        k.dead = false;
      }
      this.log(`${u.name} is crowned.`);
      this.float(u.x, u.y, "crowned");
      return;
    }
    this.foundKingdom(u);
  }

  foundKingdom(u: Unit) {
    if (!SAPIENT.includes(u.race)) return;
    const k: Kingdom = {
      id: this.nextId++,
      name: kingdomName(this.rng),
      color: KINGDOM_COLORS[this.kingdoms.length % KINGDOM_COLORS.length]!,
      race: u.race,
      gold: 20,
      wars: [],
      founderId: u.id,
      age: 0,
      decree: "expand",
      dead: false,
    };
    this.kingdoms.push(k);
    u.king = true;
    u.kingdomId = k.id;
    for (const o of this.units) {
      if (o.id !== u.id && o.race === u.race && o.kingdomId === 0 && Math.hypot(o.x - u.x, o.y - u.y) < 9) {
        o.kingdomId = k.id;
      }
    }
    this.placeBuilding("castle", u.x | 0, u.y | 0, k.id);
    this.log(`${u.name} founds ${k.name}.`);
    this.float(u.x, u.y, k.name);
  }

  removeBuilding(b: Building) {
    const i = this.buildings.indexOf(b);
    if (i >= 0) this.buildings.splice(i, 1);
    this.burst(b.x + 0.5, b.y + 0.5, 12, 90, 80, 70, "smoke", 1.5);
  }

  special(u: Unit) {
    if (u.stamina < 24) return;
    u.stamina -= 24;
    const fx = -Math.sin(u.facing);
    const fy = -Math.cos(u.facing);
    switch (u.race) {
      case "dragon":
        this.bolts.push({ x: u.x, y: u.y, vx: fx * 9, vy: fy * 9, life: 0.7, damage: 24, ownerId: u.id, race: u.race });
        this.burst(u.x, u.y, 10, 255, 120, 40, "spark", 3);
        break;
      case "elf":
        this.bolts.push({ x: u.x, y: u.y, vx: fx * 11, vy: fy * 11, life: 0.55, damage: 14, ownerId: u.id, race: u.race });
        break;
      case "orc":
      case "dwarf":
        for (const o of this.units) {
          if (o.id === u.id) continue;
          if (Math.hypot(o.x - u.x, o.y - u.y) < 1.8) {
            o.hp -= STATS[u.race].dmg + 6;
            o.vx += (o.x - u.x) * 4;
            o.vy += (o.y - u.y) * 4;
            if (o.hp <= 0) {
              u.kills++;
              this.kill(o, `fell to ${u.name}`);
            }
          }
        }
        this.addTrauma(0.2);
        break;
      case "wolf":
        u.vx += fx * 7;
        u.vy += fy * 7;
        break;
      case "human":
        for (const o of this.units) {
          if (o.kingdomId && o.kingdomId === u.kingdomId && o.id !== u.id && Math.hypot(o.x - u.x, o.y - u.y) < 8) {
            o.job = "follow";
            o.targetId = u.id;
          }
        }
        this.float(u.x, u.y, "rally");
        break;
      case "undead":
        for (const o of this.units) {
          if (o.id !== u.id && Math.hypot(o.x - u.x, o.y - u.y) < 1.6) {
            o.hp -= 10;
            u.hp = Math.min(u.maxHp, u.hp + 8);
          }
        }
        break;
      default:
        break;
    }
  }

  attack(u: Unit, t: Unit) {
    if (u.cooldown > 0) return;
    u.cooldown = u.race === "elf" || u.race === "dragon" ? 0.55 : 0.7;
    const dmg = STATS[u.race].dmg * (0.75 + this.rng() * 0.5) * (u.blessed > 0 ? 1.25 : 1);
    if (u.race === "elf" || u.race === "dragon") {
      const dx = t.x - u.x;
      const dy = t.y - u.y;
      const d = Math.hypot(dx, dy) || 1;
      this.bolts.push({ x: u.x, y: u.y, vx: (dx / d) * 10, vy: (dy / d) * 10, life: 0.6, damage: dmg, ownerId: u.id, race: u.race });
      return;
    }
    t.hp -= dmg;
    t.vx += (t.x - u.x) * 1.8;
    t.vy += (t.y - u.y) * 1.8;
    this.burst((u.x + t.x) / 2, (u.y + t.y) / 2, 4, 200, 40, 40, "blood", 1.4);
    if (t.hp <= 0) {
      u.kills++;
      u.gold += t.gold;
      this.kill(t, `fell to ${u.name}`);
    }
  }

  private rebuildCells() {
    const gw = Math.ceil(this.w / this.cellSize);
    const gh = Math.ceil(this.h / this.cellSize);
    const n = gw * gh;
    if (this.cell.length !== n) this.cell = Array.from({ length: n }, () => []);
    else for (let i = 0; i < n; i++) this.cell[i]!.length = 0;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i]!;
      const cx = Math.min(gw - 1, Math.max(0, (u.x / this.cellSize) | 0));
      const cy = Math.min(gh - 1, Math.max(0, (u.y / this.cellSize) | 0));
      this.cell[cy * gw + cx]!.push(i);
    }
  }

  neighbors(u: Unit, r: number): Unit[] {
    const gw = Math.ceil(this.w / this.cellSize);
    const gh = Math.ceil(this.h / this.cellSize);
    const r2 = r * r;
    const x0 = Math.max(0, ((u.x - r) / this.cellSize) | 0);
    const y0 = Math.max(0, ((u.y - r) / this.cellSize) | 0);
    const x1 = Math.min(gw - 1, ((u.x + r) / this.cellSize) | 0);
    const y1 = Math.min(gh - 1, ((u.y + r) / this.cellSize) | 0);
    const out: Unit[] = [];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const bucket = this.cell[cy * gw + cx];
        if (!bucket) continue;
        for (const i of bucket) {
          const o = this.units[i]!;
          if (o.id === u.id) continue;
          const dx = o.x - u.x;
          const dy = o.y - u.y;
          if (dx * dx + dy * dy <= r2) out.push(o);
        }
      }
    }
    return out;
  }

  moveUnit(u: Unit, dt: number, updateFacing = true) {
    let nx = u.x + u.vx * dt;
    let ny = u.y + u.vy * dt;
    nx = Math.max(0.4, Math.min(this.w - 0.4, nx));
    ny = Math.max(0.4, Math.min(this.h - 0.4, ny));
    if (this.walkable(nx, ny, u.race) || u.race === "dragon") {
      u.x = nx;
      u.y = ny;
    } else if (this.walkable(nx, u.y, u.race)) {
      u.x = nx;
      u.vy *= -0.4;
    } else if (this.walkable(u.x, ny, u.race)) {
      u.y = ny;
      u.vx *= -0.4;
    } else {
      u.vx *= -0.6;
      u.vy *= -0.6;
      u.cooldown = 0;
    }
    const sp = Math.hypot(u.vx, u.vy);
    if (updateFacing && sp > 0.08) {
      u.facing = Math.atan2(-u.vx, -u.vy);
      u.walkPhase += dt * (6 + sp);
    } else if (sp > 0.08) {
      u.walkPhase += dt * (6 + sp);
    }
    u.vx *= Math.pow(0.18, dt);
    u.vy *= Math.pow(0.18, dt);
  }

  steer(u: Unit, tx: number, ty: number, speed: number) {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) return;
    u.vx += (dx / d) * speed;
    u.vy += (dy / d) * speed;
    const sp = Math.hypot(u.vx, u.vy);
    const cap = STATS[u.race].speed * (u.blessed > 0 ? 1.2 : 1);
    if (sp > cap) {
      u.vx = (u.vx / sp) * cap;
      u.vy = (u.vy / sp) * cap;
    }
  }

  step(dt: number) {
    this.simTime += dt;
    this.year += dt * 0.22;
    this.timeOfDay = (this.timeOfDay + dt * 0.018) % 1;
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      const roll = this.rng();
      this.weather = roll < 0.62 ? "clear" : roll < 0.82 ? "rain" : roll < 0.93 ? "snow" : "storm";
      this.weatherT = 16 + this.rng() * 28;
    }
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.birthGate -= dt;
    this.foundGate -= dt;

    this.stepHeat(dt);
    this.stepDisasters(dt);
    this.stepBolts(dt);
    this.rebuildCells();
    this.stepUnits(dt);
    this.stepKingdoms(dt);
    this.stepParticles(dt);

    if (this.weather === "rain" || this.weather === "storm") {
      for (let i = 0; i < (this.weather === "storm" ? 8 : 4); i++) {
        this.burst(this.rng() * this.w, this.rng() * this.h, 1, 160, 180, 210, "rain", 2.5);
      }
    }
  }

  private stepHeat(dt: number) {
    // scan a strided subset each tick plus lava always
    const stride = 7;
    const origin = (this.simTime * 20) | 0;
    for (let i = origin % stride; i < this.tiles.length; i += stride) {
      const t = this.tiles[i] as Tile;
      let h = this.heat[i]!;
      if (t === TILE.LAVA) h = Math.max(h, 160);
      if (h <= 0) continue;
      const x = i % this.w;
      const y = (i / this.w) | 0;
      if (t === TILE.FOREST || t === TILE.GRASS || t === TILE.FARM) {
        h = Math.min(255, h + dt * 18);
        if (h > 140 && this.rng() < dt * 0.8) {
          this.setTile(x, y, TILE.ASH);
          this.burst(x + 0.5, y + 0.5, 3, 255, 110, 40, "spark", 1.2);
        }
        if (this.rng() < dt * 2.5) {
          const nx = x + randInt(this.rng, -1, 1);
          const ny = y + randInt(this.rng, -1, 1);
          if (inBounds(nx, ny)) {
            const nt = this.tileAt(nx, ny);
            if (nt === TILE.FOREST || nt === TILE.GRASS || nt === TILE.FARM) {
              this.heat[idx(nx, ny)] = Math.max(this.heat[idx(nx, ny)]!, 80);
            }
          }
        }
      } else if (t !== TILE.LAVA) {
        h -= dt * 40;
      }
      if (this.weather === "rain" || this.weather === "storm") h -= dt * 70;
      this.heat[i] = Math.max(0, Math.min(255, h));
    }
  }

  private stepDisasters(dt: number) {
    for (const d of this.disasters) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.kind === "tornado") {
        d.vx += randRange(this.rng, -1.4, 1.4) * dt;
        d.vy += randRange(this.rng, -1.4, 1.4) * dt;
        this.burst(d.x, d.y, 2, 180, 190, 200, "smoke", 2);
        for (const u of this.units) {
          const dist = Math.hypot(u.x - d.x, u.y - d.y);
          if (dist < d.radius + 1.5) {
            const a = Math.atan2(u.y - d.y, u.x - d.x) + 0.7;
            u.vx += Math.cos(a) * 8 * dt * 8;
            u.vy += Math.sin(a) * 8 * dt * 8;
            u.hp -= dt * 8;
          }
        }
        if (this.rng() < dt * 6) {
          const t = this.tileAt(d.x, d.y);
          if (t === TILE.FOREST) this.setTile(d.x, d.y, TILE.GRASS);
        }
        const b = this.buildingAt(d.x, d.y);
        if (b) {
          b.hp -= dt * 25;
          if (b.hp <= 0) this.removeBuilding(b);
        }
      } else if (d.kind === "meteor") {
        this.burst(d.x, d.y, 2, 255, 140, 50, "spark", 2);
        if (d.life <= 0.05) {
          this.addTrauma(0.85);
          this.flash = 0.4;
          const tx = d.x + 4;
          const ty = d.y + 10;
          for (let oy = -3; oy <= 3; oy++) {
            for (let ox = -3; ox <= 3; ox++) {
              if (ox * ox + oy * oy > 10) continue;
              this.setTile(tx + ox, ty + oy, ox * ox + oy * oy < 3 ? TILE.LAVA : TILE.ASH);
            }
          }
          for (const u of [...this.units]) {
            if (Math.hypot(u.x - tx, u.y - ty) < 4) {
              u.hp -= 80;
              if (u.hp <= 0) this.kill(u, "was burned from the sky");
            }
          }
          for (const b of [...this.buildings]) {
            if (Math.hypot(b.x - tx, b.y - ty) < 4) this.removeBuilding(b);
          }
          this.burst(tx, ty, 36, 255, 120, 40, "spark", 5);
          this.log("A star falls.");
        }
      } else if (d.kind === "stormcell") {
        if (this.rng() < dt * 1.6) this.lightning(d.x + randRange(this.rng, -d.radius, d.radius), d.y + randRange(this.rng, -d.radius, d.radius));
      }
    }
    this.disasters = this.disasters.filter((d) => d.life > 0);
  }

  private stepBolts(dt: number) {
    for (const b of this.bolts) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.race === "dragon") {
        this.burst(b.x, b.y, 1, 255, 130, 40, "spark", 0.6);
        const t = this.tileAt(b.x, b.y);
        if (t === TILE.FOREST || t === TILE.GRASS) this.heat[idx(b.x, b.y)] = 180;
      }
      for (const u of this.units) {
        if (u.id === b.ownerId) continue;
        if (Math.hypot(u.x - b.x, u.y - b.y) < 0.55) {
          u.hp -= b.damage;
          b.life = 0;
          this.burst(u.x, u.y, 6, 255, 80, 40, "spark", 2);
          if (u.hp <= 0) {
            const owner = this.units.find((o) => o.id === b.ownerId);
            if (owner) owner.kills++;
            this.kill(u, "was felled at range");
          }
          break;
        }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);
  }

  private stepParticles(dt: number) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "rain") p.vy += 8 * dt;
      if (p.kind === "smoke") {
        p.vy -= 0.6 * dt;
        p.size += dt * 0.6;
      }
    }
    for (const f of this.floats) {
      f.life -= dt;
      f.y -= dt * 0.7;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  private stepUnits(dt: number) {
    const night = this.timeOfDay < 0.22 || this.timeOfDay > 0.78;
    const toKill: Unit[] = [];

    for (const u of this.units) {
      if (u.id === this.possessedId) {
        u.stamina = Math.min(100, u.stamina + dt * 18);
        u.age += dt * 0.22;
        continue;
      }

      const st = STATS[u.race];
      u.cooldown = Math.max(0, u.cooldown - dt);
      u.age += dt * 0.22;
      u.stamina = Math.min(100, u.stamina + dt * 10);
      if (st.hunger > 0) u.hunger += dt * st.hunger * (night ? 0.6 : 1);
      if (u.blessed > 0) {
        u.blessed -= dt;
        u.hunger = Math.max(0, u.hunger - dt * 8);
        u.hp = Math.min(u.maxHp, u.hp + dt * 3);
      }
      if (u.infected > 0) {
        u.infected -= dt;
        u.hp -= dt * 4;
        if (this.rng() < dt * 0.4) {
          for (const o of this.neighbors(u, 1.4)) if (SAPIENT.includes(o.race)) o.infected = Math.max(o.infected, 12);
        }
      }

      const tile = this.tileAt(u.x, u.y);
      if (tile === TILE.LAVA && u.race !== "dragon") u.hp -= dt * 28;
      const heat = this.heat[idx(u.x, u.y)] ?? 0;
      if (heat > 80 && u.race !== "dragon") u.hp -= dt * 10;
      if (u.hunger > 100) u.hp -= dt * 6;
      if (u.age > u.lifespan) u.hp -= dt * 8;

      if (u.hp <= 0) {
        toKill.push(u);
        continue;
      }

      if (tile === TILE.FARM && u.hunger > 10 && SAPIENT.includes(u.race)) {
        u.hunger = Math.max(0, u.hunger - dt * 22);
        u.job = "farm";
      }

      const near = this.neighbors(u, 5.5);
      this.ai(u, near, night, dt);

      this.moveUnit(u, dt);
    }

    for (const u of toKill) this.kill(u, u.infected > 0 ? "succumbed to blight" : u.age > u.lifespan ? "died of age" : "starved or burned");
  }

  private ai(u: Unit, near: Unit[], night: boolean, dt: number) {
    const sapient = SAPIENT.includes(u.race);
    let enemy: Unit | undefined;
    let prey: Unit | undefined;
    let ally: Unit | undefined;
    for (const o of near) {
      if (u.race === "wolf" && o.race === "sheep") prey = prey ?? o;
      if (u.race === "dragon" && o.race !== "dragon" && this.rng() > 0.3) prey = prey ?? o;
      if (u.race === "undead" && sapientOf(o)) prey = prey ?? o;
      if (o.race === "wolf" && u.race === "sheep") enemy = enemy ?? o;
      if (o.race === "dragon" && u.race !== "dragon") enemy = enemy ?? o;
      const war =
        u.kingdomId &&
        o.kingdomId &&
        u.kingdomId !== o.kingdomId &&
        this.atWar(u.kingdomId, o.kingdomId);
      if (war) enemy = enemy ?? o;
      if (sapient && o.kingdomId === u.kingdomId && o.id !== u.id) ally = ally ?? o;
    }

    if (u.job === "follow") {
      const lead = this.units.find((o) => o.id === u.targetId) ?? this.possessed();
      if (lead) {
        this.steer(u, lead.x + randRange(this.rng, -1, 1), lead.y + randRange(this.rng, -1, 1), 2.4);
        return;
      }
      u.job = "wander";
    }

    if (enemy && (u.race === "sheep" || (sapient && u.hp < u.maxHp * 0.35 && u.race !== "orc"))) {
      u.job = "flee";
      this.steer(u, u.x - (enemy.x - u.x), u.y - (enemy.y - u.y), 2.6);
      return;
    }

    if (enemy && (u.race === "orc" || u.king || (sapient && this.kingdomDecree(u.kingdomId) === "war"))) {
      u.job = "fight";
      const d = Math.hypot(enemy.x - u.x, enemy.y - u.y);
      if (d < (u.race === "elf" ? 4 : 1.05)) this.attack(u, enemy);
      else this.steer(u, enemy.x, enemy.y, 2.1);
      return;
    }

    if ((u.race === "wolf" || u.race === "dragon" || u.race === "undead") && prey) {
      u.job = "hunt";
      const d = Math.hypot(prey.x - u.x, prey.y - u.y);
      if (d < (u.race === "dragon" ? 3.2 : 0.9)) this.attack(u, prey);
      else this.steer(u, prey.x, prey.y, 2.3);
      return;
    }

    if (sapient && night) {
      const home = this.buildings.find((b) => b.id === u.homeId) ?? this.buildings.find((b) => (b.kind === "house" || b.kind === "castle") && (!u.kingdomId || b.kingdomId === u.kingdomId) && Math.hypot(b.x - u.x, b.y - u.y) < 16);
      if (home) {
        u.homeId = home.id;
        u.job = "sleep";
        this.steer(u, home.x + 0.5, home.y + 0.5, 1.6);
        if (Math.hypot(home.x + 0.5 - u.x, home.y + 0.5 - u.y) < 0.6) {
          u.hp = Math.min(u.maxHp, u.hp + dt * 6);
          u.hunger = Math.max(0, u.hunger - dt * 4);
          u.vx *= 0.5;
          u.vy *= 0.5;
        }
        return;
      }
    }

    if (sapient && u.hunger > 45) {
      const farm = this.buildings.find((b) => b.kind === "farm" && Math.hypot(b.x - u.x, b.y - u.y) < 14);
      if (farm) {
        u.job = "forage";
        this.steer(u, farm.x + 0.5, farm.y + 0.5, 1.8);
        if (Math.hypot(farm.x + 0.5 - u.x, farm.y + 0.5 - u.y) < 0.8) u.hunger = Math.max(0, u.hunger - dt * 28);
        return;
      }
      const sheep = near.find((o) => o.race === "sheep");
      if (sheep) {
        this.steer(u, sheep.x, sheep.y, 1.7);
        return;
      }
    }

    if (u.cooldown <= 0) {
      u.targetX = u.x + randRange(this.rng, -7, 7);
      u.targetY = u.y + randRange(this.rng, -7, 7);
      u.cooldown = 1.2 + this.rng() * 2.4;
      u.job = "wander";
    }
    this.steer(u, u.targetX, u.targetY, 1.15);
  }

  private atWar(a: number, b: number): boolean {
    const k = this.kingdoms.find((g) => g.id === a);
    return !!k && k.wars.includes(b);
  }

  private kingdomDecree(id: number): Decree | null {
    return this.kingdoms.find((g) => g.id === id)?.decree ?? null;
  }

  private stepKingdoms(dt: number) {
    if (this.foundGate <= 0) {
      this.foundGate = 2.5;
      const wild = this.units.filter((u) => SAPIENT.includes(u.race) && u.kingdomId === 0);
      const clusters = new Map<Race, Unit[]>();
      for (const u of wild) {
        const list = clusters.get(u.race) ?? [];
        list.push(u);
        clusters.set(u.race, list);
      }
      for (const [, list] of clusters) {
        if (list.length < 8) continue;
        const founder = list[0]!;
        const nearby = list.filter((o) => Math.hypot(o.x - founder.x, o.y - founder.y) < 8);
        if (nearby.length >= 8) {
          this.foundKingdom(founder);
          break;
        }
      }
    }

    for (const k of this.kingdoms) {
      if (k.dead) continue;
      k.age += dt * 0.22;
      const members = this.units.filter((u) => u.kingdomId === k.id);
      if (members.length === 0) {
        k.dead = true;
        this.log(`${k.name} is no more.`);
        continue;
      }
      k.gold += dt * members.length * 0.15;

      if (k.decree === "expand" && k.gold > 18 && this.rng() < dt * 0.4) {
        const u = pick(this.rng, members);
        const kind: BuildingKind = this.rng() > 0.55 ? "house" : this.rng() > 0.5 ? "farm" : "barracks";
        const b = this.placeBuilding(kind, (u.x + randRange(this.rng, -3, 3)) | 0, (u.y + randRange(this.rng, -3, 3)) | 0, k.id);
        if (b) k.gold -= 12;
      }

      if (k.decree === "worship" && k.gold > 30 && this.rng() < dt * 0.2) {
        const u = pick(this.rng, members);
        if (this.placeBuilding("temple", u.x | 0, u.y | 0, k.id)) k.gold -= 22;
      }

      if (this.birthGate <= 0 && members.length >= 2 && this.units.length < MAX_UNITS - 10) {
        const a = pick(this.rng, members);
        const b = members.find((o) => o.id !== a.id && Math.hypot(o.x - a.x, o.y - a.y) < 2.2);
        if (b && a.hunger < 55 && b.hunger < 55 && a.age > 14 && b.age > 14) {
          const child = this.spawn(a.race, (a.x + b.x) / 2, (a.y + b.y) / 2, k.id);
          if (child) {
            child.age = 1;
            child.gen = Math.max(a.gen, b.gen) + 1;
            child.hp = child.maxHp * 0.6;
            this.birthGate = 3.5;
            this.float(child.x, child.y, "born", 180, 200, 160);
          }
        }
      }

      for (const other of this.kingdoms) {
        if (other.id === k.id || other.dead) continue;
        if (k.wars.includes(other.id)) continue;
        if (k.decree !== "war" && other.decree !== "war" && this.rng() > dt * 0.02) continue;
        const mine = members[0]!;
        const theirs = this.units.find((u) => u.kingdomId === other.id);
        if (theirs && Math.hypot(mine.x - theirs.x, mine.y - theirs.y) < 12) {
          if (k.decree === "war" || other.decree === "war" || this.rng() < 0.35) {
            k.wars.push(other.id);
            other.wars.push(k.id);
            this.stats.wars++;
            this.log(`${k.name} wars with ${other.name}.`);
          }
        }
      }
    }
  }

  setDecree(id: number, d: Decree) {
    const k = this.kingdoms.find((g) => g.id === id);
    if (k) {
      k.decree = d;
      this.log(`${k.name} is ordered to ${d}.`);
    }
  }

  snapshot(): import("./types").HudSnapshot {
    const kstats = this.kingdoms
      .filter((k) => !k.dead)
      .map((k) => ({
        id: k.id,
        name: k.name,
        color: k.color,
        pop: this.units.filter((u) => u.kingdomId === k.id).length,
        gold: Math.round(k.gold),
        race: k.race,
        decree: k.decree,
      }));
    const pos = this.possessed();
    const sel = this.units.find((u) => u.id === this.selectedId);
    let inspect: InspectPayload | null = null;
    if (sel) {
      inspect = {
        kind: "unit",
        tileX: sel.x | 0,
        tileY: sel.y | 0,
        biome: TILE_NAME[this.tileAt(sel.x, sel.y)] ?? "void",
        unit: this.toInspect(sel),
      };
    } else if (this.selectedTileX >= 0) {
      const b = this.buildingAt(this.selectedTileX, this.selectedTileY);
      inspect = {
        kind: b ? "building" : "tile",
        tileX: this.selectedTileX,
        tileY: this.selectedTileY,
        biome: TILE_NAME[this.tileAt(this.selectedTileX, this.selectedTileY)] ?? "void",
        building: b
          ? {
              kind: b.kind,
              hp: b.hp,
              kingdom: this.kingdoms.find((g) => g.id === b.kingdomId)?.name ?? "none",
            }
          : undefined,
      };
    }
    return {
      year: this.year,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      pop: this.units.filter((u) => SAPIENT.includes(u.race)).length,
      animals: this.units.filter((u) => !SAPIENT.includes(u.race)).length,
      kingdoms: kstats,
      events: this.events.slice(0, 6),
      inspect,
      possess: pos ? this.toInspect(pos) : null,
      stats: { ...this.stats },
      paused: false,
      speed: 1,
    };
  }
}

function sapientOf(u: Unit) {
  return SAPIENT.includes(u.race);
}

export { SAPIENT, STATS };
