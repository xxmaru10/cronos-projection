// src/systems/fate-accelerated/index.ts
// Copiado de front_sistema_rpg/src/systems/fate-accelerated/reducer.ts — manter em sync.
// SEM imports de UI.

import { SystemPluginCore } from "./systems/types";
import { Character, SessionState, ActionEvent } from "./types";



function createAcceleratedCharacter(overrides?: Partial<Character>): Character {
  return {
    id: overrides?.id ?? "",
    name: overrides?.name ?? "Novo Personagem",
    ownerUserId: overrides?.ownerUserId ?? "",
    isNPC: overrides?.isNPC ?? false,
    source: overrides?.source ?? "active",
    activeInArena: overrides?.activeInArena ?? false,
    fatePoints: 3,
    refresh: 3,
    stress: { unified: [false] },
    consequences: {},
    stunts: [],
    systemData: {
      highConcept: "", trouble: "", freeAspect: "",
      approaches: { careful: 0, clever: 0, flashy: 0, forceful: 0, quick: 0, sneaky: 0 },
      fatePoints: 3, refresh: 3,
      stress: { unified: [false] },
      consequences: {}, stunts: [],
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
      const created = {
        ...p,
        activeInArena: p.activeInArena ?? false,
        fatePoints: p.fatePoints ?? 3,
        stress: p.stress ?? { unified: [false] },
        consequences: p.consequences ?? {},
        stunts: p.stunts ?? [],
        imageUrl: p.imageUrl,
        source: p.source ?? "active",
        systemData: p.systemData ?? {
          highConcept: "", trouble: "", freeAspect: "",
          approaches: { careful: 0, clever: 0, flashy: 0, forceful: 0, quick: 0, sneaky: 0 },
          fatePoints: 3, refresh: 3, stress: { unified: [false] }, consequences: {}, stunts: [],
        },
      };
      return { ...state, characters: { ...state.characters, [p.id]: created } };
    }

    case "CHARACTER_MOVED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, currentZoneId: p.toZoneId } } };
    }

    case "CHARACTER_UPDATED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const changes = { ...p.changes };
      const nextSystemData = { ...(char.systemData || {}) };
      if ("highConcept" in changes) { nextSystemData.highConcept = changes.highConcept; delete changes.highConcept; }
      if ("trouble" in changes) { nextSystemData.trouble = changes.trouble; delete changes.trouble; }
      if ("freeAspect" in changes) { nextSystemData.freeAspect = changes.freeAspect; delete changes.freeAspect; }
      if ("approaches" in changes) { nextSystemData.approaches = { ...(nextSystemData.approaches || {}), ...changes.approaches }; delete changes.approaches; }
      if (changes.systemData) { Object.assign(nextSystemData, changes.systemData); delete changes.systemData; }
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, ...changes, systemData: nextSystemData } } };
    }

    case "CHARACTER_DELETED": {
      const { [p.characterId]: _, ...remaining } = state.characters;
      return { ...state, characters: remaining, turnOrder: (state.turnOrder || []).filter((id) => id !== p.characterId) };
    }

    case "CHARACTER_NAME_UPDATED": { const char = state.characters[p.characterId]; if (!char) return state; return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, name: p.name } } }; }
    case "CHARACTER_BIO_UPDATED": { const char = state.characters[p.characterId]; if (!char) return state; return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, biography: p.biography } } }; }
    case "CHARACTER_IMAGE_UPDATED": { const char = state.characters[p.characterId]; if (!char) return state; return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, imageUrl: p.imageUrl, imageThumbnailUrl: p.imageThumbnailUrl ?? char.imageThumbnailUrl } } }; }

    case "CHARACTER_NOTE_ADDED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const notes = (char as any).linkedNotes || [];
      const idx = notes.findIndex((n: any) => n.id === p.note.id);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, linkedNotes: idx === -1 ? [...notes, p.note] : notes.map((n: any, i: number) => i === idx ? { ...n, ...p.note } : n) } } };
    }
    case "CHARACTER_NOTE_UPDATED": { const char = state.characters[p.characterId]; if (!char) return state; return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, linkedNotes: ((char as any).linkedNotes || []).map((n: any) => n.id === p.noteId ? { ...n, ...p.patch } : n) } } }; }
    case "CHARACTER_NOTE_DELETED": { const char = state.characters[p.characterId]; if (!char) return state; return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, linkedNotes: ((char as any).linkedNotes || []).filter((n: any) => n.id !== p.noteId) } } }; }

    case "FP_SPENT": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const points = Math.max(0, (c.fatePoints ?? c.systemData?.fatePoints ?? 0) - p.amount);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, fatePoints: points, systemData: { ...(char.systemData || {}), fatePoints: points } } } };
    }
    case "FP_GAINED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const points = (c.fatePoints ?? c.systemData?.fatePoints ?? 0) + p.amount;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, fatePoints: points, systemData: { ...(char.systemData || {}), fatePoints: points } } } };
    }

    case "STRESS_MARKED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const rawUnified = c.stress?.unified || c.systemData?.stress?.unified;
      const baseTrack: boolean[] = Array.isArray(rawUnified) && rawUnified.length > 0
        ? rawUnified
        : Array(Math.max((c.stress?.physical || []).length, (c.stress?.mental || []).length, 3)).fill(false);
      let newTrack = [...baseTrack];
      if (p.boxIndex >= newTrack.length) newTrack = [...newTrack, ...Array(p.boxIndex + 1 - newTrack.length).fill(false)];
      if (p.boxIndex >= 0 && p.boxIndex < newTrack.length) newTrack[p.boxIndex] = true;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stress: { ...char.stress, unified: newTrack }, systemData: { ...(char.systemData || {}), stress: { ...(char.systemData?.stress || {}), unified: newTrack } } } } };
    }

    case "STRESS_CLEARED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const currentTrack = c.stress?.unified || c.systemData?.stress?.unified || [false];
      const newTrack = [...currentTrack];
      if (p.boxIndex >= 0 && p.boxIndex < newTrack.length) newTrack[p.boxIndex] = false;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stress: { ...char.stress, unified: newTrack }, systemData: { ...(char.systemData || {}), stress: { ...(char.systemData?.stress || {}), unified: newTrack } } } } };
    }

    case "STRESS_TRACK_EXPANDED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const currentTrack = c.stress?.unified || c.systemData?.stress?.unified || [false];
      const newTrack = [...currentTrack, false];
      const currentValues = (c.systemData?.stressUnifiedValues as number[] | undefined) || (c.stressValues?.unified as number[] | undefined) || currentTrack.map((_: boolean, i: number) => i + 1);
      const newValues = [...currentValues, newTrack.length];
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stress: { ...char.stress, unified: newTrack }, stressValues: { ...(c.stressValues || {}), unified: newValues }, systemData: { ...(char.systemData || {}), stress: { ...(char.systemData?.stress || {}), unified: newTrack }, stressUnifiedValues: newValues } } } };
    }

    case "STRESS_TRACK_REDUCED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const currentTrack = c.stress?.unified || c.systemData?.stress?.unified || [false];
      if (currentTrack.length === 0) return state;
      const newTrack = currentTrack.slice(0, -1);
      const currentValues = (c.systemData?.stressUnifiedValues as number[] | undefined) || (c.stressValues?.unified as number[] | undefined) || currentTrack.map((_: boolean, i: number) => i + 1);
      const newValues = currentValues.slice(0, newTrack.length);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stress: { ...char.stress, unified: newTrack }, stressValues: { ...(c.stressValues || {}), unified: newValues }, systemData: { ...(char.systemData || {}), stress: { ...(char.systemData?.stress || {}), unified: newTrack }, stressUnifiedValues: newValues } } } };
    }

    case "STRESS_BOX_VALUE_UPDATED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      if (p.boxIndex == null || p.boxIndex < 0) return state;
      const c = char as any;
      const boolTrack: boolean[] = c.stress?.unified || c.systemData?.stress?.unified || [];
      const prevValues: number[] = (c.systemData?.stressUnifiedValues as number[] | undefined) || (c.stressValues?.unified as number[] | undefined) || [];
      const targetLen = Math.max(boolTrack.length, prevValues.length, p.boxIndex + 1, 1);
      const newValues: number[] = [];
      for (let i = 0; i < targetLen; i++) newValues[i] = Math.max(1, Math.trunc(prevValues[i] ?? (i + 1)));
      newValues[p.boxIndex] = Math.max(1, Math.min(1000, Math.trunc(p.value)));
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stressValues: { ...(c.stressValues || {}), unified: newValues }, systemData: { ...(char.systemData || {}), stressUnifiedValues: newValues } } } };
    }

    case "STRESS_TRACK_SET_LENGTH": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const currentTrack = c.stress?.unified || c.systemData?.stress?.unified || [false];
      const targetLength = Math.max(1, Math.min(20, Math.trunc(p.length || 1)));
      if (targetLength === currentTrack.length) return state;
      const newTrack = targetLength > currentTrack.length
        ? [...currentTrack, ...Array(targetLength - currentTrack.length).fill(false)]
        : currentTrack.slice(0, targetLength);
      const currentValues = (c.systemData?.stressUnifiedValues as number[] | undefined) || (c.stressValues?.unified as number[] | undefined) || currentTrack.map((_: boolean, i: number) => i + 1);
      const newValues = newTrack.map((_: boolean, i: number) => currentValues[i] ?? (i + 1));
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stress: { ...char.stress, unified: newTrack }, stressValues: { ...(c.stressValues || {}), unified: newValues }, systemData: { ...(char.systemData || {}), stress: { ...(char.systemData?.stress || {}), unified: newTrack }, stressUnifiedValues: newValues } } } };
    }

    case "CHARACTER_CONSEQUENCE_UPDATED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const rootCons = { ...(c.consequences || {}) }; const sysCons = { ...(c.systemData?.consequences || {}) };
      const isEmpty = !p.value || p.value.trim() === "";
      if (isEmpty) { delete rootCons[p.slot]; delete sysCons[p.slot]; } else { rootCons[p.slot] = { text: p.value || "" }; sysCons[p.slot] = { text: p.value || "" }; }
      const removedDefaultSlots = (c.removedDefaultSlots || []).filter((s: string) => s !== p.slot);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, consequences: rootCons, removedDefaultSlots, systemData: { ...(char.systemData || {}), consequences: sysCons } } } };
    }

    case "CHARACTER_CONSEQUENCE_SLOT_ADDED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const extra = [...(c.extraConsequenceSlots || [])];
      if (!extra.includes(p.slot)) extra.push(p.slot);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, extraConsequenceSlots: extra } } };
    }

    case "CHARACTER_CONSEQUENCE_DELETED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const rootCons = { ...c.consequences }; const sysCons = { ...c.systemData?.consequences };
      delete rootCons[p.slot]; delete sysCons[p.slot];
      const extra = (c.extraConsequenceSlots || []).filter((s: string) => s !== p.slot);
      const DEFAULT_SLOTS = ["mild", "moderate", "severe"];
      const removed = [...(c.removedDefaultSlots || [])];
      if (DEFAULT_SLOTS.includes(p.slot) && !removed.includes(p.slot)) removed.push(p.slot);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, consequences: rootCons, removedDefaultSlots: removed, extraConsequenceSlots: extra, systemData: { ...(char.systemData || {}), consequences: sysCons } } } };
    }

    case "CHARACTER_REFRESH_UPDATED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any;
      const newRefresh = p.refresh;
      const clampedFate = Math.min(c.fatePoints ?? c.systemData?.fatePoints ?? 0, newRefresh);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, refresh: newRefresh, fatePoints: clampedFate, systemData: { ...(char.systemData || {}), refresh: newRefresh, fatePoints: clampedFate } } } };
    }

    case "CHARACTER_STUNT_UPDATED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any; const current = c.stunts || c.systemData?.stunts || [];
      const idx = current.findIndex((s: any) => s.id === p.stunt.id);
      const next = idx >= 0 ? current.map((s: any, i: number) => i === idx ? p.stunt : s) : [...current, p.stunt];
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stunts: next, systemData: { ...(char.systemData || {}), stunts: next } } } };
    }

    case "CHARACTER_STUNT_DELETED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      const c = char as any; const current = c.stunts || c.systemData?.stunts || [];
      const next = current.filter((s: any) => s.id !== p.stuntId);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, stunts: next, systemData: { ...(char.systemData || {}), stunts: next } } } };
    }

    case "APPROACH_UPDATED": {
      const char = state.characters[p.characterId]; if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, systemData: { ...(char.systemData || {}), approaches: { ...(char.systemData?.approaches || {}), [p.approachId]: p.value } } } } };
    }

    case "ASPECT_CREATED": return { ...state, aspects: { ...state.aspects, [p.id]: { id: p.id, name: p.name, scope: p.scope || "SCENE", freeInvokes: p.freeInvokes || 0, revealed: p.revealed ?? true, ownerId: p.ownerId, description: p.description } } };
    case "ASPECT_UPDATED": { const aspect = state.aspects[p.aspectId]; if (!aspect) return state; return { ...state, aspects: { ...state.aspects, [p.aspectId]: { ...aspect, ...p.patch } } }; }
    case "ASPECT_REVEALED": { const aspect = state.aspects[p.aspectId]; if (!aspect) return state; return { ...state, aspects: { ...state.aspects, [p.aspectId]: { ...aspect, revealed: true } } }; }
    case "FREE_INVOKE_CONSUMED": { const aspect = state.aspects[p.aspectId]; if (!aspect) return state; return { ...state, aspects: { ...state.aspects, [p.aspectId]: { ...aspect, freeInvokes: Math.max(0, aspect.freeInvokes - p.amount) } } }; }
    case "FREE_INVOKE_PRODUCED": { const aspect = state.aspects[p.aspectId]; if (!aspect) return state; return { ...state, aspects: { ...state.aspects, [p.aspectId]: { ...aspect, freeInvokes: aspect.freeInvokes + p.amount } } }; }

    case "ROLL_RESOLVED": {
      if (state.isReaction && p.actionType === "DEFEND") {
        const remaining = (state.pendingTargetIds || []).filter((id: string) => id !== p.characterId);
        if (remaining.length > 0) return { ...state, targetId: remaining[0], pendingTargetIds: remaining, isReaction: true };
        return { ...state, isReaction: false, targetId: undefined, pendingTargetIds: [], timerPaused: false };
      }
      return state;
    }
    case "ROLL_VISIBILITY_UPDATED": return { ...state, rollVisibilityOverrides: { ...(state.rollVisibilityOverrides || {}), [p.rollEventId]: { hiddenForPlayers: p.hiddenForPlayers } } };
    case "COMBAT_TARGET_SET": return { ...state, targetId: p.targetId || p.targetIds?.[0] || undefined, pendingTargetIds: p.targetIds || [], damageType: p.damageType || state.damageType, isReaction: p.isReaction ?? !!(p.targetId || p.targetIds?.length) };
    case "COMBAT_REACTION_ENDED": return { ...state, isReaction: false, targetId: undefined, pendingTargetIds: [], damageType: undefined, timerPaused: false };

    default: return state;
  }
}

const acceleratedPlugin: SystemPluginCore = {
  id: "fate-accelerated",
  name: "Fate Acelerado",
  initialSkills: () => [],
  reducer: reduceAccelerated,
  characterTemplate: createAcceleratedCharacter,
};

export default acceleratedPlugin;
