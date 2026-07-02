import type { ActionEvent, SessionState, Character } from "../../types";
import type { WodV5Character, WodV5Data, Trait, WodV5TurnState, WodV5CombatRes, WodV5DuelTarget, WodV5DamageRes, V5Damage } from "./types";
import { createWodV5Character, buildV5ClanDisciplines, mkTrait } from "./characterTemplate";
import { getV5ClanWeakness, V5_DISCIPLINE_ICON_BY_NAME } from "./types";
import { ensureWodV5Data } from "./migrations";

// ─── Story 182 — Lobisomem (V5): statblock FIXO do antagonista ────────────────
// Modelado como "poderes equivalentes" (altos níveis de Disciplinas vampíricas), igual
// ao livro de V20. Sem Fome / sem checagens de sangue (caps.bloodPool=false). +3 nos
// Físicos é APLICADO em jogo pelo botão de forma (applyWolfFormV5), não semeado aqui.
// Determinístico (sem Math.random) → CHARACTER_CREATED idempotente no replay.
const WEREWOLF_V5_ATTRS: Record<string, number> = {
  forca: 3, destreza: 3, vigor: 4,
  carisma: 3, manipulacao: 3, autocontrole: 2,
  inteligencia: 3, raciocinio: 4, determinacao: 4,
};
// Perícias por LABEL EXATO do V5 (V5_SKILL_GROUPS). Mapeamentos do dono:
// Ladroagem→Furto, Sagacidade→Astúcia, Percepção→Prontidão (Awareness).
const WEREWOLF_V5_SKILLS: Record<string, number> = {
  // Físicas
  Atletismo: 4, Briga: 5, Condução: 1, "Armas de Fogo": 1, "Armas Brancas": 4,
  Furto: 2, Furtividade: 4, Sobrevivência: 5,
  // Sociais
  "Empatia c/ Animais": 5, Etiqueta: 1, "Astúcia": 2, Intimidação: 5, Liderança: 1, Manha: 3,
  // Mentais
  Erudição: 2, Prontidão: 4, Investigação: 1, Medicina: 1, Política: 1, Ocultismo: 3, Ciência: 2,
};
// "Disciplinas Equivalentes" (nomes V5: Auspício, não Auspícios). Teto 5.
const WEREWOLF_V5_DISCIPLINES: { name: string; rating: number }[] = [
  { name: "Animalismo", rating: 5 },
  { name: "Auspício", rating: 2 },
  { name: "Celeridade", rating: 4 },
  { name: "Fortitude", rating: 5 },
  { name: "Ofuscação", rating: 1 },
  { name: "Potência", rating: 5 },
];

function seedWerewolfV5(sd: WodV5Data): void {
  // Atributos (teto 5 padrão; a forma de lobo sobe o teto via applyWolfFormV5).
  const attrs: Record<string, Trait> = { ...(sd.attributes ?? {}) };
  for (const [key, rating] of Object.entries(WEREWOLF_V5_ATTRS)) {
    const t = attrs[key];
    if (t) attrs[key] = { ...t, rating };
  }
  sd.attributes = attrs;
  // Perícias (por label).
  const applySkill = (list: Trait[]): Trait[] =>
    list.map((t) => (WEREWOLF_V5_SKILLS[t.name] != null ? { ...t, rating: WEREWOLF_V5_SKILLS[t.name] } : t));
  sd.skills = {
    fisicas: applySkill(sd.skills?.fisicas ?? []),
    sociais: applySkill(sd.skills?.sociais ?? []),
    mentais: applySkill(sd.skills?.mentais ?? []),
  };
  // Disciplinas (poderes equivalentes) com ícone V5.
  sd.disciplines = WEREWOLF_V5_DISCIPLINES.map(({ name, rating }) => {
    const t = mkTrait(name, { rating, max: 5 });
    const icon = V5_DISCIPLINE_ICON_BY_NAME[name];
    if (icon) t.icon = icon;
    return t;
  });
  // Arma: garras e presas, +3 superficial, sem penalidades.
  sd.weapons = [
    { id: "v5-werewolf-claws", name: "Garras e Presas", damage: "+3", diff: "", range: "", rate: "", clip: "", conceal: "", damageType: "S" },
  ];
  // Começa na forma humana.
  sd.form = "human";
}

// ─── Story 183 — Mortais antagonistas (V5) + Carniçal ─────────────────────────
// Formato de ANTAGONISTA do livro V5: "Paradas Padrão" por categoria (Físico/Social/
// Mental) + perícias EXCEPCIONAIS (que podem passar de 5) + Vitalidade/Vontade literais.
// Conforme o dono: a ficha mantém TODAS as seções do Vampiro EXCETO as de sangue; nos
// Mortais a Fé (faithRating) aparece no lugar da Potência de Sangue. As paradas de categoria
// preenchem os 3 atributos daquela categoria (teto sobe quando > 5). Determinístico (sem
// Math.random) → CHARACTER_CREATED idempotente no replay. Mapeamentos de perícia (do dono):
// Ladroagem→Furto, Percepção→Prontidão (Awareness), Sagacidade→Astúcia (Subterfuge).
type V5Antagonist = {
  physical: number; social: number; mental: number;
  health: number; willpower: number;
  skills: Record<string, number>; // labels EXATOS de V5_SKILL_GROUPS
  special?: string;               // regras especiais → sd.weakness (caixa "Regras Especiais")
};

const V5_MORTAL_ANTAGONISTS: Record<string, V5Antagonist> = {
  "Detetive da Polícia": { physical: 4, social: 3, mental: 4, health: 6, willpower: 5,
    skills: { Atletismo: 5, "Armas de Fogo": 5, Investigação: 6, Manha: 5 } },
  "Criminoso": { physical: 4, social: 3, mental: 3, health: 6, willpower: 4,
    skills: { Briga: 5, "Armas de Fogo": 5, Intimidação: 5, Furto: 5, Manha: 7 } },
  "Clérigo": { physical: 3, social: 5, mental: 4, health: 5, willpower: 7,
    skills: { Erudição: 6, "Astúcia": 7, Ocultismo: 5, Liderança: 6 },
    special: "Alguns clérigos possuem a característica mística Fé Verdadeira, que lhes permite afastar e ferir vampiros." },
  "Caçador da Fé": { physical: 4, social: 4, mental: 5, health: 6, willpower: 8,
    skills: { Erudição: 7, Prontidão: 7, "Armas Brancas": 6, Investigação: 7, Ocultismo: 8 },
    special: "Muitos pertencem à secreta Sociedade de São Leopoldo. Alguns alteram o próprio sangue (química ou misticamente): +4 dados para resistir ou entrar em disputa contra Disciplinas vampíricas, e beber o sangue deles inflige 4 de dano Agravado ao vampiro (a menos que o Membro passe num teste de Vigor + Determinação, Dif. 5)." },
  "Investigador da Inquisição": { physical: 5, social: 4, mental: 5, health: 7, willpower: 7,
    skills: { Erudição: 6, Prontidão: 7, "Armas de Fogo": 6, Investigação: 7 },
    special: "Agentes da Segunda Inquisição em missões de espionagem e investigação." },
  "Inquisidor Delta": { physical: 6, social: 4, mental: 4, health: 8, willpower: 7,
    skills: { Atletismo: 8, Prontidão: 7, Briga: 8, "Armas de Fogo": 9, "Armas Brancas": 8 },
    special: "Tropas de assalto de elite da Segunda Inquisição. Sempre dispõem de equipamento especializado (armadura corporal, munição especial, ferramentas de invasão) e só atacam os não vivos quando têm vantagem total. Possuem ainda Uma Habilidade de Especialista à escolha em 9." },
};

export const V5_MORTAL_ANTAGONIST_NAMES: string[] = Object.keys(V5_MORTAL_ANTAGONISTS);

const V5_GHOUL_ANTAGONIST: V5Antagonist = {
  physical: 4, social: 4, mental: 4, health: 6, willpower: 5,
  skills: { Prontidão: 6, Intimidação: 5, Ocultismo: 6, Furtividade: 5 },
  special: "Servo viciado em sangue de vampiro.",
};

// Categoria → as 3 chaves de atributo (V5_ATTRIBUTE_KEYS).
const V5_ATTR_BY_CATEGORY: Record<"physical" | "social" | "mental", string[]> = {
  physical: ["forca", "destreza", "vigor"],
  social: ["carisma", "manipulacao", "autocontrole"],
  mental: ["inteligencia", "raciocinio", "determinacao"],
};

function applyV5Antagonist(sd: WodV5Data, a: V5Antagonist): void {
  // Atributos: cada parada-padrão preenche os 3 atributos da categoria (teto sobe se > 5).
  const attrs: Record<string, Trait> = { ...(sd.attributes ?? {}) };
  const setCat = (cat: "physical" | "social" | "mental", val: number) => {
    for (const key of V5_ATTR_BY_CATEGORY[cat]) {
      const t = attrs[key];
      if (t) attrs[key] = { ...t, rating: val, max: Math.max(5, val) };
    }
  };
  setCat("physical", a.physical);
  setCat("social", a.social);
  setCat("mental", a.mental);
  sd.attributes = attrs;
  // Perícias excepcionais (por label V5; teto sobe se > 5).
  const applySkill = (list: Trait[]): Trait[] =>
    list.map((t) => (a.skills[t.name] != null ? { ...t, rating: a.skills[t.name], max: Math.max(5, a.skills[t.name]) } : t));
  sd.skills = {
    fisicas: applySkill(sd.skills?.fisicas ?? []),
    sociais: applySkill(sd.skills?.sociais ?? []),
    mentais: applySkill(sd.skills?.mentais ?? []),
  };
  // Vitalidade/Vontade LITERAIS (sobrepõem o derivado de Vigor+3 / Autocontrole+Determinação;
  // o ± da ficha ajusta depois).
  sd.healthV5 = Array(Math.max(1, a.health)).fill("");
  sd.willpowerV5 = Array(Math.max(1, a.willpower)).fill("");
  // Regras especiais → caixa "Regras Especiais" (sd.weakness).
  if (a.special && !sd.weakness) sd.weakness = a.special;
}

function seedMortalV5(sd: WodV5Data): void {
  const a = V5_MORTAL_ANTAGONISTS[sd.mortalArchetype ?? ""];
  if (!a) return; // "Nenhum"/desconhecido = ficha em branco (mas Fé já aparece via caps.faith)
  applyV5Antagonist(sd, a);
}

function seedGhoulV5(sd: WodV5Data): void {
  applyV5Antagonist(sd, V5_GHOUL_ANTAGONIST);
  // "Possuem UMA Disciplina com valor 1, de acordo com o clã" — semeia só a 1ª disciplina
  // do clã em rating 1 (o GM adiciona mais pelo picker). Sem clã conhecido → nenhuma.
  const clanDiscs = buildV5ClanDisciplines(sd.clan);
  if (clanDiscs.length > 0) {
    sd.disciplines = [{ ...clanDiscs[0], rating: 1 }];
  }
}

// ─── Story 186 — Animais (V5): LACAIO-ONLY / NPC-ONLY ─────────────────────────
// Mesma "Parada Padrão" do antagonista V5 (story 183): pool por categoria (Físico/Social/
// Mental) preenche os 3 atributos da categoria (teto sobe se > 5, p.ex. Urso Físico 7) +
// Vitalidade/Vontade LITERAIS + perícias de destaque. Sem sangue/clã/disciplinas/Fé/Humanidade
// (a Humanidade é ocultada na UI p/ Animal). Reusa V5Antagonist + applyV5Antagonist. Regras
// especiais → sd.weakness ("Regras Especiais"). Mapeamento do dono: Percepção→Prontidão
// (Awareness). Determinístico (sem Math.random) → CHARACTER_CREATED idempotente no replay.
const V5_ANIMALS: Record<string, V5Antagonist> = {
  "Morcego (Grande)": { physical: 3, social: 1, mental: 1, health: 2, willpower: 1,
    skills: { Prontidão: 7, Furtividade: 5 } },
  "Cão de Guarda": { physical: 5, social: 1, mental: 1, health: 5, willpower: 2,
    skills: { Briga: 6, Prontidão: 4, Intimidação: 4, Furtividade: 4 },
    special: "Causa +1 de dano extra em mordidas." },
  "Cavalo": { physical: 6, social: 1, mental: 1, health: 7, willpower: 2,
    skills: { Prontidão: 4 },
    special: "Causa +2 pontos de dano extra ao pisotear oponentes caídos." },
  "Urso": { physical: 7, social: 1, mental: 1, health: 8, willpower: 3,
    skills: { Intimidação: 6, Prontidão: 3 },
    special: "Adiciona +2 ao dano base de todos os seus ataques." },
  "Ave de Rapina": { physical: 4, social: 1, mental: 1, health: 3, willpower: 2,
    skills: { Prontidão: 6, Furtividade: 6, Briga: 5 } },
  "Rato": { physical: 3, social: 1, mental: 1, health: 1, willpower: 1,
    skills: { Furtividade: 7, Prontidão: 5, Briga: 4 },
    special: "Em bando (enxame), ganham +3 à Vitalidade e +3 a todas as rolagens baseadas em Atributos Físicos." },
  "Lobo": { physical: 6, social: 1, mental: 1, health: 6, willpower: 3,
    skills: { Intimidação: 5, Furtividade: 5, Prontidão: 3 },
    special: "Causa +1 de dano extra em ataques." },
};

export const V5_ANIMAL_NAMES: string[] = Object.keys(V5_ANIMALS);

function seedAnimalV5(sd: WodV5Data): void {
  const a = V5_ANIMALS[sd.animalSubtype ?? ""];
  if (!a) return;
  applyV5Antagonist(sd, a);
}

// ─── Story 188 — Arquétipos de NPC Vampiro (V5) ───────────────────────────────
// Diferem dos mortais: usam atributos INDIVIDUAIS (não parada por categoria) e têm
// Disciplinas específicas. Reusa mkTrait + V5_DISCIPLINE_ICON_BY_NAME do template.
// Determinístico (sem Math.random) → CHARACTER_CREATED idempotente no replay.
type V5VampireNpc = {
  attrs?: Record<string, number>;              // V5_ATTRIBUTE_KEYS → rating (≤ 5)
  skills?: Record<string, number>;             // label exato de V5_SKILL_GROUPS → rating
  disciplines: { name: string; rating: number }[]; // nome exato de V5_DISCIPLINE_ICON_BY_NAME
  special?: string;
  humanity?: number;
};

const V5_VAMPIRE_NPCS: Record<string, V5VampireNpc> = {
  "Harpia de Elísio": {
    attrs: { carisma: 3, manipulacao: 4 },
    skills: { Etiqueta: 5 },
    disciplines: [
      { name: "Auspício", rating: 3 },
      { name: "Presença", rating: 3 },
      { name: "Celeridade", rating: 2 },
      { name: "Fortitude", rating: 1 },
    ],
    special: "Informante e fofoqueira da corte: usa o talento social para descobrir segredos e se manter a salvo.",
  },
  "Revolucionário Anarch": {
    attrs: { forca: 4 },
    skills: { Briga: 4, Furto: 4, Manha: 4 },
    disciplines: [
      { name: "Animalismo", rating: 2 },
      { name: "Celeridade", rating: 2 },
      { name: "Fortitude", rating: 3 },
      { name: "Potência", rating: 2 },
      { name: "Metamorfose", rating: 1 },
    ],
    special: "Especialista em táticas brutais de guerrilha e combate de rua.",
  },
  "Bispo Nodista": {
    attrs: { carisma: 5, inteligencia: 5, vigor: 5 },
    skills: { Erudição: 4, Persuasão: 5, Ocultismo: 5 },
    disciplines: [
      { name: "Auspício", rating: 2 },
      { name: "Dominação", rating: 2 },
      { name: "Fortitude", rating: 3 },
      { name: "Presença", rating: 4 },
    ],
    special: "Líder religioso de extrema capacidade de persuasão; comanda os fiéis do Sabbat.",
  },
  "Xerife Sanguinário": {
    attrs: { destreza: 5, forca: 4 },
    skills: { "Armas de Fogo": 4, Intimidação: 5 },
    disciplines: [
      { name: "Animalismo", rating: 2 },
      { name: "Celeridade", rating: 3 },
      { name: "Ofuscação", rating: 3 },
      { name: "Potência", rating: 4 },
    ],
    special: "Letal máquina de caça do Príncipe; destrói os oponentes.",
  },
  "Wight": {
    attrs: { destreza: 5, vigor: 5 },
    skills: { Sobrevivência: 5, Prontidão: 5 },
    disciplines: [
      { name: "Animalismo", rating: 3 },
      { name: "Celeridade", rating: 4 },
      { name: "Fortitude", rating: 3 },
      { name: "Potência", rating: 4 },
    ],
    special: "Vampiro cuja Humanidade chegou a 0, consumido pela Besta. Extremamente violento e primitivo.",
    humanity: 0,
  },
};

export const V5_VAMPIRE_NPC_NAMES: string[] = Object.keys(V5_VAMPIRE_NPCS);

function seedVampireNpcV5(sd: WodV5Data): void {
  const a = V5_VAMPIRE_NPCS[sd.vampireNpcType ?? ""];
  if (!a) return;
  // Atributos individuais (não categoria inteira).
  if (a.attrs) {
    const attrs: Record<string, Trait> = { ...(sd.attributes ?? {}) };
    for (const [k, v] of Object.entries(a.attrs)) {
      const t = attrs[k];
      if (t) attrs[k] = { ...t, rating: v, max: Math.max(5, v) };
    }
    sd.attributes = attrs;
  }
  // Perícias por label exato.
  if (a.skills) {
    const applySkill = (list: Trait[]): Trait[] =>
      list.map((t) => (a.skills![t.name] != null ? { ...t, rating: a.skills![t.name], max: Math.max(5, a.skills![t.name]) } : t));
    sd.skills = {
      fisicas: applySkill(sd.skills?.fisicas ?? []),
      sociais: applySkill(sd.skills?.sociais ?? []),
      mentais: applySkill(sd.skills?.mentais ?? []),
    };
  }
  // Disciplinas: sobrescreve a semente do clã com a lista do arquétipo.
  sd.disciplines = a.disciplines.map(({ name, rating }) => {
    const t = mkTrait(name, { rating, max: 5 });
    const icon = V5_DISCIPLINE_ICON_BY_NAME[name];
    if (icon) t.icon = icon;
    return t;
  });
  if (a.special && !sd.weakness) sd.weakness = a.special;
  if (a.humanity != null) sd.humanity = a.humanity;
}

// ─── Story 184 — Mago (V5) ────────────────────────────────────────────────────
// Statblock FIXO (atributos individuais já no formato V5 de 9 atributos). Sem recurso à
// parte: os feitiços/rituais são simulados por altos níveis de Disciplinas vampíricas.
// Vitalidade 5 (Vigor 2 +3) e Vontade 10 (Autocontrole 5 + Determinação 5) DERIVAM dos
// atributos → healthV5/willpowerV5 ficam vazios e o status block deriva. Tudo ≤ 5 (teto
// padrão). Determinístico → idempotente no replay. Mapeamentos de perícia: Percepção→Prontidão
// (Awareness); Sagacidade→Intuição (Insight) e Subterfúgio→Astúcia (Subterfuge) — aqui AS DUAS
// aparecem, então cada uma vai p/ a sua perícia V5 (não colidem em Astúcia).
const MAGE_V5_ATTRS: Record<string, number> = {
  forca: 2, destreza: 3, vigor: 2,
  carisma: 3, manipulacao: 4, autocontrole: 5,
  inteligencia: 5, raciocinio: 4, determinacao: 5,
};
const MAGE_V5_SKILLS: Record<string, number> = {
  // Físicas
  Ofícios: 3, Atletismo: 1, Condução: 1, "Armas de Fogo": 1, "Armas Brancas": 1,
  // Sociais
  "Intuição": 4, Intimidação: 4, Liderança: 4, Persuasão: 4, Etiqueta: 3, Performance: 3, "Astúcia": 3, Manha: 1,
  // Mentais
  Erudição: 5, Ocultismo: 5, Prontidão: 3, Investigação: 2, Medicina: 2, Ciência: 2, Finanças: 1, Política: 1, Tecnologia: 1,
};
// "Disciplinas (Poderes Simulados)" — nomes V5 (Auspícios→Auspício). Teto 5.
const MAGE_V5_DISCIPLINES: { name: string; rating: number }[] = [
  { name: "Feitiçaria de Sangue", rating: 5 },
  { name: "Auspício", rating: 4 },
  { name: "Dominação", rating: 4 },
  { name: "Ofuscação", rating: 3 },
  { name: "Presença", rating: 2 },
];

function seedMageV5(sd: WodV5Data): void {
  const attrs: Record<string, Trait> = { ...(sd.attributes ?? {}) };
  for (const [key, rating] of Object.entries(MAGE_V5_ATTRS)) {
    const t = attrs[key];
    if (t) attrs[key] = { ...t, rating }; // ≤ 5 → teto padrão 5
  }
  sd.attributes = attrs;
  const applySkill = (list: Trait[]): Trait[] =>
    list.map((t) => (MAGE_V5_SKILLS[t.name] != null ? { ...t, rating: MAGE_V5_SKILLS[t.name] } : t));
  sd.skills = {
    fisicas: applySkill(sd.skills?.fisicas ?? []),
    sociais: applySkill(sd.skills?.sociais ?? []),
    mentais: applySkill(sd.skills?.mentais ?? []),
  };
  sd.disciplines = MAGE_V5_DISCIPLINES.map(({ name, rating }) => {
    const t = mkTrait(name, { rating, max: 5 });
    const icon = V5_DISCIPLINE_ICON_BY_NAME[name];
    if (icon) t.icon = icon;
    return t;
  });
}

// ─── Story 185 — Feérico (Fae) + Espectro (Wraith) (V5) ───────────────────────
// Dois statblocks FIXOS no molde do Mago (story 184): ficha de vampiro completa, sem sangue/
// clã/geração/seita/transformação e SEM recurso à parte (Glamour/Paixão NÃO são usados — os
// poderes são simulados por altas Disciplinas vampíricas). Vitalidade (Vigor+3) e Força de
// Vontade (Autocontrole+Determinação) DERIVAM dos atributos → healthV5/willpowerV5 vazios.
// Regras especiais vão em sd.weakness ("Regras Especiais"). Determinístico → idempotente no
// replay. O Feérico tem Carisma 7 (sobre-humano): semeia max = Math.max(5, rating) p/ renderizar
// os 7 pontos (a aba de atributos honra trait.max desde a story 182). Mapeamentos do dono:
// Percepção→Prontidão (Awareness); disciplina Auspícios→Auspício (singular V5).
type V5FixedStatblock = {
  attrs: Record<string, number>;            // chaves de V5_ATTRIBUTE_KEYS
  skills: Record<string, number>;           // labels EXATOS de V5_SKILL_GROUPS
  disciplines: { name: string; rating: number }[];
  special: string;                          // → sd.weakness ("Regras Especiais")
};

const FAE_V5: V5FixedStatblock = {
  attrs: {
    forca: 2, destreza: 4, vigor: 3,
    carisma: 7, manipulacao: 5, autocontrole: 3, // Carisma 7 = sobre-humano (max sobe)
    inteligencia: 3, raciocinio: 4, determinacao: 4,
  },
  skills: { Ocultismo: 4, "Armas Brancas": 4, Etiqueta: 4, Liderança: 4, Performance: 4 },
  disciplines: [
    { name: "Celeridade", rating: 1 },
    { name: "Dominação", rating: 4 },
    { name: "Ofuscação", rating: 4 },
    { name: "Presença", rating: 5 },
  ],
  special:
    "Sofrem dano Agravado apenas por fogo e ferro frio. Podem criar ilusões poderosas: para penetrá-las, o oponente deve vencer uma disputa de Raciocínio (ou Determinação) + Auspícios contra a Manipulação + Raciocínio do feérico.",
};

const WRAITH_V5: V5FixedStatblock = {
  attrs: {
    forca: 4, destreza: 4, vigor: 4,
    carisma: 1, manipulacao: 3, autocontrole: 2,
    inteligencia: 3, raciocinio: 3, determinacao: 2,
  },
  skills: { Prontidão: 5, Ocultismo: 4, Furtividade: 5, Condução: 4 }, // Prontidão = Percepção
  disciplines: [
    { name: "Auspício", rating: 4 }, // = Auspícios
    { name: "Celeridade", rating: 2 },
    { name: "Dominação", rating: 2 },
    { name: "Ofuscação", rating: 2 },
  ],
  special:
    "Intocáveis a não ser que assumam uma forma concreta. Podem possuir mortais (mecânica igual à Disciplina Possessão), controlando-os com Manipulação + Condução. Arremessam objetos com Destreza + Briga. Só podem ser banidos ou destruídos por exorcismos ou magia negra.",
};

function seedFixedStatblockV5(sd: WodV5Data, block: V5FixedStatblock): void {
  // Atributos (o teto sobe para valores > 5, p.ex. Carisma 7 do Feérico).
  const attrs: Record<string, Trait> = { ...(sd.attributes ?? {}) };
  for (const [key, rating] of Object.entries(block.attrs)) {
    const t = attrs[key];
    if (t) attrs[key] = { ...t, rating, max: Math.max(5, rating) };
  }
  sd.attributes = attrs;
  // Perícias (por label V5; teto sobe se > 5 — aqui todas ≤ 5).
  const applySkill = (list: Trait[]): Trait[] =>
    list.map((t) => (block.skills[t.name] != null ? { ...t, rating: block.skills[t.name], max: Math.max(5, block.skills[t.name]) } : t));
  sd.skills = {
    fisicas: applySkill(sd.skills?.fisicas ?? []),
    sociais: applySkill(sd.skills?.sociais ?? []),
    mentais: applySkill(sd.skills?.mentais ?? []),
  };
  // Disciplinas (poderes simulados) com ícone V5.
  sd.disciplines = block.disciplines.map(({ name, rating }) => {
    const t = mkTrait(name, { rating, max: 5 });
    const icon = V5_DISCIPLINE_ICON_BY_NAME[name];
    if (icon) t.icon = icon;
    return t;
  });
  // Regras especiais → caixa "Regras Especiais" (sd.weakness).
  if (block.special && !sd.weakness) sd.weakness = block.special;
}

// Story 179/182/183/184/185/186 — wod-v5 reducer. Criaturas: Vampiro, Lobisomem, Mortal, Carniçal, Mago, Feérico, Espectro, Animal. NO combat
// (the V5 combat engine is a later story). Handles the platform character lifecycle
// events + the plugin-only systemData patch and shared chronicle. All sheet edits
// flow through WOD_V5_SYSTEM_DATA_PATCH / CHARACTER_UPDATED; the deployed projection
// package does not know wod-v5, so wodV5ProjectionFallback re-applies this reducer
// on the front (see src/lib/wodV5ProjectionFallback.ts).
export function reduceWodV5(state: SessionState, event: ActionEvent): SessionState {
  const { type, payload } = event;
  if (!payload) return state;
  const p = payload as any;

  // Cast to string: WOD_V5_* are plugin-only events not present in the platform
  // ActionEvent union; we deliberately keep them out of domain.ts to avoid leaking
  // plugin concerns into the platform.
  switch (type as string) {
    // ── Character lifecycle ──────────────────────────────────────────────────
    case "CHARACTER_CREATED": {
      // projections.ts runs the Fate legacy reducer first, which created a
      // Fate-shaped character. Rebuild from the V5 template, keep identity and
      // any V5-shaped systemData the creator supplied.
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

      let char = createWodV5Character(overrides);
      if (p.systemData && typeof p.systemData === "object") {
        char = ensureWodV5Data({ ...char, systemData: { ...char.systemData, ...p.systemData } });
      }
      // Story 180 — V5 (vampiro-only) creation seeds. Idempotente no replay (só preenche
      // vazios). A Humanidade inicial (7) e a Potência de Sangue (1) vêm do template; aqui
      // só semeamos as Disciplinas do clã (rating 0) quando há clã e nenhuma foi fornecida.
      const createdSd = (char as WodV5Character).systemData;
      const nextSd = { ...createdSd };
      // Story 183 — semeia disciplinas/Maldição do clã SÓ p/ Vampiro. O Carniçal (que também
      // tem clã) recebe sua única disciplina via seedGhoulV5; Mortal/Lobisomem não têm clã.
      const noDisc = !nextSd.disciplines || nextSd.disciplines.length === 0;
      if (nextSd.creature === "Vampiro" && nextSd.clan && noDisc) {
        const disciplines = buildV5ClanDisciplines(nextSd.clan);
        if (disciplines.length > 0) nextSd.disciplines = disciplines;
      }
      // Story 181 — semeia a Maldição do Clã (= fraqueza) na própria caixa editável quando
      // há clã e o campo está vazio. Idempotente; o jogador pode editar depois. Só Vampiro.
      if (nextSd.creature === "Vampiro" && nextSd.clan && !nextSd.clanBane) {
        const bane = getV5ClanWeakness(nextSd.clan);
        if (bane) nextSd.clanBane = bane;
      }
      // Story 182 — Lobisomem (V5): statblock fixo (atributos/perícias/disciplinas/garras).
      if (nextSd.creature === "Lobisomem") {
        seedWerewolfV5(nextSd);
      }
      // Story 183 — Mortal antagonista (pelo tipo escolhido) + Carniçal (statblock + 1 disc. do clã).
      if (nextSd.creature === "Mortal") {
        seedMortalV5(nextSd);
      }
      if (nextSd.creature === "Carniçal") {
        seedGhoulV5(nextSd);
      }
      // Story 184 — Mago: statblock fixo (atributos/perícias/disciplinas-poder). Sem recurso.
      if (nextSd.creature === "Mago") {
        seedMageV5(nextSd);
      }
      // Story 185 — Feérico/Espectro: statblocks fixos no molde do Mago. Sem recurso à parte.
      if (nextSd.creature === "Feérico") {
        seedFixedStatblockV5(nextSd, FAE_V5);
      }
      if (nextSd.creature === "Espectro") {
        seedFixedStatblockV5(nextSd, WRAITH_V5);
      }
      // Story 186 — Animal (lacaio/NPC): statblock "Parada Padrão" do subtipo escolhido.
      if (nextSd.creature === "Animal") {
        seedAnimalV5(nextSd);
      }
      // Story 188 — Arquétipo de NPC vampiro: sobrescreve atributos/perícias/disciplinas.
      // Roda APÓS a semente do clã (clanBane mantido; disciplines sobrescritas pelo arquétipo).
      if (nextSd.creature === "Vampiro" && nextSd.vampireNpcType) {
        seedVampireNpcV5(nextSd);
      }

      char = { ...char, systemData: nextSd } as WodV5Character;
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
      const changes = (p.changes ?? {}) as Partial<Character> & { systemData?: Partial<WodV5Data> };
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

    // ── Partial system-data patch (avoids oversized CHARACTER_UPDATED) ───────────
    case "WOD_V5_SYSTEM_DATA_PATCH": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const patchData = (p.patch ?? {}) as Partial<WodV5Data>;
      const currentSd = (char as WodV5Character).systemData ?? {};
      const nextSd: WodV5Data = { ...currentSd, ...patchData } as WodV5Data;
      return {
        ...state,
        characters: { ...state.characters, [p.characterId]: { ...char, systemData: nextSd } },
      };
    }

    // ── Chronicle (shared across the whole table; GM-only emit) ───────────────
    case "WOD_V5_CHRONICLE_UPDATED": {
      const text: string = p.text ?? "";
      const nextChars: Record<string, Character> = {};
      for (const [id, char] of Object.entries(state.characters)) {
        const ensured = ensureWodV5Data(char);
        nextChars[id] = {
          ...ensured,
          systemData: { ...ensured.systemData, chronicle: text },
        } as WodV5Character;
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

    // ── Story 192 — Combat part 1: initiative (store-only; order computed in the UI) ──
    case "WOD_V5_COMBAT_SETUP_SET": {
      if (p.reset) {
        const next = { ...(state as any) };
        delete next.wodV5Turn;
        return next as SessionState;
      }
      const prev = (state as any).wodV5Turn as WodV5TurnState | undefined;
      if (p.open) {
        const wt: WodV5TurnState = prev ?? {
          setupPhase: true, combatType: "simple", advancedInit: "traditional", slots: {}, advancedAttr: "autocontrole", advancedSkill: "Prontidão", order: [], manualOrdered: false,
        };
        return { ...state, wodV5Turn: { ...wt, setupPhase: true } } as any;
      }
      if (!prev) return state;
      return { ...state, wodV5Turn: { ...prev, setupPhase: false } } as any;
    }
    case "WOD_V5_COMBAT_TYPE_SET": {
      const prev = ensureWodV5Turn(state);
      const combatType = p.combatType === "advanced" ? "advanced" : "simple";
      return { ...state, wodV5Turn: { ...prev, combatType, manualOrdered: false } } as any;
    }
    case "WOD_V5_INITIATIVE_SLOT_SET": {
      const prev = ensureWodV5Turn(state);
      const slots = { ...prev.slots };
      if (p.slot == null) delete slots[p.characterId];
      else slots[p.characterId] = p.slot;
      return { ...state, wodV5Turn: { ...prev, slots, manualOrdered: false } } as any;
    }
    case "WOD_V5_INITIATIVE_TRAIT_SET": {
      const prev = ensureWodV5Turn(state);
      const next: WodV5TurnState = { ...prev, manualOrdered: false };
      if (typeof p.skill === "string" && p.skill) next.advancedSkill = p.skill;
      if (typeof p.attr === "string" && p.attr) next.advancedAttr = p.attr;
      return { ...state, wodV5Turn: next } as any;
    }
    case "WOD_V5_INITIATIVE_ORDER_SET": {
      const prev = ensureWodV5Turn(state);
      const order = Array.isArray(p.order) ? (p.order as string[]) : prev.order;
      return { ...state, wodV5Turn: { ...prev, order, manualOrdered: p.manual === true } } as any;
    }
    // Story 202 — ADVANCED sub-mode (Grupos | Tradicional). Recompute-unfreeze like the other setters.
    case "WOD_V5_ADVANCED_INIT_SET": {
      const prev = ensureWodV5Turn(state);
      const advancedInit = p.advancedInit === "groups" ? "groups" : "traditional";
      return { ...state, wodV5Turn: { ...prev, advancedInit, manualOrdered: false } } as any;
    }
    // Story 202 — transient "Passar a vez" snapshot (end of order for THIS round only). Store-only;
    // the tracker computes/restores. `null` clears the field.
    case "WOD_V5_TURN_PASS_SET": {
      const prev = ensureWodV5Turn(state);
      const passRound = p.passRound == null ? null : (Number(p.passRound) || 0);
      const roundBaseOrder = Array.isArray(p.roundBaseOrder) ? (p.roundBaseOrder as string[]) : null;
      return { ...state, wodV5Turn: { ...prev, passRound, roundBaseOrder } } as any;
    }

    // ── Story 193 — Combat part 2: attack & damage resolution (store-only) ────────
    // The reducer never computes the outcome; the UI (GM-authoritative) computes it and
    // syncs via WOD_V5_DAMAGE_RESOLUTION_OPENED. All cases are pure/idempotent (replay-safe).
    case "WOD_V5_ATTACK_DECLARED": {
      const prev = ensureWodV5Turn(state);
      const targetIds: string[] = Array.isArray(p.targetIds) ? p.targetIds.filter(Boolean) : [];
      if (targetIds.length === 0) return state;
      // FU6 — one duel per target. `penalty` = the multi-target dice cost (0,1,2… by order).
      // `bilateral` is per attacker↔target pair (UI ships `bilaterals[]`; falls back to the
      // single `bilateral` for the 1st target / legacy single-target declarations).
      const bilaterals: boolean[] = Array.isArray(p.bilaterals) ? p.bilaterals : [];
      // Story 196 (E4) — cumulative multi-DEFENDER penalty: each successive attack a defender
      // suffers THIS round costs them −1 defense die (0 vs the 1st attacker, 1 vs the 2nd…). The
      // per-round counter resets when the platform round changes; the per-target value is frozen
      // here so the defender's roller reads it deterministically (pure/replay-safe).
      const curRound: number = (state as any).currentRound ?? 1;
      const hits: Record<string, number> = prev.defenseHitsRound === curRound ? { ...(prev.defenseHitsThisRound ?? {}) } : {};
      // Story 196 (E3) — per-target ATTACKER successes from the dice-split. Multi-target ships
      // `attackerSuccessesByTarget` (the window rolled each subset); single-target uses the whole-pool
      // `attackerSuccesses`. The old `penalty` (−1 success/target) is GONE → kept 0 for back-compat.
      const byTarget: Record<string, number> = (p.attackerSuccessesByTarget && typeof p.attackerSuccessesByTarget === "object") ? p.attackerSuccessesByTarget : {};
      const diceByTarget: Record<string, number> = (p.attackerDiceByTarget && typeof p.attackerDiceByTarget === "object") ? p.attackerDiceByTarget : {};
      const targets: WodV5DuelTarget[] = targetIds.map((id, i) => {
        const defensePenalty = hits[id] ?? 0;
        hits[id] = defensePenalty + 1;
        const attackerSuccesses = id in byTarget
          ? (Number(byTarget[id]) || 0)
          : (targetIds.length === 1 ? (Number(p.attackerSuccesses) || 0) : null);
        return {
          defenderId: id,
          penalty: 0,
          attackerSuccesses,
          attackerDice: id in diceByTarget ? (Number(diceByTarget[id]) || 0) : undefined,
          defensePenalty,
          bilateral: typeof bilaterals[i] === "boolean" ? bilaterals[i] : !!p.bilateral,
          defenderSuccesses: null,
          defenderWeaponDmg: null,
          defenderWeaponType: null,
          defenderNote: null,
          status: "awaiting",
        };
      });
      const combatRes: WodV5CombatRes = {
        resolutionId: p.resolutionId,
        attackerId: p.attackerId,
        attackerSuccesses: Number(p.attackerSuccesses) || 0,
        attackerWeaponDmg: Number(p.attackerWeaponDmg) || 0,
        attackerWeaponType: p.attackerWeaponType === "A" ? "A" : "S",
        attackerNote: typeof p.attackerNote === "string" ? p.attackerNote : "",
        targets,
        phase: "active",
      };
      // Story 194 (E5) — first attack PROMOTES the attacker from "Corpo a corpo a iniciar"
      // (melee_starting) to "Corpo a corpo iniciado" (melee_engaged). Only that one transition;
      // ranged/other/already-engaged are untouched. Idempotent (a 2nd attack finds it engaged).
      // The GM-authoritative re-order effect in CombatTab observes this slot change and re-sorts
      // the live turn order.
      let nextSlots = prev.slots;
      if (prev.slots?.[p.attackerId] === "melee_starting") {
        nextSlots = { ...prev.slots, [p.attackerId]: "melee_engaged" };
      }
      return { ...state, wodV5Turn: { ...prev, slots: nextSlots, combatRes, defenseHitsThisRound: hits, defenseHitsRound: curRound } } as any;
    }
    case "WOD_V5_DEFENSE_ROLLED": {
      const prev = ensureWodV5Turn(state);
      const cr = prev.combatRes;
      if (!cr || cr.resolutionId !== p.resolutionId) return state;
      // Fill the matching target by id (defenders may roll in ANY order); ignore if already in.
      let hit = false;
      const targets = cr.targets.map((t) => {
        if (t.defenderId !== p.defenderId || t.status !== "awaiting") return t;
        hit = true;
        return {
          ...t,
          defenderSuccesses: Number(p.defenderSuccesses) || 0,
          defenderWeaponDmg: Number(p.defenderWeaponDmg) || 0,
          defenderWeaponType: p.defenderWeaponType === "A" ? "A" : ("S" as const),
          defenderNote: typeof p.defenderNote === "string" ? p.defenderNote : "",
          status: "rolled" as const,
        };
      });
      if (!hit) return state;
      const phase = targets.every((t) => t.status !== "awaiting") ? "resolved" : "active";
      return { ...state, wodV5Turn: { ...prev, combatRes: { ...cr, targets, phase } } } as any;
    }
    case "WOD_V5_DUEL_TARGET_AUTO": {
      // Pool 0 → the target can't defend: takes the hit, no roll (attacker difficulty becomes 1).
      const prev = ensureWodV5Turn(state);
      const cr = prev.combatRes;
      if (!cr || cr.resolutionId !== p.resolutionId) return state;
      let hit = false;
      const targets = cr.targets.map((t) => {
        if (t.defenderId !== p.defenderId || t.status !== "awaiting") return t;
        hit = true;
        return { ...t, defenderSuccesses: 0, defenderWeaponDmg: 0, defenderWeaponType: "S" as const, defenderNote: "sem defesa", status: "auto" as const };
      });
      if (!hit) return state;
      const phase = targets.every((t) => t.status !== "awaiting") ? "resolved" : "active";
      return { ...state, wodV5Turn: { ...prev, combatRes: { ...cr, targets, phase } } } as any;
    }
    case "WOD_V5_DAMAGE_RESOLUTION_OPENED": {
      const prev = ensureWodV5Turn(state);
      const incoming: WodV5DamageRes[] = Array.isArray(p.boxes) ? p.boxes : [];
      const queue = [...(prev.damageQueue ?? [])];
      for (const b of incoming) {
        if (!b || !b.resolutionId || !b.toId) continue;
        if (queue.some((q) => q.resolutionId === b.resolutionId && q.toId === b.toId)) continue; // dedupe (idempotent)
        queue.push(b);
      }
      // Mark THIS target resolved (outcome computed) so the GM effect won't re-fire; the duel
      // ceremony STAYS visible (combatRes lives until the GM closes it via WOD_V5_ATTACK_CLEARED
      // or a new attack overwrites it) so everyone keeps seeing the results.
      const cr = prev.combatRes;
      let nextCr: WodV5CombatRes | null = cr ?? null;
      if (cr && cr.resolutionId === p.resolutionId) {
        nextCr = { ...cr, targets: cr.targets.map((t) => (t.defenderId === p.defenderId ? { ...t, resolved: true } : t)) };
      }
      return { ...state, wodV5Turn: { ...prev, combatRes: nextCr, damageQueue: queue } } as any;
    }
    case "WOD_V5_DAMAGE_RESOLUTION_UPDATED": {
      const prev = ensureWodV5Turn(state);
      const queue = (prev.damageQueue ?? []).map((b) =>
        b.resolutionId === p.resolutionId && b.toId === p.toId ? { ...b, ...(p.patch ?? {}) } : b
      );
      return { ...state, wodV5Turn: { ...prev, damageQueue: queue } } as any;
    }
    case "WOD_V5_DAMAGE_RESOLUTION_CONFIRMED": {
      const prev = ensureWodV5Turn(state);
      const queue = (prev.damageQueue ?? []).filter((b) => !(b.resolutionId === p.resolutionId && b.toId === p.toId));
      let characters = state.characters;
      const target = state.characters[p.toId];
      if (target && Array.isArray(p.health)) {
        const sd = (target as WodV5Character).systemData ?? ({} as WodV5Data);
        const nextSd: WodV5Data = { ...sd, healthV5: p.health as V5Damage[] };
        characters = { ...state.characters, [p.toId]: { ...target, systemData: nextSd } as Character };
      }
      return { ...state, characters, wodV5Turn: { ...prev, damageQueue: queue } } as any;
    }
    case "WOD_V5_DAMAGE_RESOLUTION_CANCELLED": {
      const prev = ensureWodV5Turn(state);
      const queue = (prev.damageQueue ?? []).filter((b) => !(b.resolutionId === p.resolutionId && b.toId === p.toId));
      return { ...state, wodV5Turn: { ...prev, damageQueue: queue } } as any;
    }
    case "WOD_V5_ATTACK_CLEARED": {
      const prev = ensureWodV5Turn(state);
      if (prev.combatRes && prev.combatRes.resolutionId !== p.resolutionId) return state;
      return { ...state, wodV5Turn: { ...prev, combatRes: null } } as any;
    }

    default:
      return state;
  }
}

// Story 192 — fall back to a fresh wodV5Turn when an initiative event arrives before
// the setup-open event (e.g. on replay). Keeps the reducer pure/idempotent.
function ensureWodV5Turn(state: SessionState): WodV5TurnState {
  const wt = (state as any).wodV5Turn as WodV5TurnState | undefined;
  if (!wt) return { setupPhase: false, combatType: "simple", advancedInit: "traditional", slots: {}, advancedAttr: "autocontrole", advancedSkill: "Prontidão", order: [], manualOrdered: false };
  // Backfill advancedAttr / advancedInit (Story 202) for turn states created before they existed.
  if (wt.advancedAttr && wt.advancedInit) return wt;
  return { ...wt, advancedAttr: wt.advancedAttr || "autocontrole", advancedInit: wt.advancedInit || "traditional" };
}
