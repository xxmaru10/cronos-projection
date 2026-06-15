// src/index.ts
// Entry point do pacote @cronos/projection

export type { ActionEvent, SessionState, Character, Aspect, Note, BattlemapState, BattlemapObject, BattlemapCombatLayer } from "./types";
export type { SystemPluginCore, SystemId } from "./systems/types";

export {
  initialState,
  computeState,
  computeStateFromEvents,
  sanitizeStateForSnapshot,
  applySceneDialogueRetention,
  trimSceneDialogues,
  SCENE_DIALOGUE_RETENTION_LIMIT,
} from "./projections";

export { normalizeIdentity, buildIdentityAliasSet, identityMatches } from "./identity";
export { getCachedSystem, getSystem, AVAILABLE_SYSTEMS } from "./systems/registry";