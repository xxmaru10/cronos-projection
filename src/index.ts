// src/index.ts
// Entry point do pacote @xxmaru10/cronos-projection
//
// NÃO exporta tipos de domínio (SessionState, Character, etc.)
// Cada consumer usa seus próprios tipos locais.
// As funções exportadas aceitam 'any' para não conflitar com tipos do consumer.

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

// Tipos do sistema são seguros de exportar (não conflitam com domain.ts do frontend)
export type { SystemPluginCore, SystemId } from "./systems/types";