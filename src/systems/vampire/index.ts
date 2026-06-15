// src/systems/vampire/index.ts
//
// Plugin Vampire para uso no BACKEND.
// Copiado de front_sistema_rpg/src/systems/vampire/reducer.ts + index.ts
// SEM imports de UI (CharacterCard, CombatTab, DiceRoller).
//
// MANTER EM SYNC com front_sistema_rpg/src/systems/vampire/reducer.ts

import type { SystemPluginCore } from "../types";
import type { ActionEvent, SessionState, Character } from "../../types";
import { VAMPIRE_SKILLS } from "./utils";

// ---------------------------------------------------------------------------
// Tipos internos do Vampire (extraídos de vampire/types.ts)
// ---------------------------------------------------------------------------

interface Discipline {
  id: string;
  name?: string;
  level?: number;
  [key: string]: any;
}

interface VampireSystemData {
  stress: Record<string, boolean[]>;
  stressValues: Record<string, number[]>;
  consequences: Record<string, { text: string; debuff?: any }>;
  hungerConsequences: Record<string, { text: string; debuff?: any }>;
  disciplines: Discipline[];
  generation?: number;
  fatePoints?: number;
  refresh?: number;
  skills?: Record<string, number>;
  stunts?: any[];
  inventory?: any[];
  sheetAspects?: string[];
  removedDefaultSlots?: string[];
  removedDefaultHungerSlots?: string[];
  extraConsequenceSlots?: string[];
  extraHungerSlots?: string[];
  blinkmotion?: any;
  [key: string]: any;
}

interface VampireCharacter extends Character {
  systemData: VampireSystemData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampStress(v: number) {
  return clamp(Math.trunc(v || 1), 1, 1000);
}

function sd(char: Character): VampireSystemData {
  return (char as VampireCharacter).systemData;
}

function patchSd(
  state: SessionState,
  characterId: string,
  patch: (data: VampireSystemData) => Partial<VampireSystemData>,
): SessionState {
  const char = state.characters[characterId];
  if (!char) return state;
  const data = sd(char);
  const next: VampireSystemData = { ...data, ...patch(data) };
  const nextChar: VampireCharacter = { ...char, systemData: next } as VampireCharacter;
  return { ...state, characters: { ...state.characters, [characterId]: nextChar } };
}

// Migração de personagens legados para o formato vampire
function migrateLegacyVampireCharacter(char: Character): Character {
  if ((char as VampireCharacter).systemData?.stress) return char;
  const systemData: VampireSystemData = {
    stress: { blood: [false, false, false] },
    stressValues: { blood: [1, 2, 3] },
    consequences: (char as any).consequences ?? {},
    hungerConsequences: {},
    disciplines: [],
    fatePoints: (char as any).fatePoints ?? 3,
    refresh: (char as any).refresh ?? 3,
    skills: (char as any).skills ?? {},
    stunts: (char as any).stunts ?? [],
    inventory: (char as any).inventory ?? [],
    sheetAspects: (char as any).sheetAspects ?? ["", "", "", ""],
  };
  return { ...char, systemData };
}

function createVampireCharacter(overrides?: Partial<Character>): VampireCharacter {
  const base: VampireCharacter = {
    id: overrides?.id ?? "",
    name: overrides?.name ?? "Novo Vampiro",
    ownerUserId: overrides?.ownerUserId ?? "",
    isNPC: overrides?.isNPC ?? false,
    source: overrides?.source ?? "active",
    activeInArena: overrides?.activeInArena ?? false,
    systemData: {
      stress: { blood: [false, false, false] },
      stressValues: { blood: [1, 2, 3] },
      consequences: {},
      hungerConsequences: {},
      disciplines: [],
      fatePoints: 3,
      refresh: 3,
      skills: {},
      stunts: [],
      inventory: [],
      sheetAspects: ["", "", "", ""],
    },
    ...overrides,
  } as VampireCharacter;
  return base;
}

function migrateAll(state: SessionState): SessionState {
  const chars = state.characters;
  const migrated: Record<string, Character> = {};
  let changed = false;
  for (const [id, char] of Object.entries(chars)) {
    const next = migrateLegacyVampireCharacter(char);
    migrated[id] = next;
    if (next !== char) changed = true;
  }
  if (!changed) return state;
  return { ...state, characters: migrated };
}

// ---------------------------------------------------------------------------
// Reducer — copiado de vampire/reducer.ts, sem dependências de UI
// ---------------------------------------------------------------------------

export function reduceVampire(state: SessionState, event: ActionEvent): SessionState {
  state = migrateAll(state);

  const { type, payload } = event;
  if (!payload) return state;
  const p = payload as any;

  switch (type) {
    case "CHARACTER_CREATED": {
      const callerProvidedSystemData =
        p.systemData &&
        typeof p.systemData === "object" &&
        Object.keys(p.systemData).length > 0;
      const overrides: Partial<Character> = {
        id: p.id,
        name: p.name ?? "Novo Vampiro",
        ownerUserId: p.ownerUserId ?? "",
        isNPC: p.isNPC ?? false,
        npcType: p.npcType,
        source: p.source ?? "active",
        activeInArena: p.activeInArena ?? false,
      } as Partial<Character>;
      let char = createVampireCharacter(overrides);
      if (p.blinkmotion) char.systemData.blinkmotion = p.blinkmotion;
      if (callerProvidedSystemData) {
        char = migrateLegacyVampireCharacter({ ...char, ...p } as Character) as VampireCharacter;
      }
      return { ...state, characters: { ...state.characters, [p.id]: char } };
    }

    case "CHARACTER_DELETED": {
      const next = { ...state.characters };
      delete next[p.characterId];
      return { ...state, characters: next };
    }

    case "CHARACTER_MOVED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, currentZoneId: p.zoneId, activeInArena: p.zoneId != null },
        },
      };
    }

    case "CHARACTER_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, ...p.changes } } };
    }

    case "CHARACTER_NAME_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, name: p.name } } };
    }

    case "CHARACTER_MONEY_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, money: p.value } } };
    }

    case "CHARACTER_BIO_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, biography: p.biography } } };
    }

    case "CHARACTER_IMAGE_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, imageUrl: p.imageUrl, imageThumbnailUrl: p.imageThumbnailUrl ?? char.imageThumbnailUrl } } };
    }

    case "CHARACTER_SHEET_ASPECT_UPDATED": {
      return patchSd(state, p.characterId, (data) => {
        const aspects = [...(data.sheetAspects ?? ["", "", "", ""])];
        aspects[p.index] = p.value;
        return { sheetAspects: aspects };
      });
    }

    case "CHARACTER_REFRESH_UPDATED": {
      return patchSd(state, p.characterId, (data) => {
        const newRefresh = Math.max(1, p.refresh ?? data.refresh);
        return { refresh: newRefresh, fatePoints: Math.min(data.fatePoints ?? 0, newRefresh) };
      });
    }

    case "FP_GAINED":
      return patchSd(state, p.characterId, (data) => ({ fatePoints: (data.fatePoints ?? 0) + (p.amount ?? 1) }));

    case "FP_SPENT":
      return patchSd(state, p.characterId, (data) => ({ fatePoints: Math.max(0, (data.fatePoints ?? 0) - (p.amount ?? 1)) }));

    case "CHARACTER_SKILL_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const data = sd(char);
      if (!data) return state;
      const newSkills = { ...(data.skills ?? {}), [p.skill]: p.rank };
      const nextData: VampireSystemData = { ...data, skills: newSkills };
      const nextChar: VampireCharacter = { ...char, systemData: nextData, skills: newSkills } as VampireCharacter;
      return { ...state, characters: { ...state.characters, [p.characterId]: nextChar } };
    }

    case "SKILL_RESOURCE_INIT": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const existing = (char as any).skillResources ?? {};
      if (existing[p.skill]) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, skillResources: { ...existing, [p.skill]: { current: p.initialMax, max: p.initialMax } } } } };
    }

    case "SKILL_RESOURCE_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const existing = (char as any).skillResources ?? {};
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, skillResources: { ...existing, [p.skill]: { current: p.current, max: p.max } } } } };
    }

    case "STRESS_MARKED": {
      const track = (p.track as string).toLowerCase();
      return patchSd(state, p.characterId, (data) => {
        const boxes = [...(data.stress[track] ?? [])];
        boxes[p.boxIndex] = true;
        return { stress: { ...data.stress, [track]: boxes } };
      });
    }

    case "STRESS_CLEARED": {
      const track = (p.track as string).toLowerCase();
      return patchSd(state, p.characterId, (data) => {
        const boxes = [...(data.stress[track] ?? [])];
        boxes[p.boxIndex] = false;
        return { stress: { ...data.stress, [track]: boxes } };
      });
    }

    case "STRESS_TRACK_EXPANDED": {
      const track = (p.track as string).toLowerCase();
      return patchSd(state, p.characterId, (data) => {
        const boxes = [...(data.stress[track] ?? []), false];
        const values = [...(data.stressValues[track] ?? []), clampStress(p.value ?? 1)];
        return { stress: { ...data.stress, [track]: boxes }, stressValues: { ...data.stressValues, [track]: values } };
      });
    }

    case "STRESS_TRACK_REDUCED": {
      const track = (p.track as string).toLowerCase();
      return patchSd(state, p.characterId, (data) => {
        const boxes = (data.stress[track] ?? []).slice(0, -1);
        const values = (data.stressValues[track] ?? []).slice(0, -1);
        return { stress: { ...data.stress, [track]: boxes }, stressValues: { ...data.stressValues, [track]: values } };
      });
    }

    case "STRESS_BOX_VALUE_UPDATED": {
      const track = (p.track as string).toLowerCase();
      return patchSd(state, p.characterId, (data) => {
        const values = [...(data.stressValues[track] ?? [])];
        values[p.boxIndex] = clampStress(p.value);
        return { stressValues: { ...data.stressValues, [track]: values } };
      });
    }

    case "CHARACTER_CONSEQUENCE_UPDATED":
      return patchSd(state, p.characterId, (data) => ({ consequences: { ...data.consequences, [p.slot]: { text: p.value, debuff: p.debuff } } }));

    case "CHARACTER_CONSEQUENCE_DELETED":
      return patchSd(state, p.characterId, (data) => {
        const defaultSlots = ["mild", "moderate", "severe"];
        const isDefault = defaultSlots.includes(p.slot);
        if (isDefault) {
          const removed = [...(data.removedDefaultSlots ?? [])];
          if (!removed.includes(p.slot)) removed.push(p.slot);
          const cons = { ...data.consequences };
          delete cons[p.slot];
          return { consequences: cons, removedDefaultSlots: removed };
        }
        const extra = (data.extraConsequenceSlots ?? []).filter((s: string) => s !== p.slot);
        const cons = { ...data.consequences };
        delete cons[p.slot];
        return { consequences: cons, extraConsequenceSlots: extra };
      });

    case "CHARACTER_CONSEQUENCE_SLOT_ADDED":
      return patchSd(state, p.characterId, (data) => ({ extraConsequenceSlots: [...(data.extraConsequenceSlots ?? []), p.slot] }));

    case "VAMPIRE_HUNGER_CONSEQUENCE_UPDATED":
      return patchSd(state, p.characterId, (data) => ({ hungerConsequences: { ...data.hungerConsequences, [p.slot]: { text: p.value, debuff: p.debuff } } }));

    case "VAMPIRE_HUNGER_CONSEQUENCE_DELETED":
      return patchSd(state, p.characterId, (data) => {
        const defaultSlots = ["fome_mild", "fome_moderate", "fome_severe"];
        const isDefault = defaultSlots.includes(p.slot);
        if (isDefault) {
          const removed = [...(data.removedDefaultHungerSlots ?? [])];
          if (!removed.includes(p.slot)) removed.push(p.slot);
          const cons = { ...data.hungerConsequences };
          delete cons[p.slot];
          return { hungerConsequences: cons, removedDefaultHungerSlots: removed };
        }
        const extra = (data.extraHungerSlots ?? []).filter((s: string) => s !== p.slot);
        const cons = { ...data.hungerConsequences };
        delete cons[p.slot];
        return { hungerConsequences: cons, extraHungerSlots: extra };
      });

    case "VAMPIRE_HUNGER_CONSEQUENCE_SLOT_ADDED":
      return patchSd(state, p.characterId, (data) => ({ extraHungerSlots: [...(data.extraHungerSlots ?? []), p.slot] }));

    case "VAMPIRE_GENERATION_UPDATED":
      return patchSd(state, p.characterId, (_data) => ({ generation: clamp(p.generation, 1, 13) }));

    case "VAMPIRE_DISCIPLINE_UPDATED":
      return patchSd(state, p.characterId, (data) => {
        const disc: Discipline = p.discipline;
        const existing = data.disciplines ?? [];
        const idx = existing.findIndex((d) => d.id === disc.id);
        const next = idx >= 0 ? existing.map((d) => (d.id === disc.id ? disc : d)) : [...existing, disc];
        return { disciplines: next };
      });

    case "VAMPIRE_DISCIPLINE_DELETED":
      return patchSd(state, p.characterId, (data) => ({ disciplines: (data.disciplines ?? []).filter((d) => d.id !== p.disciplineId) }));

    case "CHARACTER_STUNT_UPDATED":
      return patchSd(state, p.characterId, (data) => {
        const stunts = data.stunts ?? [];
        const idx = stunts.findIndex((s: any) => s.id === p.stunt.id);
        const next = idx >= 0 ? stunts.map((s: any) => (s.id === p.stunt.id ? p.stunt : s)) : [...stunts, p.stunt];
        return { stunts: next };
      });

    case "CHARACTER_STUNT_DELETED":
      return patchSd(state, p.characterId, (data) => ({ stunts: (data.stunts ?? []).filter((s: any) => s.id !== p.stuntId) }));

    case "CHARACTER_INVENTORY_UPDATED":
      return patchSd(state, p.characterId, (data) => {
        const inv = data.inventory ?? [];
        const idx = inv.findIndex((i: any) => i.id === p.item.id);
        const next = idx >= 0 ? inv.map((i: any) => (i.id === p.item.id ? p.item : i)) : [...inv, p.item];
        return { inventory: next };
      });

    case "CHARACTER_NOTE_ADDED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const notes = (char as any).notes ?? [];
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, notes: [...notes, p.note] } } };
    }

    case "CHARACTER_NOTE_DELETED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const notes = ((char as any).notes ?? []).filter((n: any) => n.id !== p.noteId);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, notes } } };
    }

    case "ZONE_CREATED":
      return { ...state, zones: { ...state.zones, [p.id]: { id: p.id, name: p.name, position: p.position, size: p.size, color: p.color, characterIds: [] } } };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

const vampirePlugin: SystemPluginCore = {
  id: "vampire",
  name: "Fate – Homebrew: Vampire",
  initialSkills: () =>
    VAMPIRE_SKILLS.map((name, index) => ({
      id: `default-vampire-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      order: index,
      createdAt: new Date(2024, 0, 1).toISOString(),
    })),
  reducer: reduceVampire,
  characterTemplate: createVampireCharacter,
};

export default vampirePlugin;