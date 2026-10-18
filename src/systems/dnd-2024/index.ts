// src/systems/dnd-2024/index.ts
//
// Plugin dnd-2024 (D&D 5E. 2024) para uso no BACKEND. Só o reducer: a ficha, o rolador e o
// ruleset ficam no front. Ver o cabeçalho de ./reducer.ts.

import type { SystemPluginCore } from "../types";
import { reduceDnd2024 } from "./reducer";

const dnd2024Plugin: SystemPluginCore = {
  id: "dnd-2024",
  name: "D&D 5E. 2024",
  initialSkills: () => [], // as perícias do D&D moram no systemData, não nas perícias da sessão (igual ao front)
  reducer: reduceDnd2024,
};

export default dnd2024Plugin;
