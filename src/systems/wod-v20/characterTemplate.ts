import type { Character } from "../../types";
import type { Trait, WodV20Data, WodV20Character } from "./types";
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_GROUPS,
  TALENTS,
  SKILLS,
  KNOWLEDGES,
  CLAN_DISCIPLINES,
  SALUBRI_ANTITRIBU_DISCIPLINES,
  CLAN_FREE_DISCIPLINE_DOT,
  DISCIPLINE_ICON_BY_NAME,
  getGenerationDisciplineMax,
  QUINTESSENCE_MAX,
} from "./types";

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function mkTrait(name: string, opts: Partial<Trait> = {}): Trait {
  return {
    id: opts.id ?? `wod-${slug(name)}`,
    name,
    rating: opts.rating ?? 0,
    max: opts.max ?? 5,
    specialization: opts.specialization ?? "",
    custom: opts.custom ?? false,
  };
}

function defaultAttributes(): Record<string, Trait> {
  const out: Record<string, Trait> = {};
  for (const group of ATTRIBUTE_GROUPS) {
    for (const t of group.traits) {
      out[t.key] = mkTrait(t.label, { id: `attr-${t.key}`, rating: 1 });
    }
  }
  return out;
}

export function createWodV20SystemData(): WodV20Data {
  return {
    creature: "Vampiro",
    generation: 13,
    clan: "",
    clanAntitribu: false,
    clanSymbolUrl: "",
    sect: "",
    sectSymbolUrl: "",
    revenantFamily: "",
    revenantFamilyCustom: "",
    mortalArchetype: "",
    // Story 170 — werewolf/abomination defaults (campos opcionais carregados sempre).
    werewolfArchetype: "",
    gnosePermanent: 0,
    gnoseCurrent: Array(10).fill(false),
    gnoseSeeded: false,
    form: "human",
    wolfImageUrl: "",
    // Story 171 — mage/Quintessência defaults (campos opcionais carregados sempre).
    mageArchetype: "",
    quintessencePermanent: 0,
    quintessenceCurrent: Array(QUINTESSENCE_MAX).fill(false),
    quintessenceSeeded: false,
    // Story 172 — fada/Glamour defaults (campos opcionais carregados sempre).
    fadaArchetype: "",
    glamourPermanent: 0,
    glamourCurrent: Array(10).fill(false),
    glamourSeeded: false,
    // Story 173 — aparição/Paixão defaults (campos opcionais carregados sempre). Teto 10.
    apparitionArchetype: "",
    passionPermanent: 0,
    passionCurrent: Array(10).fill(false),
    passionSeeded: false,
    // Story 174 — demônio default (campo opcional carregado sempre). A Fé reusa faithRating.
    demonArchetype: "",
    // Story 175 — criatura "Customizado" (defaults; customResource fica undefined até o GM definir).
    customType: "",
    customLabels: {},
    customResourcePermanent: 0,
    customResourceCurrent: Array(10).fill(false),
    customResourceRating: 0,
    customVirtues: [],
    customFinalized: false,
    // Story 175 (follow-up) — Caminho com bolinhas ajustáveis + toggles de Geração/Clã.
    humanityMax: 10,
    customHasGeneration: false,
    customHasClan: false,
    customHasSect: false,

    health: Array(7).fill(""),
    healthExtraLevels: 0,
    healthProfile: "standard",
    weakness: "",
    overdosing: "",
    experience: "",
    humanityPath: "Humanidade",
    humanityPathCustom: "",
    humanity: 0,
    posture: "",
    willpowerPermanent: 0,
    willpowerCurrent: Array(10).fill(false),
    bloodPool: Array(10).fill(false),
    bloodPerTurn: 1,
    faithRating: 0,

    chronicle: "",
    nature: "",
    demeanor: "",
    concept: "",
    sire: "",
    lore: "",
    bio: {
      age: "",
      apparentAge: "",
      birthDate: "",
      deathDate: "",
      hair: "",
      eyes: "",
      race: "",
      nationality: "",
      height: "",
      weight: "",
      sex: "",
    },
    prelude: "",
    goals: "",
    coterieDiagramId: "",

    attributes: defaultAttributes(),
    abilities: {
      talentos: TALENTS.map((n) => mkTrait(n)),
      pericias: SKILLS.map((n) => mkTrait(n)),
      conhecimentos: KNOWLEDGES.map((n) => mkTrait(n)),
    },
    disciplines: [],
    backgrounds: [],
    virtues: {
      consciencia: mkTrait("Consciência/Convicção", { id: "virt-consciencia", rating: 1 }),
      autocontrole: mkTrait("Autocontrole/Instinto", { id: "virt-autocontrole", rating: 1 }),
      coragem: mkTrait("Coragem", { id: "virt-coragem", rating: 1 }),
    },

    merits: [],
    flaws: [],
    otherTraits: [],
    weapons: [],
    armor: [],
    paths: [],
    rituals: [],
    experienceTotal: "",
    experienceSpent: "",
    experienceLog: "",
    derangements: [],
    clanDerangement: "",

    money: "",
    inventory: [],
    expanded: [],
    sectionColors: {},
  };
}

/**
 * Disciplinas iniciais do clã (criação da ficha). Caitiff/Sangue-Fraco e clãs
 * desconhecidos → []. Salubri antitribu troca Obeah por Valeren. Gárgulas já
 * começam com 1 ponto em Vôo. Ícone preenchido quando há slug conhecido.
 */
export function buildClanDisciplines(clan?: string, antitribu = false, gen = 13): Trait[] {
  if (!clan) return [];
  const names =
    clan === "Salubri" && antitribu
      ? SALUBRI_ANTITRIBU_DISCIPLINES
      : CLAN_DISCIPLINES[clan];
  if (!names || names.length === 0) return [];
  const freeDot = CLAN_FREE_DISCIPLINE_DOT[clan];
  const discMax = getGenerationDisciplineMax(gen);
  return names.map((name) => {
    const freeDotRating = freeDot && name === freeDot ? 1 : 0;
    const trait = mkTrait(name, { rating: freeDotRating, max: discMax });
    const icon = DISCIPLINE_ICON_BY_NAME[name];
    if (icon) trait.icon = icon;
    return trait;
  });
}

export function createWodV20Character(overrides: Partial<Character> = {}): WodV20Character {
  return {
    id: "",
    name: "Novo Personagem",
    ownerUserId: "",
    systemData: createWodV20SystemData(),
    activeInArena: false,
    source: "active",
    ...overrides,
  } as WodV20Character;
}

export { ATTRIBUTE_KEYS };
