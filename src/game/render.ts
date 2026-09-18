import { hash2 } from "./rng";
import { TILE, type Building, type Race, type Unit } from "./types";
import { STATS, WORLD_H, WORLD_W, World } from "./world";

export const TILE_RGB: [number, number, number][] = [
  [12, 14, 20],
  [30, 92, 148],
  [210, 190, 122],
  [74, 140, 62],
  [38, 96, 48],
  [110, 106, 100],
  [220, 228, 236],
  [196, 64, 18],
  [168, 210, 230],
  [58, 86, 52],
  [186, 154, 64],
  [92, 78, 64],
];

const RACE_SKIN: Record<Race, [number, number, number]> = {
  human: [214, 176, 132],
  orc: [90, 122, 58],
  elf: [232, 214, 176],
  dwarf: [196, 140, 96],
  wolf: [120, 118, 122],
  sheep: [236, 232, 224],
  dragon: [168, 42, 32],
  undead: [188, 196, 178],
};

function shade(rgb: [number, number, number], k: number): string {
  const r = Math.max(0, Math.min(255, rgb[0] * k));
  const g = Math.max(0, Math.min(255, rgb[1] * k));
  const b = Math.max(0, Math.min(255, rgb[2] * k));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export class Renderer {
  terrain: HTMLCanvasElement;
  tctx: CanvasRenderingContext2D;
  cell = 6;

  constructor() {
    this.terrain = document.createElement("canvas");
    this.terrain.width = WORLD_W * this.cell;
    this.terrain.height = WORLD_H * this.cell;
    this.tctx = this.terrain.getContext("2d")!;
  }

  rebuild(world: World, all = false) {
    const c = this.cell;
    const x0 = all ? 0 : world.dirtyMinX;
    const y0 = all ? 0 : world.dirtyMinY;
    const x1 = all ? world.w : world.dirtyMaxX;
    const y1 = all ? world.h : world.dirtyMaxY;
    if (x1 <= x0 || y1 <= y0) return;
    const ctx = this.tctx;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = world.tiles[y * WORLD_W + x] ?? 0;
        const base = TILE_RGB[t] ?? TILE_RGB[0]!;
        const n = hash2(x, y, world.seed);
        const k = 0.86 + n * 0.28;
        ctx.fillStyle = shade(base, k);
        ctx.fillRect(x * c, y * c, c, c);
        if (t === TILE.FOREST) {
          ctx.fillStyle = shade([28, 72, 38], 0.9 + n * 0.2);
          ctx.fillRect(x * c + 1, y * c + 1, 2, 3);
          ctx.fillRect(x * c + 3, y * c + 2, 2, 3);
        } else if (t === TILE.MOUNTAIN) {
          ctx.fillStyle = shade([160, 156, 150], 0.8 + n * 0.3);
          ctx.fillRect(x * c + 1, y * c, 4, 2);
        } else if (t === TILE.WATER) {
          ctx.fillStyle = shade(base, 0.75 + n * 0.2);
          ctx.fillRect(x * c, y * c + ((x + y) % 3), c, 1);
        } else if (t === TILE.LAVA) {
          ctx.fillStyle = shade([255, 160, 40], 0.7 + n);
          ctx.fillRect(x * c + (n > 0.5 ? 2 : 1), y * c + 2, 2, 2);
        } else if (t === TILE.FARM) {
          ctx.fillStyle = shade([120, 90, 40], 1);
          ctx.fillRect(x * c, y * c + 2, c, 1);
        }
      }
    }
    world.resetDirty();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    world: World,
    camX: number,
    camY: number,
    zoom: number,
    w: number,
    h: number,
    time: number,
    brush: { x: number; y: number; r: number; show: boolean },
    shakeX: number,
    shakeY: number,
  ) {
    if (world.dirty) this.rebuild(world);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    ctx.drawImage(this.terrain, 0, 0, WORLD_W, WORLD_H);

    this.drawWater(ctx, world, camX, camY, zoom, w, h, time);
    this.drawHeat(ctx, world, camX, camY, zoom, w, h);
    this.drawBuildings(ctx, world);
    this.drawUnits(ctx, world, zoom);
    this.drawDisasters(ctx, world, time);
    this.drawBolts(ctx, world);
    this.drawParticles(ctx, world);
    this.drawFloats(ctx, world);
    if (brush.show) this.drawBrush(ctx, brush.x, brush.y, brush.r);

    ctx.restore();

    this.drawNight(ctx, world, camX, camY, zoom, w, h, shakeX, shakeY);
    this.drawAtmosphere(ctx, world, w, h);
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(230,240,255,${world.flash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawWater(
    ctx: CanvasRenderingContext2D,
    world: World,
    camX: number,
    camY: number,
    zoom: number,
    w: number,
    h: number,
    time: number,
  ) {
    const x0 = Math.max(0, ((camX - w / zoom / 2) | 0) - 1);
    const y0 = Math.max(0, ((camY - h / zoom / 2) | 0) - 1);
    const x1 = Math.min(world.w, ((camX + w / zoom / 2) | 0) + 2);
    const y1 = Math.min(world.h, ((camY + h / zoom / 2) | 0) + 2);
    ctx.fillStyle = "rgba(180,220,255,0.08)";
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (world.tiles[y * WORLD_W + x] !== TILE.WATER && world.tiles[y * WORLD_W + x] !== TILE.ICE) continue;
        const wave = Math.sin(x * 0.7 + y * 0.4 + time * 2.2);
        if (wave > 0.35) ctx.fillRect(x, y + 0.35 + wave * 0.12, 1, 0.18);
      }
    }
  }

  private drawHeat(
    ctx: CanvasRenderingContext2D,
    world: World,
    camX: number,
    camY: number,
    zoom: number,
    w: number,
    h: number,
  ) {
    const x0 = Math.max(0, ((camX - w / zoom / 2) | 0) - 1);
    const y0 = Math.max(0, ((camY - h / zoom / 2) | 0) - 1);
    const x1 = Math.min(world.w, ((camX + w / zoom / 2) | 0) + 2);
    const y1 = Math.min(world.h, ((camY + h / zoom / 2) | 0) + 2);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const heat = world.heat[y * WORLD_W + x]!;
        if (heat < 40) continue;
        const a = Math.min(0.55, heat / 255);
        ctx.fillStyle = `rgba(255,${90 + (heat >> 2)},20,${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  private drawBuildings(ctx: CanvasRenderingContext2D, world: World) {
    for (const b of world.buildings) {
      const k = world.kingdoms.find((g) => g.id === b.kingdomId);
      this.building(ctx, b, k?.color ?? "#8a8074");
    }
  }

  private building(ctx: CanvasRenderingContext2D, b: Building, color: string) {
    const x = b.x;
    const y = b.y;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(x + 0.1, y + 0.72, 0.85, 0.18);
    if (b.kind === "house") {
      ctx.fillStyle = color;
      ctx.fillRect(x + 0.15, y + 0.32, 0.7, 0.5);
      ctx.fillStyle = "#5a4030";
      ctx.beginPath();
      ctx.moveTo(x + 0.08, y + 0.36);
      ctx.lineTo(x + 0.5, y + 0.05);
      ctx.lineTo(x + 0.92, y + 0.36);
      ctx.fill();
      ctx.fillStyle = "#d8c48a";
      ctx.fillRect(x + 0.4, y + 0.5, 0.18, 0.32);
    } else if (b.kind === "farm") {
      ctx.fillStyle = "#c4a050";
      ctx.fillRect(x + 0.1, y + 0.35, 0.8, 0.5);
      ctx.fillStyle = "#6a5030";
      ctx.fillRect(x + 0.2, y + 0.2, 0.22, 0.25);
    } else if (b.kind === "castle") {
      ctx.fillStyle = color;
      ctx.fillRect(x + 0.08, y + 0.22, 0.84, 0.68);
      ctx.fillRect(x + 0.08, y + 0.05, 0.22, 0.25);
      ctx.fillRect(x + 0.7, y + 0.05, 0.22, 0.25);
      ctx.fillStyle = "#d8d2c6";
      ctx.fillRect(x + 0.42, y + 0.48, 0.18, 0.42);
    } else if (b.kind === "temple") {
      ctx.fillStyle = "#d6d0c4";
      ctx.fillRect(x + 0.18, y + 0.35, 0.64, 0.5);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + 0.08, y + 0.38);
      ctx.lineTo(x + 0.5, y + 0.02);
      ctx.lineTo(x + 0.92, y + 0.38);
      ctx.fill();
    } else if (b.kind === "barracks") {
      ctx.fillStyle = "#5a5248";
      ctx.fillRect(x + 0.1, y + 0.3, 0.8, 0.55);
      ctx.fillStyle = color;
      ctx.fillRect(x + 0.1, y + 0.3, 0.8, 0.12);
    } else if (b.kind === "wonder") {
      ctx.fillStyle = "#e8e4dc";
      ctx.fillRect(x + 0.35, y + 0.1, 0.3, 0.8);
      ctx.fillStyle = color;
      ctx.fillRect(x + 0.22, y + 0.55, 0.56, 0.12);
    } else {
      ctx.fillStyle = "#6a6258";
      ctx.fillRect(x + 0.15, y + 0.3, 0.7, 0.5);
    }
  }

  private drawUnits(ctx: CanvasRenderingContext2D, world: World, zoom: number) {
    const detailed = zoom >= 9;
    for (const u of world.units) {
      this.unit(ctx, world, u, detailed);
    }
  }

  private unit(ctx: CanvasRenderingContext2D, world: World, u: Unit, detailed: boolean) {
    const k = world.kingdoms.find((g) => g.id === u.kingdomId);
    const size = STATS[u.race].size;
    const bob = Math.sin(u.walkPhase) * 0.06;
    const x = u.x;
    const y = u.y + bob;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, u.y + 0.28 * size, 0.22 * size, 0.1 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    if (u.id === world.possessedId) {
      ctx.strokeStyle = "rgba(220,230,245,0.85)";
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.arc(x, y - 0.05, 0.55 * size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (u.id === world.selectedId) {
      ctx.strokeStyle = "rgba(236,232,225,0.55)";
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.arc(x, y - 0.05, 0.48 * size, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (u.race === "dragon") {
      this.dragon(ctx, u, x, y);
      return;
    }
    if (u.race === "wolf") {
      this.quad(ctx, x, y, [110, 108, 112], 0.55);
      return;
    }
    if (u.race === "sheep") {
      this.quad(ctx, x, y, [236, 232, 224], 0.5);
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(x - 0.08, y - 0.22, 0.1, 0.1);
      return;
    }

    const tunic = k ? k.color : shade(RACE_SKIN[u.race], 0.75 + u.hue * 0.2);
    const skin = shade(RACE_SKIN[u.race], 0.92 + u.hue * 0.12);
    const s = size;

    if (!detailed) {
      ctx.fillStyle = tunic;
      ctx.fillRect(x - 0.18 * s, y - 0.18 * s, 0.36 * s, 0.4 * s);
      ctx.fillStyle = skin;
      ctx.fillRect(x - 0.12 * s, y - 0.32 * s, 0.24 * s, 0.18 * s);
      return;
    }

    ctx.fillStyle = tunic;
    ctx.fillRect(x - 0.16 * s, y - 0.12 * s, 0.32 * s, 0.34 * s);
    ctx.fillStyle = skin;
    ctx.fillRect(x - 0.12 * s, y - 0.32 * s, 0.24 * s, 0.2 * s);
    if (u.race === "dwarf") {
      ctx.fillStyle = "#c45c28";
      ctx.fillRect(x - 0.12 * s, y - 0.16 * s, 0.24 * s, 0.1 * s);
    }
    if (u.race === "elf") {
      ctx.fillStyle = "#d8c878";
      ctx.fillRect(x - 0.14 * s, y - 0.34 * s, 0.28 * s, 0.06 * s);
    }
    if (u.king) {
      ctx.fillStyle = "#e8e0cc";
      ctx.fillRect(x - 0.1 * s, y - 0.4 * s, 0.2 * s, 0.08 * s);
    }
    if (u.infected > 0) {
      ctx.fillStyle = "rgba(80,140,70,0.45)";
      ctx.fillRect(x - 0.18 * s, y - 0.32 * s, 0.36 * s, 0.5 * s);
    }
    if (u.job === "sleep") {
      ctx.fillStyle = "rgba(236,232,225,0.7)";
      ctx.font = `${0.28 * s}px sans-serif`;
      ctx.fillText("z", x + 0.2 * s, y - 0.4 * s);
    }
  }

  private quad(ctx: CanvasRenderingContext2D, x: number, y: number, rgb: [number, number, number], s: number) {
    ctx.fillStyle = shade(rgb, 1);
    ctx.fillRect(x - 0.28 * s, y - 0.12 * s, 0.5 * s, 0.22 * s);
    ctx.fillRect(x + 0.12 * s, y - 0.2 * s, 0.18 * s, 0.16 * s);
  }

  private dragon(ctx: CanvasRenderingContext2D, u: Unit, x: number, y: number) {
    const flap = Math.sin(u.walkPhase * 1.6) * 0.18;
    ctx.fillStyle = "#a02820";
    ctx.beginPath();
    ctx.ellipse(x, y, 0.55, 0.22, u.facing, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a1c18";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 0.7, y - 0.45 - flap);
    ctx.lineTo(x + 0.1, y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.7, y - 0.45 - flap);
    ctx.lineTo(x - 0.1, y);
    ctx.fill();
    ctx.fillStyle = "#d8c48a";
    ctx.fillRect(x - 0.08, y - 0.12, 0.14, 0.1);
  }

  private drawDisasters(ctx: CanvasRenderingContext2D, world: World, time: number) {
    for (const d of world.disasters) {
      if (d.kind === "tornado") {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.strokeStyle = "rgba(200,210,220,0.35)";
        ctx.lineWidth = 0.12;
        for (let i = 0; i < 5; i++) {
          const r = 0.3 + i * 0.35;
          ctx.beginPath();
          ctx.ellipse(Math.sin(time * 6 + i) * 0.15, -i * 0.45, r, r * 0.45, time * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (d.kind === "meteor") {
        ctx.fillStyle = "#ffd0a0";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,140,50,0.7)";
        ctx.lineWidth = 0.18;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.vx * 0.12, d.y - d.vy * 0.12);
        ctx.stroke();
      } else if (d.kind === "stormcell") {
        ctx.fillStyle = "rgba(40,50,70,0.18)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawBolts(ctx: CanvasRenderingContext2D, world: World) {
    for (const b of world.bolts) {
      ctx.strokeStyle = b.race === "dragon" ? "#ff8a3a" : "#d8e8c8";
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05);
      ctx.stroke();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, world: World) {
    for (const p of world.particles) {
      if (p.life <= 0) continue;
      const a = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`;
      const s = p.size * (p.kind === "smoke" ? a : 1) * 0.18;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }

  private drawFloats(ctx: CanvasRenderingContext2D, world: World) {
    ctx.font = "0.42px Outfit, sans-serif";
    ctx.textAlign = "center";
    for (const f of world.floats) {
      ctx.fillStyle = `rgba(${f.r},${f.g},${f.b},${Math.max(0, f.life)})`;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.textAlign = "left";
  }

  private drawBrush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.strokeStyle = "rgba(236,232,225,0.45)";
    ctx.lineWidth = 0.07;
    ctx.setLineDash([0.2, 0.15]);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.4, r), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawAtmosphere(ctx: CanvasRenderingContext2D, world: World, w: number, h: number) {
    const tod = world.timeOfDay;
    const edge = tod < 0.22 || tod > 0.78 ? 0.38 : 0.22;
    const g = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.12, w * 0.5, h * 0.46, Math.max(w, h) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.68, "rgba(0,0,0,0.035)");
    g.addColorStop(1, `rgba(0,0,0,${edge})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(236,232,225,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  private drawNight(
    ctx: CanvasRenderingContext2D,
    world: World,
    camX: number,
    camY: number,
    zoom: number,
    w: number,
    h: number,
    shakeX: number,
    shakeY: number,
  ) {
    const tod = world.timeOfDay;
    let night = 0;
    if (tod < 0.22) night = 1 - tod / 0.22;
    else if (tod > 0.78) night = (tod - 0.78) / 0.22;
    if (night <= 0.02) return;
    ctx.fillStyle = `rgba(6,8,14,${0.55 * night})`;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);
    for (const b of world.buildings) {
      if (b.kind === "farm") continue;
      const g = ctx.createRadialGradient(b.x + 0.5, b.y + 0.4, 0.1, b.x + 0.5, b.y + 0.4, 2.2);
      g.addColorStop(0, `rgba(255,200,120,${0.28 * night})`);
      g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g;
      ctx.fillRect(b.x - 2, b.y - 2, 5, 5);
    }
    const p = world.possessed();
    if (p) {
      const g = ctx.createRadialGradient(p.x, p.y, 0.2, p.x, p.y, 3);
      g.addColorStop(0, `rgba(210,220,240,${0.22 * night})`);
      g.addColorStop(1, "rgba(210,220,240,0)");
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    ctx.restore();
  }
}
