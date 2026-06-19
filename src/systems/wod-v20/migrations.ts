import type { Character } from "../../types";
import type { WodV20Character, WodV20Data, DamageLevel } from "./types";
import { getGenerationBloodLimits, getHealthTotalSlots, QUINTESSENCE_MAX } from "./types";
import { createWodV20SystemData } from "./characterTemplate";

/**
 * Story 141 — no legacy data exists for the wod-v20 id. This helper only
 * guarantees a fully-shaped WodV20Data on any character that the projection
 * hands us (e.g. created before the plugin was cached, or with a partial
 * payload). It deep-fills missing keys from the template; it never overwrites
 * values the character already has.
 */
function isComplete(sd: Partial<WodV20Data> | undefined): sd is WodV20Data {
  if (!sd) return false;
  const gen = sd.generation ?? 13;
  const maxBlood = sd.bloodPoolOverride ?? getGenerationBloodLimits(gen).maxBlood;
  return (
    typeof sd.creature === "string" &&
    // Story 169b — exige `generation` (número). Sem isso, um personagem "completo" mas
    // sem o campo pulava o merge e ficava com generation undefined → o card/ficha não
    // mostravam a geração do vampiro. Faltando, vira "incompleto" → o merge semeia 13
    // (sd.generation ?? base = 13). Como o check de sangue acima já assume gen 13 nesse
    // caso, o merge não redimensiona mais nada — só preenche a geração.
    typeof sd.generation === "number" &&
    !!sd.attributes &&
    !!sd.abilities &&
    Array.isArray(sd.health) &&
    sd.health.every((val) => typeof val === "string") &&
    typeof sd.healthExtraLevels === "number" &&
    sd.health.length === getHealthTotalSlots(sd.healthProfile, sd.healthExtraLevels) &&
    Array.isArray(sd.bloodPool) &&
    sd.bloodPool.length === maxBlood &&
    !!sd.bio &&
    !!sd.virtues
  );
}

export function ensureWodV20Data(char: Character): WodV20Character {
  const c = char as any;
  const sd0 = c.systemData as Partial<WodV20Data> | undefined;
  // Fast path: already complete → keep the same reference (no re-render churn).
  if (isComplete(sd0)) return char as WodV20Character;

  const base = createWodV20SystemData();
  const sd = (c.systemData ?? {}) as Partial<WodV20Data>;

  const gen = sd.generation ?? base.generation;
  const extraLevels = sd.healthExtraLevels ?? 0;
  const maxBlood = sd.bloodPoolOverride ?? getGenerationBloodLimits(gen).maxBlood;

  // Convert old boolean[] health to DamageLevel[] health
  let healthArray: DamageLevel[] = [];
  if (Array.isArray(sd.health)) {
    healthArray = sd.health.map((val: any) => {
      if (val === true) return "L";
      if (val === false) return "";
      if (typeof val === "string") return val as DamageLevel;
      return "";
    });
  } else {
    healthArray = base.health;
  }

  const targetHealthLength = getHealthTotalSlots(sd.healthProfile, extraLevels);
  if (healthArray.length < targetHealthLength) {
    healthArray = [...healthArray, ...Array(targetHealthLength - healthArray.length).fill("")];
  } else if (healthArray.length > targetHealthLength) {
    healthArray = healthArray.slice(0, targetHealthLength);
  }

  // Convert and resize blood pool
  let bloodPoolArray = Array.isArray(sd.bloodPool) ? sd.bloodPool : [];
  if (bloodPoolArray.length < maxBlood) {
    bloodPoolArray = [...bloodPoolArray, ...Array(maxBlood - bloodPoolArray.length).fill(false)];
  } else if (bloodPoolArray.length > maxBlood) {
    bloodPoolArray = bloodPoolArray.slice(0, maxBlood);
  }

  const merged: WodV20Data = {
    ...base,
    ...sd,
    generation: gen,
    healthExtraLevels: extraLevels,
    health: healthArray,
    bloodPool: bloodPoolArray,
    // nested objects must be merged so a partial payload never loses defaults
    bio: { ...base.bio, ...(sd.bio ?? {}) },
    virtues: { ...base.virtues, ...(sd.virtues ?? {}) },
    abilities: {
      talentos: sd.abilities?.talentos ?? base.abilities.talentos,
      pericias: sd.abilities?.pericias ?? base.abilities.pericias,
      conhecimentos: sd.abilities?.conhecimentos ?? base.abilities.conhecimentos,
    },
    attributes: { ...base.attributes, ...(sd.attributes ?? {}) },
    willpowerCurrent:
      Array.isArray(sd.willpowerCurrent) && sd.willpowerCurrent.length === 10
        ? sd.willpowerCurrent
        : base.willpowerCurrent,
    // Story 166 — mortal archetype + Fé (optional; default-filled here)
    mortalArchetype: sd.mortalArchetype ?? base.mortalArchetype,
    faithRating: sd.faithRating ?? base.faithRating,
    // Story 139 — optional; absent in characters created before this story
    sectionColors: sd.sectionColors ?? base.sectionColors,
    // Story 144 — npc bag: preserve as-is if present; absent stays absent (PC)
    npc: sd.npc,
    // Story 167 — perfil de vitalidade (figurante = 4 níveis); ausente → padrão.
    healthProfile: sd.healthProfile ?? base.healthProfile,
    // Story 168 — flag de semeadura da Vontade temporária (ver reducer G6b).
    willpowerSeeded: sd.willpowerSeeded,
    // Story 170 — campos de Lobisomem/Abominação (opcionais; default-filled aqui).
    werewolfArchetype: sd.werewolfArchetype ?? base.werewolfArchetype,
    gnosePermanent: sd.gnosePermanent ?? base.gnosePermanent,
    gnoseCurrent:
      Array.isArray(sd.gnoseCurrent) && sd.gnoseCurrent.length === 10
        ? sd.gnoseCurrent
        : base.gnoseCurrent,
    gnoseSeeded: sd.gnoseSeeded,
    form: sd.form ?? base.form,
    wolfImageUrl: sd.wolfImageUrl ?? base.wolfImageUrl,
    // Story 171 — campos de Mago/Quintessência (opcionais; default-filled aqui).
    mageArchetype: sd.mageArchetype ?? base.mageArchetype,
    quintessencePermanent: sd.quintessencePermanent ?? base.quintessencePermanent,
    quintessenceCurrent:
      Array.isArray(sd.quintessenceCurrent) && sd.quintessenceCurrent.length === QUINTESSENCE_MAX
        ? sd.quintessenceCurrent
        : base.quintessenceCurrent,
    quintessenceSeeded: sd.quintessenceSeeded,
    // Story 172 — campos de Fada/Glamour (opcionais; default-filled aqui). Glamour usa length 10.
    fadaArchetype: sd.fadaArchetype ?? base.fadaArchetype,
    glamourPermanent: sd.glamourPermanent ?? base.glamourPermanent,
    glamourCurrent:
      Array.isArray(sd.glamourCurrent) && sd.glamourCurrent.length === 10
        ? sd.glamourCurrent
        : base.glamourCurrent,
    glamourSeeded: sd.glamourSeeded,
    // Story 174 — demônio (opcional; default-filled aqui). A Fé reusa faithRating (já mesclado acima).
    demonArchetype: sd.demonArchetype ?? base.demonArchetype,
    // Story 175 — criatura "Customizado" (opcionais; default-filled aqui).
    customType: sd.customType ?? base.customType,
    customLabels: sd.customLabels ?? base.customLabels,
    customResource: sd.customResource, // undefined até o GM definir
    customResourcePermanent: sd.customResourcePermanent ?? base.customResourcePermanent,
    customResourceCurrent: Array.isArray(sd.customResourceCurrent) ? sd.customResourceCurrent : base.customResourceCurrent,
    customResourceRating: sd.customResourceRating ?? base.customResourceRating,
    customVirtues: Array.isArray(sd.customVirtues) ? sd.customVirtues : base.customVirtues,
    customFinalized: sd.customFinalized ?? base.customFinalized,
    // Story 175 (follow-up) — Caminho ajustável + toggles de Geração/Clã + id do modelo.
    humanityMax: sd.humanityMax ?? base.humanityMax,
    customHasGeneration: sd.customHasGeneration ?? base.customHasGeneration,
    customHasClan: sd.customHasClan ?? base.customHasClan,
    customHasSect: sd.customHasSect ?? base.customHasSect,
    customModelId: sd.customModelId, // undefined até salvar como modelo
    // Story 173 — campos de Aparição/Paixão (opcionais; default-filled aqui). Paixão usa length 10.
    apparitionArchetype: sd.apparitionArchetype ?? base.apparitionArchetype,
    passionPermanent: sd.passionPermanent ?? base.passionPermanent,
    passionCurrent:
      Array.isArray(sd.passionCurrent) && sd.passionCurrent.length === 10
        ? sd.passionCurrent
        : base.passionCurrent,
    passionSeeded: sd.passionSeeded,
  };

  // Story 170 — reparo único da Gnose (espelha o de willpowerSeeded acima): uma reserva
  // nunca semeada (sem a flag) + Gnose permanente > 0 começa cheia, sem nunca re-encher
  // uma reserva gasta de propósito.
  if (!merged.gnoseSeeded && (merged.gnosePermanent ?? 0) > 0 && !(merged.gnoseCurrent ?? []).some(Boolean)) {
    merged.gnoseCurrent = Array.from({ length: 10 }, (_, i) => i < (merged.gnosePermanent ?? 0));
  }

  // Story 171 — reparo único da Quintessência (espelha o da Gnose): reserva nunca semeada
  // (sem a flag) + Quintessência permanente > 0 começa cheia, sem re-encher uma reserva gasta
  // de propósito. Array com teto QUINTESSENCE_MAX (statblock chega a 12).
  if (!merged.quintessenceSeeded && (merged.quintessencePermanent ?? 0) > 0 && !(merged.quintessenceCurrent ?? []).some(Boolean)) {
    merged.quintessenceCurrent = Array.from({ length: QUINTESSENCE_MAX }, (_, i) => i < (merged.quintessencePermanent ?? 0));
  }

  // Story 172 — reparo único do Glamour (espelha o da Gnose): reserva nunca semeada (sem a
  // flag) + Glamour permanente > 0 começa cheia, sem re-encher uma reserva gasta de propósito.
  // Glamour usa length 10 (maxa em 10, sem cap 20).
  if (!merged.glamourSeeded && (merged.glamourPermanent ?? 0) > 0 && !(merged.glamourCurrent ?? []).some(Boolean)) {
    merged.glamourCurrent = Array.from({ length: 10 }, (_, i) => i < (merged.glamourPermanent ?? 0));
  }

  // Story 173 — reparo único da Paixão (espelha o do Glamour): reserva nunca semeada (sem a
  // flag) + Paixão permanente > 0 começa cheia, sem re-encher uma reserva gasta de propósito.
  // Paixão usa length 10 (maxa em 10, sem cap 20).
  if (!merged.passionSeeded && (merged.passionPermanent ?? 0) > 0 && !(merged.passionCurrent ?? []).some(Boolean)) {
    merged.passionCurrent = Array.from({ length: 10 }, (_, i) => i < (merged.passionPermanent ?? 0));
  }

  // Story 168 — repara fichas anteriores à semeadura: a Vontade temporária nunca foi
  // inicializada, então uma reserva vazia + Vontade permanente > 0 é "não iniciada"
  // (não "gasta de propósito") → começa cheia. Só fichas sem a flag willpowerSeeded;
  // as criadas após o fix carregam a flag e nunca são reabastecidas.
  if (!merged.willpowerSeeded && merged.willpowerPermanent > 0 && !merged.willpowerCurrent.some(Boolean)) {
    merged.willpowerCurrent = Array.from({ length: 10 }, (_, i) => i < merged.willpowerPermanent);
  }

  return { ...char, systemData: merged } as WodV20Character;
}

// Legacy entry point kept for symmetry with other plugins. No-op beyond ensure.
export function migrateLegacyWodV20Character(char: Character): WodV20Character {
  return ensureWodV20Data(char);
}
