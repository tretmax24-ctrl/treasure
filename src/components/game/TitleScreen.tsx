import { useState } from "react";
import { ArrowRight, Compass, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";

export function TitleScreen({
  onAwaken,
  onIsles,
  onBlank,
  onContinue,
}: {
  onAwaken: (seed?: string) => void;
  onIsles: (seed?: string) => void;
  onBlank: (seed?: string) => void;
  onContinue: () => void;
}) {
  const hasSave = useGame((s) => s.hasSave);
  const [seed, setSeed] = useState("");

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-bg">
      <img
        src="/splash.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-bg)_0%,color-mix(in_oklab,var(--color-bg)_82%,transparent)_46%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-bg)_0%,transparent_42%,color-mix(in_oklab,var(--color-bg)_35%,transparent)_100%)] pointer-events-none" />

      <div className="relative flex h-full flex-col justify-between px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-border-strong bg-surface/80 text-accent">
              <Crown className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-subtle">Primordia</p>
              <p className="text-xs text-muted">Worlds are meant to be shaped.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border bg-surface/65 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-subtle sm:flex">
            <Sparkles className="size-3.5" />
            Living world simulation
          </div>
        </header>

        <main className="w-full max-w-2xl pb-6 sm:pb-10">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted">
            <span className="h-px w-8 bg-border-strong" />
            God sandbox
          </p>
          <h1 className="font-display text-6xl font-semibold leading-[0.82] tracking-tight text-fg sm:text-8xl">
            PRIMORDIA
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Shape continents. Raise civilizations. Rewrite fate. Then step inside the world
            and experience the consequences as a living soul.
          </p>

          <div className="mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-subtle">World seed</span>
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface/85 px-3 focus-within:border-border-strong">
                <Compass className="size-4 shrink-0 text-subtle" />
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random world"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
                />
              </div>
            </label>
            <Button size="lg" className="h-11 sm:min-w-44" data-qa="awaken" onClick={() => onAwaken(seed)}>
              Awaken
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="mt-3 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
            <Button size="lg" variant="secondary" className="w-full" onClick={() => onIsles(seed)}>
              Scattered isles
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => onBlank(seed)}>
              Empty canvas
            </Button>
            {hasSave ? (
              <Button size="lg" variant="ghost" className="col-span-2 w-full sm:col-span-1" onClick={onContinue}>
                Continue world
              </Button>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-subtle">
            <span>Drag · paint</span>
            <span>Scroll · zoom</span>
            <span>Double tap · possess</span>
            <span>WASD · walk</span>
            <span>Space · act</span>
          </div>
        </main>

        <footer className="flex items-end justify-between gap-4 text-[10px] uppercase tracking-[0.16em] text-subtle">
          <span>Every world is seeded. Every life is temporary.</span>
          <span className="hidden sm:block">Build your myth.</span>
        </footer>
      </div>
    </div>
  );
}
