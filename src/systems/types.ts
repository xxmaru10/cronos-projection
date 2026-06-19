// src/systems/types.ts
//
// Interface do plugin de sistema para uso no backend.
// Diferente da interface do frontend: SEM campos de UI (CharacterCard, etc.)
// O backend só precisa de reducer + initialSkills para projetar estado.

import type { ActionEvent, SessionState, Character } from "../types";

export type SystemId = "fate" | "fate-accelerated" | "vampire" | "wod-v20";

export interface SystemPluginCore {
  id: SystemId;
  name: string;
  initialSkills: () => Array<{
    id: string;
    name: string;
    order: number;
    createdAt: string;
  }>;
  reducer: (state: SessionState, event: ActionEvent) => SessionState;
  characterTemplate?: (overrides?: Partial<Character>) => Character;
}