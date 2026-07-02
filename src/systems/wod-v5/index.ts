// src/systems/wod-v5/index.ts
//
// Plugin wod-v5 (Vampiro: A Máscara — V5) para uso no BACKEND.
// Copiado de front_sistema_rpg/src/systems/wod-v5/ — SEM imports de UI
// (CharacterCard, CombatTab, DiceRoller, WodV5TurnTracker) nem eventTypes.
// O backend só precisa de reducer + initialSkills + characterTemplate para
// projetar o estado (snapshot). Sem isso, os eventos WOD_V5_* (e o
// WOD_V5_SYSTEM_DATA_PATCH que salva as fichas) são ignorados e a ficha
// "reseta" no snapshot do servidor — o mesmo bug que o wod-v20 já teve.
//
// MANTER EM SYNC com front_sistema_rpg/src/systems/wod-v5/reducer.ts
// (o front reaplica o MESMO reducer via wodV5ProjectionFallback enquanto
// este pacote não estava deployado; depois do deploy o fallback vira redundante).

import type { SystemPluginCore } from "../types";
import { reduceWodV5 } from "./reducer";
import { createWodV5Character } from "./characterTemplate";

const wodV5Plugin: SystemPluginCore = {
  id: "wod-v5",
  name: "Vampiro A Máscara - V5",
  initialSkills: () => [],
  reducer: reduceWodV5,
  characterTemplate: createWodV5Character,
};

export default wodV5Plugin;
