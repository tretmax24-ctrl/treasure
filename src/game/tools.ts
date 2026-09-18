export type Category = "land" | "life" | "wrath" | "fate";

export type ToolId =
  | "grass"
  | "forest"
  | "sand"
  | "water"
  | "mountain"
  | "snow"
  | "lava"
  | "farm"
  | "erase"
  | "human"
  | "orc"
  | "elf"
  | "dwarf"
  | "wolf"
  | "sheep"
  | "dragon"
  | "undead"
  | "lightning"
  | "meteor"
  | "tornado"
  | "quake"
  | "volcano"
  | "bless"
  | "plague"
  | "storm"
  | "magnet"
  | "inspect"
  | "possess"
  | "kill"
  | "heal"
  | "crown"
  | "nudge";

export interface ToolDef {
  id: ToolId;
  label: string;
  category: Category;
  hint: string;
  brush: boolean;
}

export const TOOLS: ToolDef[] = [
  { id: "grass", label: "Grass", category: "land", hint: "Paint living soil", brush: true },
  { id: "forest", label: "Forest", category: "land", hint: "Raise a wood", brush: true },
  { id: "sand", label: "Sand", category: "land", hint: "Shore and dune", brush: true },
  { id: "water", label: "Water", category: "land", hint: "Carve seas and lakes", brush: true },
  { id: "mountain", label: "Stone", category: "land", hint: "Lift mountains", brush: true },
  { id: "snow", label: "Snow", category: "land", hint: "Winter the peaks", brush: true },
  { id: "lava", label: "Lava", category: "land", hint: "Open the earth", brush: true },
  { id: "farm", label: "Farm", category: "land", hint: "Till the land", brush: true },
  { id: "erase", label: "Void", category: "land", hint: "Unmake the land", brush: true },
  { id: "human", label: "Human", category: "life", hint: "Builders and farmers", brush: false },
  { id: "orc", label: "Orc", category: "life", hint: "Warlike clans", brush: false },
  { id: "elf", label: "Elf", category: "life", hint: "Forest rangers", brush: false },
  { id: "dwarf", label: "Dwarf", category: "life", hint: "Mountain kin", brush: false },
  { id: "wolf", label: "Wolf", category: "life", hint: "Hunters of the wild", brush: false },
  { id: "sheep", label: "Sheep", category: "life", hint: "Gentle flocks", brush: false },
  { id: "dragon", label: "Dragon", category: "life", hint: "Apex of the sky", brush: false },
  { id: "undead", label: "Undead", category: "life", hint: "Restless dead", brush: false },
  { id: "lightning", label: "Bolt", category: "wrath", hint: "Strike from the sky", brush: false },
  { id: "meteor", label: "Meteor", category: "wrath", hint: "Call a falling star", brush: false },
  { id: "tornado", label: "Gale", category: "wrath", hint: "A walking storm", brush: false },
  { id: "quake", label: "Quake", category: "wrath", hint: "Shatter the ground", brush: false },
  { id: "volcano", label: "Caldera", category: "wrath", hint: "Wake a volcano", brush: false },
  { id: "bless", label: "Bless", category: "wrath", hint: "Heal and prosper", brush: true },
  { id: "plague", label: "Plague", category: "wrath", hint: "A spreading blight", brush: false },
  { id: "storm", label: "Tempest", category: "wrath", hint: "Open the heavens", brush: false },
  { id: "magnet", label: "Draw", category: "wrath", hint: "Pull souls together", brush: false },
  { id: "inspect", label: "Gaze", category: "fate", hint: "Read a soul or tile", brush: false },
  { id: "possess", label: "Possess", category: "fate", hint: "Wear a living body", brush: false },
  { id: "kill", label: "Smite", category: "fate", hint: "End a life", brush: false },
  { id: "heal", label: "Mend", category: "fate", hint: "Restore the wounded", brush: false },
  { id: "crown", label: "Crown", category: "fate", hint: "Raise a monarch", brush: false },
  { id: "nudge", label: "Finger", category: "fate", hint: "Flick a creature", brush: false },
];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "land", label: "Land" },
  { id: "life", label: "Life" },
  { id: "wrath", label: "Wrath" },
  { id: "fate", label: "Fate" },
];
