// src/systems/fate-accelerated/index.ts
//
// Plugin Fate Acelerado para uso no BACKEND.
// Copiado de front_sistema_rpg/src/systems/fate-accelerated/reducer.ts
// SEM imports de UI.
//
// MANTER EM SYNC com front_sistema_rpg/src/systems/fate-accelerated/reducer.ts

import type { SystemPluginCore } from "../types";
import type { ActionEvent, SessionState, Character } from "../../types";

export const APPROACHES = [
  { id: "cuidadoso", label: "Cuidadoso" },
  { id: "esperto",   label: "Esperto" },
  { id: "estiloso",  label: "Estiloso" },
  { id: "forcado",   label: "Forçado" },
  { id: "rapido",    label: "Rápido" },
  { id: "sorrateiro",label: "Sorrateiro" },
] as const;

function clampStress(v: number) {
  return Math.max(1, Math.min(1000, Math.trunc(v || 1)));
}

function createAcceleratedCharacter(overrides?: Partial<Character>): Character {
  const defaultApproaches = Object.fromEntries(APPROACHES.map(a => [a.id, 0]));
  return {
    id: overrides?.id ?? "",
    name: overrides?.name ?? "Novo Personagem",
    ownerUserId: overrides?.ownerUserId ?? "",
    isNPC: overrides?.isNPC ?? false,
    source: overrides?.source ?? "active",
    activeInArena: overrides?.activeInArena ?? false,
    fatePoints: 3,
    refresh: 3,
    stress: { physical: [false, false] },
    stressValues: { physical: [1, 2] },
    consequences: {},
    stunts: [],
    inventory: [],
    sheetAspects: ["", "", "", ""],
    systemData: {
      approaches: defaultApproaches,
      fatePoints: 3,
      refresh: 3,
      consequences: {},
      stunts: [],
      stress: { unified: [false, false, false] },
      stressValues: { unified: [1, 2, 3] },
    },
    ...overrides,
  } as Character;
}

export function reduceAccelerated(state: SessionState, event: ActionEvent): SessionState {
  const { type, payload } = event;
  if (!payload) return state;
  const p = payload as any;

  switch (type) {
    case "CHARACTER_CREATED": {
      const overrides: Partial<Character> = {
        id: p.id,
        name: p.name ?? "Novo Personagem",
        ownerUserId: p.ownerUserId ?? "",
        isNPC: p.isNPC ?? false,
        source: p.source ?? "active",
        activeInArena: p.activeInArena ?? false,
      };
      const char = createAcceleratedCharacter(overrides);
      return { ...state, characters: { ...state.characters, [p.id]: char } };
    }

    // Abordagens (approaches) — exclusivo do Fate Acelerado
    case "ACCELERATED_APPROACH_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const systemData = { ...(char.systemData ?? {}) };
      const approaches = { ...(systemData.approaches ?? {}) };
      approaches[p.approach] = p.rank;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, systemData: { ...systemData, approaches } },
        },
      };
    }

    // Stress unificado — track única no Fate Acelerado
    case "STRESS_MARKED": {
      const rawTrack = typeof p.track === "string" ? p.track.toLowerCase() : "";
      if (rawTrack !== "unified") return state;
      const char = state.characters[p.characterId];
      if (!char) return state;
      const sd = { ...(char.systemData ?? {}) };
      const stress = { ...(sd.stress ?? {}) };
      const unified = [...(stress.unified ?? [])];
      unified[p.boxIndex] = true;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, systemData: { ...sd, stress: { ...stress, unified } } },
        },
      };
    }

    case "STRESS_CLEARED": {
      const rawTrack = typeof p.track === "string" ? p.track.toLowerCase() : "";
      if (rawTrack !== "unified") return state;
      const char = state.characters[p.characterId];
      if (!char) return state;
      const sd = { ...(char.systemData ?? {}) };
      const stress = { ...(sd.stress ?? {}) };
      const unified = [...(stress.unified ?? [])];
      unified[p.boxIndex] = false;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, systemData: { ...sd, stress: { ...stress, unified } } },
        },
      };
    }

    case "STRESS_BOX_VALUE_UPDATED": {
      const rawTrack = typeof p.track === "string" ? p.track.toLowerCase() : "";
      if (rawTrack !== "unified") return state;
      const char = state.characters[p.characterId];
      if (!char) return state;
      const sd = { ...(char.systemData ?? {}) };
      const stressValues = { ...(sd.stressValues ?? {}) };
      const unified = [...(stressValues.unified ?? [])];
      unified[p.boxIndex] = clampStress(p.value);

      // Story 134: espelha em stressValues do nível de character para
      // compatibilidade com o reducer legado
      const charStressValues = { ...(char.stressValues as any ?? {}) };
      charStressValues.unified = unified;

      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: {
            ...char,
            stressValues: charStressValues,
            systemData: { ...sd, stressValues: { ...stressValues, unified } },
          },
        },
      };
    }

    case "STRESS_TRACK_EXPANDED": {
      const rawTrack = typeof p.track === "string" ? p.track.toLowerCase() : "";
      if (rawTrack !== "unified") return state;
      const char = state.characters[p.characterId];
      if (!char) return state;
      const sd = { ...(char.systemData ?? {}) };
      const stress = { ...(sd.stress ?? {}) };
      const stressValues = { ...(sd.stressValues ?? {}) };
      const unified = [...(stress.unified ?? []), false];
      const unifiedValues = [...(stressValues.unified ?? []), clampStress(p.value ?? unified.length)];
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: {
            ...char,
            systemData: {
              ...sd,
              stress: { ...stress, unified },
              stressValues: { ...stressValues, unified: unifiedValues },
            },
          },
        },
      };
    }

    case "STRESS_TRACK_REDUCED": {
      const rawTrack = typeof p.track === "string" ? p.track.toLowerCase() : "";
      if (rawTrack !== "unified") return state;
      const char = state.characters[p.characterId];
      if (!char) return state;
      const sd = { ...(char.systemData ?? {}) };
      const stress = { ...(sd.stress ?? {}) };
      const stressValues = { ...(sd.stressValues ?? {}) };
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: {
            ...char,
            systemData: {
              ...sd,
              stress: { ...stress, unified: (stress.unified ?? []).slice(0, -1) },
              stressValues: { ...stressValues, unified: (stressValues.unified ?? []).slice(0, -1) },
            },
          },
        },
      };
    }

    default:
      return state;
  }
}

const acceleratedPlugin: SystemPluginCore = {
  id: "fate-accelerated",
  name: "Fate Acelerado",
  initialSkills: () => [], // Fate Acelerado usa abordagens, não perícias
  reducer: reduceAccelerated,
  characterTemplate: createAcceleratedCharacter,
};

export default acceleratedPlugin;