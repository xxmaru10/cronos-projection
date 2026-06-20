// src/projections.ts
//
// Copiado de front_sistema_rpg/src/lib/projections.ts
// Adaptações para o backend:
//   - imports de @/ substituídos por caminhos relativos
//   - getCachedSystem usa o registry síncrono do backend (sem dynamic import)
//   - sem dependências de browser (window, localStorage, etc.)
//
// MANTER EM SYNC com front_sistema_rpg/src/lib/projections.ts

import type {
  ActionEvent,
  SessionState,
  Character,
  BattlemapState,
  BattlemapCombatLayer,
  BattlemapObject,
} from "./types";
import { DEFAULT_SKILLS } from "./systems/fate/types";
import { VAMPIRE_SKILLS } from "./systems/vampire/utils";
import { getCachedSystem } from "./systems/registry";
import { normalizeIdentity } from "./identity";

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

export const initialState: SessionState = {
  id: "",
  system: "fate",
  seats: [],
  characters: {},
  aspects: {},
  zones: {},
  links: [],
  headerImages: {},
  currentRound: 1,
  notes: [],
  noteFolders: [],
  themeColor: "#C5A059",
  themeTitleColor: null,
  themePreset: "medieval",
  missions: [],
  timeline: [],
  skills: [],
  items: [],
  mindMaps: [],
  sessionNumber: 1,
  stickyNotes: [],
  arenaCards: {},
  themeLocked: false,
  rollVisibilityOverrides: {},
  systemSkills: undefined,
  soundSettings: {
    victory: "audio/Effects/vitoria.mp3",
    defeat: "audio/Effects/derrota.mp3",
    death: "audio/Effects/morte.mp3",
    battleStart: "audio/Effects/battle_start.mp3",
  },
  characterAssignments: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pruneCharacterFromAssignments(
  assignments: Record<string, string[]> | undefined,
  characterId: string,
): Record<string, string[]> {
  if (!assignments) return {};
  const next: Record<string, string[]> = {};
  let changed = false;
  for (const [userId, ids] of Object.entries(assignments)) {
    const filtered = (ids || []).filter((id) => id !== characterId);
    if (filtered.length !== (ids || []).length) changed = true;
    if (filtered.length > 0) next[userId] = filtered;
  }
  return changed ? next : assignments;
}

function clampStressValue(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(1000, Math.trunc(value)));
}

function deriveStressValues(char: Character, track: "physical" | "mental"): number[] {
  const fallback = (char.stress?.[track] || []).map((_, index) => index + 1);
  const existing = char.stressValues?.[track] || [];
  return fallback.map((baseValue, index) => clampStressValue(existing[index] ?? baseValue));
}

function normalizeCharacterStress(char: Character): Character {
  const physical = deriveStressValues(char, "physical");
  const mental = deriveStressValues(char, "mental");
  const existingUnified = (char.stressValues as any)?.unified as number[] | undefined;
  return {
    ...char,
    impulseArrows: Math.max(0, Math.trunc(char.impulseArrows || 0)),
    stressValues: existingUnified
      ? ({ physical, mental, unified: existingUnified } as any)
      : { physical, mental },
  };
}

function upsertById<T extends { id: string }>(list: T[], incoming: T): T[] {
  const existingIndex = list.findIndex((item) => item.id === incoming.id);
  if (existingIndex === -1) return [...list, incoming];
  const next = [...list];
  next[existingIndex] = { ...next[existingIndex], ...incoming };
  return next;
}

function patchById<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function clearFolderIdFromNotes(notes: any[], folderId: string): any[] {
  return notes.map((note) => (note.folderId === folderId ? { ...note, folderId: undefined } : note));
}

function mirrorObjectState1(obj: BattlemapObject): BattlemapObject {
  if (obj.animated && obj.states && obj.states[0]) {
    const s0 = obj.states[0];
    return {
      ...obj,
      imageUrl: s0.imageUrl,
      x: s0.x, y: s0.y,
      width: s0.width, height: s0.height,
      rotation: s0.rotation,
      brightness: s0.brightness / 100,
      contrast: s0.contrast / 100,
      saturation: s0.saturation / 100,
    };
  }
  return obj;
}

function createDefaultBattlemap(): BattlemapState {
  return {
    isActive: false,
    sceneModeActive: false,
    scenePlayerAssignments: {},
    imageUrl: "",
    gridSize: 50, gridColor: "rgba(255,255,255,0.25)",
    gridThickness: 1, gridSizeX: 50, gridSizeY: 50,
    gridShape: "square", gridOpacity: 1,
    offsetX: 0, offsetY: 0, zoom: 1,
    strokes: [], objects: [], shapes: [], scenes: [],
    activeSceneId: undefined,
  };
}

function ensureBattlemapCombatLayers(state: BattlemapState): BattlemapState {
  if (!state || typeof state !== "object") return createDefaultBattlemap();
  const saneGridSize = state.gridSize && state.gridSize > 0 ? state.gridSize : 50;
  const saneGridSizeX = state.gridSizeX && state.gridSizeX > 0 ? state.gridSizeX : saneGridSize;
  const saneGridSizeY = state.gridSizeY && state.gridSizeY > 0 ? state.gridSizeY : saneGridSize;

  if (state.layers && state.layers.length > 0 && "kind" in (state.layers[0] || {})) {
    const updatedLayers = state.layers.map((layer) => {
      if (layer.kind === "GRID") {
        return {
          ...layer,
          gridSize: saneGridSize,
          gridColor: state.gridColor ?? layer.gridColor,
          gridThickness: state.gridThickness ?? layer.gridThickness,
          gridSizeX: saneGridSizeX,
          gridSizeY: saneGridSizeY,
          gridShape: state.gridShape ?? layer.gridShape ?? "square",
          gridOpacity: state.gridOpacity ?? layer.gridOpacity ?? 1,
        };
      }
      return layer;
    });
    return { ...state, gridSize: saneGridSize, gridSizeX: saneGridSizeX, gridSizeY: saneGridSizeY, layers: updatedLayers };
  }

  const hasStrokes = (state.strokes || []).length > 0;
  const baseLayers: BattlemapCombatLayer[] = [
    { id: "layer-bg-color", kind: "BACKGROUND_COLOR", name: "Fundo", order: 0, visible: true, locked: true, color: "#1a1a1a" },
    { id: "layer-bg-image", kind: "IMAGE", name: "Imagem de Fundo", order: 1, visible: Boolean(state.imageUrl), locked: true, imageUrl: state.imageUrl || "", imageTransform: state.imageUrl ? { x: 0, y: 0, width: 1280, height: 720, rotation: 0 } : undefined },
    { id: "layer-objects", kind: "OBJECTS", name: "Imagens", order: 2, visible: true, locked: false, objectIds: [] },
  ];

  if (hasStrokes) {
    baseLayers.push({ id: "layer-drawings", kind: "DRAWING", name: "Desenhos", order: 3, visible: true, locked: false, strokeIds: (state.strokes || []).map((s) => s.id), shapeIds: [] });
  }

  baseLayers.push({
    id: "layer-grid", kind: "GRID", name: "Grade",
    order: hasStrokes ? 4 : 3, visible: true, locked: true,
    gridSize: saneGridSize, gridColor: state.gridColor, gridThickness: state.gridThickness,
    gridSizeX: saneGridSizeX, gridSizeY: saneGridSizeY,
    gridShape: state.gridShape ?? "square", gridOpacity: state.gridOpacity ?? 1,
  });

  const objectLayers = ((state.layers || []) as BattlemapCombatLayer[]).filter(
    (l) => l && l.kind === "OBJECTS" && l.objectIds && l.objectIds.length > 0,
  );

  return {
    ...state, gridSize: saneGridSize, gridSizeX: saneGridSizeX, gridSizeY: saneGridSizeY,
    layers: [...baseLayers, ...objectLayers],
    activeLayerId: state.activeLayerId || (hasStrokes ? "layer-drawings" : "layer-grid"),
  };
}

function ensureSystemSkills(state: SessionState): SessionState {
  const systemId = (state.system || "fate").trim().toLowerCase();
  const plugin = getCachedSystem(systemId);

  const getFateDefaults = () =>
    DEFAULT_SKILLS.map((name, index) => ({
      id: `default-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name, order: index, createdAt: new Date(2024, 0, 1).toISOString(),
    }));

  const getVampireDefaults = () =>
    VAMPIRE_SKILLS.map((name, index) => ({
      id: `default-vampire-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name, order: index, createdAt: new Date(2024, 0, 1).toISOString(),
    }));

  const getDefaults = () => (systemId === "vampire" ? getVampireDefaults() : getFateDefaults());
  const isFate = systemId === "fate";
  const isVampire = systemId === "vampire";

  if (state.systemSkills === undefined || state.systemSkills === null) {
    const initial = plugin ? plugin.initialSkills() : getDefaults();
    return { ...state, systemSkills: initial };
  }

  const hasWrongSystemDefaults = state.systemSkills.some(
    (s) =>
      (isVampire && s.id.startsWith("default-") && !s.id.startsWith("default-vampire-")) ||
      (isFate && s.id.startsWith("default-vampire-")),
  );
  if (hasWrongSystemDefaults) {
    const cleanedSkills = state.systemSkills.filter((s) => {
      if (isVampire) return !s.id.startsWith("default-") || s.id.startsWith("default-vampire-");
      if (isFate) return !s.id.startsWith("default-vampire-");
      return true;
    });
    return ensureSystemSkills({ ...state, systemSkills: cleanedSkills });
  }

  if (isFate || isVampire) {
    const defaults = getDefaults();
    const existingIds = new Set(state.systemSkills.map((s) => s.id));
    const missingDefaults = defaults.filter((d) => !existingIds.has(d.id));
    if (missingDefaults.length > 0) {
      return { ...state, systemSkills: [...missingDefaults, ...state.systemSkills] };
    }
  }

  return state;
}

function migrateFogLayers(state: BattlemapState): BattlemapState {
  const layers = state.layers;
  if (!layers) return state;
  const hasFogRooms = layers.some((l: any) => l.kind === "FOG_ROOMS");
  if (!hasFogRooms) return state;
  const fogParent = layers.find((l) => l.kind === "FOG");
  const fogParentId = fogParent?.id ?? null;
  const migrated = layers
    .filter((l: any) => l.kind !== "FOG_ROOMS")
    .map((l) => {
      if (l.kind === "FOG_ROOM" && !l.parentLayerId && fogParentId) {
        return { ...l, parentLayerId: fogParentId };
      }
      return l;
    });
  return { ...state, layers: migrated };
}

export const SCENE_DIALOGUE_RETENTION_LIMIT = 200;

export function trimSceneDialogues<T extends { dialogueMessages?: any[] }>(scenes: T[]): T[] {
  if (!Array.isArray(scenes)) return scenes;
  let changed = false;
  const next = scenes.map((scene) => {
    const messages = scene?.dialogueMessages;
    if (!Array.isArray(messages) || messages.length <= SCENE_DIALOGUE_RETENTION_LIMIT) return scene;
    changed = true;
    return { ...scene, dialogueMessages: messages.slice(-SCENE_DIALOGUE_RETENTION_LIMIT) };
  });
  return changed ? next : scenes;
}

export function applySceneDialogueRetention(state: any): any {
  const battlemap = (state as SessionState)?.battlemap;
  if (!battlemap || !Array.isArray(battlemap.scenes)) return state;
  const trimmed = trimSceneDialogues(battlemap.scenes);
  if (trimmed === battlemap.scenes) return state;
  return { ...state, battlemap: { ...battlemap, scenes: trimmed } };
}

function ensureBattlemapScenes(state: BattlemapState): BattlemapState {
  if (!state || typeof state !== "object") return createDefaultBattlemap();
  const sceneModeActive = state.sceneModeActive ?? false;

  if (state.scenes && state.scenes.length > 0) {
    const normalizedScenes = state.scenes.map((scene) => {
      const baseLayerId = `layer-bg-${scene.id}`;
      const scenarioLayerId = `layer-bgimg-${scene.id}`;
      const baseLayer = scene.layers.find((l: any) => l.type === "BACKGROUND") || { id: baseLayerId, type: "BACKGROUND", name: "Background", hidden: false };
      const dynamicLayers = scene.layers.filter((l: any) => l.type !== "BACKGROUND").map((l: any) => ({ ...l, hidden: l.hidden ?? false }));
      const hasScenarioLayer = dynamicLayers.some((l: any) => l.id === scenarioLayerId);
      const scenarioLayer = scene.backgroundImage && !hasScenarioLayer
        ? [{ id: scenarioLayerId, type: "OBJECT", name: "Cenario", thumbnailUrl: scene.backgroundImage, hidden: false }]
        : [];
      return {
        ...scene,
        backgroundTransform: scene.backgroundTransform || { x: 0, y: 0, width: 1280, height: 720 },
        layers: [{ ...baseLayer, hidden: baseLayer.hidden ?? false }, ...dynamicLayers, ...scenarioLayer],
        strokes: scene.strokes || [],
        objects: (scene.objects || []).map((obj: any) => ({ ...obj, isConversable: obj.isConversable ?? false })),
        dialogueMessages: (scene.dialogueMessages || []).slice(-SCENE_DIALOGUE_RETENTION_LIMIT),
      };
    });

    const validSceneIds = new Set(normalizedScenes.map((s) => s.id));
    const normalizedAssignments = Object.entries(state.scenePlayerAssignments || {}).reduce<Record<string, string>>(
      (acc, [rawUserId, rawSceneId]) => {
        const uid = (rawUserId || "").trim().toLowerCase();
        const sid = typeof rawSceneId === "string" ? rawSceneId : "";
        if (!uid || !sid || !validSceneIds.has(sid)) return acc;
        acc[uid] = sid;
        return acc;
      }, {},
    );

    return {
      ...state, sceneModeActive,
      scenePlayerAssignments: normalizedAssignments,
      scenes: normalizedScenes,
      activeSceneId: state.activeSceneId || normalizedScenes[0]?.id,
    };
  }

  const sceneId = "scene-1";
  const legacyBg = state.imageUrl || undefined;
  const bgLayers = legacyBg
    ? [{ id: `layer-bgimg-${sceneId}`, type: "OBJECT", name: "Cenario", thumbnailUrl: legacyBg, hidden: false }]
    : [];
  return {
    ...state, sceneModeActive, scenePlayerAssignments: {},
    activeSceneId: sceneId,
    scenes: [{
      id: sceneId, name: "Cena 1", backgroundColor: "#0d0907",
      backgroundImage: legacyBg,
      backgroundTransform: { x: 0, y: 0, width: 1280, height: 720 },
      layers: [
        { id: `layer-bg-${sceneId}`, type: "BACKGROUND", name: "Background", hidden: false },
        ...bgLayers,
        ...(state.objects || []).map((obj: any) => ({ id: `layer-object-${obj.id}`, type: "OBJECT", name: "Objeto", objectId: obj.id, thumbnailUrl: obj.imageUrl, hidden: false })),
      ],
      strokes: state.strokes || [],
      objects: (state.objects || []).map((obj: any) => ({ ...obj, isConversable: obj.isConversable ?? false })),
      dialogueMessages: [],
    }],
  };
}

// ---------------------------------------------------------------------------
// Reducer legado / base (cobre todos os eventos de plataforma)
// Copiado integralmente de projections.ts — sem modificações de lógica
// ---------------------------------------------------------------------------

function reduceFateLegacy(state: SessionState, event: ActionEvent): SessionState {
  const { type, payload } = event;

  if (!payload && type !== "ALL_NOTES_DELETED") return state;

  switch (type) {
    case "SESSION_CREATED":
      return { ...state, id: payload.sessionId, name: payload.name, system: payload.system ?? state.system, gmUserId: event.actorUserId ?? state.gmUserId };

    case "TURN_GRANTED":
      return { ...state, currentTurnUserId: payload.userId };
    case "TURN_REVOKED":
      return { ...state, currentTurnUserId: undefined };
    case "SESSION_NUMBER_UPDATED":
      return { ...state, sessionNumber: payload.number };
    case "SESSION_HEADER_UPDATED":
      return { ...state, headerImages: { ...state.headerImages, [payload.tab]: payload.imageUrl } };
    case "SEAT_STATE_CHANGED":
      return {
        ...state,
        seats: (state.seats ?? []).some((s) => s.userId === payload.userId)
          ? (state.seats ?? []).map((s) => (s.userId === payload.userId ? { ...s, state: payload.state } : s))
          : [...(state.seats ?? []), { userId: payload.userId, state: payload.state, role: "PLAYER" }],
      };

    case "CHARACTER_ASSIGNED": {
      const { userId, characterId } = payload;
      const targetChar = state.characters[characterId];
      if (targetChar && (targetChar.source === "bestiary" || targetChar.isNPC === true)) return state;
      const current = state.characterAssignments?.[userId] ?? [];
      if (current.includes(characterId)) return state;
      return { ...state, characterAssignments: { ...state.characterAssignments, [userId]: [...current, characterId] } };
    }
    case "CHARACTER_UNASSIGNED": {
      const { userId, characterId } = payload;
      const current = state.characterAssignments?.[userId] ?? [];
      const updated = current.filter((id: string) => id !== characterId);
      const next = { ...state.characterAssignments };
      if (updated.length === 0) delete next[userId]; else next[userId] = updated;
      return { ...state, characterAssignments: next };
    }

    case "ROLL_VISIBILITY_UPDATED":
      return { ...state, rollVisibilityOverrides: { ...(state.rollVisibilityOverrides || {}), [payload.rollEventId]: { hiddenForPlayers: payload.hiddenForPlayers } } };

    case "CHARACTER_CREATED": {
      const createdCharacter = normalizeCharacterStress({
        ...payload,
        activeInArena: payload.activeInArena ?? false,
        fatePoints: payload.fatePoints ?? 3,
        stress: payload.stress ?? { physical: [false, false], mental: [false, false] },
        skills: payload.skills ?? DEFAULT_SKILLS.reduce((acc: Record<string, number>, sk: string) => ({ ...acc, [sk]: 0 }), {}),
        consequences: payload.consequences ?? {},
        inventory: payload.inventory ?? [],
        stunts: payload.stunts ?? [],
        spells: payload.spells ?? [],
        magicLevel: payload.magicLevel ?? 0,
        imageUrl: payload.imageUrl,
        source: payload.source ?? "active",
      });
      return { ...state, characters: { ...state.characters, [payload.id]: createdCharacter } };
    }

    case "CHARACTER_MOVED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, currentZoneId: payload.toZoneId } } };
    }

    case "CHARACTER_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const mergedCharacter = normalizeCharacterStress({ ...char, ...payload.changes });
      const becameUnassignable = (payload.changes?.source === "bestiary" && char.source !== "bestiary") || (payload.changes?.isNPC === true && char.isNPC !== true);
      const nextAssignments = becameUnassignable ? pruneCharacterFromAssignments(state.characterAssignments, payload.characterId) : state.characterAssignments;
      return { ...state, characters: { ...state.characters, [payload.characterId]: mergedCharacter }, characterAssignments: nextAssignments };
    }

    case "CHARACTER_DELETED": {
      const { [payload.characterId]: _, ...remainingCharacters } = state.characters;
      return { ...state, characters: remainingCharacters, turnOrder: (state.turnOrder || []).filter((id) => id !== payload.characterId), characterAssignments: pruneCharacterFromAssignments(state.characterAssignments, payload.characterId) };
    }

    case "STRESS_MARKED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const track = payload.track.toLowerCase() as "physical" | "mental";
      const newTrack = [...(char.stress?.[track] || [])];
      if (payload.boxIndex >= 0 && payload.boxIndex < newTrack.length) newTrack[payload.boxIndex] = true;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, stress: { ...(char.stress || {}), [track]: newTrack } } } };
    }

    case "STRESS_CLEARED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const track = payload.track.toLowerCase() as "physical" | "mental";
      const newTrack = [...(char.stress?.[track] || [])];
      if (payload.boxIndex >= 0 && payload.boxIndex < newTrack.length) newTrack[payload.boxIndex] = false;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, stress: { ...(char.stress || {}), [track]: newTrack } } } };
    }

    case "CHARACTER_CONSEQUENCE_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const nextConsequences = { ...(char.consequences || {}) };
      const isEmpty = !payload.value || payload.value.trim() === "";
      if (isEmpty) delete nextConsequences[payload.slot];
      else nextConsequences[payload.slot] = { text: payload.value || "", debuff: payload.debuff };
      const removedDefaultSlots = (char.removedDefaultSlots || []).filter((s) => s !== payload.slot);
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, consequences: nextConsequences, removedDefaultSlots } } };
    }

    case "CHARACTER_CONSEQUENCE_SLOT_ADDED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const extraConsequenceSlots = [...(char.extraConsequenceSlots || [])];
      if (!extraConsequenceSlots.includes(payload.slot)) extraConsequenceSlots.push(payload.slot);
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, extraConsequenceSlots } } };
    }

    case "CHARACTER_CONSEQUENCE_DELETED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const newConsequences = { ...(char.consequences || {}) };
      delete newConsequences[payload.slot];
      const extraConsequenceSlots = (char.extraConsequenceSlots || []).filter((s) => s !== payload.slot);
      const DEFAULT_CONSEQUENCE_SLOTS = ["mild", "mild2", "moderate", "severe"];
      const removedDefaultSlots = [...(char.removedDefaultSlots || [])];
      if (DEFAULT_CONSEQUENCE_SLOTS.includes(payload.slot) && !removedDefaultSlots.includes(payload.slot)) removedDefaultSlots.push(payload.slot);
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, consequences: newConsequences, removedDefaultSlots, extraConsequenceSlots } } };
    }

    case "CHARACTER_INVENTORY_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const currentInventory = char.inventory || [];
      const itemIndex = currentInventory.findIndex((i) => i.id === payload.item.id);
      const newInventory = itemIndex >= 0 ? currentInventory.map((i, idx) => idx === itemIndex ? payload.item : i) : [...currentInventory, payload.item];
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, inventory: newInventory } } };
    }

    case "CHARACTER_STUNT_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const currentStunts = char.stunts || [];
      const stuntIndex = currentStunts.findIndex((s) => s.id === payload.stunt.id);
      const newStunts = stuntIndex >= 0 ? currentStunts.map((s, i) => i === stuntIndex ? payload.stunt : s) : [...currentStunts, payload.stunt];
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, stunts: newStunts } } };
    }

    case "CHARACTER_STUNT_DELETED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, stunts: (char.stunts || []).filter((s) => s.id !== payload.stuntId) } } };
    }

    case "CHARACTER_SKILL_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, skills: { ...(char.skills || {}), [payload.skill]: payload.rank } } } };
    }

    case "CHARACTER_IMAGE_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, imageUrl: payload.imageUrl, imageThumbnailUrl: payload.imageThumbnailUrl ?? char.imageThumbnailUrl } } };
    }

    case "CHARACTER_NAME_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, name: payload.name } } };
    }

    case "CHARACTER_BIO_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, biography: payload.biography } } };
    }

    case "CHARACTER_SHEET_ASPECT_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const newAspects = [...(char.sheetAspects || ["", "", "", ""])];
      newAspects[payload.index] = payload.value;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, sheetAspects: newAspects } } };
    }

    case "CHARACTER_REFRESH_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const clampedFate = Math.min((char as any).fatePoints ?? 0, payload.refresh);
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, refresh: payload.refresh, fatePoints: clampedFate } } };
    }

    case "STRESS_TRACK_EXPANDED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const track = payload.track.toLowerCase() as "physical" | "mental";
      const currentValues = deriveStressValues(char, track);
      const nextValue = clampStressValue(payload.value ?? currentValues.length + 1);
      return {
        ...state,
        characters: {
          ...state.characters,
          [payload.characterId]: {
            ...char,
            stress: { ...(char.stress || {}), [track]: [...(char.stress?.[track] || []), false] },
            stressValues: {
              physical: track === "physical" ? [...currentValues, nextValue] : deriveStressValues(char, "physical"),
              mental: track === "mental" ? [...currentValues, nextValue] : deriveStressValues(char, "mental"),
            },
          },
        },
      };
    }

    case "STRESS_TRACK_REDUCED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const track = payload.track.toLowerCase() as "physical" | "mental";
      const currentTrack = char.stress?.[track] || [];
      if (currentTrack.length === 0) return state;
      const currentValues = deriveStressValues(char, track);
      return {
        ...state,
        characters: {
          ...state.characters,
          [payload.characterId]: {
            ...char,
            stress: { ...(char.stress || {}), [track]: currentTrack.slice(0, -1) },
            stressValues: {
              physical: track === "physical" ? currentValues.slice(0, -1) : deriveStressValues(char, "physical"),
              mental: track === "mental" ? currentValues.slice(0, -1) : deriveStressValues(char, "mental"),
            },
          },
        },
      };
    }

    case "STRESS_BOX_VALUE_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      const rawTrack = typeof payload.track === "string" ? payload.track.toLowerCase() : "";
      if (rawTrack !== "physical" && rawTrack !== "mental") return state;
      const track = rawTrack as "physical" | "mental";
      const currentTrack = char.stress?.[track] || [];
      if (payload.boxIndex < 0 || payload.boxIndex >= currentTrack.length) return state;
      const values = deriveStressValues(char, track);
      values[payload.boxIndex] = clampStressValue(payload.value);
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, stressValues: { physical: track === "physical" ? values : deriveStressValues(char, "physical"), mental: track === "mental" ? values : deriveStressValues(char, "mental") } } } };
    }

    case "ASPECT_CREATED":
      return { ...state, aspects: { ...state.aspects, [payload.id]: { id: payload.id, name: payload.name, scope: payload.scope || "SCENE", freeInvokes: payload.freeInvokes || 0, revealed: payload.revealed ?? true, ownerId: payload.ownerId, description: payload.description } } };

    case "ASPECT_UPDATED": {
      const aspect = state.aspects[payload.aspectId];
      if (!aspect) return state;
      return { ...state, aspects: { ...state.aspects, [payload.aspectId]: { ...aspect, ...payload.patch } } };
    }

    case "FREE_INVOKE_CONSUMED": {
      const aspect = state.aspects[payload.aspectId];
      if (!aspect) return state;
      return { ...state, aspects: { ...state.aspects, [payload.aspectId]: { ...aspect, freeInvokes: Math.max(0, aspect.freeInvokes - payload.amount) } } };
    }

    case "FREE_INVOKE_PRODUCED": {
      const aspect = state.aspects[payload.aspectId];
      if (!aspect) return state;
      return { ...state, aspects: { ...state.aspects, [payload.aspectId]: { ...aspect, freeInvokes: aspect.freeInvokes + payload.amount } } };
    }

    case "ZONE_CREATED":
      return { ...state, zones: { ...state.zones, [payload.id]: payload } };
    case "ZONE_LINKED":
      return { ...state, links: [...(state.links ?? []), payload] };

    case "TURN_ORDER_UPDATED": {
      const charIds = payload?.characterIds ?? [];
      const currentIdx = state.currentTurnIndex || 0;
      const currentActorId = state.turnOrder && state.turnOrder[currentIdx] ? state.turnOrder[currentIdx] : null;
      let newIdx = 0;
      if (currentActorId) {
        const foundIdx = charIds.indexOf(currentActorId);
        if (foundIdx !== -1) newIdx = foundIdx;
      }
      const combatEnded = charIds.length === 0;
      return { ...state, turnOrder: charIds, currentTurnIndex: newIdx, currentRound: combatEnded ? 1 : state.currentRound, ...(combatEnded ? { electionPending: false, electiveActiveId: null, actedThisRound: [] } : {}), lastTurnChangeTimestamp: event.createdAt };
    }

    case "TURN_STEPPED": {
      const nextIdx = payload.index;
      let nextRound = state.currentRound || 1;
      if (nextIdx === 0 && (state.turnOrder?.length || 0) > 0) nextRound++;
      return { ...state, currentTurnIndex: nextIdx, currentRound: nextRound, timerPaused: false, lastTurnChangeTimestamp: event.createdAt };
    }

    case "TURN_ORDER_MODE_SET": {
      const p = payload as any;
      const isNormal = p.mode === "NORMAL" || p.mode === "BY_SKILL";
      const isElective = p.mode === "ELECTIVE";
      return { ...state, turnOrderMode: p.mode, turnOrderSkillId: p.skillId ?? (isNormal ? undefined : state.turnOrderSkillId), electiveActiveId: isNormal ? null : state.electiveActiveId, actedThisRound: isElective ? [] : state.actedThisRound, electionPending: isElective ? false : state.electionPending };
    }

    case "TURN_ELECTION_OPENED":
      return { ...state, electionPending: true };

    case "TURN_ELECTED_NEXT": {
      const p = payload as any;
      const outgoingId = state.electiveActiveId;
      const newActed = [...(state.actedThisRound || [])];
      if (outgoingId && !newActed.includes(outgoingId)) newActed.push(outgoingId);
      const others = (state.turnOrder || []).filter((id: string) => id !== p.characterId);
      const allOthersActed = others.every((id: string) => newActed.includes(id));
      return { ...state, electiveActiveId: p.characterId, actedThisRound: allOthersActed ? [] : newActed, currentRound: allOthersActed ? ((state.currentRound || 1) + 1) : (state.currentRound || 1), electionPending: false, timerPaused: false, lastTurnChangeTimestamp: event.createdAt };
    }

    case "COMBAT_TARGET_SET":
      return { ...state, targetId: payload.targetId || payload.targetIds?.[0] || undefined, pendingTargetIds: payload.targetIds || [], damageType: payload.damageType || state.damageType, isReaction: payload.isReaction ?? !!(payload.targetId || payload.targetIds?.length), attackerCharacterId: payload.attackerCharacterId || state.attackerCharacterId };

    case "COMBAT_REACTION_ENDED":
      return { ...state, isReaction: false, targetId: undefined, pendingTargetIds: [], damageType: undefined, timerPaused: false, attackerCharacterId: undefined };

    case "ROLL_RESOLVED": {
      if (state.isReaction && payload.actionType === "DEFEND") {
        const remaining = (state.pendingTargetIds || []).filter((id) => id !== payload.characterId);
        if (remaining.length > 0) return { ...state, targetId: remaining[0], pendingTargetIds: remaining, isReaction: true };
        return { ...state, isReaction: false, targetId: undefined, pendingTargetIds: [], timerPaused: false, attackerCharacterId: undefined };
      }
      return state;
    }

    case "TIMER_PAUSED":
      return { ...state, timerPaused: true, timerPausedAt: payload.pausedAt };
    case "TIMER_RESUMED":
      return { ...state, timerPaused: false, timerPausedAt: undefined };
    case "TURN_FORCED_PASS":
      return { ...state, lastTurnChangeTimestamp: event.createdAt };

    case "NOTE_ADDED":
      return { ...state, notes: upsertById(state.notes || [], payload) };
    case "NOTE_UPDATED": {
      const patch = payload.patch || (payload.content !== undefined ? { content: payload.content } : {});
      return { ...state, notes: patchById(state.notes || [], payload.noteId, patch) };
    }
    case "NOTE_DELETED":
      return { ...state, notes: (state.notes || []).filter((n) => n.id !== payload.noteId) };
    case "ALL_NOTES_DELETED":
      return { ...state, notes: [] };
    case "NOTE_FOLDER_CREATED":
      return { ...state, noteFolders: upsertById(state.noteFolders || [], payload) };
    case "NOTE_FOLDER_UPDATED":
      return { ...state, noteFolders: patchById(state.noteFolders || [], payload.folderId, payload.patch) };
    case "NOTE_FOLDER_DELETED":
      return { ...state, noteFolders: (state.noteFolders || []).filter((f) => f.id !== payload.folderId), notes: clearFolderIdFromNotes(state.notes || [], payload.folderId) };

    case "SESSION_THEME_UPDATED":
      return { ...state, themeColor: payload.color || undefined };
    case "SESSION_THEME_TITLE_COLOR_UPDATED":
      return { ...state, themeTitleColor: payload.color || null };
    case "SESSION_THEME_PRESET_UPDATED":
      return { ...state, themePreset: payload.preset, themeColor: undefined, themeTitleColor: null };
    case "SESSION_SOUNDS_UPDATED":
      return { ...state, soundSettings: { ...state.soundSettings, ...payload } };
    case "SESSION_THEME_LOCK_UPDATED":
      return { ...state, themeLocked: payload.locked };
    case "MUSIC_PLAYBACK_CHANGED":
      if (payload.isTemporary) return state;
      return { ...state, currentMusic: { url: payload.url, loop: payload.loop, playing: payload.playing } };
    case "ATMOSPHERIC_EFFECT_UPDATED": {
      const types = payload.types ?? (payload.type ? [payload.type] : []);
      return { ...state, atmosphericEffects: types, atmosphericEffect: types[0] || "none" };
    }

    case "WORLD_ENTITY_CREATED": {
      if (!payload?.id) return state;
      return { ...state, worldEntities: { ...(state.worldEntities || {}), [payload.id]: payload } };
    }
    case "WORLD_ENTITY_UPDATED": {
      const entity = (state.worldEntities || {})[payload.entityId];
      if (!entity) return state;
      return { ...state, worldEntities: { ...state.worldEntities, [payload.entityId]: { ...entity, ...payload.patch } } };
    }
    case "WORLD_ENTITY_DELETED": {
      const { [payload.entityId]: _, ...remainingEntities } = state.worldEntities || {};
      return { ...state, worldEntities: remainingEntities };
    }

    case "MISSION_CREATED":
      return { ...state, missions: [...(state.missions || []), payload] };
    case "MISSION_UPDATED":
      return { ...state, missions: (state.missions || []).map((m) => m.id === payload.missionId ? { ...m, ...payload.patch } : m) };
    case "MISSION_DELETED":
      return { ...state, missions: (state.missions || []).filter((m) => m.id !== payload.missionId) };

    case "TIMELINE_EVENT_CREATED":
      return { ...state, timeline: [...(state.timeline || []), payload] };
    case "TIMELINE_EVENT_UPDATED":
      return { ...state, timeline: (state.timeline || []).map((e) => e.id === payload.eventId ? { ...e, ...payload.patch } : e) };
    case "TIMELINE_EVENT_DELETED":
      return { ...state, timeline: (state.timeline || []).filter((e) => e.id !== payload.eventId) };

    case "GLOBAL_SKILL_CREATED":
      return { ...state, skills: [...(state.skills || []), payload] };
    case "GLOBAL_SKILL_UPDATED":
      return { ...state, skills: (state.skills || []).map((s) => s.id === payload.skillId ? { ...s, ...payload.patch } : s) };
    case "GLOBAL_SKILL_DELETED":
      return { ...state, skills: (state.skills || []).filter((s) => s.id !== payload.skillId) };

    case "GLOBAL_ITEM_CREATED":
      return { ...state, items: [...(state.items || []), payload] };
    case "GLOBAL_ITEM_UPDATED":
      return { ...state, items: (state.items || []).map((i) => i.id === payload.itemId ? { ...i, ...payload.patch } : i) };
    case "GLOBAL_ITEM_DELETED":
      return { ...state, items: (state.items || []).filter((i) => i.id !== payload.itemId) };

    case "MIND_MAP_CREATED":
      return { ...state, mindMaps: [...(state.mindMaps || []), payload] };
    case "MIND_MAP_UPDATED":
      return { ...state, mindMaps: (state.mindMaps || []).map((m) => m.id === payload.mindMapId ? { ...m, ...payload.patch } : m) };
    case "MIND_MAP_DELETED":
      return { ...state, mindMaps: (state.mindMaps || []).filter((m) => m.id !== payload.mindMapId) };
    case "MIND_MAP_PRIVACY_UPDATED":
      return { ...state, mindMaps: (state.mindMaps || []).map((m) => m.id === payload.mindMapId ? { ...m, isPrivate: payload.isPrivate, ...(payload.allowEditing !== undefined ? { allowEditing: payload.allowEditing } : {}) } : m) };
    case "MIND_MAP_CONNECTION_ADDED":
      return { ...state, mindMaps: (state.mindMaps || []).map((m) => { if (m.id !== payload.mindMapId) return m; const conns = m.connections || []; if (conns.some((c: any) => c.id === payload.connection.id)) return { ...m, connections: conns.map((c: any) => c.id === payload.connection.id ? { ...c, ...payload.connection } : c) }; return { ...m, connections: [...conns, payload.connection] }; }) };
    case "MIND_MAP_CONNECTION_UPDATED":
      return { ...state, mindMaps: (state.mindMaps || []).map((m) => m.id === payload.mindMapId ? { ...m, connections: (m.connections || []).map((c: any) => c.id === payload.connectionId ? { ...c, ...payload.patch } : c) } : m) };
    case "MIND_MAP_CONNECTION_DELETED":
      return { ...state, mindMaps: (state.mindMaps || []).map((m) => m.id === payload.mindMapId ? { ...m, connections: (m.connections || []).filter((c: any) => c.id !== payload.connectionId) } : m) };

    case "STICKY_NOTE_CREATED": {
      const incoming = { ...payload, ownerId: event.actorUserId };
      const existing = state.stickyNotes || [];
      if (existing.some((n) => n.id === incoming.id)) return { ...state, stickyNotes: existing.map((n) => n.id === incoming.id ? { ...n, ...incoming } : n) };
      return { ...state, stickyNotes: [...existing, incoming] };
    }
    case "STICKY_NOTE_UPDATED": {
      const noteToUpdate = state.stickyNotes?.find((n) => n.id === payload.id);
      if (noteToUpdate && normalizeIdentity(noteToUpdate.ownerId) !== normalizeIdentity(event.actorUserId)) return state;
      return { ...state, stickyNotes: (state.stickyNotes || []).map((n) => n.id === payload.id ? { ...n, ...payload.patch } : n) };
    }
    case "STICKY_NOTE_DELETED": {
      const noteToDelete = state.stickyNotes?.find((n) => n.id === payload.id);
      if (noteToDelete && normalizeIdentity(noteToDelete.ownerId) !== normalizeIdentity(event.actorUserId)) return state;
      return { ...state, stickyNotes: (state.stickyNotes || []).filter((n) => n.id !== payload.id) };
    }
    case "STICKY_NOTE_VISIBILITY_CHANGED": {
      const n = state.stickyNotes?.find((n) => n.id === payload.id);
      if (!n || normalizeIdentity(n.ownerId) !== normalizeIdentity(event.actorUserId)) return state;
      return { ...state, stickyNotes: state.stickyNotes!.map((sn) => sn.id === payload.id ? { ...sn, visibility: payload.visibility, hiddenFor: [] } : sn) };
    }
    case "STICKY_NOTE_HIDDEN_FOR_USER": {
      const n = state.stickyNotes?.find((sn) => sn.id === payload.id);
      if (!n || n.ownerId === event.actorUserId || (n.visibility ?? "OWNER_ONLY") !== "PUBLIC") return state;
      const currentHidden = n.hiddenFor ?? [];
      if (currentHidden.includes(payload.userId)) return state;
      return { ...state, stickyNotes: state.stickyNotes!.map((sn) => sn.id === payload.id ? { ...sn, hiddenFor: [...currentHidden, payload.userId] } : sn) };
    }

    // Story 178 F1 — Arena GM Cards. Only the Fate family; ignored in wod-v20.
    // Full-payload upsert/delete keyed by cardId (scalar fields merge, rows replace).
    case "ARENA_CARD_UPDATED": {
      const sys = (state.system || "fate");
      if (sys !== "fate" && sys !== "fate-accelerated" && sys !== "vampire") return state;
      if (!payload?.cardId) return state;
      const cards = { ...(state.arenaCards || {}) };
      if (payload.deleted) {
        if (!cards[payload.cardId]) return state;
        delete cards[payload.cardId];
        return { ...state, arenaCards: cards };
      }
      const prev = cards[payload.cardId] ?? {
        cardId: payload.cardId,
        sessionId: payload.sessionId,
        x: 38, y: 24, color: "var(--accent-color)", title: "Novo Card",
        cardVisible: false, rows: [],
      };
      const merged: any = { ...prev, cardId: payload.cardId, sessionId: payload.sessionId || prev.sessionId };
      if (payload.x !== undefined) merged.x = payload.x;
      if (payload.y !== undefined) merged.y = payload.y;
      if (payload.width !== undefined) merged.width = payload.width;
      if (payload.height !== undefined) merged.height = payload.height;
      if (payload.color !== undefined) merged.color = payload.color;
      if (payload.title !== undefined) merged.title = payload.title;
      if (payload.cardVisible !== undefined) merged.cardVisible = payload.cardVisible;
      if (payload.rows !== undefined) merged.rows = payload.rows;
      cards[payload.cardId] = merged;
      return { ...state, arenaCards: cards };
    }

    case "CHARACTER_NOTE_ADDED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, linkedNotes: upsertById(char.linkedNotes || [], payload.note) } } };
    }
    case "CHARACTER_NOTE_UPDATED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, linkedNotes: patchById(char.linkedNotes || [], payload.noteId, payload.patch) } } };
    }
    case "CHARACTER_NOTE_DELETED": {
      const char = state.characters[payload.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [payload.characterId]: { ...char, linkedNotes: (char.linkedNotes || []).filter((n) => n.id !== payload.noteId) } } };
    }

    case "SCENE_DIALOGUE_CLEARED": {
      const battlemap = state.battlemap;
      const sceneId = (payload as any)?.sceneId;
      if (!battlemap || !Array.isArray(battlemap.scenes) || !sceneId) return state;
      if (!battlemap.scenes.some((sc) => sc.id === sceneId)) return state;
      return { ...state, battlemap: { ...battlemap, scenes: battlemap.scenes.map((sc) => sc.id === sceneId ? { ...sc, dialogueMessages: [] } : sc) } };
    }

    case "BATTLEMAP_UPDATED": {
      let merged = { ...(state.battlemap || createDefaultBattlemap()), ...payload } as BattlemapState;
      if (merged.objects) merged.objects = merged.objects.map(mirrorObjectState1);
      if (merged.battlemaps) merged.battlemaps = merged.battlemaps.map((bm) => ({ ...bm, objects: (bm.objects || []).map(mirrorObjectState1) }));
      if (merged.scenes) merged.scenes = merged.scenes.map((sc) => ({ ...sc, objects: (sc.objects || []).map(mirrorObjectState1) }));
      if (payload.fogOfWar !== undefined) merged.fogOfWar = { ...(state.battlemap?.fogOfWar || {}), ...payload.fogOfWar };
      if (payload.gridSize !== undefined && payload.gridSizeX === undefined && payload.gridSizeY === undefined) { merged.gridSizeX = merged.gridSize; merged.gridSizeY = merged.gridSize; }
      if ((payload.gridSizeX !== undefined || payload.gridSizeY !== undefined) && payload.gridSize === undefined) merged.gridSize = merged.gridSizeX ?? merged.gridSize;
      if (payload.gridShape === undefined) merged.gridShape = merged.gridShape ?? "square";
      let result = ensureBattlemapCombatLayers(ensureBattlemapScenes(merged));
      if (payload.strokes !== undefined && Array.isArray(payload.strokes) && payload.strokes.length === 0) result = { ...result, layers: result.layers?.map((l) => l.kind === "DRAWING" ? { ...l, strokeIds: [] } : l) };
      if (payload.shapes !== undefined && Array.isArray(payload.shapes) && payload.shapes.length === 0) result = { ...result, layers: result.layers?.map((l) => l.kind === "DRAWING" ? { ...l, shapeIds: [] } : l) };
      result = migrateFogLayers(result);
      if (payload.layers !== undefined) {
        const nextLayerIds = new Set((result.layers || []).map((l) => l.id));
        const prevLayerIds = new Set((state.battlemap?.layers || []).map((l) => l.id));
        const removedLayerIds = new Set([...prevLayerIds].filter((id) => !nextLayerIds.has(id)));
        if (removedLayerIds.size > 0) {
          const prevLayers = state.battlemap?.layers || [];
          const fogParentDeleted = prevLayers.some((l) => l.kind === "FOG" && removedLayerIds.has(l.id));
          if (fogParentDeleted) {
            result = { ...result, fogOfWar: undefined, layers: (result.layers || []).filter((l) => l.kind !== "FOG_ROOM") };
          } else {
            const removedRoomLayerIds = new Set(prevLayers.filter((l) => l.kind === "FOG_ROOM" && removedLayerIds.has(l.id)).map((l) => l.id));
            if (removedRoomLayerIds.size > 0 && result.fogOfWar?.rooms?.length) {
              result = { ...result, fogOfWar: { ...result.fogOfWar, rooms: result.fogOfWar.rooms.filter((r: any) => !r.layerId || !removedRoomLayerIds.has(r.layerId)) } };
            }
          }
        }
      }
      const isFogEmpty = (f: any) => { if (!f) return true; if (f.globalEnabled) return false; if ((f.brushMask?.strokes?.length ?? 0) > 0) return false; if ((f.rooms?.length ?? 0) > 0) return false; return true; };
      if (isFogEmpty(result.fogOfWar)) result = { ...result, layers: (result.layers || []).filter((l) => l.kind !== "FOG" && l.kind !== "FOG_ROOM"), fogOfWar: result.fogOfWar?.resetExploredAt ? { resetExploredAt: result.fogOfWar.resetExploredAt } : undefined };
      if (result.layers) {
        const hasFxChildren = result.layers.some((l) => l.kind === "fx" && l.parentLayerId === "effects-root");
        if (!hasFxChildren) result = { ...result, layers: result.layers.filter((l) => l.id !== "effects-root") };
        const allLayers0 = result.layers ?? [];
        const hasStrayMarkers = allLayers0.some((l) => { if (l.kind !== "SOUND_MARKER") return false; const p = allLayers0.find((x) => x.id === l.parentLayerId); return !p || p.kind !== "SOUND"; });
        if (hasStrayMarkers) {
          let layers1 = [...allLayers0];
          let parent = layers1.find((l) => l.kind === "SOUND");
          if (!parent) { const maxOrder = Math.max(0, ...layers1.map((l) => l.order)); parent = { id: `sons-${Date.now()}`, name: "Sons", kind: "SOUND", order: maxOrder + 1, visible: true, locked: false }; layers1.push(parent); }
          layers1 = layers1.map((l) => { if (l.kind !== "SOUND_MARKER") return l; const p = layers1.find((x) => x.id === l.parentLayerId); if (!p || p.kind !== "SOUND") return { ...l, parentLayerId: parent!.id }; return l; });
          result = { ...result, layers: layers1 };
        }
        const soundParents = (result.layers ?? []).filter((l) => l.kind === "SOUND");
        for (const parent of soundParents) {
          const currentLayers = result.layers ?? [];
          const hasChildren = currentLayers.some((l) => l.kind === "SOUND_MARKER" && l.parentLayerId === parent.id);
          if (!hasChildren) result = { ...result, layers: currentLayers.filter((l) => l.id !== parent.id) };
        }
      }
      return { ...state, battlemap: result };
    }

    case "BATTLEMAP_OBJECT_ANIMATION_TRIGGERED": {
      if (!state.battlemap) return state;
      const { objectId, mapId, triggeredAt } = payload;
      const updateObject = (obj: BattlemapObject): BattlemapObject => obj.id === objectId ? { ...obj, lastAnimationTriggerAt: triggeredAt } : obj;
      return { ...state, battlemap: { ...state.battlemap, objects: (state.battlemap.objects || []).map(updateObject), battlemaps: (state.battlemap.battlemaps || []).map((bm) => bm.id === mapId ? { ...bm, objects: (bm.objects || []).map(updateObject) } : bm) } };
    }

    case "SYSTEM_SKILL_CREATED":
      return { ...state, systemSkills: [...(state.systemSkills || []), payload] };
    case "SYSTEM_SKILL_RENAMED": {
      const { id, name: newName } = payload;
      const skillDef = (state.systemSkills || []).find((s) => s.id === id);
      if (!skillDef) return state;
      const oldName = skillDef.name;
      const nextSkills = (state.systemSkills || []).map((s) => s.id === id ? { ...s, name: newName } : s);
      const nextCharacters = { ...state.characters };
      for (const charId in nextCharacters) {
        const char = nextCharacters[charId];
        const hasSkill = char.skills && char.skills[oldName] !== undefined;
        if (hasSkill) {
          const val = char.skills![oldName];
          const nextCharSkills = { ...char.skills };
          delete nextCharSkills[oldName];
          nextCharSkills[newName] = val;
          nextCharacters[charId] = { ...char, skills: nextCharSkills };
        }
      }
      return { ...state, systemSkills: nextSkills, characters: nextCharacters };
    }
    case "SYSTEM_SKILL_DELETED": {
      const { id } = payload;
      const skillDef = (state.systemSkills || []).find((s) => s.id === id);
      if (!skillDef) return state;
      const skillName = skillDef.name;
      const nextSkills = (state.systemSkills || []).filter((s) => s.id !== id);
      const nextCharacters = { ...state.characters };
      for (const charId in nextCharacters) {
        const char = nextCharacters[charId];
        if (char.skills && char.skills[skillName] !== undefined) {
          const nextCharSkills = { ...char.skills };
          delete nextCharSkills[skillName];
          nextCharacters[charId] = { ...char, skills: nextCharSkills };
        }
      }
      return { ...state, systemSkills: nextSkills, characters: nextCharacters };
    }
    case "SYSTEM_SKILLS_REORDERED": {
      const { skillIds } = payload;
      const nextSkills = [...(state.systemSkills || [])].sort((a, b) => { const ia = skillIds.indexOf(a.id); const ib = skillIds.indexOf(b.id); return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib); }).map((s, i) => ({ ...s, order: i }));
      return { ...state, systemSkills: nextSkills };
    }

    // Notas de entidades
    case "WORLD_ENTITY_NOTE_ADDED": { const entities = state.worldEntities || {}; const entity = entities[payload.entityId]; if (!entity) return state; return { ...state, worldEntities: { ...entities, [payload.entityId]: { ...entity, linkedNotes: upsertById(entity.linkedNotes || [], payload.note) } } }; }
    case "WORLD_ENTITY_NOTE_DELETED": { const entities = state.worldEntities || {}; const entity = entities[payload.entityId]; if (!entity) return state; return { ...state, worldEntities: { ...entities, [payload.entityId]: { ...entity, linkedNotes: (entity.linkedNotes || []).filter((n: any) => n.id !== payload.noteId) } } }; }
    case "MISSION_NOTE_ADDED": return { ...state, missions: (state.missions || []).map((m) => m.id === payload.missionId ? { ...m, linkedNotes: upsertById(m.linkedNotes || [], payload.note) } : m) };
    case "MISSION_NOTE_DELETED": return { ...state, missions: (state.missions || []).map((m) => m.id === payload.missionId ? { ...m, linkedNotes: (m.linkedNotes || []).filter((n: any) => n.id !== payload.noteId) } : m) };
    case "TIMELINE_EVENT_NOTE_ADDED": return { ...state, timeline: (state.timeline || []).map((e) => e.id === payload.eventId ? { ...e, linkedNotes: upsertById(e.linkedNotes || [], payload.note) } : e) };
    case "TIMELINE_EVENT_NOTE_DELETED": return { ...state, timeline: (state.timeline || []).map((e) => e.id === payload.eventId ? { ...e, linkedNotes: (e.linkedNotes || []).filter((n: any) => n.id !== payload.noteId) } : e) };
    case "GLOBAL_SKILL_NOTE_ADDED": return { ...state, skills: (state.skills || []).map((s) => s.id === payload.skillId ? { ...s, linkedNotes: upsertById(s.linkedNotes || [], payload.note) } : s) };
    case "GLOBAL_SKILL_NOTE_DELETED": return { ...state, skills: (state.skills || []).map((s) => s.id === payload.skillId ? { ...s, linkedNotes: (s.linkedNotes || []).filter((n: any) => n.id !== payload.noteId) } : s) };
    case "GLOBAL_ITEM_NOTE_ADDED": return { ...state, items: (state.items || []).map((i) => i.id === payload.itemId ? { ...i, linkedNotes: upsertById(i.linkedNotes || [], payload.note) } : i) };
    case "GLOBAL_ITEM_NOTE_DELETED": return { ...state, items: (state.items || []).map((i) => i.id === payload.itemId ? { ...i, linkedNotes: (i.linkedNotes || []).filter((n: any) => n.id !== payload.noteId) } : i) };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Reducer principal — base + plugin
// ---------------------------------------------------------------------------

function reduce(state: SessionState, event: ActionEvent): SessionState {
  if ((event.payload as any)?._oversized) return state;
  const currentState = ensureSystemSkills(state);
  let nextState = reduceFateLegacy(currentState, event);
  const plugin = getCachedSystem(nextState.system ?? "fate");
  if (plugin) nextState = plugin.reducer(nextState, event);
  return nextState;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

// Assinaturas públicas usam 'any' para não conflitar com os tipos locais
// de cada consumer (frontend usa @/types/domain, backend usa seus próprios tipos).
// A lógica interna continua tipada via SessionState/ActionEvent.
export function computeState(events: any[], baseState?: any): any {
  return (events as ActionEvent[]).reduce(reduce, (baseState ?? initialState) as SessionState);
}

export function computeStateFromEvents(events: any[], baseState?: any): any {
  return computeState(events, baseState);
}

export function sanitizeStateForSnapshot(state: any): any {
  const sanitizedCharacters: Record<string, any> = {};
  for (const [id, char] of Object.entries(state.characters || {})) {
    if ((char as any).imageUrl?.startsWith("data:")) {
      const { imageUrl, ...rest } = char as any;
      sanitizedCharacters[id] = rest;
    } else {
      sanitizedCharacters[id] = char;
    }
  }
  return { ...state, characters: sanitizedCharacters };
}