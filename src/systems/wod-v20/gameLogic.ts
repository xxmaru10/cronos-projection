import type { Character } from "../../types";
import type { WodV20Character, WodV20Data, WodCombatLineRow, Armor, Trait } from "./types";
import { getHealthLevels, getHealthTotalSlots, CREATURE_CAPS } from "./types";

/**
 * A vampire is "out" when the 7th health level (Incapacitado) is marked.
 * Torpor / Final Death modeling is a later story.
 */
export function isCharacterEliminated(character: Character): boolean {
  const sd = character.systemData as Partial<WodV20Data> | undefined;
  if (!sd || !Array.isArray(sd.health) || sd.health.length === 0) return false;
  const lastIdx = sd.health.length - 1;
  const val = sd.health[lastIdx];
  return typeof val === "string" && val !== "";
}

// Story 163 — pior tipo de dano presente na trilha de saúde (Agravado > Letal > Contusão),
// usado p/ colorir a caveira sobre o retrato: amarelo (B), laranja (L), vermelho (A).
export function worstDamageType(character: Character): "B" | "L" | "A" | null {
  const sd = character?.systemData as Partial<WodV20Data> | undefined;
  const h = sd?.health;
  if (!Array.isArray(h)) return null;
  const sev: Record<string, number> = { B: 1, L: 2, A: 3 };
  let worst: "B" | "L" | "A" | null = null;
  for (const v of h) {
    if ((v === "B" || v === "L" || v === "A") && (worst === null || sev[v] > sev[worst])) worst = v;
  }
  return worst;
}

// Story 163 — "abatido" = TODAS as caixas de saúde preenchidas (não só a última). Trigger
// da caveira + do botão "Remover do combate" do card.
export function isFullyDowned(character: Character): boolean {
  const sd = character?.systemData as Partial<WodV20Data> | undefined;
  if (!sd) return false;
  const baseLen = getHealthTotalSlots(sd.healthProfile, sd.healthExtraLevels);
  const h = sd.health;
  if (!Array.isArray(h) || h.length === 0) return false;
  for (let i = 0; i < baseLen; i++) { if ((h[i] ?? "") === "") return false; }
  return true;
}

// ─── Story 170 — Crinos (forma de batalha do Lobisomem/Abominação) ───────────
// Quando o Lupino assume a forma de homem-lobo, os Atributos Físicos DOBRAM, a
// Aparência vai a 0 e ganha +2 níveis de vitalidade (RAW V20). Reversível: ao entrar
// guarda crinosSnapshot com os valores-base; ao reverter restaura exatamente dele.
// Helper PURO — devolve o patch; o chamador grava via patchSd/emitPatch (sem novo evento).
const CRINOS_ATTR_MAX = 10; // a forma de guerra estoura o teto 5 — sobe o max dos Físicos.

export function applyCrinosForm(sd: WodV20Data, toCrinos: boolean): Partial<WodV20Data> {
  const a = sd.attributes ?? {};
  const next: Record<string, Trait> = { ...a };
  if (toCrinos) {
    const snap = {
      forca: a.forca?.rating ?? 0, destreza: a.destreza?.rating ?? 0, vigor: a.vigor?.rating ?? 0,
      forcaMax: a.forca?.max ?? 5, destrezaMax: a.destreza?.max ?? 5, vigorMax: a.vigor?.max ?? 5,
      aparencia: a.aparencia?.rating ?? 0, aparenciaMax: a.aparencia?.max ?? 5,
      healthExtraLevels: sd.healthExtraLevels ?? 0,
    };
    for (const key of ["forca", "destreza", "vigor"]) {
      const t = next[key];
      if (t) next[key] = { ...t, rating: t.rating * 2, max: CRINOS_ATTR_MAX };
    }
    const ap = next["aparencia"];
    if (ap) next["aparencia"] = { ...ap, rating: 0 }; // RAW Crinos: Aparência 0
    return {
      form: "crinos",
      crinosSnapshot: snap,
      attributes: next,
      healthExtraLevels: (sd.healthExtraLevels ?? 0) + 2,
      health: ["", "", ...(sd.health ?? [])], // +2 níveis (prepende, como o onExtraLevelsChange)
    };
  }
  // reverter
  const s = sd.crinosSnapshot;
  if (!s) return { form: "human" }; // defensivo: sem snapshot, só volta o rótulo
  const setAttr = (key: string, rating: number, max: number) => {
    const t = next[key];
    if (t) next[key] = { ...t, rating, max };
  };
  setAttr("forca", s.forca, s.forcaMax);
  setAttr("destreza", s.destreza, s.destrezaMax);
  setAttr("vigor", s.vigor, s.vigorMax);
  setAttr("aparencia", s.aparencia, s.aparenciaMax);
  const targetSlots = getHealthTotalSlots(sd.healthProfile, s.healthExtraLevels);
  const restoredHealth = (sd.health ?? []).slice(Math.max(0, (sd.health ?? []).length - targetSlots));
  return {
    form: "human",
    crinosSnapshot: undefined,
    attributes: next,
    healthExtraLevels: s.healthExtraLevels,
    health: restoredHealth,
  };
}

// Story 170 — retrato por forma: em Crinos usa a foto lupina (sd.wolfImageUrl) se houver;
// senão o retrato humano (thumbnail ou full). Centraliza a regra p/ card, tracker de turnos
// e painel de turno (que liam só imageThumbnailUrl/imageUrl cru e não trocavam ao transformar).
export function formPortraitRaw(character: any): string {
  const sd = character?.systemData as Partial<WodV20Data> | undefined;
  if (sd && sd.form === "crinos" && sd.wolfImageUrl) return sd.wolfImageUrl;
  return (character?.imageThumbnailUrl || character?.imageUrl || "") as string;
}

// ─── Story 146 — combat-flow helpers (read-only lookups + damage track) ──────
const SEVERITY: Record<string, number> = { "": 0, B: 1, L: 2, A: 3 };

// V20 damage fill: empty boxes first (left→right), then upgrade lower-severity
// boxes (bashing→lethal→aggravated overflow). Returns a NEW health array.
// Single source of truth shared by the reducer (atomic confirm) and the card.
export function applyDamageToTrack(health: string[], amount: number, type: "B" | "L" | "A"): string[] {
  const h = [...health];
  const tSev = SEVERITY[type];
  let remaining = amount;
  for (let i = 0; i < h.length && remaining > 0; i++) { if (SEVERITY[h[i] || ""] === 0) { h[i] = type; remaining--; } }
  for (let i = 0; i < h.length && remaining > 0; i++) { if (SEVERITY[h[i] || ""] < tSev) { h[i] = type; remaining--; } }
  return h;
}

function sdOf(character: Character): WodV20Data | undefined {
  return character?.systemData as WodV20Data | undefined;
}

// Dexterity + Wits — the static part of V20 initiative.
export function getInitiativeStatic(character: Character): number {
  const sd = sdOf(character);
  if (!sd) return 0;
  return attr(sd, "destreza") + attr(sd, "raciocinio");
}

// Dexterity alone (used for tie-breaks, D2).
export function getDexterity(character: Character): number {
  const sd = sdOf(character);
  return sd ? attr(sd, "destreza") : 0;
}

// Stamina = Vigor (soak attribute).
export function getStamina(character: Character): number {
  const sd = sdOf(character);
  return sd ? attr(sd, "vigor") : 0;
}

// Celerity rating — the discipline named "Celeridade" or "Rapidez" (0 if absent).
export function getCelerityRating(character: Character): number {
  const sd = sdOf(character);
  if (!sd) return 0;
  return discRating(sd, "Celeridade") || discRating(sd, "Rapidez");
}

// Fortitude rating — soaks all damage types (and the only soak vs aggravated).
export function getFortitude(character: Character): number {
  const sd = sdOf(character);
  return sd ? discRating(sd, "Fortitude") : 0;
}

// Total armor absorption rating.
export function getArmorRating(character: Character): number {
  const sd = sdOf(character);
  return sd ? totalArmor(sd) : 0;
}

// Current wound penalty as a non-negative magnitude (0 = healthy).
export function getWoundPenaltyAbs(character: Character): number {
  const sd = sdOf(character);
  if (!sd) return 0;
  const p = Math.abs(getWoundPenalty(sd.health, sd.healthExtraLevels, sd.healthProfile));
  return p >= 99 ? 99 : p;
}

// Unified initiative total (D1): Dex + Wits + 1d10 + (Celerity if active) − wound.
// `die` is rolled by the caller so the panel and the card's INIC button share it.
export function computeInitiativeTotal(character: Character, die: number, celerityActive: boolean): number {
  const stat = getInitiativeStatic(character);
  const cel = celerityActive ? getCelerityRating(character) : 0;
  const wound = getWoundPenaltyAbs(character);
  return stat + die + cel - (wound >= 99 ? 0 : wound);
}

// F4 — V20 damage/soak success count: simply count die ≥ diff. Unlike normal rolls
// there is NO 1-subtraction and NO botch (zero successes = no effect).
export function countV20DamageSuccesses(dice: number[], diff = 6): number {
  return dice.reduce((n, d) => n + (d >= diff ? 1 : 0), 0);
}

// F4 — resolve a weapon's free-text damage string to a base number + type. Melee
// "Força+N" → Strength + N; ranged/fixed "N" → N. Type defaults to Lethal (the GM
// can override in the modal); detects Agravado / Contusão hints when present.
// Story 155 (F7) — an explicit `damageType` (from the sheet) WINS over the regex
// inference; the free-text regex stays as the fallback for legacy weapons.
// Story 157 follow-up #5 — também devolve a PARCELA de Força (`strength`) e o número
// fixo (`flat`) separados, p/ a caixa 3D do dano pintar a Força como ATRIBUTO (branco) e
// o resto da arma em LARANJA. `base = strength + flat` (compatível com chamadas antigas).
export function resolveWeaponBaseDamage(damageStr: string, strength: number, explicitType?: "B" | "L" | "A"): { base: number; type: "B" | "L" | "A"; strength: number; flat: number } {
  const s = (damageStr || "").toLowerCase();
  let type: "B" | "L" | "A" = "L";
  if (/(agrav|\bagg|\(a\)|\ba\b)/.test(s)) type = "A";
  else if (/(contus|bash|\(b\)|\bb\b)/.test(s)) type = "B";
  if (explicitType) type = explicitType;
  const num = s.match(/\d+/);
  const flat = num ? parseInt(num[0], 10) : 0;
  const usesStrength = /(for[çc]a|\bfor\b|\bstr\b)/.test(s);
  const str = usesStrength ? strength : 0;
  return { base: str + flat, type, strength: str, flat };
}

// Story 155 (F6) — the armor penalty that applies to a SPECIFIC roll. Each armor
// piece's penalty applies only when the roll uses its `affectedTrait` (matched
// case-insensitively against the selected attribute LABEL or the ability name).
// An armor without `affectedTrait` falls back to V20 RAW: penalizes only rolls whose
// ATTRIBUTE is Destreza. Returns a non-negative magnitude to SUBTRACT from the pool.
export function armorPenaltyForRoll(armor: Armor[] | undefined, attrLabel: string, abilityName: string): number {
  const list = armor ?? [];
  const aLabel = (attrLabel || "").trim().toLowerCase();
  const abil = (abilityName || "").trim().toLowerCase();
  let total = 0;
  for (const a of list) {
    const pen = Math.abs(parseInt(a.penalty || "0", 10));
    if (!Number.isFinite(pen) || pen === 0) continue;
    const trait = (a.affectedTrait || "").trim().toLowerCase();
    const applies = trait ? trait === aLabel || trait === abil : aLabel === "destreza";
    if (applies) total += pen;
  }
  return total;
}

// F4 — soak pool (D8). Bashing/Lethal: Vigor + Fortitude + armor. Aggravated: only
// Fortitude soaks (armor that explicitly soaks aggravated is left to the GM). For a
// vampire target this surfaces Vigor + Fortitude pre-selected, as required.
// Também devolve a DECOMPOSIÇÃO (vigor/fort/armor) p/ a caixa 3D pintar o dado de
// ARMADURA num grupo próprio (cor #acad94). Em Agravado a armadura comum NÃO absorve.
export function computeSoakPool(character: Character, type: "B" | "L" | "A"): { pool: number; detail: string; vigor: number; fort: number; armor: number } {
  const vigor = getStamina(character);
  const fort = getFortitude(character);
  const armor = getArmorRating(character);
  if (type === "A") {
    return { pool: fort, detail: `Fortitude ${fort}`, vigor: 0, fort, armor: 0 };
  }
  return { pool: vigor + fort + armor, detail: `Vigor ${vigor}${fort ? ` + Fortitude ${fort}` : ""}${armor ? ` + armadura ${armor}` : ""}`, vigor, fort, armor };
}

// Derive current wound penalty from the health track.
export function getWoundPenalty(health: WodV20Data["health"], healthExtraLevels = 0, profile?: string): number {
  const levels = getHealthLevels(profile);
  // Story 167 — o perfil figurante não tem níveis extras; ignora o offset.
  const extra = profile === "figurante" ? 0 : healthExtraLevels;
  const totalSlots = levels.length + extra;
  let worstIndex = -1;
  for (let i = 0; i < totalSlots; i++) {
    if ((health?.[i] ?? "") !== "") worstIndex = i;
  }
  if (worstIndex === -1) return 0;
  const slotIndex = worstIndex - extra;
  if (slotIndex < 0) return 0; // extra "Machucado" level (só no perfil padrão)
  const p = levels[slotIndex]?.penalty ?? "0";
  if (p === "—") return 99; // incapacitated / morto
  return parseInt(p, 10) || 0;
}

// Derive total armor rating from the armor list.
function totalArmor(sd: WodV20Data): number {
  return (sd.armor ?? []).reduce((sum, a) => sum + (parseInt(a.rating, 10) || 0), 0);
}

// Derive total armor penalty from the armor list.
function totalArmorPenalty(sd: WodV20Data): number {
  return (sd.armor ?? []).reduce((sum, a) => sum + (parseInt(a.penalty, 10) || 0), 0);
}

// Get attribute rating by key (e.g. "destreza", "vigor").
function attr(sd: WodV20Data, key: string): number {
  return sd.attributes?.[key]?.rating ?? 0;
}

// Get ability rating by label match (pt-BR name search across talentos/pericias/conhecimentos).
function abilityByName(sd: WodV20Data, name: string): number {
  const all = [
    ...(sd.abilities?.talentos ?? []),
    ...(sd.abilities?.pericias ?? []),
    ...(sd.abilities?.conhecimentos ?? []),
  ];
  const found = all.find((t) => t.name.toLowerCase() === name.toLowerCase());
  return found?.rating ?? 0;
}

// Get discipline rating by name.
function discRating(sd: WodV20Data, name: string): number {
  const found = (sd.disciplines ?? []).find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  return found?.rating ?? 0;
}

/**
 * Build the pre-computed combat line rows for an NPC.
 * Shares the same pool math as DiceRoller.tsx:
 *   pool = attribute + ability − woundPenalty − armorPenalty (floored at 0)
 */
export function deriveCombatLine(character: WodV20Character): WodCombatLineRow[] {
  const sd = character.systemData;
  if (!sd) return [];

  const caps = CREATURE_CAPS[sd.creature ?? "Vampiro"] ?? CREATURE_CAPS.Vampiro;
  const woundPen = Math.abs(getWoundPenalty(sd.health, sd.healthExtraLevels, sd.healthProfile));
  const armorPen = Math.abs(totalArmorPenalty(sd));
  const armorRating = totalArmor(sd);

  const rows: WodCombatLineRow[] = [];

  // Iniciativa: Destreza + Raciocínio (+1d10 shown in detail)
  rows.push({
    id: "iniciativa",
    label: "Iniciativa",
    pool: Math.max(0, attr(sd, "destreza") + attr(sd, "raciocinio") - woundPen),
    detail: "+1d10",
  });

  // Absorção (Soak): Vigor + Fortitude (if caps.disciplines) + armadura
  const fortitude = caps.disciplines ? discRating(sd, "Fortitude") : 0;
  const soakPool = attr(sd, "vigor") + fortitude + armorRating;
  const soakDetail = caps.disciplines && fortitude > 0
    ? `Vigor ${attr(sd, "vigor")} + Fortitude ${fortitude} + armadura ${armorRating}`
    : `Vigor ${attr(sd, "vigor")} + armadura ${armorRating}`;
  rows.push({
    id: "absorcao",
    label: "Absorção (Soak)",
    pool: soakPool,
    detail: soakDetail + (sd.npc?.soakAggravated ? " (agravado ok)" : ""),
  });

  // Potência adds dice to Strength-based (melee/unarmed) damage.
  const potencia = caps.disciplines ? discRating(sd, "Potência") : 0;
  const potNote = potencia > 0 ? ` +${potencia} Pot` : "";

  // Ataques: one row per weapon + unarmed fallback.
  // Story 154 r8 — a parada SUGERIDA de acerto usa DESTREZA também no corpo-a-corpo
  // (V20 RAW: Destreza + habilidade; a Força entra só no DANO). O GM segue livre
  // para ajustar na mesa — isto é apenas a sugestão pré-calculada.
  const weapons = sd.weapons ?? [];
  if (weapons.length === 0) {
    const briga = abilityByName(sd, "Briga");
    const pool = Math.max(0, attr(sd, "destreza") + briga - woundPen - armorPen);
    rows.push({ id: "ataque-briga", label: "Briga (desarmado)", pool, detail: `Destreza + Briga · dano Força${potNote} (contundente) · Dif 6` });
  } else {
    weapons.forEach((w, i) => {
      const isFirearm = !!(w.range && w.range !== "" && w.range !== "—");
      const abilityName = isFirearm ? "Armas de Fogo" : "Armas Brancas";
      const abilityKey = isFirearm ? abilityByName(sd, "Armas de Fogo") : abilityByName(sd, "Armas Brancas");
      const pool = Math.max(0, attr(sd, "destreza") + abilityKey - woundPen - armorPen);
      const dmg = `${w.damage}${isFirearm ? "" : potNote}`;
      const diff = w.diff && w.diff.trim() ? w.diff : "6";
      rows.push({
        id: `ataque-${i}`,
        label: w.name,
        pool,
        detail: `dano ${dmg} · ${abilityName} · Dif ${diff}`,
      });
    });
  }

  // Esquiva: Destreza + Esportes
  const esportes = abilityByName(sd, "Esportes");
  rows.push({
    id: "esquiva",
    label: "Esquiva",
    pool: Math.max(0, attr(sd, "destreza") + esportes - woundPen - armorPen),
    detail: "Destreza + Esportes",
  });

  // Nº de ações: 1 + Celeridade (se tem disciplinas)
  if (caps.disciplines) {
    const celeridade = discRating(sd, "Rapidez") || discRating(sd, "Celeridade");
    rows.push({
      id: "acoes",
      label: "Nº de Ações",
      pool: 1 + celeridade,
      detail: celeridade > 0 ? `1 + Rapidez/Celeridade ${celeridade}` : "1 ação por turno",
    });
  } else {
    rows.push({ id: "acoes", label: "Nº de Ações", pool: 1, detail: "1 ação por turno" });
  }

  // Wound penalty (current) — informative when > 0
  if (woundPen > 0) {
    rows.push({ id: "penalidade", label: "Penalidade de Ferimento", pool: -woundPen, detail: "já aplicada às paradas acima" });
  }

  // Sangue por turno (vampires/ghouls)
  if (caps.bloodPool) {
    rows.push({ id: "sangue-turno", label: "Sangue / Turno", pool: sd.bloodPerTurn ?? 1, detail: "pontos gastáveis por turno" });
  }

  return rows;
}
