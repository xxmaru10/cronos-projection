// src/systems/dnd-2014/index.ts
//
// Plugin dnd-2014 (D&D 5E. 2014) para uso no BACKEND. Só o reducer: a ficha, o rolador e o
// ruleset ficam no front. Ver o cabeçalho de ./reducer.ts.

import type { SystemPluginCore } from "../types";
import { reduceDnd2014 } from "./reducer";

const dnd2014Plugin: SystemPluginCore = {
  id: "dnd-2014",
  name: "D&D 5E. 2014",
  initialSkills: () => [], // as perícias do D&D moram no systemData, não nas perícias da sessão (igual ao front)
  reducer: reduceDnd2014,
};

export default dnd2014Plugin;
