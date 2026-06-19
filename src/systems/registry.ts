// src/systems/registry.ts
// Registry síncrono para uso no backend.
// Diferente do frontend: sem dynamic import, sem UI, todos os plugins
// registrados estaticamente na inicialização do processo.

import type { SystemId, SystemPluginCore } from "./types";
import fatePlugin from "./fate/index";
import vampirePlugin from "./vampire/index";
import acceleratedPlugin from "./fate-accelerated/index";
import wodV20Plugin from "./wod-v20/index";

const registry = new Map<string, SystemPluginCore>([
  ["fate", fatePlugin],
  ["vampire", vampirePlugin],
  ["fate-accelerated", acceleratedPlugin],
  ["wod-v20", wodV20Plugin],
]);

export function getSystem(id: string): SystemPluginCore | null {
  return registry.get(id) ?? registry.get("fate") ?? null;
}

// Alias para compatibilidade com projections.ts que usa getCachedSystem
export function getCachedSystem(id: string): SystemPluginCore | null {
  return getSystem(id);
}

export const AVAILABLE_SYSTEMS = [
  { id: "fate" as SystemId, name: "Fate Core e Condensed" },
  { id: "fate-accelerated" as SystemId, name: "Fate Acelerado" },
  { id: "vampire" as SystemId, name: "Fate – Homebrew: Vampire" },
  { id: "wod-v20" as SystemId, name: "Vampiro A Máscara - V20" },
];
