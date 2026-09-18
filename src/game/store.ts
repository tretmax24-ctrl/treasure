import { create } from "zustand";
import type { Category, ToolId } from "./tools";
import type { Decree, HudSnapshot } from "./types";

export type Phase = "title" | "play";

export interface GameStore {
  phase: Phase;
  tool: ToolId;
  category: Category;
  brush: number;
  speed: number;
  paused: boolean;
  muted: boolean;
  menu: boolean;
  hint: string;
  savedFlash: boolean;
  hasSave: boolean;
  hud: HudSnapshot | null;
  stick: { x: number; y: number };
  set: (p: Partial<GameStore>) => void;
  setDecree: (id: number, d: Decree) => void;
}

export const useGame = create<GameStore>((set) => ({
  phase: "title",
  tool: "inspect",
  category: "fate",
  brush: 3,
  speed: 1,
  paused: false,
  muted: false,
  menu: false,
  hint: "Paint land. Spawn a people. Possess a soul.",
  savedFlash: false,
  hasSave: false,
  hud: null,
  stick: { x: 0, y: 0 },
  set: (p) => set(p),
  setDecree: () => undefined,
}));
