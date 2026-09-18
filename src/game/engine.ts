import { GameAudio } from "./audio";
import { Renderer } from "./render";
import { hasSave, loadWorld, saveWorld } from "./save";
import { useGame } from "./store";
import { TOOLS, type ToolId } from "./tools";
import { xmur3 } from "./rng";
import { World, WORLD_H, WORLD_W } from "./world";

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __primordia?: { world: World; engine: Engine };
  }
}

const STEP = 1 / 20;
const PAN = 22;

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  world: World;
  renderer = new Renderer();
  audio = new GameAudio();
  camX = WORLD_W / 2;
  camY = WORLD_H / 2;
  zoom = 14;
  targetZoom = 14;
  keys = new Set<string>();
  injected: string[] | null = null;
  pointers = new Map<number, { x: number; y: number; button: number; ox: number; oy: number }>();
  dragging = false;
  painting = false;
  lastPaintX = -1;
  lastPaintY = -1;
  hoverX = 0;
  hoverY = 0;
  raf = 0;
  acc = 0;
  last = 0;
  running = false;
  hudAcc = 0;
  saveAcc = 0;
  noiseT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.world = new World((Math.random() * 1e9) | 0);
    this.bind();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.tick(dt, now / 1000);
    };
    this.raf = requestAnimationFrame(loop);
    this.installProbe();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbind();
  }

  newWorld(kind: "living" | "isles" | "blank", seedStr?: string) {
    const seed = seedStr && seedStr.trim() ? xmur3(seedStr.trim()) : (Math.random() * 1e9) | 0;
    this.world = new World(seed);
    this.world.genesis(kind);
    this.camX = WORLD_W / 2;
    this.camY = WORLD_H / 2;
    this.zoom = kind === "blank" ? 16 : 12;
    this.targetZoom = this.zoom;
    this.renderer.rebuild(this.world, true);
    this.installProbe();
    useGame.getState().set({ phase: "play", paused: false, menu: false, hud: this.hud() });
    this.audio.unlock();
    this.audio.click();
  }

  continueSave() {
    const w = loadWorld();
    if (!w) {
      this.newWorld("living");
      return;
    }
    this.world = w;
    this.camX = WORLD_W / 2;
    this.camY = WORLD_H / 2;
    this.renderer.rebuild(this.world, true);
    this.installProbe();
    useGame.getState().set({ phase: "play", paused: false, menu: false, hud: this.hud() });
    this.audio.unlock();
  }

  persist() {
    const ok = saveWorld(this.world);
    if (ok) {
      useGame.getState().set({ savedFlash: true, hasSave: true });
      setTimeout(() => useGame.getState().set({ savedFlash: false }), 1200);
    }
  }

  private hud() {
    const s = this.world.snapshot();
    const st = useGame.getState();
    s.paused = st.paused;
    s.speed = st.speed;
    return s;
  }

  private held(): Set<string> | string[] {
    return this.injected ?? this.keys;
  }

  private hasKey(code: string) {
    const h = this.held();
    if (h instanceof Set) return h.has(code);
    return h.includes(code);
  }

  private tick(dt: number, time: number) {
    const st = useGame.getState();
    this.targetZoom = Math.max(5, Math.min(28, this.targetZoom));
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-10 * dt));

    if (st.phase !== "play") {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.fillStyle = "#0a0b0d";
      this.ctx.fillRect(0, 0, w, h);
      return;
    }

    this.handleMove(dt, st);
    this.world.trauma = Math.max(0, this.world.trauma - dt * 1.7);

    if (!st.paused) {
      this.acc += dt * st.speed;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        this.world.step(STEP);
        this.acc -= STEP;
        steps++;
      }
    } else {
      this.acc = 0;
      this.world.trauma = Math.max(0, this.world.trauma - dt * 1.7);
    }

    this.followPossessed(dt);

    const shake = this.world.trauma * this.world.trauma;
    this.noiseT += dt * 18;
    const sx = (hashNoise(this.noiseT) - 0.5) * shake * 14;
    const sy = (hashNoise(this.noiseT + 40) - 0.5) * shake * 14;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderer.draw(
      this.ctx,
      this.world,
      this.camX,
      this.camY,
      this.zoom,
      w,
      h,
      time,
      { x: this.hoverX, y: this.hoverY, r: st.brush, show: st.phase === "play" && !st.menu },
      sx,
      sy,
    );

    this.hudAcc += dt;
    if (this.hudAcc > 0.18) {
      this.hudAcc = 0;
      useGame.getState().set({ hud: this.hud(), hasSave: hasSave() });
    }
    this.saveAcc += dt;
    if (this.saveAcc > 24 && st.phase === "play") {
      this.saveAcc = 0;
      saveWorld(this.world);
    }
  }

  private handleMove(dt: number, st: ReturnType<typeof useGame.getState>) {
    const possessed = this.world.possessed();
    let mx = 0;
    let my = 0;
    if (this.hasKey("KeyW") || this.hasKey("ArrowUp")) my -= 1;
    if (this.hasKey("KeyS") || this.hasKey("ArrowDown")) my += 1;
    if (this.hasKey("KeyA") || this.hasKey("ArrowLeft")) mx -= 1;
    if (this.hasKey("KeyD") || this.hasKey("ArrowRight")) mx += 1;
    mx += st.stick.x;
    my += st.stick.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }

    if (possessed) {
      const speed = 3.4 * (possessed.race === "dragon" ? 1.35 : 1) * (possessed.race === "wolf" ? 1.2 : 1);
      possessed.vx = mx * speed;
      possessed.vy = my * speed;
      if (mag > 0.08) possessed.facing = Math.atan2(-mx, -my);
      this.world.moveUnit(possessed, dt, false);
      possessed.stamina = Math.min(100, possessed.stamina + dt * 12);
    } else if (st.phase === "play" && !st.menu) {
      this.camX += mx * (PAN / this.zoom) * 60 * dt;
      this.camY += my * (PAN / this.zoom) * 60 * dt;
    }
    this.camX = Math.max(0, Math.min(WORLD_W, this.camX));
    this.camY = Math.max(0, Math.min(WORLD_H, this.camY));
  }

  private followPossessed(dt: number) {
    const p = this.world.possessed();
    if (!p) return;
    const k = 1 - Math.exp(-6 * dt);
    this.camX += (p.x - this.camX) * k;
    this.camY += (p.y - this.camY) * k;
  }

  screenToWorld(cx: number, cy: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = cx - rect.left;
    const y = cy - rect.top;
    const wx = (x - rect.width / 2) / this.zoom + this.camX;
    const wy = (y - rect.height / 2) / this.zoom + this.camY;
    return { x: wx, y: wy };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  useTool(x: number, y: number, tool: ToolId) {
    const before = this.world.possessedId;
    this.world.applyTool(tool, x, y, useGame.getState().brush);
    if (tool === "lightning") this.audio.lightning();
    else if (tool === "meteor" || tool === "volcano") this.audio.meteor();
    else if (tool === "quake") this.audio.quake();
    else if (tool === "bless" || tool === "heal") this.audio.bless();
    else if (tool === "possess" && this.world.possessedId && this.world.possessedId !== before) this.audio.possess();
    else if (["human", "orc", "elf", "dwarf", "wolf", "sheep", "dragon", "undead"].includes(tool)) this.audio.spawn();
    else if (tool === "kill") this.audio.hit();
    else this.audio.click();
    const def = TOOLS.find((t) => t.id === tool);
    if (def) useGame.getState().set({ hint: def.hint, hud: this.hud() });
  }

  private bind() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onVis = this.onVis.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVis);
  }

  private unbind() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  private onKeyDown(e: KeyboardEvent) {
    const st = useGame.getState();
    if (st.phase !== "play") return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    this.keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();

    if (e.code === "Escape") {
      if (this.world.possessedId) {
        this.world.unpossess();
        this.audio.unpossess();
      } else {
        useGame.getState().set({ menu: !st.menu, paused: !st.menu ? true : st.paused });
      }
    }
    if (e.code === "KeyP") useGame.getState().set({ paused: !st.paused });
    if (e.code === "Digit1") useGame.getState().set({ speed: 1, paused: false });
    if (e.code === "Digit2") useGame.getState().set({ speed: 2, paused: false });
    if (e.code === "Digit3") useGame.getState().set({ speed: 4, paused: false });
    if (e.code === "Equal" || e.code === "NumpadAdd") useGame.getState().set({ brush: Math.min(8, st.brush + 1) });
    if (e.code === "Minus" || e.code === "NumpadSubtract") useGame.getState().set({ brush: Math.max(0, st.brush - 1) });
    if (e.code === "KeyF" && this.world.possessed()) {
      this.world.special(this.world.possessed()!);
      this.audio.hit();
    }
    if (e.code === "Space" && this.world.possessed()) {
      const u = this.world.possessed()!;
      const t = this.world.nearest(u.x, u.y, (o) => o.id !== u.id && Math.hypot(o.x - u.x, o.y - u.y) < 1.6);
      if (t) this.world.attack(u, t);
      else this.world.special(u);
      this.audio.hit();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private onBlur() {
    this.keys.clear();
    this.painting = false;
    this.dragging = false;
  }

  private onVis() {
    if (document.hidden) {
      this.keys.clear();
      if (useGame.getState().phase === "play") saveWorld(this.world);
      if (this.audio) {
        /* keep */
      }
    } else {
      this.audio.unlock();
    }
  }

  private onPointerDown(e: PointerEvent) {
    const st = useGame.getState();
    if (st.phase !== "play" || st.menu) return;
    this.audio.unlock();
    this.canvas.setPointerCapture(e.pointerId);
    const w = this.screenToWorld(e.clientX, e.clientY);
    this.hoverX = w.x;
    this.hoverY = w.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, ox: e.clientX, oy: e.clientY });
    if (e.button === 1 || e.button === 2 || this.hasKey("Space")) {
      this.dragging = true;
      e.preventDefault();
      return;
    }
    if (e.button === 0) {
      if (e.detail === 2) {
        const u = this.world.possessAt(w.x, w.y);
        if (u) this.audio.possess();
        return;
      }
      const def = TOOLS.find((t) => t.id === st.tool);
      this.painting = !!def?.brush;
      this.useTool(w.x, w.y, st.tool);
      this.lastPaintX = w.x;
      this.lastPaintY = w.y;
    }
  }

  private onPointerMove(e: PointerEvent) {
    const st = useGame.getState();
    const wpos = this.screenToWorld(e.clientX, e.clientY);
    this.hoverX = wpos.x;
    this.hoverY = wpos.y;
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.dragging || p.button === 1 || p.button === 2) {
      this.camX -= dx / this.zoom;
      this.camY -= dy / this.zoom;
      return;
    }
    if (this.painting && st.phase === "play") {
      this.world.paint(wpos.x, wpos.y, st.tool, st.brush);
    }
  }

  private onPointerUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.painting = false;
    }
  }

  private onWheel(e: WheelEvent) {
    if (useGame.getState().phase !== "play") return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0012);
    this.targetZoom = Math.max(5, Math.min(28, this.targetZoom * factor));
  }

  installProbe() {
    window.__controlsTest = {
      getYaw: () => this.world.possessed()?.facing ?? 0,
      getSpeed: () => {
        const u = this.world.possessed();
        return u ? Math.hypot(u.vx, u.vy) : 0;
      },
      setKeys: (codes: string[]) => {
        this.injected = codes.length ? codes : null;
        if (codes.length && !this.world.possessed()) {
          if (useGame.getState().phase !== "play") this.newWorld("living");
          let u = this.world.units.find((o) => o.race === "human" && this.world.walkable(o.x, o.y, o.race));
          if (!u) u = this.world.spawn("human", WORLD_W / 2, WORLD_H / 2) ?? undefined;
          if (u) {
            // Park on open ground so the control probe is not fighting cliffs.
            u.x = WORLD_W / 2;
            u.y = WORLD_H / 2;
            for (let i = 0; i < 40; i++) {
              const tx = WORLD_W / 2 + ((i * 3) % 17) - 8;
              const ty = WORLD_H / 2 + ((i * 5) % 17) - 8;
              if (this.world.walkable(tx, ty, u.race)) {
                u.x = tx;
                u.y = ty;
                break;
              }
            }
            u.vx = 0;
            u.vy = 0;
            u.facing = 0;
            this.world.possessedId = u.id;
            this.camX = u.x;
            this.camY = u.y;
          }
        }
      },
    };
    window.__primordia = { world: this.world, engine: this };
  }
}

function hashNoise(t: number) {
  const s = Math.sin(t * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function bootHasSave() {
  return hasSave();
}
