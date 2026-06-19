import type { ActionEvent, SessionState, Character } from "../../types";
import type { WodV20Character, WodV20Data } from "./types";
import {
  getGenerationBloodLimits,
  getClanWeakness,
  APPEARANCE_ZERO_CLANS,
  CREATURE_CAPS,
  CREATURE_STARTING_POWERS,
  CLAN_DISCIPLINES,
  DISCIPLINE_ICON_BY_NAME,
  getRevenantFamily,
  NPC_GHOUL_STATBLOCK,
  getMortalArchetype,
  getWerewolfArchetype,
  getMageArchetype,
  getFadaArchetype,
  getApparitionArchetype,
  getDemonArchetype,
  QUINTESSENCE_MAX,
  COMMON_DISCIPLINE_NAMES,
  deriveHumanity,
  deriveWillpower,
  getHealthTotalSlots,
} from "./types";
import { createWodV20Character, buildClanDisciplines, mkTrait } from "./characterTemplate";
import { ensureWodV20Data } from "./migrations";
import { applyDamageToTrack } from "./gameLogic";
import type { WodTurnState, WodDeclaration, Trait } from "./types";

// Story 164 — build rating-0 discipline traits from a name list (with icons) and,
// when `withPotence`, ensure Potência is present at rating ≥ 1 (ghoul starting power).
function disciplinesFromNames(names: string[], withPotence: boolean): Trait[] {
  const out: Trait[] = names.map((n) => {
    const t = mkTrait(n, { rating: 0, max: 5 });
    const icon = DISCIPLINE_ICON_BY_NAME[n];
    if (icon) t.icon = icon;
    return t;
  });
  if (withPotence) {
    const pot = out.find((t) => t.name === "Potência");
    if (pot) {
      pot.rating = Math.max(1, pot.rating);
    } else {
      const t = mkTrait("Potência", { rating: 1, max: 5 });
      const icon = DISCIPLINE_ICON_BY_NAME["Potência"];
      if (icon) t.icon = icon;
      out.unshift(t);
    }
  }
  return out;
}

// Story 170 — base "Disciplinas Equivalentes" do statblock do Lobisomem/Abominação +
// (se Ancião) a 7ª disciplina ALEATÓRIA rating 4, sorteada do pool COMUM (nunca especial)
// via elderDisciplineRoll (sorteado 1x na criação → determinístico no replay).
function buildWerewolfDisciplines(sd: WodV20Data): { name: string; rating: number }[] {
  const arch = getWerewolfArchetype(sd.werewolfArchetype);
  if (!arch) return [];
  const out = arch.disciplines.map((d) => ({ ...d }));
  if (sd.werewolfArchetype === "Ancião" && typeof sd.elderDisciplineRoll === "number") {
    const taken = new Set(out.map((d) => d.name));
    const pool = COMMON_DISCIPLINE_NAMES.filter((n) => !taken.has(n));
    if (pool.length > 0) {
      const idx = Math.min(pool.length - 1, Math.floor((sd.elderDisciplineRoll ?? 0) * pool.length));
      out.push({ name: pool[idx], rating: 4 });
    }
  }
  return out;
}

// Story 170 — materializa nomes+ratings em traits (com ícone). Reusado pelo Lobisomem
// e pela Abominação.
function werewolfTraits(list: { name: string; rating: number }[]): Trait[] {
  return list.map(({ name, rating }) => {
    const t = mkTrait(name, { rating, max: 5 });
    const icon = DISCIPLINE_ICON_BY_NAME[name];
    if (icon) t.icon = icon;
    return t;
  });
}

// Story 164/166 — overwrite the rating of any ability trait whose label is in `map`,
// and push unknown labels as custom traits. Shared by the ghoul and mortal seeds.
function applyAbilities(list: Trait[], map: Record<string, number>): Trait[] {
  const next = list.map((t) => (map[t.name] != null ? { ...t, rating: map[t.name] } : t));
  for (const [label, rating] of Object.entries(map)) {
    if (!next.some((t) => t.name === label)) next.push(mkTrait(label, { rating, custom: true }));
  }
  return next;
}

export function reduceWodV20(state: SessionState, event: ActionEvent): SessionState {
  const { type, payload } = event;
  if (!payload) return state;
  const p = payload as any;

  // Cast to string: WOD_CHRONICLE_UPDATED is a plugin-only event not present in
  // the platform ActionEvent union; we deliberately keep it out of domain.ts to
  // avoid leaking plugin concerns into the platform.
  switch (type as string) {
    // ── Character lifecycle ──────────────────────────────────────────────────
    case "CHARACTER_CREATED": {
      // projections.ts runs the Fate legacy reducer first, which created a
      // Fate-shaped character. Rebuild from the V20 template, keep identity and
      // any V20-shaped systemData the creator supplied.
      const overrides: Partial<Character> = {
        id: p.id,
        name: p.name ?? "Novo Personagem",
        ownerUserId: p.ownerUserId ?? "",
        isNPC: p.isNPC ?? false,
        npcType: p.npcType,
        religionId: p.religionId,
        source: p.source ?? "active",
        scope: p.scope,
        activeInArena: p.activeInArena ?? false,
        imageUrl: p.imageUrl,
        imageThumbnailUrl: p.imageThumbnailUrl,
      } as Partial<Character>;

      let char = createWodV20Character(overrides);
      if (p.systemData && typeof p.systemData === "object") {
        char = ensureWodV20Data({ ...char, systemData: { ...char.systemData, ...p.systemData } });
      }
      // Apply creation seeds. All seeds only fill empty/default values so they
      // are idempotent on replay and never overwrite manually supplied data.
      const createdSd = (char as WodV20Character).systemData;
      let nextSd = { ...createdSd };
      const gen = nextSd.generation ?? 13;
      const caps = CREATURE_CAPS[nextSd.creature ?? "Vampiro"] ?? CREATURE_CAPS.Vampiro;

      // G1 — seed bloodPerTurn from generation (only for creatures with blood)
      if (caps.bloodPool && nextSd.bloodPoolOverride === undefined) {
        nextSd.bloodPerTurn = getGenerationBloodLimits(gen).bloodPerTurn;
      }

      // G2/G2b/G4 — discipline + weakness seeding. Only seed disciplines when none
      // were supplied (idempotent on replay). Branches by creature kind:
      const noDisc = !nextSd.disciplines || nextSd.disciplines.length === 0;
      if (caps.disciplines && nextSd.creature === "Abominação") {
        // Story 170 — ABOMINAÇÃO (lobisomem Abraçado). Branch ANTES do caps.clan (ela TEM
        // caps.clan=true) p/ não cair no caminho de vampiro puro. Disciplinas =
        //   (1) statblock do garou (+ 7ª aleatória do Ancião),
        //   (2) +3 pontos pré-sorteados (abominationRoll), teto 5, só nas do garou,
        //   (3) disciplinas do CLÃ escolhido a ZERO (sem pontos), sem duplicar nomes.
        // SEM fraqueza de clã (o clã afeta só as disciplinas — padrão da story 164).
        if (noDisc) {
          const base = buildWerewolfDisciplines(nextSd);
          if (Array.isArray(nextSd.abominationRoll)) {
            for (const r of nextSd.abominationRoll.slice(0, 3)) {
              const eligible = base.filter((d) => d.rating < 5);
              if (eligible.length === 0) break;
              const idx = Math.min(eligible.length - 1, Math.floor((r ?? 0) * eligible.length));
              eligible[idx].rating += 1; // mesma referência de `base`
            }
          }
          const taken = new Set(base.map((d) => d.name));
          const clanDiscs = nextSd.clan ? buildClanDisciplines(nextSd.clan, nextSd.clanAntitribu, gen) : [];
          for (const cd of clanDiscs) {
            if (!taken.has(cd.name)) { base.push({ name: cd.name, rating: 0 }); taken.add(cd.name); }
          }
          nextSd.disciplines = werewolfTraits(base);
        }
      } else if (caps.clan) {
        // VAMPIRE — clan disciplines (G2) + clan weakness (G4). Unchanged.
        if (caps.disciplines && nextSd.clan && noDisc) {
          const disciplines = buildClanDisciplines(nextSd.clan, nextSd.clanAntitribu, gen);
          if (disciplines.length > 0) nextSd.disciplines = disciplines;
        }
        if (nextSd.clan && !nextSd.weakness?.trim()) {
          nextSd.weakness = getClanWeakness(nextSd.clan);
        }
      } else if (caps.disciplines && nextSd.creature === "Carniçal") {
        // Story 164 — GHOUL / REVENANT. A known revenant family (≠ Nenhum/Outro)
        // OVERRIDES the clan-of-origin: family disciplines AND family weakness. A
        // non-revenant ghoul takes its domitor clan's disciplines but NO weakness.
        // Both get Potência 1; with neither clan nor family, just Potência 1.
        const fam = getRevenantFamily(nextSd.revenantFamily);
        if (fam) {
          if (noDisc) nextSd.disciplines = disciplinesFromNames(fam.disciplines, true);
          if (!nextSd.weakness?.trim()) nextSd.weakness = fam.weakness;
        } else if (noDisc) {
          const clanDisc = nextSd.clan ? CLAN_DISCIPLINES[nextSd.clan] ?? [] : [];
          nextSd.disciplines = disciplinesFromNames(clanDisc, true);
          // No weakness for a ghoul — clan weaknesses are not inherited.
        }
      } else if (caps.disciplines && nextSd.creature === "Lobisomem") {
        // Story 170 — LOBISOMEM (Lupino). Statblock do garou (+ 7ª aleatória do Ancião).
        // Sem clã, sem fraqueza, sem os +3 pontos da Abominação.
        if (noDisc) {
          const base = buildWerewolfDisciplines(nextSd);
          if (base.length > 0) nextSd.disciplines = werewolfTraits(base);
        }
      } else if (caps.disciplines && nextSd.creature === "Mago" && noDisc) {
        // Story 171 — MAGO. "Disciplinas Equivalentes" do statblock (com pontos). Sem clã,
        // sem fraqueza, sem sorteio. werewolfTraits só materializa name+rating+ícone.
        const mageArch = getMageArchetype(nextSd.mageArchetype);
        if (mageArch && mageArch.disciplines.length > 0) {
          nextSd.disciplines = werewolfTraits(mageArch.disciplines);
        }
      } else if (caps.disciplines && nextSd.creature === "Fada" && noDisc) {
        // Story 172 — FADA. "Disciplinas Equivalentes" do statblock (com pontos). Sem clã,
        // sem fraqueza, sem sorteio. werewolfTraits só materializa name+rating+ícone.
        const fadaArch = getFadaArchetype(nextSd.fadaArchetype);
        if (fadaArch && fadaArch.disciplines.length > 0) {
          nextSd.disciplines = werewolfTraits(fadaArch.disciplines);
        }
      } else if (caps.disciplines && nextSd.creature === "Aparição" && noDisc) {
        // Story 173 — APARIÇÃO. "Disciplinas Equivalentes" do statblock (com pontos). Sem clã,
        // sem fraqueza de clã, sem sorteio. werewolfTraits só materializa name+rating+ícone.
        const apparitionArch = getApparitionArchetype(nextSd.apparitionArchetype);
        if (apparitionArch && apparitionArch.disciplines.length > 0) {
          nextSd.disciplines = werewolfTraits(apparitionArch.disciplines);
        }
      } else if (caps.disciplines && nextSd.creature === "Demônio" && noDisc) {
        // Story 174 — DEMÔNIO. "Disciplinas Equivalentes" do statblock (com pontos). Sem clã,
        // sem fraqueza de clã, sem sorteio. werewolfTraits só materializa name+rating+ícone.
        const demonArch = getDemonArchetype(nextSd.demonArchetype);
        if (demonArch && demonArch.disciplines.length > 0) {
          nextSd.disciplines = werewolfTraits(demonArch.disciplines);
        }
      } else if (caps.disciplines && noDisc) {
        // Other non-vampire creatures with disciplines (legacy G2b path).
        const startingPowers = CREATURE_STARTING_POWERS[nextSd.creature ?? ""] ?? [];
        if (startingPowers.length > 0) {
          nextSd.disciplines = startingPowers.map(({ discipline, rating }) => {
            const t = mkTrait(discipline, { rating, max: 5 });
            const icon = DISCIPLINE_ICON_BY_NAME[discipline];
            if (icon) t.icon = icon;
            return t;
          });
        }
      }

      // Story 164 — NPC Carniçal antagonist statblock. Deterministic from the (single)
      // creation payload; re-applied identically on replay before any later edit event.
      if (nextSd.creature === "Carniçal" && p.isNPC) {
        const sb = NPC_GHOUL_STATBLOCK;
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(sb.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, sb.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, sb.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, sb.conhecimentos),
        };
        nextSd.virtues = {
          consciencia: { ...nextSd.virtues.consciencia, rating: sb.virtues.consciencia },
          autocontrole: { ...nextSd.virtues.autocontrole, rating: sb.virtues.autocontrole },
          coragem: { ...nextSd.virtues.coragem, rating: sb.virtues.coragem },
        };
        // Humanidade deriva das virtudes (RAW: Consciência + Autocontrole) → deixa o G6
        // calcular (Consc 3 + Autoc 3 = 6). A Força de Vontade é um valor deliberado de
        // statblock (≥ Coragem, refletindo pontos gastos) e fica em modo manual.
        nextSd.willpowerPermanent = sb.willpowerPermanent;
        nextSd.willpowerManual = true;
        nextSd.bloodPoolOverride = sb.bloodOverride;
        nextSd.bloodPool = Array(sb.bloodOverride).fill(true);
      }

      // GHOUL (PC) — reserva de vitae pequena (RAW p.500: capacidade inicial de 2
      // pontos, começando com 1 ponto de sangue). Diferente do vampiro, a reserva do
      // carniçal NÃO deriva da Geração, então fica em controle manual (override). O
      // carniçal NPC já tem sua própria reserva no statblock acima. Só semeia quando o
      // usuário não definiu um override — idempotente em replay.
      if (nextSd.creature === "Carniçal" && !p.isNPC && nextSd.bloodPoolOverride === undefined) {
        nextSd.bloodPoolOverride = 2;
        nextSd.bloodPool = [true, false];
      }

      // Story 166 — Mortal base archetype: pre-fill the sheet from MORTAL_ARCHETYPES.
      // Applies to PC and NPC. Deterministic from the (single) creation payload →
      // idempotent on replay. "Nenhum"/"" archetype → no seed (blank mortal).
      const arch = getMortalArchetype(nextSd.mortalArchetype);
      if (nextSd.creature === "Mortal" && arch) {
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(arch.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, arch.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, arch.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, arch.conhecimentos),
        };
        // Virtudes deliberadas do arquétipo. A Humanidade NÃO é fixada aqui: deixamos o
        // G6 derivá-la das virtudes (RAW: Humanidade = Consciência + Autocontrole). A
        // Força de Vontade fica como valor deliberado (≥ Coragem, refletindo pontos
        // gastos na criação/experiência) e em modo manual — como nos statblocks do livro.
        nextSd.virtues = {
          consciencia: { ...nextSd.virtues.consciencia, rating: arch.virtues.consciencia },
          autocontrole: { ...nextSd.virtues.autocontrole, rating: arch.virtues.autocontrole },
          coragem: { ...nextSd.virtues.coragem, rating: arch.virtues.coragem },
        };
        nextSd.willpowerPermanent = arch.willpowerPermanent;
        nextSd.willpowerManual = true;
        nextSd.weapons = arch.weapons.map((w) => ({
          id: w.id, name: w.name, damage: w.damage, diff: w.diff,
          range: "—", rate: "—", clip: "—", conceal: w.conceal ?? "—", damageType: w.damageType,
        }));
        nextSd.armor = arch.armor.map((a) => ({
          id: a.id, name: a.name, rating: a.rating, penalty: a.penalty,
          description: a.description, affectedTrait: a.affectedTrait,
        }));
        nextSd.inventory = arch.inventory.map((name, i) => ({
          id: `mortal-inv-${i}`, name, description: "", qty: 1,
        }));
        // Story 167 — arquétipo "Comum" usa a Regra de Figurantes: vitalidade de 4 níveis
        // (sem níveis extras). Redimensiona a trilha de saúde determinísticamente.
        if (arch.healthProfile === "figurante") {
          nextSd.healthProfile = "figurante";
          nextSd.healthExtraLevels = 0;
          nextSd.health = Array(getHealthTotalSlots("figurante")).fill("");
        }
      }

      // Story 170 — Lobisomem/Abominação base statblock (PC e NPC). Espelha o seed de
      // Mortal: atributos + habilidades do tipo; Humanidade e Vontade vêm FIXAS do
      // statblock (manual — não derivam das virtudes). "Nenhum"/"" → sem seed.
      const wolfArch = getWerewolfArchetype(nextSd.werewolfArchetype);
      if ((nextSd.creature === "Lobisomem" || nextSd.creature === "Abominação") && wolfArch) {
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(wolfArch.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, wolfArch.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, wolfArch.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, wolfArch.conhecimentos),
        };
        nextSd.humanity = wolfArch.humanity; nextSd.humanityManual = true;
        nextSd.willpowerPermanent = wolfArch.willpowerPermanent; nextSd.willpowerManual = true;
      }

      // Story 171 — Mago base statblock (PC e NPC). Espelha o seed de Mortal (atributos +
      // habilidades + equipamento) e o de Lobisomem (Humanidade e Vontade MANUAIS, do
      // statblock). "Nenhum"/"" → sem seed. Determinístico → idempotente no replay.
      const mageArch = getMageArchetype(nextSd.mageArchetype);
      if (nextSd.creature === "Mago" && mageArch) {
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(mageArch.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, mageArch.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, mageArch.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, mageArch.conhecimentos),
        };
        // Magos NÃO derivam Humanidade das virtudes → fixa manual a partir do statblock.
        nextSd.humanity = mageArch.humanity; nextSd.humanityManual = true;
        nextSd.willpowerPermanent = mageArch.willpowerPermanent; nextSd.willpowerManual = true;
        // Equipamento do statblock (mesma forma de mapeamento do arquétipo de Mortal). O
        // weapons[].note (manobras especiais) é só documentação — o tipo Weapon não tem campo
        // p/ ele, então é descartado aqui.
        nextSd.weapons = mageArch.weapons.map((w) => ({
          id: w.id, name: w.name, damage: w.damage, diff: w.diff,
          range: w.range, rate: w.rate, clip: w.clip, conceal: w.conceal, damageType: w.damageType,
        }));
        nextSd.armor = mageArch.armor.map((a) => ({
          id: a.id, name: a.name, rating: a.rating, penalty: a.penalty,
          description: a.description, affectedTrait: a.affectedTrait,
        }));
        nextSd.inventory = mageArch.inventory.map((it, i) => ({
          id: `mage-inv-${i}`, name: it.name, description: it.description ?? "", qty: 1,
        }));
        // (M3) Nota da Abominação Tecnológica → campo de fraqueza/observação (já exibido).
        if (mageArch.note && !nextSd.weakness?.trim()) nextSd.weakness = mageArch.note;
      }

      // Story 172 — Fada base statblock (PC e NPC). Espelha o seed de Lobisomem (atributos +
      // habilidades; Humanidade e Vontade MANUAIS, do statblock). SEM equipamento (as fadas não
      // têm). "Nenhum"/"" → sem seed. A Encantadora Sidhe tem Aparência 7 (acima do teto 5): só
      // setamos o rating; a ficha deixa Fadas excederem o teto (ver TabAtributosHabilidades).
      const fadaArch = getFadaArchetype(nextSd.fadaArchetype);
      if (nextSd.creature === "Fada" && fadaArch) {
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(fadaArch.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, fadaArch.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, fadaArch.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, fadaArch.conhecimentos),
        };
        nextSd.humanity = fadaArch.humanity; nextSd.humanityManual = true;
        nextSd.willpowerPermanent = fadaArch.willpowerPermanent; nextSd.willpowerManual = true;
      }

      // Story 173 — Aparição base statblock (PC e NPC). Espelha o seed da Fada (atributos +
      // habilidades; Humanidade e Vontade MANUAIS, do statblock). SEM equipamento. "Nenhum"/""
      // → sem seed. Determinístico → idempotente no replay. DOIS extras vs. a Fada:
      //  • "Força 0/N": o atributo é único, então `forca` já recebe o valor MANIFESTO (N) acima;
      //    a regra "0 no mundo material" vai p/ sd.weakness via `note`.
      //  • Alma Antiga semeia caminhos de Taumaturgia em sd.paths (ids determinísticos).
      const apparitionArch = getApparitionArchetype(nextSd.apparitionArchetype);
      if (nextSd.creature === "Aparição" && apparitionArch) {
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(apparitionArch.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, apparitionArch.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, apparitionArch.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, apparitionArch.conhecimentos),
        };
        nextSd.humanity = apparitionArch.humanity; nextSd.humanityManual = true;
        nextSd.willpowerPermanent = apparitionArch.willpowerPermanent; nextSd.willpowerManual = true;
        // Caminhos de Taumaturgia (só a Alma Antiga tem). IDs determinísticos → idempotente no replay.
        if (apparitionArch.paths && apparitionArch.paths.length > 0 && (!nextSd.paths || nextSd.paths.length === 0)) {
          nextSd.paths = apparitionArch.paths.map((pa, i) => ({ id: `apparition-path-${i}`, name: pa.name, level: pa.level }));
        }
        // Regra de Força 0/N (mundo material vs. manifestação) → campo de fraqueza/observação.
        if (apparitionArch.note && !nextSd.weakness?.trim()) nextSd.weakness = apparitionArch.note;
      }

      // Story 174 — seed do statblock do DEMÔNIO (PC e NPC). Igual ao da Aparição: atributos +
      // habilidades; Humanidade e Vontade MANUAIS; SEM equipamento. A Fé reusa faithRating (rating
      // único do statblock, 7/10). A regra de "forma demoníaca" (só o Profanador) vai p/ sd.weakness.
      // Determinístico → idempotente no replay (CHARACTER_CREATED roda 1×; mesmos valores).
      const demonArch = getDemonArchetype(nextSd.demonArchetype);
      if (nextSd.creature === "Demônio" && demonArch) {
        const attrs = { ...nextSd.attributes };
        for (const [key, rating] of Object.entries(demonArch.attributes)) {
          if (attrs[key]) attrs[key] = { ...attrs[key], rating };
        }
        nextSd.attributes = attrs;
        nextSd.abilities = {
          talentos: applyAbilities(nextSd.abilities.talentos, demonArch.talentos),
          pericias: applyAbilities(nextSd.abilities.pericias, demonArch.pericias),
          conhecimentos: applyAbilities(nextSd.abilities.conhecimentos, demonArch.conhecimentos),
        };
        nextSd.humanity = demonArch.humanity; nextSd.humanityManual = true;
        nextSd.willpowerPermanent = demonArch.willpowerPermanent; nextSd.willpowerManual = true;
        nextSd.faithRating = demonArch.faith; // Fé do statblock (7 / 10)
        // Regra de "forma demoníaca" (físicos/Potência só na forma demoníaca) → fraqueza/observação.
        if (demonArch.note && !nextSd.weakness?.trim()) nextSd.weakness = demonArch.note;
      }

      // Story 170 — Gnose (caps.gnose): ponto permanente do statblock (4/6/8); reserva
      // começa CHEIA. gnoseSeeded trava o auto-preenchimento da migração (deixa zerar de
      // propósito). "Nenhum" → default baixo 1. Determinístico → idempotente no replay.
      if (caps.gnose && !nextSd.gnoseSeeded) {
        const perm = wolfArch ? wolfArch.gnose : 1;
        nextSd.gnosePermanent = perm;
        nextSd.gnoseCurrent = Array.from({ length: 10 }, (_, i) => i < perm);
        nextSd.gnoseSeeded = true;
      }

      // Story 171 — Quintessência (caps.quintessence): ponto permanente do statblock
      // (10/12/10); reserva começa CHEIA. quintessenceSeeded trava o auto-preenchimento da
      // migração (deixa zerar de propósito). "Nenhum" → default baixo 1. Array com teto
      // QUINTESSENCE_MAX (statblock chega a 12). Determinístico → idempotente no replay.
      if (caps.quintessence && !nextSd.quintessenceSeeded) {
        const perm = mageArch ? mageArch.quintessence : 1;
        nextSd.quintessencePermanent = perm;
        nextSd.quintessenceCurrent = Array.from({ length: QUINTESSENCE_MAX }, (_, i) => i < perm);
        nextSd.quintessenceSeeded = true;
      }

      // Story 172 — Glamour (caps.glamour): ponto permanente do statblock (6/5/10); reserva
      // começa CHEIA. glamourSeeded trava o auto-preenchimento da migração. "Nenhum" → default
      // baixo 1. Glamour maxa em 10 → array de length 10 (NÃO usar QUINTESSENCE_MAX). Determinístico.
      if (caps.glamour && !nextSd.glamourSeeded) {
        const perm = fadaArch ? fadaArch.glamour : 1;
        nextSd.glamourPermanent = perm;
        nextSd.glamourCurrent = Array.from({ length: 10 }, (_, i) => i < perm);
        nextSd.glamourSeeded = true;
      }

      // Story 173 — Paixão (caps.passion): ponto permanente do statblock (5/9/10); reserva
      // começa CHEIA. passionSeeded trava o auto-preenchimento da migração (deixa zerar de
      // propósito). "Nenhum" → default baixo 1. Paixão maxa em 10 → array de length 10 (NÃO usar
      // QUINTESSENCE_MAX). Determinístico → idempotente no replay.
      if (caps.passion && !nextSd.passionSeeded) {
        const perm = apparitionArch ? apparitionArch.passion : 1;
        nextSd.passionPermanent = perm;
        nextSd.passionCurrent = Array.from({ length: 10 }, (_, i) => i < perm);
        nextSd.passionSeeded = true;
      }

      // G6 — seed humanity/willpower from virtues. Vampiros, Mortais e Carniçais usam
      // o mesmo modelo do RAW: Humanidade = Consciência + Autocontrole, Força de Vontade
      // = Coragem. Ficha em branco (virtudes 1/1/1) nasce com Humanidade 2 e Vontade 1,
      // em vez de 0/0. Não atropela arquétipos/statblocks (eles marcam *Manual = true).
      const usesVirtueHumanity =
        caps.vampiricHumanity || nextSd.creature === "Mortal" || nextSd.creature === "Carniçal";
      if (usesVirtueHumanity) {
        if (!nextSd.humanityManual) nextSd.humanity = deriveHumanity(nextSd.virtues);
        if (!nextSd.willpowerManual) nextSd.willpowerPermanent = deriveWillpower(nextSd.virtues);
      }

      // G6b — temporary Willpower starts FULL (= permanent), mirroring how the blood
      // pool is seeded full above. Without this, the card/sheet show 0 available
      // willpower on a freshly created sheet (looked "zeroed" for mortals/ghouls).
      // Only seeds an untouched pool, so an explicitly supplied/imported willpower
      // is preserved. Deterministic → idempotent on replay.
      const wpUntouched = !Array.isArray(nextSd.willpowerCurrent) || !nextSd.willpowerCurrent.some(Boolean);
      if (wpUntouched) {
        nextSd.willpowerCurrent = Array.from({ length: 10 }, (_, i) => i < nextSd.willpowerPermanent);
      }
      nextSd.willpowerSeeded = true;

      // G7 — Appearance 0 for clans whose weakness zeroes it. Story 170 — a Abominação
      // NÃO sofre a fraqueza de clã (só herda as disciplinas), então não zera Aparência.
      if (caps.clan && nextSd.creature !== "Abominação" && nextSd.clan && APPEARANCE_ZERO_CLANS.has(nextSd.clan) && nextSd.attributes?.aparencia) {
        nextSd.attributes = { ...nextSd.attributes, aparencia: { ...nextSd.attributes.aparencia, rating: 0 } };
      }

      char = { ...char, systemData: nextSd } as WodV20Character;
      return { ...state, characters: { ...state.characters, [p.id]: char } };
    }

    case "CHARACTER_DELETED": {
      const next = { ...state.characters };
      delete next[p.characterId];
      return { ...state, characters: next };
    }

    case "CHARACTER_MOVED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, currentZoneId: p.zoneId, activeInArena: p.zoneId != null },
        },
      };
    }

    case "CHARACTER_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const changes = (p.changes ?? {}) as Partial<Character> & { systemData?: Partial<WodV20Data> };
      let next: Character = { ...char, ...changes };
      if (changes.systemData) {
        next = { ...next, systemData: { ...(char.systemData as object), ...changes.systemData } } as Character;
      }
      return { ...state, characters: { ...state.characters, [p.characterId]: next } };
    }

    case "CHARACTER_NAME_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, name: p.name } } };
    }

    case "CHARACTER_IMAGE_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: {
            ...char,
            imageUrl: p.imageUrl,
            imageThumbnailUrl: p.imageThumbnailUrl ?? char.imageThumbnailUrl,
          },
        },
      };
    }

    // ── Chronicle (shared across the whole table; GM-only emit) ───────────────
    // ── Partial system-data patch (avoids oversized CHARACTER_UPDATED) ───────────
    case "WOD_V20_SYSTEM_DATA_PATCH": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const patchData = (p.patch ?? {}) as Partial<WodV20Data>;
      const currentSd = (char as WodV20Character).systemData ?? {};
      const nextSd: WodV20Data = { ...currentSd, ...patchData } as WodV20Data;
      return {
        ...state,
        characters: { ...state.characters, [p.characterId]: { ...char, systemData: nextSd } },
      };
    }

    case "WOD_CHRONICLE_UPDATED": {
      const text: string = p.text ?? "";
      const nextChars: Record<string, Character> = {};
      for (const [id, char] of Object.entries(state.characters)) {
        const ensured = ensureWodV20Data(char);
        nextChars[id] = {
          ...ensured,
          systemData: { ...ensured.systemData, chronicle: text },
        } as WodV20Character;
      }
      return { ...state, characters: nextChars };
    }

    case "ZONE_CREATED": {
      return {
        ...state,
        zones: {
          ...state.zones,
          [p.id]: { id: p.id, name: p.name, position: p.position, size: p.size, color: p.color, characterIds: [] },
        },
      };
    }

    // ── Story 143 FASE 2 — V20 turn engine ───────────────────────────────────
    // These mutate the platform turn state (turnOrder / currentTurnIndex /
    // actedThisRound / currentRound) plus a V20-only `state.wodTurn` bag. They run
    // AFTER the platform reducer (see projections.ts), which ignores unknown types.
    case "WOD_V20_INITIATIVE_ROLLED": {
      const order = Array.isArray(p.order) ? (p.order as string[]) : [];
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const initiative = p.initiative && typeof p.initiative === "object" ? p.initiative : prevWt.initiative ?? {};
      return {
        ...state,
        turnOrder: order,
        currentTurnIndex: 0,
        actedThisRound: [],
        // INITIATIVE_ROLLED só dispara no INÍCIO de um combate (re-rolagem de rodada
        // usa TURN_END_ROUND). Portanto sempre começa na Rodada 1 — nunca herdar a
        // rodada de um combate anterior que não foi encerrado/resetado direito.
        currentRound: 1,
        turnOrderMode: "NORMAL",
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        // Story 146 — fresh round: persist totals, clear declarations/Celerity/damage,
        // reopen the declaration phase (declaration happens every round).
        wodTurn: {
          ...prevWt,
          delayedIds: [],
          initiative,
          pendingInitiative: {},
          declarations: {},
          pendingChanges: [],
          interruptRequests: [],
          interruptReturnToId: null,
          celerityActive: [],
          damageRes: null,
          declarationOpen: true,
        } as WodTurnState,
      } as any;
    }

    case "WOD_V20_TURN_MODE_SET": {
      return { ...state, wodTurn: { ...(state as any).wodTurn, initiativeMode: p.initiativeMode } } as any;
    }

    case "WOD_V20_COMBAT_SETUP_SET": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      // Reset total (encerrar combate / cancelar cerimônia / entrar no Modo Desafio):
      // zera a ordem + rodada da plataforma E todo o bag de turno V20, para que um
      // próximo combate comece do ZERO (Rodada 1, sem iniciativa/declarações/quem-agiu
      // herdados). Sem isso, o combate "continuava de onde parou". Mantém só a
      // preferência de visibilidade de NPC do Mestre.
      if (p.reset) {
        return {
          ...state,
          turnOrder: [],
          currentTurnIndex: 0,
          actedThisRound: [],
          currentRound: 1,
          wodTurn: {
            setupPhase: false,
            hideNpcDeclarations: prevWt.hideNpcDeclarations ?? false,
            delayedIds: [],
            initiative: {},
            pendingInitiative: {},
            declarations: {},
            pendingChanges: [],
            interruptRequests: [],
            interruptReturnToId: null,
            celerityActive: [],
            damageRes: null,
            declarationOpen: false,
          } as WodTurnState,
        } as any;
      }
      return { ...state, wodTurn: { ...prevWt, setupPhase: !!p.open } } as any;
    }

    case "WOD_V20_TURN_ADVANCE": {
      const order = state.turnOrder ?? [];
      if (order.length === 0) return state;
      const idx = state.currentTurnIndex ?? 0;
      const actorId: string = p.characterId ?? order[idx];
      const acted = [...(state.actedThisRound ?? [])];
      if (actorId && !acted.includes(actorId)) acted.push(actorId);
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const delayed = ((prevWt.delayedIds ?? []) as string[]).filter((id) => id !== actorId);
      // Story 153 — return-to-interrupted: an approved interrupt let `actorId` act out of
      // turn; once their action ends the turn hops BACK to the interrupted combatant (the
      // interrupter is marked acted above; the returned combatant is NOT). Guard against a
      // stale id that already left the order → fall through to the normal advance.
      const returnToId = prevWt.interruptReturnToId;
      const returnPos = returnToId ? order.indexOf(returnToId) : -1;
      if (returnToId && returnPos >= 0) {
        return {
          ...state,
          actedThisRound: acted,
          currentTurnIndex: returnPos,
          timerPaused: false,
          lastTurnChangeTimestamp: event.createdAt,
          wodTurn: { ...prevWt, delayedIds: delayed, interruptReturnToId: null } as WodTurnState,
        } as any;
      }
      let nextIdx = idx;
      for (let step = 1; step <= order.length; step++) {
        const i = (idx + step) % order.length;
        if (!acted.includes(order[i])) { nextIdx = i; break; }
      }
      return {
        ...state,
        actedThisRound: acted,
        currentTurnIndex: nextIdx,
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        // No pending return here (or it was stale) → keep the field cleared.
        wodTurn: { ...prevWt, delayedIds: delayed, interruptReturnToId: null } as WodTurnState,
      } as any;
    }

    case "WOD_V20_TURN_DELAY": {
      const order = [...(state.turnOrder ?? [])];
      if (order.length < 2) return state;
      const idx = state.currentTurnIndex ?? 0;
      const actorId: string = p.characterId ?? order[idx];
      const curPos = order.indexOf(actorId);
      if (curPos === -1) return state;
      order.splice(curPos, 1);
      const nextPos = curPos % order.length; // the actor that was next becomes current
      const insertAt = Math.min(order.length, nextPos + 1);
      order.splice(insertAt, 0, actorId);
      const delayed = Array.from(new Set([...(((state as any).wodTurn?.delayedIds ?? []) as string[]), actorId]));
      return {
        ...state,
        turnOrder: order,
        currentTurnIndex: nextPos % order.length,
        lastTurnChangeTimestamp: event.createdAt,
        wodTurn: { ...(state as any).wodTurn, delayedIds: delayed },
      } as any;
    }

    case "WOD_V20_TURN_INTERRUPT": {
      const order = state.turnOrder ?? [];
      const pos = order.indexOf(p.characterId);
      if (pos === -1) return state;
      const delayed = (((state as any).wodTurn?.delayedIds ?? []) as string[]).filter((id) => id !== p.characterId);
      return {
        ...state,
        currentTurnIndex: pos,
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        wodTurn: { ...(state as any).wodTurn, delayedIds: delayed },
      } as any;
    }

    case "WOD_V20_TURN_ACTIVATE": {
      const order = state.turnOrder ?? [];
      const pos = order.indexOf(p.characterId);
      if (pos === -1) return state;
      const acted = (state.actedThisRound ?? []).filter((id) => id !== p.characterId);
      const delayed = (((state as any).wodTurn?.delayedIds ?? []) as string[]).filter((id) => id !== p.characterId);
      return {
        ...state,
        currentTurnIndex: pos,
        actedThisRound: acted,
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        wodTurn: { ...(state as any).wodTurn, delayedIds: delayed },
      } as any;
    }

    // Story 155 (F5) — GM manual pointer move (◀/▶). Set the active turn to the given
    // combatant in the CURRENT order and remove them from actedThisRound (they may act
    // again). EVERYTHING ELSE is left untouched: round, declarations, initiative,
    // delayedIds, interruptReturnToId, pendingInitiative. NEVER emits INITIATIVE_ROLLED
    // / COMBAT_SETUP_SET and NEVER clears turnOrder (combat-reset landmines).
    case "WOD_V20_TURN_SET": {
      const order = state.turnOrder ?? [];
      const pos = order.indexOf(p.characterId);
      if (pos === -1) return state; // not found / order empty → no-op
      const acted = (state.actedThisRound ?? []).filter((id) => id !== p.characterId);
      return {
        ...state,
        currentTurnIndex: pos,
        actedThisRound: acted,
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
      } as any;
    }

    case "WOD_V20_TURN_REACTIVATE": {
      const ids = (Array.isArray(p.characterIds) ? p.characterIds : []) as string[];
      if (ids.length === 0) return state;
      const order = state.turnOrder ?? [];
      const acted = (state.actedThisRound ?? []).filter((id) => !ids.includes(id));
      const pos = order.indexOf(ids[0]);
      // Story 146 (F6) — reactivated actors re-declare: clear their declarations and
      // reopen the declaration phase so they pick a fresh action/target.
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const decls = { ...(prevWt.declarations ?? {}) };
      for (const id of ids) delete decls[id];
      return {
        ...state,
        actedThisRound: acted,
        currentTurnIndex: pos >= 0 ? pos : (state.currentTurnIndex ?? 0),
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        wodTurn: { ...prevWt, declarations: decls, declarationOpen: true } as WodTurnState,
      } as any;
    }

    case "WOD_V20_TURN_END_ROUND": {
      const order = (Array.isArray(p.order) ? p.order : state.turnOrder) ?? [];
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const initiative = p.initiative && typeof p.initiative === "object" ? p.initiative : prevWt.initiative ?? {};
      return {
        ...state,
        turnOrder: order,
        actedThisRound: [],
        currentTurnIndex: 0,
        currentRound: (state.currentRound || 1) + 1,
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        // Story 146 — per-round reset: clear declarations + per-round Celerity, reopen
        // the declaration phase, persist the re-rolled totals.
        wodTurn: {
          ...prevWt,
          delayedIds: [],
          initiative,
          declarations: {},
          pendingChanges: [],
          interruptRequests: [],
          interruptReturnToId: null,
          celerityActive: [],
          damageRes: null,
          declarationOpen: true,
        } as WodTurnState,
      } as any;
    }

    // ── Story 146 — combat flow (initiative totals, Celerity, declaration, damage) ──
    case "WOD_V20_INITIATIVE_SUBMITTED": {
      if (!p.characterId) return state;
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const pending = { ...(prevWt.pendingInitiative ?? {}) };
      pending[p.characterId] = typeof p.total === "number" ? p.total : 0;
      return { ...state, wodTurn: { ...prevWt, pendingInitiative: pending } as WodTurnState } as any;
    }

    case "WOD_V20_CELERITY_SET": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const ids = Array.isArray(p.characterIds) ? (p.characterIds as string[]) : [];
      return { ...state, wodTurn: { ...prevWt, celerityActive: ids } as WodTurnState } as any;
    }

    case "WOD_V20_ACTION_DECLARED": {
      if (!p.characterId) return state;
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const decls = { ...(prevWt.declarations ?? {}) };
      if (p.kind == null) {
        delete decls[p.characterId];
      } else {
        decls[p.characterId] = {
          kind: p.kind,
          targetIds: Array.isArray(p.targetIds) ? p.targetIds : undefined,
          maneuver: typeof p.maneuver === "string" ? p.maneuver : undefined,
          // Story 150 — additive per-target maneuver map (back-compatible; default undefined).
          targetManeuvers:
            p.targetManeuvers && typeof p.targetManeuvers === "object" ? (p.targetManeuvers as Record<string, string>) : undefined,
          // Story 150 follow-up — additive extra (stacked) actions; default undefined.
          extraActions: Array.isArray(p.extraActions) ? (p.extraActions as WodDeclaration[]) : undefined,
        };
      }
      return { ...state, wodTurn: { ...prevWt, declarations: decls } as WodTurnState } as any;
    }

    case "WOD_V20_DECLARATION_OPENED": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      return { ...state, wodTurn: { ...prevWt, declarationOpen: !!p.open } as WodTurnState } as any;
    }

    case "WOD_V20_DECLARATION_NPC_VISIBILITY": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      return { ...state, wodTurn: { ...prevWt, hideNpcDeclarations: !!p.hidden } as WodTurnState } as any;
    }

    case "WOD_V20_DECLARATION_CHANGE_REQUESTED": {
      if (!p.requestId || !p.characterId) return state;
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      // Queue (not a single slot): de-dupe by requestId, never clobber other requests.
      const queue = (prevWt.pendingChanges ?? []).filter((x) => x.requestId !== p.requestId);
      queue.push({
        requestId: p.requestId,
        characterId: p.characterId,
        decl: {
          kind: p.kind,
          targetIds: Array.isArray(p.targetIds) ? p.targetIds : undefined,
          maneuver: typeof p.maneuver === "string" ? p.maneuver : undefined,
        },
      });
      return { ...state, wodTurn: { ...prevWt, pendingChanges: queue } as WodTurnState } as any;
    }

    case "WOD_V20_DECLARATION_CHANGE_RESOLVED": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const queue = prevWt.pendingChanges ?? [];
      const req = queue.find((x) => x.requestId === p.requestId);
      // Stale veto/approve on an already-removed requestId is a no-op.
      const nextQueue = queue.filter((x) => x.requestId !== p.requestId);
      let decls = prevWt.declarations ?? {};
      if (req && p.approved) decls = { ...decls, [req.characterId]: req.decl };
      return { ...state, wodTurn: { ...prevWt, pendingChanges: nextQueue, declarations: decls } as WodTurnState } as any;
    }

    // ── Story 153 — interrupt hand (out-of-turn action request + GM approval) ────
    case "WOD_V20_INTERRUPT_REQUESTED": {
      if (!p.requestId || !p.characterId) return state;
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      // Upsert by requestId (idempotent on re-delivery; never clobber other requests).
      const queue = (prevWt.interruptRequests ?? []).filter((x) => x.requestId !== p.requestId);
      queue.push({ requestId: p.requestId, characterId: p.characterId, requesterUserId: p.requesterUserId ?? "" });
      return { ...state, wodTurn: { ...prevWt, interruptRequests: queue } as WodTurnState } as any;
    }

    case "WOD_V20_INTERRUPT_RESOLVED": {
      if (!p.requestId) return state;
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const queue = prevWt.interruptRequests ?? [];
      const req = queue.find((x) => x.requestId === p.requestId);
      const nextQueue = queue.filter((x) => x.requestId !== p.requestId);
      // Decline / requester cancel (approved:false) or stale id → just drop the request.
      if (!req || !p.approved) {
        return { ...state, wodTurn: { ...prevWt, interruptRequests: nextQueue } as WodTurnState } as any;
      }
      // Approve → jump the turn to the interrupter NOW (mirrors WOD_V20_TURN_INTERRUPT),
      // remembering the interrupted combatant so the next TURN_ADVANCE returns to them.
      const order = state.turnOrder ?? [];
      const pos = order.indexOf(req.characterId);
      if (pos === -1) {
        return { ...state, wodTurn: { ...prevWt, interruptRequests: nextQueue } as WodTurnState } as any;
      }
      const interruptedId = order[state.currentTurnIndex ?? 0] ?? null;
      const delayed = ((prevWt.delayedIds ?? []) as string[]).filter((id) => id !== req.characterId);
      return {
        ...state,
        currentTurnIndex: pos,
        timerPaused: false,
        lastTurnChangeTimestamp: event.createdAt,
        wodTurn: {
          ...prevWt,
          interruptRequests: nextQueue,
          delayedIds: delayed,
          // Don't set a return hop if the interrupter already WAS the current actor.
          interruptReturnToId: interruptedId && interruptedId !== req.characterId ? interruptedId : null,
        } as WodTurnState,
      } as any;
    }

    case "WOD_V20_DAMAGE_RESOLUTION_OPENED": {
      if (!p.resolutionId || !p.targetId) return state;
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const attack = typeof p.attackSuccesses === "number" ? p.attackSuccesses : 0;
      const defense = typeof p.defenseSuccesses === "number" ? p.defenseSuccesses : 0;
      const net = attack - defense;
      const baseDamage = typeof p.baseDamage === "number" ? p.baseDamage : 0;
      return {
        ...state,
        wodTurn: {
          ...prevWt,
          damageRes: {
            resolutionId: p.resolutionId,
            attackerId: p.attackerId ?? "",
            targetId: p.targetId,
            attackSuccesses: attack,
            defenseSuccesses: defense,
            net,
            damageType: (p.damageType ?? "L") as "B" | "L" | "A",
            baseDamage,
            weaponBonus: typeof p.weaponBonus === "number" ? p.weaponBonus : 0,
            weaponName: typeof p.weaponName === "string" ? p.weaponName : null,
            strengthDamage: typeof p.strengthDamage === "number" ? p.strengthDamage : 0,
            // Story 157 (F3) — dano = dados da arma + sucessos líquidos ALÉM do 1º (RAW V20:
            // o 1º sucesso só estabelece o acerto). baseDamage + (net − 1) é o núcleo RAW
            // já existente; o termo NOVO é o weaponBonus (os dados da arma que saíram da
            // parada de ATAQUE na F2). Ex.: net 2, arma "Força +1"/Força 3, bônus +2 →
            // (3+1)+(2−1)+2 = 7d10. Desarmado net 2, Força 3 → 3+(2−1) = 4d10.
            damagePool: Math.max(0, baseDamage + (net - 1) + (typeof p.weaponBonus === "number" ? p.weaponBonus : 0)),
            damageRoll: null,
            damageSuccesses: null,
            soakPool: null,
            soakRoll: null,
            soakSuccesses: null,
            final: null,
          },
        } as WodTurnState,
      } as any;
    }

    case "WOD_V20_DAMAGE_RESOLUTION_UPDATED": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const cur = prevWt.damageRes;
      if (!cur || cur.resolutionId !== p.resolutionId) return state;
      return { ...state, wodTurn: { ...prevWt, damageRes: { ...cur, ...(p.patch ?? {}) } } as WodTurnState } as any;
    }

    case "WOD_V20_DAMAGE_RESOLUTION_CONFIRMED": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const cur = prevWt.damageRes;
      const targetId: string | undefined = cur?.targetId ?? p.targetId;
      const final = typeof p.final === "number" ? p.final : (cur?.final ?? 0);
      const type = (p.damageType ?? cur?.damageType ?? "L") as "B" | "L" | "A";
      // Story 161 — o GM agora MARCA as caixas de saúde no modal e confirma o array
      // RESULTANTE (absoluto). Aplicar um array absoluto é IDEMPOTENTE em replay (ao
      // contrário do delta applyDamageToTrack). Sem `p.health` → caminho LEGADO (delta
      // por final+type), mantendo back-compat com confirmações antigas/o botão Automático
      // que ainda usa o mesmo applyDamageToTrack só que do lado do modal.
      const explicitHealth = Array.isArray(p.health) ? (p.health as string[]) : null;
      let characters = state.characters;
      // Apply the health change ATOMICALLY here — never emit a separate
      // WOD_V20_SYSTEM_DATA_PATCH (the delta path would double-apply on replay).
      if (targetId && state.characters[targetId] && (explicitHealth || final > 0)) {
        const char = state.characters[targetId];
        const csd = ((char as any).systemData ?? {}) as Partial<WodV20Data>;
        const baseLen = getHealthTotalSlots(csd.healthProfile, csd.healthExtraLevels);
        let nextHealth: string[];
        if (explicitHealth) {
          nextHealth = explicitHealth.slice(0, baseLen);
          while (nextHealth.length < baseLen) nextHealth.push("");
        } else {
          const health = Array.isArray(csd.health) ? [...csd.health] : [];
          while (health.length < baseLen) health.push("");
          nextHealth = applyDamageToTrack(health as string[], final, type);
        }
        characters = { ...state.characters, [targetId]: { ...char, systemData: { ...csd, health: nextHealth } } as Character };
      }
      return { ...state, characters, wodTurn: { ...prevWt, damageRes: null } as WodTurnState } as any;
    }

    case "WOD_V20_DAMAGE_RESOLUTION_CANCELLED": {
      const prevWt = ((state as any).wodTurn ?? {}) as WodTurnState;
      const cur = prevWt.damageRes;
      if (cur && p.resolutionId && cur.resolutionId !== p.resolutionId) return state;
      return { ...state, wodTurn: { ...prevWt, damageRes: null } as WodTurnState } as any;
    }

    default:
      return state;
  }
}
