// src/systems/fate/types.ts
// Extraído de front_sistema_rpg/src/systems/fate/types.ts
// Apenas constantes e tipos necessários para projeção — sem UI.

export const DEFAULT_SKILLS = [
  "Atletismo",
  "Comunicação",
  "Condução",
  "Contatos",
  "Enganar",
  "Furtividade",
  "Investigar",
  "Lutar",
  "Percepção",
  "Provocar",
  "Recursos",
  "Relacionamento",
  "Roubar",
  "Saber",
  "Tiro",
  "Vontade",
] as const;

export type FateSkill = (typeof DEFAULT_SKILLS)[number];

export type StressTrackValues = {
  physical: number[];
  mental: number[];
  unified?: number[];
};