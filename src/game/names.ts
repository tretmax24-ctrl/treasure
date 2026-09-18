import { pick, type Rng } from "./rng";
import type { Race } from "./types";

const GIVEN: Record<Race, string[]> = {
  human: ["Aric", "Bryn", "Cora", "Dalen", "Elsa", "Fenn", "Gwen", "Harun", "Ilya", "Joss", "Kael", "Lira", "Mira", "Noll", "Owen", "Pia", "Rook", "Sera", "Tess", "Wren"],
  orc: ["Grash", "Ulgor", "Brakka", "Durn", "Hroga", "Karg", "Mog", "Rulga", "Skarn", "Vrok", "Zagra", "Thul"],
  elf: ["Aelith", "Calen", "Elarion", "Fael", "Ithil", "Lorien", "Nimue", "Sael", "Thalion", "Vael", "Ysolde"],
  dwarf: ["Bram", "Durgi", "Helga", "Korrin", "Magni", "Orin", "Runa", "Thrain", "Ulfric", "Yorri"],
  wolf: ["Ash", "Bramble", "Cinder", "Frost", "Nettle", "Shade", "Thorn"],
  sheep: ["Bell", "Cloud", "Down", "Moss", "Puff", "Willow"],
  dragon: ["Ashvyr", "Caldera", "Emberon", "Nirath", "Solkhar", "Vorthax"],
  undead: ["Barrow", "Chill", "Ghast", "Morrow", "Riven", "Wight"],
};

const HOUSE = ["Ash", "Briar", "Cove", "Dun", "Ember", "Flint", "Glen", "Holt", "Iron", "Marsh", "Oak", "Reed", "Stone", "Vale", "Wick"];

const REALM = [
  "Ashen Reach",
  "Verdant March",
  "Irondeep",
  "Stormfen",
  "Hollow Crown",
  "Redbarrow",
  "Silverpine",
  "Duskwatch",
  "Cinderhold",
  "Miregate",
  "Frosthelm",
  "Sunken Banner",
  "Thornwall",
  "Pale Harbor",
  "Nightwell",
];

export function unitName(rng: Rng, race: Race): string {
  const given = pick(rng, GIVEN[race]);
  if (race === "wolf" || race === "sheep" || race === "dragon" || race === "undead") return given;
  return `${given} ${pick(rng, HOUSE)}`;
}

export function kingdomName(rng: Rng): string {
  return pick(rng, REALM);
}

export const KINGDOM_COLORS = ["#b85c4a", "#3e8f78", "#4a6fa0", "#8a6a45", "#6a7a4a", "#8a4a5a", "#5a6a78", "#a07048"];
