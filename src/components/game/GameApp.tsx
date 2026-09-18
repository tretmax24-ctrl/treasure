import { useEffect, useRef } from "react";
import { Engine } from "@/game/engine";
import { hasSave } from "@/game/save";
import { useGame } from "@/game/store";
import { Hud } from "./Hud";
import { TitleScreen } from "./TitleScreen";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas);
    engineRef.current = engine;
    useGame.getState().set({
      hasSave: hasSave(),
      setDecree: (id, d) => engine.world.setDecree(id, d),
    });
    const resize = () => engine.resize();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    engine.start();
    return () => {
      ro.disconnect();
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
      />
      {phase === "title" ? (
        <TitleScreen
          onAwaken={(seed) => engineRef.current?.newWorld("living", seed)}
          onIsles={(seed) => engineRef.current?.newWorld("isles", seed)}
          onBlank={(seed) => engineRef.current?.newWorld("blank", seed)}
          onContinue={() => engineRef.current?.continueSave()}
        />
      ) : (
        <Hud
          onPauseToggle={() => useGame.getState().set({ paused: !useGame.getState().paused })}
          onSpeed={(n) => useGame.getState().set({ speed: n, paused: false })}
          onSave={() => engineRef.current?.persist()}
          onTitle={() => useGame.getState().set({ phase: "title", menu: false, paused: false })}
          onMute={() => {
            const next = !useGame.getState().muted;
            engineRef.current?.audio.setMuted(next);
            useGame.getState().set({ muted: next });
          }}
          onNew={() => {
            useGame.getState().set({ phase: "title", menu: false });
          }}
        />
      )}
    </div>
  );
}
