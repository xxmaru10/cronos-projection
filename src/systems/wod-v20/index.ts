// src/systems/wod-v20/index.ts
//
// Plugin wod-v20 (Vampiro: A Máscara — V20) para uso no BACKEND.
// Copiado de front_sistema_rpg/src/systems/wod-v20/ — SEM imports de UI
// (CharacterCard, CombatTab, DiceRoller, WodTurnTracker) nem eventTypes.
// O backend só precisa de reducer + initialSkills + characterTemplate para
// projetar o estado (snapshot). Sem isso, eventos WOD_V20_* são ignorados e
// a ficha "reseta" no snapshot do servidor.
//
// MANTER EM SYNC com front_sistema_rpg/src/systems/wod-v20/reducer.ts

import type { SystemPluginCore } from "../types";
import { reduceWodV20 } from "./reducer";
import { createWodV20Character } from "./characterTemplate";

const wodV20Plugin: SystemPluginCore = {
  id: "wod-v20",
  name: "Vampiro A Máscara - V20",
  initialSkills: () => [],
  reducer: reduceWodV20,
  characterTemplate: createWodV20Character,
};

export default wodV20Plugin;
