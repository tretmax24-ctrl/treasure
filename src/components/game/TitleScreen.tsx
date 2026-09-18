import { useState } from "react";
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
        className="absolute inset-0 h-full w-full object-cover opacity-80"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40 pointer-events-none" />

      <div className="relative flex h-full max-w-xl flex-col justify-end gap-6 px-6 pb-16 pt-20 sm:justify-center sm:px-12 sm:pb-0">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted">God sandbox</p>
        <h1 className="font-display text-5xl font-semibold leading-none tracking-tight text-fg sm:text-7xl">
          PRIMORDIA
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted">
          Shape continents. Found kingdoms. Possess any soul and walk the world you made.
        </p>

        <label className="flex max-w-sm flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">Seed</span>
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="leave blank for chance"
            className="h-11 rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-sm text-fg outline-none placeholder:text-subtle focus:border-border-strong"
          />
        </label>

        <div className="flex max-w-sm flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            data-qa="awaken"
            onClick={() => onAwaken(seed)}
          >
            Awaken a world
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => onIsles(seed)}>
            Scattered isles
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => onBlank(seed)}>
            Empty canvas
          </Button>
          {hasSave ? (
            <Button size="lg" variant="ghost" className="w-full" onClick={onContinue}>
              Continue
            </Button>
          ) : null}
        </div>

        <p className="max-w-md text-xs leading-relaxed text-subtle">
          Drag to paint. Scroll to zoom. Double-tap a soul to possess. WASD to walk. F for a gift of the flesh.
        </p>
      </div>
    </div>
  );
}
