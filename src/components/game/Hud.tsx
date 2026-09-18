import type { PointerEvent as PE, ReactNode } from "react";
import {
  Axe,
  Biohazard,
  CloudLightning,
  CloudRain,
  Crown,
  Eraser,
  FastForward,
  Feather,
  Flame,
  Ghost,
  Hammer,
  Hand,
  Heart,
  Landmark,
  Magnet,
  Mountain,
  Orbit,
  Pause,
  PawPrint,
  PersonStanding,
  Play,
  Search,
  Skull,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  Trees,
  User,
  Volume2,
  VolumeX,
  Waves,
  Wheat,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, TOOLS, type ToolId } from "@/game/tools";
import { useGame } from "@/game/store";
import type { Decree } from "@/game/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ToolId, ReactNode> = {
  grass: <Sprout className="size-4" />,
  forest: <Trees className="size-4" />,
  sand: <Sun className="size-4" />,
  water: <Waves className="size-4" />,
  mountain: <Mountain className="size-4" />,
  snow: <Snowflake className="size-4" />,
  lava: <Flame className="size-4" />,
  farm: <Wheat className="size-4" />,
  erase: <Eraser className="size-4" />,
  human: <User className="size-4" />,
  orc: <Axe className="size-4" />,
  elf: <Feather className="size-4" />,
  dwarf: <Hammer className="size-4" />,
  wolf: <PawPrint className="size-4" />,
  sheep: <Landmark className="size-4" />,
  dragon: <Flame className="size-4" />,
  undead: <Ghost className="size-4" />,
  lightning: <CloudLightning className="size-4" />,
  meteor: <Orbit className="size-4" />,
  tornado: <Wind className="size-4" />,
  quake: <ActivityIcon />,
  volcano: <Mountain className="size-4" />,
  bless: <Sparkles className="size-4" />,
  plague: <Biohazard className="size-4" />,
  storm: <CloudRain className="size-4" />,
  magnet: <Magnet className="size-4" />,
  inspect: <Search className="size-4" />,
  possess: <PersonStanding className="size-4" />,
  kill: <Skull className="size-4" />,
  heal: <Heart className="size-4" />,
  crown: <Crown className="size-4" />,
  nudge: <Hand className="size-4" />,
};

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h4l3-8 6 16 3-8h4" />
    </svg>
  );
}

export function Hud({
  onPauseToggle,
  onSpeed,
  onSave,
  onTitle,
  onMute,
  onNew,
}: {
  onPauseToggle: () => void;
  onSpeed: (n: number) => void;
  onSave: () => void;
  onTitle: () => void;
  onMute: () => void;
  onNew: () => void;
}) {
  const category = useGame((s) => s.category);
  const tool = useGame((s) => s.tool);
  const brush = useGame((s) => s.brush);
  const paused = useGame((s) => s.paused);
  const speed = useGame((s) => s.speed);
  const muted = useGame((s) => s.muted);
  const menu = useGame((s) => s.menu);
  const hint = useGame((s) => s.hint);
  const hud = useGame((s) => s.hud);
  const savedFlash = useGame((s) => s.savedFlash);
  const set = useGame((s) => s.set);
  const setDecree = useGame((s) => s.setDecree);
  const possess = hud?.possess;

  const tools = TOOLS.filter((t) => t.category === category);
  const hour = hud ? Math.floor(hud.timeOfDay * 24) : 8;
  const clock = `${String(hour).padStart(2, "0")}:00`;
  const night = hud ? hud.timeOfDay < 0.22 || hud.timeOfDay > 0.78 : false;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <div className="pointer-events-auto absolute left-3 top-3 right-3 flex items-start justify-between gap-3 sm:left-4 sm:right-4 sm:top-4">
        <div className="game-panel rounded-[calc(var(--radius-md)+8px)] px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-lg font-semibold leading-none">Year {hud ? Math.floor(hud.year) : 1}</span>
            <span className="font-mono text-xs tabular-nums text-muted">{clock}</span>
            <span className="text-xs uppercase tracking-[0.16em] text-subtle">{night ? "Night" : "Day"}</span>
            <span className="text-xs capitalize text-muted">{hud?.weather ?? "clear"}</span>
          </div>
          <div className="mt-1 flex gap-3 font-mono text-xs tabular-nums text-muted">
            <span>{hud?.pop ?? 0} souls</span>
            <span>{hud?.animals ?? 0} beasts</span>
            <span>{hud?.kingdoms.length ?? 0} realms</span>
          </div>
        </div>
        <div className="hidden max-w-xs flex-col gap-1 sm:flex">
          {hud?.events.slice(0, 3).map((e, i) => (
            <p key={`${e.t}-${i}`} className="truncate text-right text-xs text-muted">
              {e.text}
            </p>
          ))}
        </div>
      </div>

      <div className="pointer-events-auto absolute left-3 top-24 hidden w-[5rem] flex-col gap-2 sm:flex">
        <div className="game-panel-soft flex flex-col gap-1 rounded-[calc(var(--radius-md)+6px)] p-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => set({ category: c.id })}
              className={cn(
                "h-8 rounded-[var(--radius-sm)] text-[10px] font-medium uppercase tracking-[0.14em]",
                category === c.id ? "bg-accent text-accent-fg" : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="game-panel-soft grid grid-cols-2 gap-1 rounded-[calc(var(--radius-md)+6px)] p-1.5">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => set({ tool: t.id, hint: t.hint })}
              className={cn(
                "flex size-10 items-center justify-center rounded-[var(--radius-sm)]",
                tool === t.id ? "bg-accent text-accent-fg" : "text-fg hover:bg-elevated",
              )}
            >
              {ICONS[t.id]}
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 flex flex-col gap-2 sm:hidden">
        <div className="flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface/90 p-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => set({ category: c.id })}
              className={cn(
                "h-10 shrink-0 rounded-[var(--radius-sm)] px-3 text-xs font-medium uppercase tracking-[0.12em]",
                category === c.id ? "bg-accent text-accent-fg" : "text-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface/90 p-1.5">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set({ tool: t.id, hint: t.hint })}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
                tool === t.id ? "bg-accent text-accent-fg" : "text-fg",
              )}
            >
              {ICONS[t.id]}
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="game-panel pointer-events-auto absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-[calc(var(--radius-md)+8px)] p-1.5 sm:flex">
        <IconBtn label={paused ? "Play" : "Pause"} onClick={onPauseToggle}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </IconBtn>
        {[1, 2, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSpeed(n)}
            className={cn(
              "h-10 min-w-10 rounded-[var(--radius-sm)] px-2 font-mono text-xs tabular-nums",
              speed === n && !paused ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            {n}x
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => set({ brush: Math.max(0, brush - 1) })}
          className="size-10 rounded-[var(--radius-sm)] text-lg text-muted hover:text-fg"
        >
          −
        </button>
        <span className="w-8 text-center font-mono text-xs tabular-nums text-muted">{brush}</span>
        <button
          type="button"
          onClick={() => set({ brush: Math.min(8, brush + 1) })}
          className="size-10 rounded-[var(--radius-sm)] text-lg text-muted hover:text-fg"
        >
          +
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <IconBtn label="Mute" onClick={onMute}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </IconBtn>
        <IconBtn label="Save" onClick={onSave}>
          <FastForward className="size-4 rotate-180" />
        </IconBtn>
      </div>

      <div className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface/65 px-3 py-1.5 text-xs text-subtle sm:flex"><span className="size-1.5 rounded-full bg-accent" /><span>{hint}</span></div>
      {savedFlash ? (
        <p className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs text-ok">World remembered</p>
      ) : null}

      {hud?.inspect?.unit && !possess ? (
        <aside className="game-panel pointer-events-auto absolute right-3 top-24 w-[17rem] max-w-[calc(100%-1.5rem)] rounded-[calc(var(--radius-md)+10px)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">{hud.inspect.unit.race}</p>
          <h2 className="font-display text-2xl font-semibold leading-tight">{hud.inspect.unit.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {hud.inspect.unit.kingdom}
            {hud.inspect.unit.king ? " · crowned" : ""} · {hud.inspect.unit.job}
          </p>
          <Meter label="Life" value={hud.inspect.unit.hp / hud.inspect.unit.maxHp} />
          <Meter label="Hunger" value={hud.inspect.unit.hunger / 100} warn />
          <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-muted">
            <span>Age {hud.inspect.unit.age}</span>
            <span>{hud.inspect.unit.kills} kills</span>
            <span>{hud.inspect.unit.gold} gold</span>
          </div>
          {hud.inspect.unit.traits.length ? (
            <p className="mt-2 text-xs text-muted">{hud.inspect.unit.traits.join(" · ")}</p>
          ) : null}
        </aside>
      ) : null}

      {hud?.inspect?.kind === "tile" && !hud.inspect.unit && !possess ? (
        <aside className="game-panel pointer-events-auto absolute right-3 top-24 w-[15rem] rounded-[calc(var(--radius-md)+10px)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">Land</p>
          <h2 className="font-display text-2xl font-semibold capitalize">{hud.inspect.biome}</h2>
          <p className="mt-1 font-mono text-xs text-muted">
            {hud.inspect.tileX}, {hud.inspect.tileY}
          </p>
        </aside>
      ) : null}

      {hud?.kingdoms.length && !possess ? (
        <div className="pointer-events-auto absolute right-3 bottom-24 hidden w-[17rem] flex-col gap-1 sm:flex">
          {hud.kingdoms.slice(0, 4).map((k) => (
            <div key={k.id} className="game-panel-soft rounded-[var(--radius-md)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: k.color }} />
                  {k.name}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">{k.pop}</span>
              </div>
              <div className="mt-1 flex gap-1">
                {(["expand", "defend", "war", "worship"] as Decree[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecree(k.id, d)}
                    className={cn(
                      "h-7 rounded-[var(--radius-xs)] px-1.5 text-[10px] uppercase tracking-[0.08em]",
                      k.decree === d ? "bg-accent text-accent-fg" : "text-subtle hover:text-fg",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {possess ? (
        <div className="game-panel pointer-events-auto absolute left-1/2 top-24 w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-[calc(var(--radius-md)+10px)] px-4 py-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">{possess.name}</h2>
            <span className="text-xs uppercase tracking-[0.16em] text-subtle">Possessed</span>
          </div>
          <Meter label="Life" value={possess.hp / possess.maxHp} />
          <p className="mt-1 text-xs text-muted">WASD walk · Space strike · F gift · Esc leave the flesh</p>
        </div>
      ) : null}

      {possess ? <VirtualStick /> : null}

      {menu ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/70">
          <div className="game-panel w-[min(22rem,calc(100%-2rem))] rounded-[var(--radius-xl)] p-6">
            <h2 className="font-display text-3xl font-semibold">Paused</h2>
            <p className="mt-1 text-sm text-muted">The world holds its breath.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => set({ menu: false, paused: false })}>Resume</Button>
              <Button variant="secondary" onClick={onSave}>
                Remember this world
              </Button>
              <Button variant="secondary" onClick={onNew}>
                New world
              </Button>
              <Button variant="ghost" onClick={onTitle}>
                Return to the void
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Meter({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] uppercase tracking-[0.14em] text-subtle">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{Math.round(v * 100)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className={cn("h-full rounded-full", warn ? "bg-danger" : "bg-accent")}
          style={{ width: `${v * 100}%` }}
        />
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-fg hover:bg-elevated"
    >
      {children}
    </button>
  );
}

function VirtualStick() {
  const set = useGame((s) => s.set);
  return (
    <div
      className="pointer-events-auto absolute bottom-36 left-4 size-28 rounded-full border border-border bg-surface/50 sm:hidden"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        aim(e, e.currentTarget, set);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) aim(e, e.currentTarget, set);
      }}
      onPointerUp={() => set({ stick: { x: 0, y: 0 } })}
      onPointerCancel={() => set({ stick: { x: 0, y: 0 } })}
    />
  );
}

function aim(
  e: PE<HTMLDivElement>,
  el: HTMLDivElement,
  set: (p: { stick: { x: number; y: number } }) => void,
) {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * 2 - 1;
  const y = (e.clientY - r.top) / r.height * 2 - 1;
  const m = Math.hypot(x, y);
  const s = m > 1 ? 1 / m : 1;
  set({ stick: { x: x * s, y: y * s } });
}
