// src/systems/fate/index.ts
//
// Plugin Fate para uso no BACKEND (e frontend via @cronos/projection/systems/fate).
// SEM imports de UI — só reducer puro + initialSkills.
//
// O reducer completo do Fate fica em projections.ts (reduceFateLegacy).
// Este plugin encapsula as extensões do Fate Core sobre o reducer base.

import type { SystemPluginCore } from "../types";
import type { ActionEvent, SessionState, Character } from "../../types";
import { DEFAULT_SKILLS, StressTrackValues } from "./types";

// Reducer específico do Fate Core (extensões sobre o base legacy)
// Por ora passa-through: o reduceFateLegacy em projections.ts já cobre tudo do Fate Core.
// Se houver eventos exclusivos do Fate Core no futuro, adicionar aqui.
function reduceFate(state: SessionState, _event: ActionEvent): SessionState {
  return state;
}

const fatePlugin: SystemPluginCore = {
  id: "fate",
  name: "Fate Core e Condensed",
  initialSkills: () =>
    DEFAULT_SKILLS.map((name, index) => ({
      id: `default-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      order: index,
      createdAt: new Date(2024, 0, 1).toISOString(),
    })),
  reducer: reduceFate,
};

export default fatePlugin;