import type { Character } from "../../types";

// ─────────────────────────────────────────────────────────────────────────────
// Story 141 — "Mundo das Trevas - V20" (Vampire: The Masquerade 20th Anniversary)
// Pure Storyteller-system sheet. No Fate mechanics. All data lives in systemData.
// Code identifiers in English; user-facing strings in pt-BR.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Story 144 — NPC types ───────────────────────────────────────────────────
export type WodNpcTier = "lacaio" | "antagonista";

export type WodCombatLineRow = {
  id: string;
  label: string;       // "Iniciativa", "Absorção", "Briga", "Esquiva" …
  pool?: number;       // derived dice pool
  poolOverride?: number; // GM pin — wins over derived when set
  detail?: string;     // "dano Força+1 (letal)", "Vigor+Fortitude+armadura" …
};

export type WodNpcData = {
  tier: WodNpcTier;
  quantity?: number;         // squad size for Lacaio ("×N idênticos"); default 1
  tactics?: string;          // GM-only: como luta / quando foge
  motivation?: string;       // GM-only
  trueNature?: string;       // GM-only: verdadeira natureza
  secretWeakness?: string;   // GM-only: fraqueza secreta
  combatLine?: WodCombatLineRow[];
  combatLineManual?: boolean; // GM froze the line (stop re-deriving)
  soakAggravated?: boolean;  // can soak aggravated damage
};

// Capability map — which blocks a creature type has.
// npcReady: false ⇒ "(em breve)" in the NPC creator picker.
export type WodCreatureCaps = {
  npcReady: boolean;
  generation: boolean;
  clan: boolean;
  sect: boolean;
  bloodPool: boolean;
  disciplines: boolean;
  vampiricHumanity: boolean;
  // Story 166 — Fé (True Faith) tracker. Mortal (e Demônio, story 174).
  faith: boolean;
  // Story 170 — Lobisomem/Abominação: trilha de Gnose (laranja/espiral) no lugar
  // (ou além) do sangue; e forma de batalha (botão de lobo + 2ª foto + Crinos).
  gnose: boolean;
  shapeshift: boolean;
  // Story 171 — Mago: trilha de Quintessência (azul/triângulo invertido) no lugar do sangue.
  quintessence: boolean;
  // Story 172 — Fada: trilha de Glamour (espiral roxa) no lugar do sangue.
  glamour: boolean;
  // Story 173 — Aparição: trilha de Paixão (coração esverdeado) no lugar do sangue.
  passion: boolean;
  startingBlood?: "full" | "small" | "none";
};

export const CREATURE_CAPS: Record<string, WodCreatureCaps> = {
  Vampiro:  { npcReady: true,  generation: true,  clan: true,  sect: true,  bloodPool: true,  disciplines: true,  vampiricHumanity: true,  faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false, startingBlood: "full"  },
  Mortal:   { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: false, vampiricHumanity: false, faith: true,  gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false, startingBlood: "none"  },
  // Story 183 (wod-v5) — Carniçal antagonista: escolhe clã/seita e tem 1 Disciplina do clã,
  // MAS sem trilha de sangue (V5 não tem Fome/Potência p/ ghoul). clan/sect = true; bloodPool = false.
  Carniçal: { npcReady: true,  generation: false, clan: true,  sect: true,  bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false, startingBlood: "none" },
  // Story 170 — Lobisomem (Lupino): usa Gnose no lugar do sangue, sem clã/geração, e
  // tem forma de batalha (Crinos). Abominação: lobisomem Abraçado — escolhe clã/seita/
  // geração (disciplinas do clã a 0, SEM fraqueza) + statblock do garou + Gnose + sangue.
  Lobisomem: { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: true,  shapeshift: true,  quintessence: false, glamour: false, passion: false },
  Abominação:{ npcReady: true,  generation: true,  clan: true,  sect: true,  bloodPool: true,  disciplines: true,  vampiricHumanity: false, faith: false, gnose: true,  shapeshift: true,  quintessence: false, glamour: false, passion: false, startingBlood: "full" },
  // Story 184 (wod-v5) — Mago: SEM recurso à parte (o V5 do dono não usa Quintessência; os
  // feitiços são simulados por altos níveis de Disciplinas). Sem clã/geração/seita/transformação/
  // sangue. Saúde/Vontade DERIVAM dos atributos. quintessence=false (nada renderiza no V5).
  Mago:     { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false },
  // Story 172 — Fada (Changeling): usa Glamour (espiral roxa) no lugar do sangue, sem clã/
  // geração/seita, sem transformação. Humanidade e Vontade manuais (do statblock).
  Fada:     { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: true,  passion: false },
  // Story 173 — Aparição: usa Paixão (coração esverdeado) no lugar do sangue, sem clã/
  // geração/seita, sem transformação. Humanidade e Vontade manuais (do statblock).
  Aparição: { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: true  },
  // Story 174 — Demônio: usa Fé (reusa caps.faith + faithRating do Mortal — rating único 0..10)
  // no lugar do sangue, sem clã/geração/seita, sem transformação. Humanidade e Vontade manuais
  // (do statblock); "Disciplinas Equivalentes" com pontos.
  Demônio:  { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: true,  gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false },
  // Story 175 — Customizado: ficha desenhada pelo Mestre. Caps FIXOS (sem clã/geração/seita/
  // transformação; tem disciplinas; moralidade manual; sem recurso embutido). O recurso de poder
  // é um descritor próprio (sd.customResource), não um cap.
  Customizado: { npcReady: true, generation: false, clan: false, sect: false, bloodPool: false, disciplines: true, vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false },
  // Story 185 (wod-v5) — Feérico (Fae) e Espectro (Wraith): statblocks fixos no molde do Mago.
  // SEM recurso à parte (NÃO reusam os caps legados Fada/Aparição com glamour/passion — os poderes
  // são simulados por altas Disciplinas). Sem clã/geração/seita/transformação/sangue/Fé.
  // Saúde/Vontade DERIVAM dos atributos. Regras especiais vão em sd.weakness ("Regras Especiais").
  Feérico:  { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false },
  Espectro: { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: true,  vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false },
  // Story 186 (wod-v5) — Animal (bestas): LACAIO-ONLY / NPC-ONLY. Statblock "Parada Padrão" V5
  // (igual ao Mortal antagonista). SEM sangue/clã/geração/seita/Fé/disciplinas/recurso. A
  // Humanidade é ocultada na UI p/ Animal (WodStatusBlock) — uma besta não tem Humanidade.
  Animal:   { npcReady: true,  generation: false, clan: false, sect: false, bloodPool: false, disciplines: false, vampiricHumanity: false, faith: false, gnose: false, shapeshift: false, quintessence: false, glamour: false, passion: false },
};

export function getCreatureCaps(creature?: string): WodCreatureCaps {
  return CREATURE_CAPS[creature ?? "Vampiro"] ?? CREATURE_CAPS.Vampiro;
}

// Story 175 (follow-up) — caps EFETIVOS da criatura na UI da FICHA/CARD. Para "Customizado",
// o GM pode habilitar Geração e/ou Clã na criação (sd.customHasGeneration / sd.customHasClan);
// esses overrides valem APENAS para o gating de exibição (ficha, cabeçalho, card de combate).
// O reducer continua lendo os caps FIXOS de CREATURE_CAPS, então o Customizado NUNCA semeia
// disciplinas/fraqueza de clã nem reserva de sangue por causa desses toggles.
export function getEffectiveCaps(sd: { creature?: string; customHasGeneration?: boolean; customHasClan?: boolean; customHasSect?: boolean }): WodCreatureCaps {
  const base = getCreatureCaps(sd.creature);
  if (sd.creature !== "Customizado") return base;
  return { ...base, generation: !!sd.customHasGeneration, clan: !!sd.customHasClan, sect: !!sd.customHasSect };
}

// Story 176 (follow-up) — a edição ESTRUTURAL do Customizado (lápis AZUIS: renomear rótulos/
// atributos/habilidades/títulos, definir o recurso de poder, criar disciplinas, virtudes) só é
// permitida enquanto a criatura é um RASCUNHO em desenho (customFinalized falso) OU é o MODELO
// no bestiário (source "bestiary" — editável pelo lápis na criação). Fichas/cópias finalizadas
// em jogo ficam TRAVADAS: jogam como qualquer criatura (só valores/notas, sem alterar a estrutura),
// para não correr o risco de mudar a estrutura da criatura inteira sem querer.
export function isCustomStructEditable(character: {
  source?: string | null;
  systemData?: { creature?: string; customFinalized?: boolean } | null;
}): boolean {
  const sd = character.systemData;
  if (!sd || sd.creature !== "Customizado") return false;
  return !sd.customFinalized || character.source === "bestiary";
}

// Starting powers seeded at NPC creation for non-vampire creatures.
export const CREATURE_STARTING_POWERS: Record<string, { discipline: string; rating: number }[]> = {
  Carniçal: [{ discipline: "Potência", rating: 1 }],
};

// ─── Story 164 — Revenant families (ghoul bloodlines bred by Sabbat clans) ────
// A revenant (Carniçal + a chosen family ≠ "Nenhum") takes the family's disciplines
// AND weakness, IGNORING the clan-of-origin. Discipline names MUST match
// CLAN_DISCIPLINES / DISCIPLINE_ICON_BY_NAME (Celerity = "Rapidez"). The weakness is
// synthesized to ONE short sentence, matching CLAN_WEAKNESS's terse style.
export const REVENANT_FAMILIES: { name: string; disciplines: string[]; weakness: string }[] = [
  { name: "Bratovitch", disciplines: ["Animalismo", "Fortitude", "Vicissitude"],
    weakness: "+2 de dificuldade para resistir ao frenesi; não lidam bem com mortais." },
  { name: "Ducheski",   disciplines: ["Auspícios", "Dominação", "Taumaturgia"],
    weakness: "Nenhuma Característica Social pode passar de 2." },
  { name: "Grimaldi",   disciplines: ["Rapidez", "Dominação", "Fortitude"],
    weakness: "Após a puberdade, sofrem Laço de Sangue com o Sabá (Bispo ou acima)." },
  { name: "Obertus",    disciplines: ["Auspícios", "Ofuscação", "Vicissitude"],
    weakness: "Propensos a distúrbios psicológicos; quase sempre sofrem de TOC." },
  { name: "Oprichniki", disciplines: ["Animalismo", "Ofuscação", "Vicissitude"],
    weakness: "Sempre Assombrados (Defeito Sobrenatural de 3 pontos); livrar-se de um fantasma só atrai outro." },
  { name: "Zantosa",    disciplines: ["Auspícios", "Presença", "Vicissitude"],
    weakness: "Fracos contra a tentação: testam Vontade diante do prazer intenso ou viciam-se, e não gastam Vontade para resistir a poderes que os atraem ao prazer." },
];

export const REVENANT_FAMILY_NAMES: string[] = REVENANT_FAMILIES.map((f) => f.name);

export function getRevenantFamily(name?: string): { name: string; disciplines: string[]; weakness: string } | null {
  return REVENANT_FAMILIES.find((f) => f.name === name) ?? null;
}

// Story 164 — pre-filled NPC Carniçal (antagonist) statblock. Attributes keyed by
// ATTRIBUTE_GROUPS key; abilities keyed by their pt-BR label (must exist in
// TALENTS/SKILLS/KNOWLEDGES). Disciplines (Potência 1 + clan/family) are seeded by
// the reducer's discipline tree, NOT here.
export const NPC_GHOUL_STATBLOCK = {
  attributes: {
    forca: 4, destreza: 3, vigor: 3,
    carisma: 3, manipulacao: 4, aparencia: 1,
    percepcao: 2, inteligencia: 2, raciocinio: 3,
  } as Record<string, number>,
  talentos:     { "Briga": 3, "Esportes": 3, "Prontidão": 2, "Manha": 3, "Lábia": 2, "Intimidação": 3 } as Record<string, number>,
  // "Segurança" (Security) → "Furto" (Larceny): no Security skill exists in V20.
  pericias:     { "Armas de Fogo": 3, "Armas Brancas": 2, "Condução": 2, "Furto": 3, "Furtividade": 2 } as Record<string, number>,
  conhecimentos:{ "Finanças": 2, "Ocultismo": 1 } as Record<string, number>,
  virtues:      { consciencia: 3, autocontrole: 3, coragem: 4 }, // Humanidade derivada = 6
  willpowerPermanent: 6,
  bloodOverride: 3, // vitae reserve (2–3 pts)
};

// ─── Story 166 — Mortal base archetypes ──────────────────────────────────────
// Picking a base type at creation pre-fills the sheet (PC and NPC). Attributes by
// ATTRIBUTE_GROUPS key; abilities by their pt-BR label (must exist in TALENTS/
// SKILLS/KNOWLEDGES — "Segurança" maps to "Furto"/Larceny). Weapons/armor use the
// V20 stats the user supplied; non-weapon gear becomes plain inventory rows.
// Seed ids are DETERMINISTIC so CHARACTER_CREATED stays idempotent on replay.
export type MortalArchetype = {
  attributes: Record<string, number>;
  talentos: Record<string, number>;
  pericias: Record<string, number>;
  conhecimentos: Record<string, number>;
  // Virtudes deliberadas. A Humanidade é DERIVADA delas no reducer (RAW: Consciência +
  // Autocontrole), por isso não há campo humanity aqui — escolha consciencia/autocontrole
  // de modo que a soma seja a Humanidade pretendida.
  virtues: { consciencia: number; autocontrole: number; coragem: number };
  willpowerPermanent: number;
  weapons: { id: string; name: string; damage: string; diff: string; damageType: "B" | "L" | "A"; conceal?: string }[];
  armor: { id: string; name: string; rating: string; penalty: string; description: string; affectedTrait?: string }[];
  inventory: string[];
  // Story 167 — arquétipo que usa a Regra de Figurantes (vitalidade de 4 níveis) marca
  // "figurante"; ausente = vitalidade padrão de 7 níveis.
  healthProfile?: HealthProfile;
};

export const MORTAL_ARCHETYPES: Record<string, MortalArchetype> = {
  "Inquisidor": {
    attributes: { forca: 2, destreza: 3, vigor: 3, carisma: 4, manipulacao: 3, aparencia: 2, percepcao: 3, inteligencia: 3, raciocinio: 3 },
    talentos:     { "Prontidão": 2, "Esportes": 2, "Briga": 2, "Expressão": 2, "Liderança": 3 },
    pericias:     { "Condução": 1, "Armas Brancas": 3, "Furtividade": 2 },
    conhecimentos:{ "Acadêmicos": 3, "Ocultismo": 3 },
    virtues: { consciencia: 4, autocontrole: 3, coragem: 4 }, // Humanidade 7
    willpowerPermanent: 9,
    weapons: [
      { id: "mortal-wpn-bengala", name: "Bengala-espada", damage: "Força +3", diff: "5", damageType: "L" },
      { id: "mortal-wpn-estaca",  name: "Estaca (madeira)", damage: "Força +1", diff: "4", damageType: "B" },
    ],
    armor: [],
    inventory: ["Rosários", "Crucifixo", "Bíblia", "Maçarico"],
  },
  "Agente do Governo": {
    attributes: { forca: 3, destreza: 2, vigor: 3, carisma: 2, manipulacao: 3, aparencia: 2, percepcao: 3, inteligencia: 3, raciocinio: 3 },
    talentos:     { "Prontidão": 3, "Esportes": 3, "Briga": 3 },
    pericias:     { "Condução": 3, "Armas de Fogo": 3, "Armas Brancas": 2, "Furtividade": 2 },
    conhecimentos:{ "Computador": 1, "Investigação": 4, "Ocultismo": 1, "Política": 2 },
    virtues: { consciencia: 3, autocontrole: 4, coragem: 3 }, // Humanidade 7
    willpowerPermanent: 7,
    weapons: [
      { id: "mortal-wpn-pistola", name: "Pistola pesada", damage: "5", diff: "7", damageType: "L", conceal: "P" },
    ],
    armor: [],
    inventory: ["Terno preto", "Óculos escuros", "Distintivo e cartão de identificação", "Instrumentos eletrônicos de vigilância"],
  },
  "Erudito Arcano": {
    attributes: { forca: 2, destreza: 2, vigor: 2, carisma: 2, manipulacao: 2, aparencia: 2, percepcao: 4, inteligencia: 4, raciocinio: 3 },
    talentos:     { "Esportes": 1, "Expressão": 2 },
    pericias:     { "Condução": 1, "Etiqueta": 2, "Armas Brancas": 1 },
    conhecimentos:{ "Acadêmicos": 4, "Computador": 3, "Investigação": 3, "Ocultismo": 4, "Ciência": 3 },
    virtues: { consciencia: 4, autocontrole: 4, coragem: 2 }, // Humanidade 8
    willpowerPermanent: 7,
    weapons: [],
    armor: [],
    inventory: ["Laptop ou tablet", "Biblioteca completa", "Automóvel", "Coleção de parafernália ocultista", "Conta bancária elevada"],
  },
  "Chefão/Bandido": {
    attributes: { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 4, aparencia: 1, percepcao: 2, inteligencia: 2, raciocinio: 3 },
    talentos:     { "Prontidão": 2, "Briga": 3, "Esportes": 3, "Manha": 3, "Lábia": 2 },
    pericias:     { "Condução": 2, "Armas de Fogo": 3, "Armas Brancas": 2, "Furto": 3, "Furtividade": 2 }, // Segurança → Furto
    conhecimentos:{ "Finanças": 2 },
    virtues: { consciencia: 2, autocontrole: 4, coragem: 4 }, // Humanidade 6
    willpowerPermanent: 6,
    weapons: [
      { id: "mortal-wpn-smg",  name: "SMG (submetralhadora)", damage: "4", diff: "7", damageType: "L", conceal: "J" },
      { id: "mortal-wpn-faca", name: "Faca", damage: "Força +1", diff: "4", damageType: "L", conceal: "B" },
    ],
    armor: [
      { id: "mortal-arm-colete", name: "Colete à prova de balas", rating: "4", penalty: "2", description: "Armadura Classe Quatro (+4 dados de absorção; −2 em paradas de Destreza).", affectedTrait: "Destreza" },
    ],
    inventory: ["Carro de médio porte", "Cópia digital de operações detalhadas"],
  },
  // Story 167 — Cidadão Comum / Pedestre. Mortal sem nome (estudante, balconista,
  // trabalhador de escritório): atributos na média humana (tudo 2), 1-2 pontos em
  // perícias cotidianas, Humanidade 7, Vontade baixa. Usa a Regra de Figurantes:
  // vitalidade reduzida a 4 níveis (Machucado −1, Mutilado −3, Incapacitado, Morto).
  "Comum": {
    attributes: { forca: 2, destreza: 2, vigor: 2, carisma: 2, manipulacao: 2, aparencia: 2, percepcao: 2, inteligencia: 2, raciocinio: 2 },
    talentos:     { "Prontidão": 1, "Empatia": 1, "Esportes": 1 },
    pericias:     { "Condução": 1, "Ofícios": 2 },
    conhecimentos:{ "Computador": 1, "Acadêmicos": 1 },
    virtues: { consciencia: 4, autocontrole: 3, coragem: 2 }, // Humanidade 7
    willpowerPermanent: 3,
    weapons: [],
    armor: [],
    inventory: [],
    healthProfile: "figurante",
  },
};

export const MORTAL_ARCHETYPE_NAMES: string[] = Object.keys(MORTAL_ARCHETYPES);

export function getMortalArchetype(name?: string): MortalArchetype | null {
  return name ? (MORTAL_ARCHETYPES[name] ?? null) : null;
}

// ─── Story 170 — Werewolf (Lupino) base statblocks ───────────────────────────
// Os blocos de ANTAGONISTA Lobisomem do livro de Vampiro V20 (sobre o chassi comum).
// COMPARTILHADOS pelo Lobisomem E pela Abominação (lobisomem Abraçado como vampiro):
// escolher um tipo na criação pré-preenche atributos, habilidades, Disciplinas
// Equivalentes, Humanidade (manual), Vontade (manual) e Gnose. Atributos por KEY de
// ATTRIBUTE_GROUPS; habilidades por LABEL pt-BR (devem existir em TALENTS/SKILLS/
// KNOWLEDGES — "Acuidade" mapeia para "Vigilância"). Disciplinas com NOME batendo
// DISCIPLINE_ICON_BY_NAME. O Ancião cita "uma outra Disciplina 4": ela NÃO é listada
// aqui — é SORTEADA na criação (rating 4) a partir das disciplinas COMUNS (ver
// COMMON_DISCIPLINE_NAMES + elderDisciplineRoll no reducer).
export type WerewolfArchetype = {
  attributes: Record<string, number>;
  talentos: Record<string, number>;
  pericias: Record<string, number>;
  conhecimentos: Record<string, number>;
  disciplines: { name: string; rating: number }[];
  humanity: number;            // fixada (manual) — não derivada das virtudes
  willpowerPermanent: number;  // deliberada (manual)
  gnose: number;               // ponto de Gnose (define o máximo da trilha)
};

export const WEREWOLF_ARCHETYPES: Record<string, WerewolfArchetype> = {
  "Adolescente": {
    attributes: { forca: 3, destreza: 3, vigor: 3, carisma: 2, manipulacao: 2, aparencia: 2, percepcao: 3, inteligencia: 2, raciocinio: 3 },
    talentos:     { "Prontidão": 3, "Esportes": 2, "Briga": 3, "Vigilância": 2, "Intimidação": 3, "Liderança": 1 }, // Acuidade → Vigilância
    pericias:     { "Empatia com Animais": 2, "Ofícios": 2, "Armas de Fogo": 2, "Armas Brancas": 2, "Furtividade": 3, "Sobrevivência": 3 },
    conhecimentos:{ "Acadêmicos": 1, "Investigação": 2, "Ocultismo": 1 },
    disciplines: [ { name: "Rapidez", rating: 3 }, { name: "Potência", rating: 1 }, { name: "Metamorfose", rating: 4 } ],
    humanity: 7, willpowerPermanent: 5, gnose: 4,
  },
  "Veterano": {
    attributes: { forca: 4, destreza: 4, vigor: 4, carisma: 3, manipulacao: 2, aparencia: 3, percepcao: 4, inteligencia: 3, raciocinio: 4 },
    talentos:     { "Prontidão": 3, "Esportes": 2, "Briga": 4, "Vigilância": 3, "Expressão": 1, "Intimidação": 3, "Liderança": 1 },
    pericias:     { "Empatia com Animais": 3, "Ofícios": 2, "Armas de Fogo": 2, "Armas Brancas": 3, "Furtividade": 3, "Sobrevivência": 4 },
    conhecimentos:{ "Acadêmicos": 1, "Investigação": 2, "Medicina": 1, "Ocultismo": 3 },
    disciplines: [ { name: "Rapidez", rating: 4 }, { name: "Potência", rating: 2 }, { name: "Metamorfose", rating: 4 } ],
    humanity: 6, willpowerPermanent: 7, gnose: 6,
  },
  "Ancião": {
    attributes: { forca: 5, destreza: 4, vigor: 5, carisma: 5, manipulacao: 3, aparencia: 3, percepcao: 5, inteligencia: 3, raciocinio: 4 },
    talentos:     { "Prontidão": 4, "Esportes": 4, "Briga": 5, "Vigilância": 3, "Expressão": 3, "Intimidação": 4, "Liderança": 4 },
    pericias:     { "Empatia com Animais": 4, "Ofícios": 2, "Armas de Fogo": 2, "Armas Brancas": 5, "Furtividade": 4, "Sobrevivência": 5 },
    conhecimentos:{ "Acadêmicos": 1, "Investigação": 2, "Medicina": 1, "Ocultismo": 4 },
    disciplines: [
      { name: "Rapidez", rating: 5 }, { name: "Dominação", rating: 2 }, { name: "Fortitude", rating: 2 },
      { name: "Ofuscação", rating: 3 }, { name: "Potência", rating: 3 }, { name: "Metamorfose", rating: 4 },
    ],
    humanity: 5, willpowerPermanent: 9, gnose: 8,
  },
};

export const WEREWOLF_ARCHETYPE_NAMES: string[] = Object.keys(WEREWOLF_ARCHETYPES);

export function getWerewolfArchetype(name?: string): WerewolfArchetype | null {
  return name ? (WEREWOLF_ARCHETYPES[name] ?? null) : null;
}

// ─── Story 171 — Mago (Mage) base archetypes ──────────────────────────────────
// Picking a base type at creation pre-fills the sheet (PC and NPC), mixing the Mortal
// pattern (attributes/abilities/weapons/armor/inventory) with the Werewolf pattern
// (disciplines WITH ratings + manual Humanidade/Vontade). Quintessência REPLACES the
// blood track (caps.quintessence). Attributes by ATTRIBUTE_GROUPS key; abilities by their
// pt-BR label (must exist in TALENTS/SKILLS/KNOWLEDGES — "Acuidade" → Vigilância,
// "Roubo" → Furto). "Disciplinas Equivalentes" use real V20 discipline names (icon when
// known). Humanidade/Vontade/Quintessência are deliberate statblock values. Weapons/armor
// use the V20 stats; utility/ritual/social/vehicle gear becomes inventory rows with a short
// effect note. `note` (Abominação Tecnológica only) is seeded into sd.weakness. Seed ids are
// DETERMINISTIC so CHARACTER_CREATED stays idempotent on replay. The `weapons[].note`
// (special maneuvers) is documentation only — the Weapon type has no field for it, so the
// reducer drops it when seeding (see story 171).
export type MageArchetype = {
  attributes: Record<string, number>;
  talentos: Record<string, number>;
  pericias: Record<string, number>;
  conhecimentos: Record<string, number>;
  disciplines: { name: string; rating: number }[];
  humanity: number;            // fixada (manual) — magos não derivam das virtudes
  willpowerPermanent: number;  // deliberada (manual); magos costumam ter Vontade alta
  quintessence: number;        // ponto de Quintessência (define o máximo da trilha)
  weapons: { id: string; name: string; damage: string; diff: string; range: string; rate: string; clip: string; conceal: string; damageType: "B" | "L" | "A"; note?: string }[];
  armor: { id: string; name: string; rating: string; penalty: string; description: string; affectedTrait?: string }[];
  inventory: { name: string; description?: string }[];
  note?: string;               // texto pt-BR de regra especial → semeado em sd.weakness
};

export const MAGE_ARCHETYPES: Record<string, MageArchetype> = {
  "Praticante Jovem": {
    attributes: { forca: 3, destreza: 3, vigor: 3, carisma: 3, manipulacao: 4, aparencia: 3, percepcao: 2, inteligencia: 4, raciocinio: 4 },
    talentos:     { "Prontidão": 3, "Esportes": 2, "Vigilância": 3, "Briga": 2, "Empatia": 2, "Intimidação": 2, "Manha": 3, "Lábia": 3 }, // Acuidade → Vigilância
    pericias:     { "Condução": 2, "Armas de Fogo": 3, "Armas Brancas": 2 },
    conhecimentos:{ "Acadêmicos": 2, "Ocultismo": 4 },
    disciplines: [ { name: "Auspícios", rating: 2 }, { name: "Dominação", rating: 2 }, { name: "Presença", rating: 1 }, { name: "Metamorfose", rating: 1 }, { name: "Taumaturgia", rating: 3 } ],
    humanity: 7, willpowerPermanent: 5, quintessence: 10,
    weapons: [
      { id: "mage-wpn-faca", name: "Faca", damage: "Força +1", diff: "4", range: "—", rate: "—", clip: "—", conceal: "J", damageType: "L", note: "Ataque Duplo: divide a parada p/ 2 ataques no mesmo alvo (+1 dado cada, dif. 5 em ambos)." },
      { id: "mage-wpn-pistola-leve", name: "Pistola leve (9mm)", damage: "4", diff: "4", range: "20 m", rate: "4", clip: "15+1", conceal: "P", damageType: "L", note: "Armas de fogo: dano Letal vs magos/mortais; contusão vs vampiros (exceto na cabeça, dif. 8)." },
    ],
    armor: [],
    inventory: [
      { name: "Instrumentos rituais (velas, cordas, giz, cálice)", description: "Focos p/ reduzir a dificuldade de Raciocínio + Ocultismo ao lançar feitiços." },
      { name: "Roupas intimidantes", description: "-1 de dificuldade em Intimidação contra capangas, carniçais e submundo mais fraco." },
    ],
  },
  "Alto Mago": {
    attributes: { forca: 2, destreza: 2, vigor: 2, carisma: 3, manipulacao: 5, aparencia: 2, percepcao: 4, inteligencia: 4, raciocinio: 4 },
    talentos:     { "Prontidão": 3, "Esportes": 2, "Vigilância": 4, "Empatia": 4, "Intimidação": 4, "Liderança": 2, "Lábia": 3 }, // Acuidade → Vigilância
    pericias:     { "Condução": 1, "Etiqueta": 3, "Armas de Fogo": 1 },
    conhecimentos:{ "Acadêmicos": 5, "Finanças": 2, "Investigação": 3, "Medicina": 2, "Ocultismo": 5 },
    disciplines: [ { name: "Auspícios", rating: 4 }, { name: "Quimerismo", rating: 3 }, { name: "Dominação", rating: 2 }, { name: "Fortitude", rating: 2 }, { name: "Ofuscação", rating: 4 }, { name: "Presença", rating: 3 }, { name: "Taumaturgia", rating: 5 } ],
    humanity: 5, willpowerPermanent: 9, quintessence: 12,
    weapons: [
      { id: "mage-wpn-espada-bengala", name: "Espada-bengala", damage: "Força +3", diff: "5", range: "—", rate: "—", clip: "—", conceal: "T", damageType: "L", note: "Escondida na bengala (dif. extra p/ notar que é arma). Estocada: golpe a até 4 m, dif. 7, dano Força +4." },
    ],
    armor: [],
    inventory: [
      { name: "Santuário", description: "Espaço protegido para realizar rituais." },
      { name: "Ampla biblioteca de ocultismo", description: "Simula a Qualidade Biblioteca de Ocultismo: -dif. p/ decifrar símbolos antigos, rastrear maldições e achar nomes verdadeiros; ações prolongadas de Investigação." },
      { name: "Instrumentos para rituais (livros, lâminas, giz, velas, poções, incenso)", description: "Focos de magia." },
      { name: "Roupas sob medida", description: "-1 de dificuldade em Lábia/Etiqueta em ambientes sociais de elite (leilões ocultistas, jantares da Camarilla, tribunais)." },
    ],
  },
  "Abominação Tecnológica": {
    attributes: { forca: 5, destreza: 4, vigor: 5, carisma: 2, manipulacao: 2, aparencia: 2, percepcao: 4, inteligencia: 3, raciocinio: 4 },
    talentos:     { "Prontidão": 3, "Esportes": 3, "Vigilância": 4, "Briga": 3, "Intimidação": 4, "Manha": 2 }, // Acuidade → Vigilância
    pericias:     { "Condução": 3, "Armas de Fogo": 4, "Furto": 5, "Armas Brancas": 3, "Furtividade": 2 }, // Roubo → Furto
    conhecimentos:{ "Computador": 4, "Investigação": 4, "Direito": 2, "Ocultismo": 4, "Ciência": 3, "Tecnologia": 4 },
    disciplines: [ { name: "Auspícios", rating: 2 }, { name: "Dominação", rating: 2 }, { name: "Fortitude", rating: 4 }, { name: "Potência", rating: 3 }, { name: "Presença", rating: 3 } ],
    humanity: 3, willpowerPermanent: 8, quintessence: 10,
    weapons: [
      { id: "mage-wpn-smg", name: "Submetralhadora (MP-5/Uzi)", damage: "4", diff: "4", range: "—", rate: "—", clip: "30", conceal: "T", damageType: "L", note: "Disparos automáticos: +10 dados, dif. +2, sucessos extras viram dano. Efeito mangueira: área de 3 m, +10 dados, dif. +2, divide os sucessos pelos alvos." },
    ],
    armor: [
      { id: "mage-arm-tatico", name: "Colete tático (Classe Quatro)", rating: "4", penalty: "2", description: "Armadura Classe Quatro (+4 dados de absorção; −2 em paradas de Destreza).", affectedTrait: "Destreza" },
    ],
    inventory: [
      { name: "Supercomputador disfarçado de smartphone", description: "Permite testes de Inteligência/Raciocínio + Computador e Pirataria a qualquer momento; desligar alarmes e quebrar segurança remotamente." },
      { name: "Sedan preto blindado", description: "Vidro à prova de balas e lataria espessa: cobertura quase total (+2 ou mais na dificuldade de atacantes externos)." },
      { name: "Casaco preto", description: "" },
      { name: "Óculos de sol espelhados", description: "-1 de dificuldade defensiva contra Dominação (esconde o olhar); protege de luzes cegantes/granadas de luz." },
    ],
    note: "Sangue venenoso: cada ponto de sangue desta Abominação Tecnológica bebido por um vampiro causa 1 nível de dano agravado.",
  },
};

export const MAGE_ARCHETYPE_NAMES: string[] = Object.keys(MAGE_ARCHETYPES);
export function getMageArchetype(name?: string): MageArchetype | null {
  return name ? (MAGE_ARCHETYPES[name] ?? null) : null;
}

// Story 171 — Quintessência track/array cap. Statblocks reach 12 (Alto Mago); GnoseTrack/
// WillpowerTrack clamp at 10, so Quintessência uses its own larger cap.
export const QUINTESSENCE_MAX = 20;

// ─── Story 172 — Fada (Changeling) base archetypes ────────────────────────────
// Picking a base type at creation pre-fills the sheet (PC and NPC), mirroring the Werewolf
// pattern (disciplines WITH ratings + manual Humanidade/Vontade) — NO equipment. Glamour
// REPLACES the blood track (caps.glamour); símbolo = espiral ROXA (a mesma espiral da Gnose,
// só a cor muda). Attributes by ATTRIBUTE_GROUPS key; abilities by their pt-BR label (must
// exist in TALENTS/SKILLS/KNOWLEDGES — "Acuidade" → Vigilância, "Roubo"/"Segurança" → Furto).
// Humanidade/Vontade/Glamour são valores deliberados do statblock. A Encantadora Sidhe tem
// Aparência 7 (sobrenatural): a ficha deixa Fadas excederem o teto de Geração (ver story 172).
export type FadaArchetype = {
  attributes: Record<string, number>;
  talentos: Record<string, number>;
  pericias: Record<string, number>;
  conhecimentos: Record<string, number>;
  disciplines: { name: string; rating: number }[];
  humanity: number;            // fixada (manual) — fadas não derivam das virtudes
  willpowerPermanent: number;  // deliberada (manual)
  glamour: number;             // o ponto de Glamour (define o máximo da trilha, 0..10)
};

export const FADA_ARCHETYPES: Record<string, FadaArchetype> = {
  "Trapaceiro Pooka": {
    attributes: { forca: 2, destreza: 5, vigor: 2, carisma: 4, manipulacao: 5, aparencia: 2, percepcao: 3, inteligencia: 2, raciocinio: 2 },
    talentos:     { "Prontidão": 3, "Briga": 3, "Esportes": 5, "Vigilância": 3, "Lábia": 4 }, // Acuidade → Vigilância
    pericias:     { "Empatia com Animais": 2, "Performance": 3, "Furto": 5, "Furtividade": 5 }, // Roubo → Furto
    conhecimentos:{ "Ocultismo": 2 },
    disciplines: [ { name: "Animalismo", rating: 2 }, { name: "Auspícios", rating: 2 }, { name: "Quimerismo", rating: 3 }, { name: "Rapidez", rating: 2 }, { name: "Ofuscação", rating: 4 }, { name: "Metamorfose", rating: 4 } ],
    humanity: 6, willpowerPermanent: 6, glamour: 6,
  },
  "Guerreiro Manjaléu": {
    attributes: { forca: 3, destreza: 4, vigor: 4, carisma: 1, manipulacao: 3, aparencia: 1, percepcao: 3, inteligencia: 3, raciocinio: 4 },
    talentos:     { "Prontidão": 3, "Esportes": 3, "Briga": 4, "Intimidação": 4, "Manha": 3 },
    pericias:     { "Furto": 2, "Armas Brancas": 4, "Furtividade": 2 }, // Roubo 2 + Segurança 2 → Furto 2
    conhecimentos:{},
    disciplines: [ { name: "Rapidez", rating: 3 }, { name: "Fortitude", rating: 2 }, { name: "Ofuscação", rating: 3 }, { name: "Potência", rating: 2 } ],
    humanity: 4, willpowerPermanent: 5, glamour: 5,
  },
  "Encantadora Sidhe": {
    attributes: { forca: 2, destreza: 4, vigor: 3, carisma: 4, manipulacao: 4, aparencia: 7, percepcao: 3, inteligencia: 3, raciocinio: 3 }, // Aparência 7 (sobrenatural)
    talentos:     { "Prontidão": 2, "Esportes": 2, "Vigilância": 5, "Empatia": 3, "Expressão": 4, "Intimidação": 3, "Liderança": 4, "Lábia": 2 }, // Acuidade → Vigilância
    pericias:     { "Etiqueta": 4, "Performance": 4 },
    conhecimentos:{ "Ocultismo": 4 },
    disciplines: [ { name: "Rapidez", rating: 1 }, { name: "Quimerismo", rating: 5 }, { name: "Dominação", rating: 4 }, { name: "Ofuscação", rating: 4 }, { name: "Presença", rating: 5 } ],
    humanity: 2, willpowerPermanent: 7, glamour: 10,
  },
};

export const FADA_ARCHETYPE_NAMES: string[] = Object.keys(FADA_ARCHETYPES);
export function getFadaArchetype(name?: string): FadaArchetype | null {
  return name ? (FADA_ARCHETYPES[name] ?? null) : null;
}

// ─── Story 173 — Aparição (Wraith antagonist blocks) base archetypes ──────────
// Espelha a Fada: disciplinas COM pontos + Humanidade/Vontade MANUAIS, SEM equipamento.
// Paixão SUBSTITUI o sangue (caps.passion); símbolo = coração esverdeado (NOVO; não é a
// espiral). Atributos por KEY de ATTRIBUTE_GROUPS; habilidades por LABEL pt-BR (devem existir
// em TALENTS/SKILLS/KNOWLEDGES — "Acuidade" → Vigilância, "Computação" → Computador; "Burocracia"
// NÃO é canônica e entra como Conhecimento custom via applyAbilities, de propósito). Humanidade/
// Vontade/Paixão são valores deliberados do statblock. Cada apariç. tem "Força 0/N": o chassi
// guarda um valor único, então `forca` recebe o valor MANIFESTO (N) e a regra "0 no material" vai
// para `sd.weakness` via `note`. `paths` (opcional) = caminhos de Taumaturgia → sd.paths (só a Alma
// Antiga tem). Todo atributo é ≤ 5, então NÃO precisa de bypass do teto de Geração (≠ Sidhe).
export type ApparitionArchetype = {
  attributes: Record<string, number>;
  talentos: Record<string, number>;
  pericias: Record<string, number>;
  conhecimentos: Record<string, number>;
  disciplines: { name: string; rating: number }[]; // "Disciplinas Equivalentes" (com pontos)
  paths?: { name: string; level: string }[];        // caminhos de Taumaturgia → sd.paths (Alma Antiga)
  humanity: number;            // fixada (manual) — aparições não derivam das virtudes
  willpowerPermanent: number;  // deliberada (manual)
  passion: number;             // o ponto de Paixão (define o máximo da trilha, 0..10)
  note?: string;               // regra de Força 0/N → semeado em sd.weakness
};

export const APPARITION_ARCHETYPES: Record<string, ApparitionArchetype> = {
  // 1. Recém-Falecido — inexperientes, confusos, ainda com elos fortes com o mundo mortal.
  "Recém-Falecido": {
    attributes: { forca: 2, destreza: 3, vigor: 3, carisma: 2, manipulacao: 3, aparencia: 2, percepcao: 3, inteligencia: 2, raciocinio: 3 }, // Força 0/2 → manifesta 2 (ver note)
    talentos:     { "Prontidão": 3, "Briga": 1, "Vigilância": 2, "Empatia": 3, "Intimidação": 2, "Manha": 1, "Lábia": 2 }, // Acuidade → Vigilância
    pericias:     { "Armas Brancas": 1, "Furtividade": 1 },
    conhecimentos:{ "Acadêmicos": 1, "Burocracia": 2, "Computador": 2, "Investigação": 1, "Direito": 2, "Ocultismo": 2, "Política": 1 }, // Computação → Computador; Burocracia = custom
    disciplines: [ { name: "Auspícios", rating: 1 }, { name: "Quimerismo", rating: 1 }, { name: "Demência", rating: 2 }, { name: "Dominação", rating: 1 }, { name: "Vicissitude", rating: 1 } ],
    humanity: 6, willpowerPermanent: 5, passion: 5,
    note: "Aparição: Força 0 no mundo material (não toca/move objetos físicos normalmente); Força 2 ao manifestar-se ou agir sobre a matéria. O valor exibido é o de manifestação.",
  },
  // 2. Espectro — espíritos sombrios consumidos pela raiva e pelo ódio, dominados pelo lado negro.
  "Espectro": {
    attributes: { forca: 3, destreza: 3, vigor: 5, carisma: 2, manipulacao: 3, aparencia: 1, percepcao: 2, inteligencia: 4, raciocinio: 3 }, // Força 0/3 → manifesta 3
    talentos:     { "Prontidão": 3, "Briga": 4, "Vigilância": 3, "Intimidação": 3, "Manha": 3, "Lábia": 3 }, // Acuidade → Vigilância
    pericias:     { "Armas Brancas": 3, "Furtividade": 2 },
    conhecimentos:{ "Ocultismo": 2 },
    disciplines: [ { name: "Auspícios", rating: 2 }, { name: "Quimerismo", rating: 4 }, { name: "Demência", rating: 4 }, { name: "Ofuscação", rating: 2 }, { name: "Tenebrosidade", rating: 3 }, { name: "Presença", rating: 2 }, { name: "Metamorfose", rating: 2 }, { name: "Vicissitude", rating: 4 } ],
    humanity: 3, willpowerPermanent: 7, passion: 9,
    note: "Aparição: Força 0 no mundo material; Força 3 ao manifestar-se ou agir sobre a matéria. O valor exibido é o de manifestação.",
  },
  // 3. Alma Antiga — mortas há décadas/séculos; entre as aparições mais fortes e temíveis.
  "Alma Antiga": {
    attributes: { forca: 4, destreza: 5, vigor: 5, carisma: 3, manipulacao: 4, aparencia: 1, percepcao: 5, inteligencia: 3, raciocinio: 3 }, // Força 0/4 → manifesta 4
    talentos:     { "Prontidão": 3, "Briga": 2, "Vigilância": 5, "Empatia": 3, "Intimidação": 3, "Manha": 1, "Lábia": 1 }, // Acuidade → Vigilância
    pericias:     { "Armas Brancas": 2, "Furtividade": 3 },
    conhecimentos:{ "Acadêmicos": 2, "Burocracia": 4, "Computador": 3, "Investigação": 1, "Direito": 2, "Ocultismo": 2, "Política": 1 }, // Computação → Computador; Burocracia = custom
    disciplines: [ { name: "Auspícios", rating: 2 }, { name: "Quimerismo", rating: 1 }, { name: "Demência", rating: 4 }, { name: "Dominação", rating: 3 }, { name: "Presença", rating: 2 }, { name: "Taumaturgia", rating: 3 }, { name: "Vicissitude", rating: 3 } ],
    paths: [ { name: "Sedução das Chamas", level: "3" }, { name: "Movimento da Mente", level: "3" } ],
    humanity: 1, willpowerPermanent: 9, passion: 10,
    note: "Aparição: Força 0 no mundo material; Força 4 ao manifestar-se ou agir sobre a matéria. O valor exibido é o de manifestação.",
  },
};

export const APPARITION_ARCHETYPE_NAMES: string[] = Object.keys(APPARITION_ARCHETYPES);
export function getApparitionArchetype(name?: string): ApparitionArchetype | null {
  return name ? (APPARITION_ARCHETYPES[name] ?? null) : null;
}

// Story 174 — Demônio. Como a Aparição (disciplinas com pontos + Humanidade/Vontade manuais +
// note opcional, SEM equipamento), mas o recurso é a Fé (reusa sd.faithRating, rating único 0..10).
// "Disciplinas Equivalentes" são disciplinas V20 normais com pontos. note = regra de "forma
// demoníaca" → semeada em sd.weakness.
export type DemonArchetype = {
  attributes: Record<string, number>;
  talentos: Record<string, number>;
  pericias: Record<string, number>;
  conhecimentos: Record<string, number>;
  disciplines: { name: string; rating: number }[]; // "Disciplinas Equivalentes" (com pontos)
  humanity: number;            // fixada (manual) — demônios não derivam das virtudes
  willpowerPermanent: number;  // deliberada (manual)
  faith: number;               // a Fé do statblock → semeada em sd.faithRating (0..10)
  note?: string;               // regra de "forma demoníaca" → semeada em sd.weakness
};

export const DEMON_ARCHETYPES: Record<string, DemonArchetype> = {
  // 1. Tentador Caído — manipulador social; corrompe mortais pela influência e pela palavra.
  "Tentador Caído": {
    attributes: { forca: 2, destreza: 2, vigor: 2, carisma: 3, manipulacao: 4, aparencia: 3, percepcao: 3, inteligencia: 4, raciocinio: 4 },
    talentos:     { "Prontidão": 2, "Vigilância": 4, "Empatia": 2, "Expressão": 3, "Intimidação": 4, "Liderança": 4, "Lábia": 5 }, // Acuidade → Vigilância
    pericias:     { "Condução": 2, "Etiqueta": 4, "Performance": 2, "Furtividade": 1 },
    conhecimentos:{ "Computador": 1, "Finanças": 4, "Direito": 3, "Ocultismo": 2, "Política": 5 },
    disciplines: [ { name: "Dominação", rating: 2 }, { name: "Fortitude", rating: 2 }, { name: "Daimoinon", rating: 4 } ],
    humanity: 3, willpowerPermanent: 7, faith: 7,
  },
  // 2. Profanador Terrestre na Escuridão — manifestação física devastadora; possui atributos
  //    físicos e Potência apenas quando projeta sua forma demoníaca.
  "Profanador Terrestre na Escuridão": {
    attributes: { forca: 2, destreza: 2, vigor: 2, carisma: 3, manipulacao: 4, aparencia: 3, percepcao: 5, inteligencia: 5, raciocinio: 5 }, // físicos só em forma demoníaca (ver note)
    talentos:     { "Prontidão": 3, "Vigilância": 4, "Expressão": 3, "Intimidação": 3, "Liderança": 4, "Lábia": 5 }, // Acuidade → Vigilância
    pericias:     { "Armas Brancas": 3, "Performance": 2, "Furtividade": 1 },
    conhecimentos:{ "Finanças": 4, "Medicina": 3, "Ocultismo": 3, "Política": 3 },
    disciplines: [ { name: "Dominação", rating: 6 }, { name: "Potência", rating: 6 }, { name: "Vicissitude", rating: 6 } ],
    humanity: 1, willpowerPermanent: 10, faith: 10,
    note: "Demônio: possui atributos FÍSICOS (Força/Destreza/Vigor) apenas ao projetar a forma demoníaca; Potência 6 só vale na forma demoníaca. Os valores exibidos são os da forma demoníaca.",
  },
};

export const DEMON_ARCHETYPE_NAMES: string[] = Object.keys(DEMON_ARCHETYPES);
export function getDemonArchetype(name?: string): DemonArchetype | null {
  return name ? (DEMON_ARCHETYPES[name] ?? null) : null;
}

// Story 175 — recurso de poder customizado (criatura "Customizado"). O Mestre define nome,
// símbolo, cor, modelo e teto na própria ficha. pool = ponto permanente + reserva gastável
// (estilo sangue/Gnose); rating = valor único (estilo Fé).
export type CustomResource = {
  name: string;
  symbol: string;            // chave de CUSTOM_RESOURCE_SYMBOLS
  color: string;             // hex (#rrggbb)
  model: "pool" | "rating";
  max: number;               // 1..10 (reusa os widgets de 10)
};

// Símbolos prontos p/ o recurso custom (reusam componentes/ícones já existentes).
export const CUSTOM_RESOURCE_SYMBOLS: { key: string; label: string }[] = [
  { key: "drop", label: "Gota" },
  { key: "flame", label: "Chama" },
  { key: "spiral", label: "Espiral" },
  { key: "triangle", label: "Triângulo" },
  { key: "heart", label: "Coração" },
  { key: "star", label: "Estrela" },
  { key: "sparkles", label: "Brilho" },
];

// Story 170 — disciplinas COMUNS (básicas) do V20. Pool da 7ª disciplina aleatória do
// Ancião: o sorteio nunca pega disciplinas especiais/de clã/de linhagem (ex.: Taumaturgia,
// Necromancia, Vicissitude). Bate com V20_DISCIPLINE_GROUPS[0] ("Disciplinas Comuns").
export const COMMON_DISCIPLINE_NAMES: string[] = [
  "Animalismo", "Auspícios", "Dominação", "Fortitude", "Ofuscação", "Potência", "Presença", "Rapidez",
];

export type Trait = {
  id: string;
  name: string;
  rating: number;
  max: number;
  specialization?: string;
  custom?: boolean;
  /** Optional symbol slug (e.g. a discipline icon under /vtm/disciplines/). */
  icon?: string;
  /** Story 180 — V5: poderes nomeados da disciplina (escritos nas linhas da ficha). */
  powers?: string[];
};

export type DamageLevel = "" | "B" | "L" | "A";

// Story 180 — V5 damage box state. Saúde e Vontade no V5 só têm dois tipos de dano:
// superficial ("S", marcado com "/") e agravado ("A", marcado com "X"). Vazio = "".
export type V5Damage = "" | "S" | "A";

// `bonus` (optional) = extra d10 the item adds to a dice pool when selected in the
// roller (Story 146, "como no Fate"). Back-compat: undefined/0 = no dice.
export type WodItem = { id: string; name: string; description: string; qty: number; bonus?: number };

export type WodBio = {
  age: string;
  apparentAge: string;
  birthDate: string;
  deathDate: string;
  hair: string;
  eyes: string;
  race: string;
  nationality: string;
  height: string;
  weight: string;
  sex: string;
};

export type MeritFlaw = { id: string; name: string; kind: string; value: string };
export type Weapon = {
  id: string;
  name: string;
  damage: string;
  diff: string;
  range: string;
  rate: string;
  clip: string;
  conceal: string;
  // Story 143 — arena ammo tracking. Optional/back-compat: melee weapons leave
  // both undefined and the arena hides the ammo UI. ammoMax falls back to clip.
  ammoCurrent?: number;
  ammoMax?: number;
  // Story 181 — V5: weapons only deal Superficial ("S") or Aggravated ("A").
  // Legacy V20 values "B"/"L" are migrated (B→S, L→A) in ensureWodV5Data.
  damageType?: "S" | "A";
  bonus?: number;
  // Story 181 — V5 weapon fields. `type` = free-text category ("Espada", "Pistola"…);
  // `penalty` = always-negative dice penalty (each point = −1 die) applied only to rolls
  // using `affectedTrait` (attribute label or ability name); `notes` = longer free text.
  // DATA ONLY for now — the V5 roller is a later story. All optional/back-compat.
  type?: string;
  penalty?: string;
  affectedTrait?: string;
  notes?: string;
};
// Story 155 — `affectedTrait` (free text, e.g. "Destreza" or an ability name): the
// armor penalty applies ONLY to rolls using that trait. Empty/undefined → V20 RAW
// fallback (applies only to Destreza-attribute rolls). Back-compat: undefined.
export type Armor = { id: string; name: string; rating: string; penalty: string; description: string; affectedTrait?: string;
  // Story 181 — V5: the armor class drives the protection (blindagem) value:
  // leve=2, media=4, pesada=6, militar=8. `rating` is derived from it on selection.
  armorType?: "leve" | "media" | "pesada" | "militar" };
export type NamedLevel = { id: string; name: string; level: string };

export type ExpandedEntry = {
  id: string;
  type: string;
  order: number;
  title?: string;
  body?: string;
  color?: string;
  // Laços de Sangue
  comQuem?: string;
  nivel?: string;
  // Refúgios
  localizacao?: string;
  descricao?: string;
};

export type WodAbilities = {
  talentos: Trait[];
  pericias: Trait[];
  conhecimentos: Trait[];
};

export type WodV5Data = {
  creature: string;
  generation: number;
  clan: string;
  clanAntitribu: boolean;
  sect: string;
  // Símbolo de clã customizado (upload do mestre). Quando preenchido, a ficha/card mostram
  // ESTA imagem (cor cheia) no lugar do símbolo derivado do clã. URL já passada por toProxyUrl.
  clanSymbolUrl?: string;
  // Símbolo de seita customizado (upload do mestre). Mesmo recipe do clanSymbolUrl: quando
  // preenchido, a ficha mostra ESTA imagem (cor cheia) no lugar do símbolo derivado da seita.
  sectSymbolUrl?: string;
  // Story 164 — ghoul/revenant. revenantFamily "" / "Nenhum" = not a revenant (use
  // clan-of-origin); a known family name overrides the clan (disciplines + weakness).
  // "Outro" → custom name in revenantFamilyCustom (no preset disciplines/weakness).
  revenantFamily?: string;
  revenantFamilyCustom?: string;
  // Story 166 — mortal base archetype. "" / "Nenhum" = blank mortal; otherwise a
  // MORTAL_ARCHETYPES key. Only meaningful when creature === "Mortal".
  mortalArchetype?: string;
  // Story 186 — animal subtype (V5 Standard-Pool statblock). One of V5_ANIMAL_NAMES.
  // Only meaningful when creature === "Animal" (which is lacaio-only / NPC-only).
  animalSubtype?: string;
  // Story 170 — werewolf base statblock (Lobisomem E Abominação). "" / "Nenhum" = blank;
  // otherwise a WEREWOLF_ARCHETYPES key.
  werewolfArchetype?: string;
  // Story 170 — pre-rolled randomness baked at creation (replay-safe; the reducer only
  // APPLIES these, never calls Math.random()). abominationRoll = 3 floats [0,1) that
  // distribute the Abomination's +3 discipline points among the garou disciplines.
  // elderDisciplineRoll = 1 float [0,1) that picks the Ancião's random 7th discipline.
  abominationRoll?: number[];
  elderDisciplineRoll?: number;
  // Story 170 — Gnose (só caps.gnose). Modelada como a Vontade unificada (story 169):
  // gnosePermanent = máximo de caixas (o "ponto" de Gnose, 0..10); gnoseCurrent = reserva
  // gastável (length 10). gnoseSeeded trava o auto-preenchimento da migração após a 1ª
  // interação (deixa zerar de propósito), espelhando willpowerSeeded.
  gnosePermanent?: number;
  gnoseCurrent?: boolean[];
  gnoseSeeded?: boolean;
  // Story 170 — forma de batalha (só caps.shapeshift). "human" (padrão/ausente) | "crinos".
  // O Crinos duplica os Físicos, zera Aparência e dá +2 níveis de vitalidade (RAW V20);
  // crinosSnapshot guarda os valores-base p/ reverter exatamente.
  form?: "human" | "crinos";
  crinosSnapshot?: {
    forca: number; destreza: number; vigor: number;
    forcaMax: number; destrezaMax: number; vigorMax: number;
    aparencia: number; aparenciaMax: number;
    healthExtraLevels: number;
  };
  // Story 170 — retrato da FORMA LUPINA (o retrato humano é o character.imageUrl de domínio).
  wolfImageUrl?: string;
  // Story 171 — Mago base statblock. "" / "Nenhum" = blank; otherwise a MAGE_ARCHETYPES key.
  mageArchetype?: string;
  // Story 171 — Quintessência (só caps.quintessence). Modelada como a Gnose/Vontade unificada:
  // quintessencePermanent = máximo de caixas (o "ponto" de Quintessência, 0..QUINTESSENCE_MAX);
  // quintessenceCurrent = reserva gastável (length QUINTESSENCE_MAX). quintessenceSeeded trava
  // o auto-preenchimento da migração após a 1ª interação (deixa zerar de propósito).
  quintessencePermanent?: number;
  quintessenceCurrent?: boolean[];
  quintessenceSeeded?: boolean;
  // Story 172 — Fada base statblock. "" / "Nenhum" = blank; otherwise a FADA_ARCHETYPES key.
  fadaArchetype?: string;
  // Story 172 — Glamour (só caps.glamour). Modelada como a Gnose: glamourPermanent = máximo de
  // caixas (o "ponto" de Glamour, 0..10); glamourCurrent = reserva gastável (length 10).
  // glamourSeeded trava o auto-preenchimento da migração após a 1ª interação.
  glamourPermanent?: number;
  glamourCurrent?: boolean[];
  glamourSeeded?: boolean;
  // Story 173 — Aparição base statblock. "" / "Nenhum" = blank; otherwise an APPARITION_ARCHETYPES key.
  apparitionArchetype?: string;
  // Story 174 — Demônio base statblock. "" / "Nenhum" = blank; otherwise a DEMON_ARCHETYPES key.
  // A Fé do demônio reusa sd.faithRating (não há campo próprio).
  demonArchetype?: string;
  // Story 175 — criatura "Customizado" (ficha desenhada pelo Mestre).
  customType?: string;                   // rótulo de tipo (subtítulo), ex.: "Anjo Caído"
  customLabels?: Record<string, string>; // overrides de rótulo: nature/demeanor/concept/sire/willpower/humanity
  customResource?: CustomResource | null; // recurso de poder (ausente/null = "Clique para definir"; null = limpo persistível, pois JSON descarta undefined)
  customResourcePermanent?: number;      // pool: ponto base/máximo (0..max)
  customResourceCurrent?: boolean[];     // pool: reserva gastável (length max)
  customResourceRating?: number;         // rating: valor único (0..max)
  customVirtues?: Trait[];               // virtudes extras (apenas traços de ficha/card)
  customFinalized?: boolean;             // GM clicou "Salvar criatura" → some a barra Salvar/Cancelar do topo
  // Story 175 (follow-up) — ajustes da criatura Customizado.
  humanityMax?: number;                  // nº de bolinhas VISÍVEIS do Caminho/Humanidade (default 10)
  customHasGeneration?: boolean;         // GM marcou "adicionar Geração" na criação (mostra Geração na ficha)
  customHasClan?: boolean;               // GM marcou "adicionar Clã" na criação (mostra Clã na ficha)
  customHasSect?: boolean;               // GM marcou "adicionar Seita" na criação (mostra Seita na ficha)
  customModelId?: string;                // id do MODELO global salvo a partir desta criatura (Salvar criatura)
  // Story 173 — Paixão (só caps.passion). Modelada como a Gnose/Glamour: passionPermanent = máximo de
  // caixas (o "ponto" de Paixão, 0..10); passionCurrent = reserva gastável (length 10). passionSeeded
  // trava o auto-preenchimento da migração após a 1ª interação (deixa zerar de propósito).
  passionPermanent?: number;
  passionCurrent?: boolean[];
  passionSeeded?: boolean;

  // ── Story 180 — V5 (5th Edition) fields ────────────────────────────────────
  // Additive while the sheet migrates tab-by-tab off the V20 model. Vampire-only.
  // Fome (Hunger): 0..5. Substitui a Reserva de Sangue do V20.
  hunger?: number;
  // Potência de Sangue (Blood Potency): 0..10. Define os derivados (ver BLOOD_POTENCY_TABLE).
  bloodPotency?: number;
  // Story 181 — quantidade de caixas/bolinhas exibidas (ajustável pelos ±). Ausente → 5 / 10.
  hungerMax?: number;
  bloodPotencyMax?: number;
  // Humanidade no V5 reusa `humanity` (0..10); as Manchas (Stains) são marcadas da direita
  // para a esquerda sobre as caixas vazias da trilha de Humanidade.
  humanityStains?: number;
  // Ressonância do sangue mais recente (Sanguínea/Colérica/Melancólica/Fleumática + intensidade).
  resonance?: string;
  // Tipo de Predador (como o vampiro caça).
  predatorType?: string;
  // Story 188 — arquétipo de NPC vampiro (Harpia de Elísio / Wight / etc.). Só NPC; opcional.
  vampireNpcType?: string;
  // Identidade V5 (no lugar de Natureza/Comportamento do V20).
  ambition?: string;
  desire?: string;
  // Princípios da Crônica / Pedras de Toque & Convicções / Maldição do Clã (textos da ficha V5).
  chronicleTenets?: string;
  touchstones?: string;
  clanBane?: string;
  // Saúde/Vontade no V5 são trilhas de dano superficial(/)+agravado(X) dimensionadas por
  // Vigor+3 e Autocontrole+Determinação. `healthV5`/`willpowerV5` guardam as caixas V5
  // (length derivada); a UI antiga (health/willpowerCurrent) é aposentada na Fase 3.
  healthV5?: V5Damage[];
  willpowerV5?: V5Damage[];

  // Status block
  health: DamageLevel[]; // length = getHealthTotalSlots(healthProfile, healthExtraLevels)
  healthExtraLevels: number; // number of extra health slots (penalty 0) — só no perfil padrão
  // Story 167 — perfil de vitalidade. Ausente/"standard" = 7 níveis V20; "figurante" =
  // 4 níveis (mortal "Comum", Regra de Figurantes). Definido na criação pelo arquétipo.
  healthProfile?: HealthProfile;
  weakness: string;
  experience: string;
  humanityPath: string;
  humanityPathCustom: string;
  humanity: number; // 0..10
  posture: string;
  willpowerPermanent: number; // 0..10
  willpowerCurrent: boolean[]; // length 10
  bloodPool: boolean[]; // length based on generation / manual override
  bloodPoolOverride?: number; // optional manual override
  bloodPerTurn: number; // 0..1000
  // Story 166 — Fé (True Faith): single permanent rating (1..10), shown only for
  // creatures with caps.faith (Mortal e Demônio na story 174). 0 = sem fé.
  faithRating?: number;
  // Story 164 — ghoul-only free-text note beside the blood pool (official sheet's
  // "Overdosing?"). Pure tracker note; rendered only for Carniçal.
  overdosing?: string;

  // Tab 1 — Personagem
  chronicle: string;
  nature: string;
  demeanor: string;
  concept: string;
  sire: string;
  lore: string;
  bio: WodBio;
  prelude: string;
  goals: string;
  coterieDiagramId: string;

  // Tab 2 — Atributos / Habilidades / Vantagens
  attributes: Record<string, Trait>;
  abilities: WodAbilities; // V20 (legado; aposentado na limpeza da story 180)
  // Story 180 — V5: 27 perícias em 3 colunas (Físicas/Sociais/Mentais), 0..5 + especialidade.
  skills: V5Skills;
  disciplines: Trait[];
  backgrounds: Trait[];
  virtues: { consciencia: Trait; autocontrole: Trait; coragem: Trait };

  // Tab 3 — Qualidades / Combate / Experiência
  merits: MeritFlaw[];
  flaws: MeritFlaw[];
  otherTraits: Trait[];
  weapons: Weapon[];
  armor: Armor[];
  paths: NamedLevel[];
  rituals: NamedLevel[];
  experienceTotal: string;
  experienceSpent: string;
  experienceLog: string;
  derangements: string[];

  // Tab 4 — Inventário
  money?: string; // free-text money/currency, scoped to the inventory tab
  inventory: WodItem[];

  // Tab 5 — Expand.
  expanded: ExpandedEntry[];

  // Story 139 — per-section band colors (Qualidades/Combate collapsibles)
  sectionColors?: Record<string, string>;

  // Story 142 — auto-derived fields with manual override flags
  clanDerangement?: string;
  humanityManual?: boolean;
  willpowerManual?: boolean;
  // Story 168 — true once the temporary Willpower pool (willpowerCurrent) has been
  // seeded to full on creation. Lets the migration repair pre-seeding characters
  // (whose temporary pool was never initialized) exactly once, without ever
  // refilling a pool that was later deliberately spent down to zero.
  willpowerSeeded?: boolean;

  // Story 144 — NPC bag. Absent ⇒ PC (no change to existing behavior).
  npc?: WodNpcData;
};

export interface WodV5Character extends Character {
  systemData: WodV5Data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Story 146 — V20 combat-flow turn state. Lives in `state.wodTurn` (written via
// cast, kept OUT of domain.ts — same pattern as story-143). These types only
// describe the bag so the plugin UI can stay type-safe.
// ─────────────────────────────────────────────────────────────────────────────
export type WodInitiativeMode = "GM" | "BY_ROLL" | "PLAYER_ROLL";

// Story 150 — "Manobra" added as a 5th (non-defensive) kind. Order matches the
// action-ceremony droplist (Manobra first).
export type WodDeclarationKind = "Manobra" | "Atacar" | "Esquivar" | "Bloqueio/Aparar" | "Outro";

export const WOD_DECLARATION_KINDS: WodDeclarationKind[] = ["Manobra", "Atacar", "Esquivar", "Bloqueio/Aparar", "Outro"];

// Defensive declarations grant the target a reactive defense roll (D6).
// Story 150 — Manobra is NOT defensive (behaves like Atacar/Outro, single maneuver text).
export const WOD_DEFENSIVE_KINDS: WodDeclarationKind[] = ["Esquivar", "Bloqueio/Aparar", "Outro"];

export type WodDeclaration = {
  kind: WodDeclarationKind;
  targetIds?: string[];
  maneuver?: string;                        // single maneuver (non-attack kinds)
  // Story 150 — per-target attack maneuver ("como vai agredir o alvo X"), keyed by targetId.
  targetManeuvers?: Record<string, string>;
  // Story 150 follow-up — extra actions declared in the same turn (multi-action, V20:
  // the dice pool is split). The primary fields above are the FIRST action; these are
  // the rest. The turn/damage engine still resolves the primary action — extras are
  // declaration-only for now (shown in summaries).
  extraActions?: WodDeclaration[];
};

export type WodPendingChange = {
  requestId: string;
  characterId: string;
  decl: WodDeclaration;
};

// Damage resolution modal state (F4). GM rolls damage; the targeted player rolls
// soak reactively; final = max(0, damageSuccesses − soakSuccesses).
export type WodDamageRes = {
  resolutionId: string;
  attackerId: string;
  targetId: string;
  attackSuccesses: number;
  defenseSuccesses: number;
  net: number;
  damageType: "B" | "L" | "A";
  baseDamage: number;
  weaponBonus: number;       // story 157 — dados de BÔNUS da arma (separados p/ pintar laranja no dano)
  weaponName: string | null; // story 157 — nome da arma (null = desarmado/Força) p/ rotular o dano
  strengthDamage: number;    // story 157 #5 — parcela de Força do dano base (pinta de atributo branco no 3D)
  damagePool: number;
  damageRoll: number[] | null;
  damageSuccesses: number | null;
  soakPool: number | null;
  soakRoll: number[] | null;
  soakSuccesses: number | null;
  final: number | null;
};

export type WodTurnState = {
  initiativeMode?: WodInitiativeMode;
  delayedIds?: string[];
  initiative?: Record<string, number>;        // persisted initiative totals
  pendingInitiative?: Record<string, number>; // PLAYER_ROLL collection
  declarationOpen?: boolean;
  declarations?: Record<string, WodDeclaration>;
  pendingChanges?: WodPendingChange[];         // queue of mid-combat change requests
  damageRes?: WodDamageRes | null;
  celerityActive?: string[];                   // per-round Celerity-active combatants
  hideNpcDeclarations?: boolean;               // GM eye toggle
  setupPhase?: boolean;                        // Story 148 — shared "Iniciar combate" ceremony flag
  // Story 153 — interrupt hand: players ask to act out of turn (queued like
  // pendingChanges); the GM approves/declines. On approval the turn jumps to the
  // interrupter and `interruptReturnToId` remembers the interrupted combatant so the
  // next WOD_V5_TURN_ADVANCE hops the turn back to them.
  interruptRequests?: { requestId: string; characterId: string; requesterUserId: string }[];
  interruptReturnToId?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constant lists (V20 RAW, pt-BR labels)
// ─────────────────────────────────────────────────────────────────────────────

export const CREATURES: { id: string; label: string; enabled: boolean }[] = [
  { id: "Vampiro", label: "Vampiro", enabled: true },
  { id: "Lobisomem", label: "Lobisomem", enabled: true },
  { id: "Abominação", label: "Abominação", enabled: true },
  { id: "Mago", label: "Mago", enabled: true },
  { id: "Fada", label: "Fada", enabled: true },
  { id: "Aparição", label: "Aparição", enabled: true },
  { id: "Mortal", label: "Mortal", enabled: true },
  { id: "Carniçal", label: "Carniçal", enabled: true },
  { id: "Kinfolk", label: "Kinfolk", enabled: false },
  { id: "Caçador", label: "Caçador", enabled: false },
  { id: "Demônio", label: "Demônio", enabled: true },
  { id: "Múmia", label: "Múmia", enabled: false },
  { id: "Customizado", label: "Customizado", enabled: true },
];

export const GENERATIONS: number[] = Array.from({ length: 20 }, (_, i) => i + 1);

export function getGenerationBloodLimits(gen: number): { maxBlood: number; bloodPerTurn: number; usableBlood?: number; doubleCost?: boolean } {
  if (gen <= 3) return { maxBlood: 100, bloodPerTurn: 15 };
  if (gen === 14) return { maxBlood: 10, bloodPerTurn: 1, usableBlood: 8 };
  if (gen === 15) return { maxBlood: 10, bloodPerTurn: 1, usableBlood: 6, doubleCost: true };
  if (gen >= 13) return { maxBlood: 10, bloodPerTurn: 1 };
  const table: Record<number, { maxBlood: number; bloodPerTurn: number }> = {
    4:  { maxBlood: 50,  bloodPerTurn: 10 },
    5:  { maxBlood: 40,  bloodPerTurn: 8  },
    6:  { maxBlood: 30,  bloodPerTurn: 6  },
    7:  { maxBlood: 20,  bloodPerTurn: 4  },
    8:  { maxBlood: 15,  bloodPerTurn: 3  },
    9:  { maxBlood: 14,  bloodPerTurn: 2  },
    10: { maxBlood: 13,  bloodPerTurn: 1  },
    11: { maxBlood: 12,  bloodPerTurn: 1  },
    12: { maxBlood: 11,  bloodPerTurn: 1  },
  };
  return table[gen] || { maxBlood: 10, bloodPerTurn: 1 };
}

export function getGenerationDisciplineMax(gen: number): number {
  const table: Record<number, number> = {
    3:10, 4:9, 5:8, 6:7, 7:6, 8:5, 9:5, 10:5, 11:5, 12:5, 13:5, 14:4, 15:3,
  };
  return table[gen] ?? 5;
}

// Teto de Características permanentes (Atributos) pela Geração:
// 3ª→10, 4ª→9, 5ª→8, 6ª→7, 7ª→6, 8ª–15ª→5 (RAW V20).
export function getGenerationAttributeMax(gen: number): number {
  const table: Record<number, number> = { 3: 10, 4: 9, 5: 8, 6: 7, 7: 6 };
  return table[gen] ?? 5;
}

export function deriveHumanity(virtues: WodV5Data["virtues"]): number {
  return (virtues.consciencia?.rating ?? 0) + (virtues.autocontrole?.rating ?? 0);
}

export function deriveWillpower(virtues: WodV5Data["virtues"]): number {
  return virtues.coragem?.rating ?? 0;
}

export const CLAN_GROUPS: { group: string; clans: string[] }[] = [
  {
    group: "13 Clãs Principais",
    clans: [
      "Assamita",
      "Brujah",
      "Gangrel",
      "Giovanni",
      "Lasombra",
      "Malkaviano",
      "Nosferatu",
      "Ravnos",
      "Seguidores de Set",
      "Toreador",
      "Tremere",
      "Tzimisce",
      "Ventrue",
    ],
  },
  {
    group: "Exceções Essenciais",
    clans: ["Caitiff", "Sangue-Fraco"],
  },
  {
    group: "Linhagens Menores",
    clans: [
      "Ahrimanes",
      "Baali",
      "Capadócios",
      "Filhas da Cacofonia",
      "Gárgulas",
      "Kiasyd",
      "Lamia",
      "Nagaraja",
      "Arautos das Caveiras",
      "Salubri",
      "Samedi",
      "Verdadeiro Brujah",
    ],
  },
];

export const ALL_CLANS: string[] = CLAN_GROUPS.flatMap((g) => g.clans);

export const APPEARANCE_ZERO_CLANS = new Set(["Nosferatu", "Gárgulas", "Samedi", "Arautos das Caveiras"]);

// Teto efetivo de um Atributo: respeita o limite de Geração e a exceção de
// Aparência (Nosferatu/Samedi/Gárgulas/Arautos das Caveiras → travada em 0,
// sem ponto grátis e sem poder aumentar).
export function getAttributeMax(gen: number, clan: string | undefined, attrKey: string): number {
  if (attrKey === "aparencia" && clan && APPEARANCE_ZERO_CLANS.has(clan)) return 0;
  return getGenerationAttributeMax(gen);
}

export const CLAN_WEAKNESS: Record<string, string> = {
  // 13 clãs principais
  "Assamita": "Sangue vampírico causa dano letal (1/ponto); diablerie causa dano agravado.",
  "Brujah": "+2 na dificuldade contra frenesi; não pode usar Força de Vontade para evitá-lo.",
  "Gangrel": "Ganha um traço animal após cada frenesi.",
  "Giovanni": "Mordida causa o dobro de dano em mortais.",
  "Lasombra": "Não possui reflexo.",
  "Malkaviano": "Uma perturbação mental incurável e permanente.",
  "Nosferatu": "Aparência 0 permanente.",
  "Ravnos": "Vício específico que exige teste (Dificuldade 6) para resistir.",
  "Seguidores de Set": "+2 níveis de dano por luz solar; -1 dado sob iluminação forte.",
  "Toreador": "Transe paralisante diante da beleza (Dificuldade 6 para resistir).",
  "Tremere": "Sofre Laço de Sangue total com apenas 2 goles.",
  "Tzimisce": "Sem a terra natal ao dormir, reduz a parada de dados pela metade a cada dia.",
  "Ventrue": "Só se alimenta de um tipo específico de sangue mortal.",
  // Exceções essenciais
  "Caitiff": "Disciplinas custam mais caro (Nível x 6 em XP); sem Status inicial.",
  "Sangue-Fraco": "Gasto de sangue custa o dobro; não consegue criar laços ou carniçais.",
  // Linhagens menores
  "Ahrimanes": "Sangue inerte (não cria vampiros, carniçais ou laços de sangue).",
  "Arautos das Caveiras": "Aparência de esqueleto e caveira (Aparência 0).",
  "Baali": "Símbolos religiosos queimam a pele; Fé tem efeito dobrado.",
  "Capadócios": "Palidez cadavérica perceptível e irreversível.",
  "Filhas da Cacofonia": "Ouvem música eternamente (+2 de Dif em Percepção; Prontidão máxima 3).",
  "Gárgulas": "Aparência 0; penalidade de -2 na Vontade para resistir a controle mental.",
  "Kiasyd": "Aversão e dano agravado pelo contato com ferro puro.",
  "Lamia": "Mordida transmite uma peste letal a qualquer mortal.",
  "Nagaraja": "Precisa comer carne humana crua além de sangue para não perder dados físicos.",
  "Salubri": "Alimentar-se de alvo relutante custa 1 Vontade e 1 nível de Vitalidade do vampiro.",
  "Samedi": "Cadáver em estado de decomposição contínua (Aparência 0).",
  "Verdadeiro Brujah": "Frios e sem paixão (+2 de Dif em Consciência/Convicção; Virtudes custam o dobro de XP).",
};

export function getClanWeakness(clan?: string): string {
  return CLAN_WEAKNESS[clan ?? ""] ?? "";
}

export const SECTS: string[] = [
  "Camarilla",
  "Sabá",
  "Movimento Anarquista",
  "Independentes",
  "Autarca",
  "Inconnu",
  "Mão Negra",
  "Tal'Mahe'Ra",
];

// Attributes (9) — grouped
export const ATTRIBUTE_GROUPS: { key: string; label: string; traits: { key: string; label: string }[] }[] = [
  {
    key: "fisicos",
    label: "Físicos",
    traits: [
      { key: "forca", label: "Força" },
      { key: "destreza", label: "Destreza" },
      { key: "vigor", label: "Vigor" },
    ],
  },
  {
    key: "sociais",
    label: "Sociais",
    traits: [
      { key: "carisma", label: "Carisma" },
      { key: "manipulacao", label: "Manipulação" },
      { key: "aparencia", label: "Aparência" },
    ],
  },
  {
    key: "mentais",
    label: "Mentais",
    traits: [
      { key: "percepcao", label: "Percepção" },
      { key: "inteligencia", label: "Inteligência" },
      { key: "raciocinio", label: "Raciocínio" },
    ],
  },
];

export const ATTRIBUTE_KEYS: string[] = ATTRIBUTE_GROUPS.flatMap((g) => g.traits.map((t) => t.key));

// Story 175 — rótulo override (criatura Customizado). Volta pro fallback quando não há override.
export function getCustomLabel(sd: Partial<WodV5Data>, key: string, fallback: string): string {
  return sd.customLabels?.[key]?.trim() || fallback;
}

// Story 175 — rótulo de um atributo. SÓ na criatura "Customizado" usa o nome custom guardado no
// próprio Trait (sd.attributes[key].name); para todas as outras criaturas devolve o rótulo
// canônico de ATTRIBUTE_GROUPS (no-op garantido, sem mudar comportamento existente).
export function attributeLabel(sd: Partial<WodV5Data>, key: string): string {
  if (sd.creature === "Customizado") {
    const custom = sd.attributes?.[key]?.name?.trim();
    if (custom) return custom;
  }
  for (const g of ATTRIBUTE_GROUPS) {
    const t = g.traits.find((x) => x.key === key);
    if (t) return t.label;
  }
  return key;
}

// Abilities (30)
export const TALENTS = [
  "Prontidão",
  "Esportes",
  "Vigilância",
  "Briga",
  "Empatia",
  "Expressão",
  "Intimidação",
  "Liderança",
  "Manha",
  "Lábia",
];
export const SKILLS = [
  "Empatia com Animais",
  "Ofícios",
  "Condução",
  "Etiqueta",
  "Armas de Fogo",
  "Furto",
  "Armas Brancas",
  "Performance",
  "Furtividade",
  "Sobrevivência",
];
export const KNOWLEDGES = [
  "Acadêmicos",
  "Computador",
  "Finanças",
  "Investigação",
  "Direito",
  "Medicina",
  "Ocultismo",
  "Política",
  "Ciência",
  "Tecnologia",
];

export const BACKGROUND_SUGGESTIONS = [
  "Aliados",
  "Contatos",
  "Fama",
  "Rebanho",
  "Influência",
  "Mentor",
  "Recursos",
  "Lacaios",
  "Status",
  "Geração",
];

// ─────────────────────────────────────────────────────────────────────────────
// Story 180 — V5 (5th Edition) reference data. The wod-v5 sheet is migrating off
// the V20 constants above (TALENTS/SKILLS/KNOWLEDGES, ATTRIBUTE_GROUPS, blood pool)
// onto these. Vampire-only. Labels in pt-BR matching the official V5 BR sheet.
// ─────────────────────────────────────────────────────────────────────────────

// V5 atributos: Físicos (Força/Destreza/Vigor), Sociais (Carisma/Manipulação/
// Autocontrole), Mentais (Inteligência/Raciocínio/Determinação). Sem Aparência/Percepção.
export const V5_ATTRIBUTE_GROUPS: { key: string; label: string; traits: { key: string; label: string }[] }[] = [
  { key: "fisicos", label: "Físicos", traits: [
    { key: "forca", label: "Força" },
    { key: "destreza", label: "Destreza" },
    { key: "vigor", label: "Vigor" },
  ] },
  { key: "sociais", label: "Sociais", traits: [
    { key: "carisma", label: "Carisma" },
    { key: "manipulacao", label: "Manipulação" },
    { key: "autocontrole", label: "Autocontrole" },
  ] },
  { key: "mentais", label: "Mentais", traits: [
    { key: "inteligencia", label: "Inteligência" },
    { key: "raciocinio", label: "Raciocínio" },
    { key: "determinacao", label: "Determinação" },
  ] },
];
export const V5_ATTRIBUTE_KEYS: string[] = V5_ATTRIBUTE_GROUPS.flatMap((g) => g.traits.map((t) => t.key));

// V5 perícias (27) em 3 colunas. Ordem e rótulos batem com a ficha oficial BR (a mesma
// ordem alfabética do inglês: Athletics, Brawl, Craft…). `key` estável p/ specialties.
export const V5_SKILL_GROUPS: { key: keyof V5Skills; label: string; skills: string[] }[] = [
  { key: "fisicas", label: "Físicas", skills: [
    "Atletismo", "Briga", "Ofícios", "Condução", "Armas de Fogo", "Furto", "Armas Brancas", "Furtividade", "Sobrevivência",
  ] },
  { key: "sociais", label: "Sociais", skills: [
    "Empatia c/ Animais", "Etiqueta", "Intuição", "Intimidação", "Liderança", "Performance", "Persuasão", "Manha", "Astúcia",
  ] },
  { key: "mentais", label: "Mentais", skills: [
    "Erudição", "Prontidão", "Finanças", "Investigação", "Medicina", "Ocultismo", "Política", "Ciência", "Tecnologia",
  ] },
];

export type V5Skills = { fisicas: Trait[]; sociais: Trait[]; mentais: Trait[] };

// ─── Story 192 — Combat part 1: initiative ──────────────────────────────────
// Projected combat-turn state for wod-v5 (read as state.wodV5Turn). The reducer is
// STORE-ONLY; the order is computed in the UI and synced via WOD_V5_INITIATIVE_ORDER_SET.
export type WodV5GroupKey = "melee_engaged" | "ranged" | "melee_starting" | "other";
export type WodV5CombatType = "simple" | "advanced";
// Story 202 — ADVANCED sub-mode: "groups" reuses Simple's action-group lanes; "traditional" is a
// linear Compostura+Consciência trait order with NO lanes. Default "traditional" (= pre-202 advanced).
export type WodV5AdvancedInit = "groups" | "traditional";

// Story 203/204 (ported into the package by story 208 — parity with the front reducer). The action
// menu's attack maneuvers + the transient per-character combat flags they set. These MUST match the
// frontend `src/systems/wod-v5/types.ts` exactly so the backend snapshot preserves them; any front
// change here has to be mirrored + republished before a backend deploy (see story 208).
export type WodV5AttackManeuver = "normal" | "bite" | "focused" | "grapple" | "surprise" | "total_attack" | "total_defense";

// Transient per-character combat flags. All optional; absent = false/none.
export interface WodV5ActionFlags {
  grappledBy?: string;            // this char is grappled/bitten by <attackerId> → menu disabled
  grappling?: string;             // this char is holding <targetId> in a grapple
  biteHold?: string;              // vampire attacker keeps a bite-hold on <targetId>
  noDefenseUntilRound?: number;   // Ataque Total: no reactive defense while currentRound === this
  totalDefenseRound?: number;     // Defesa Total: +1 die on defense while currentRound === this
  // Story 204 — the four wired actions:
  shieldingAlly?: string;         // BLOQUEIO: this char readied a shield guarding <allyId>
  shieldRound?: number;           // BLOQUEIO: round the shield was declared (active while === currentRound)
  maneuverPending?: boolean;      // MANOBRA: actor rolled a Manobra test; GM must still grant +1..+3
  maneuverBonusNextTurn?: number; // MANOBRA: +N (1..3) auto-added to the NEXT attack pool, then cleared
}

export interface WodV5TurnState {
  setupPhase: boolean;                  // the initiative box is open
  combatType: WodV5CombatType;          // "simple" | "advanced"
  advancedInit?: WodV5AdvancedInit;     // Story 202 — ADVANCED sub-mode (default "traditional")
  slots: Record<string, WodV5GroupKey>; // SIMPLE / ADVANCED+GRUPOS: characterId → lane (absent = tray/unassigned)
  advancedAttr: string;                 // ADVANCED+TRADICIONAL: 1st-term attribute key (default "autocontrole")
  advancedSkill: string;                // ADVANCED+TRADICIONAL: 2nd-term skill name (default "Prontidão")
  order: string[];                      // current computed/committed order (first → last)
  manualOrdered: boolean;               // GM used the arrows → freeze auto-recompute until inputs change
  // Story 202 — "Passar a vez" (TRADICIONAL) sends the actor to the END of the order for THIS ROUND
  // ONLY. `roundBaseOrder` = the turnOrder snapshot to restore when the round rolls over; `passRound`
  // = the round the snapshot belongs to. Both transient (cleared at the next round).
  passRound?: number | null;
  roundBaseOrder?: string[] | null;
  // Story 193 — Combat part 2: attack & damage resolution.
  combatRes?: WodV5CombatRes | null;    // the current live attack contest (attacker rolled; waiting defense)
  damageQueue?: WodV5DamageRes[];        // GM apply boxes (ties/multi-target push >1); the modal shows [0]
  // Story 196 (E4) — cumulative multi-defender penalty. `defenseHitsThisRound[defenderId]` = how many
  // attacks that defender already suffered THIS round (−1 defense die per successive attacker).
  // `defenseHitsRound` = the platform round those counts belong to (reset when it changes).
  defenseHitsThisRound?: Record<string, number>;
  defenseHitsRound?: number;
  // Story 203/204 (ported by story 208) — action-menu flags keyed by characterId (grapple/bite/
  // no-defense/total-defense/shield/maneuver-bonus). Store-only; survives the backend snapshot.
  actionFlags?: Record<string, WodV5ActionFlags>;
}

// Story 193 — V5 damage type. Saúde V5 só tem Superficial ("S") e Agravado ("A").
export type WodV5DamageType = "S" | "A";

// Story 193 + FU6 (duel ceremony) — one live attack contest shown as a PUBLIC duel: the
// attacker (already rolled) vs EACH target. Each target carries its own defense roll + status
// so all duels show simultaneously and defenders may roll in any order. Store-only; the UI
// computes the outcome and opens the damage box(es).
export type WodV5DuelStatus = "awaiting" | "rolled" | "auto";

// One attacker→target duel within a (possibly multi-target) attack.
export interface WodV5DuelTarget {
  defenderId: string;
  penalty: number;                      // DEPRECATED (Story 196 E3): the old multi-target −1-success/
                                        // target cost. Replaced by the dice-SPLIT (attackerSuccesses
                                        // per target). Kept as 0 for back-compat; not used in math.
  // Story 196 (E3) — per-target ATTACKER successes from the dice allocated to THIS target (the
  // attacker splits the pool across targets). null until the attacker rolls this target's subset;
  // for a single-target attack it is the whole-pool roll. `attackerDice` = dice allocated (display).
  attackerSuccesses?: number | null;
  attackerDice?: number;
  // Story 196 (E4) — defense dice this defender loses vs THIS attack (= attacks already suffered
  // this round before this one): 0 vs the 1st attacker, 1 vs the 2nd, 2 vs the 3rd…
  defensePenalty?: number;
  bilateral: boolean;                   // frozen per attacker↔this-defender pair (from the lanes)
  defenderSuccesses: number | null;     // null until this defender rolls
  defenderWeaponDmg: number | null;
  defenderWeaponType: WodV5DamageType | null;
  defenderNote: string | null;
  status: WodV5DuelStatus;              // awaiting → rolled | auto (pool 0 → takes dmg)
  resolved?: boolean;                   // GM outcome computed + damage box opened for this target
  // Story 204 (ported by story 208) — BLOQUEIO: a guardian rolled THIS line in the ally's place.
  blockedBy?: string;
}

export interface WodV5CombatRes {
  resolutionId: string;
  attackerId: string;
  attackerSuccesses: number;            // attacker already rolled (one roll for all targets)
  attackerWeaponDmg: number;            // weapon damage modifier (0 = unarmed)
  attackerWeaponType: WodV5DamageType;  // "S" default
  attackerNote: string;                 // pool description for the log/box
  targets: WodV5DuelTarget[];           // one per chosen target; all shown in the duel ceremony
  phase: "active" | "resolved";         // active = some target still to roll; resolved = all in
  // Story 203 (ported by story 208) — the maneuver frozen at declaration (drives the front's
  // computeV5Outcome overrides). Absent (or "normal") = today's behavior byte-identical.
  maneuver?: WodV5AttackManeuver;
  focusedPenalty?: number;              // "focused" only — log/box note (penalty already in the roll)
}

// Story 193 — the GM apply step (mirrors the wod-v20 damageRes). A queue: ties / multi-target
// push more than one. The modal renders damageQueue[0].
export interface WodV5DamageRes {
  resolutionId: string;                 // links to the combat res (dedupe the auto-opener)
  fromId: string;                       // who deals it (winner)
  toId: string;                         // who receives it (loser)
  amount: number;                       // flat damage BEFORE halving (margin + weapon, or weapon/1 on tie)
  halved: boolean;                      // auto true when receiver is Vampiro and type === "S"
  type: WodV5DamageType;                // GM-editable
  final: number;                        // after halving (what gets distributed)
  health: V5Damage[];                   // GM-marked target track draft (absolute on confirm)
}

// The 4 SIMPLE-mode action groups. Acting priority = array order (top acts first).
export const WOD_V5_GROUPS: { key: WodV5GroupKey; label: string; color: string; rgb: string; priority: number }[] = [
  { key: "melee_engaged",  label: "Corpo a Corpo Iniciado",  color: "#b91c1c", rgb: "185,28,28",  priority: 0 },
  { key: "ranged",         label: "Distância",               color: "#2563eb", rgb: "37,99,235",  priority: 1 },
  { key: "melee_starting", label: "Corpo a Corpo a Iniciar", color: "#f97316", rgb: "249,115,22", priority: 2 },
  { key: "other",          label: "Outras Manobras",         color: "#8b5cf6", rgb: "139,92,246", priority: 3 },
];
export const WOD_V5_GROUP_PRIORITY: Record<WodV5GroupKey, number> = {
  melee_engaged: 0, ranged: 1, melee_starting: 2, other: 3,
};
// "Consciência" → Prontidão (the V5 Awareness skill). The GM dropdown can change it.
export const WOD_V5_DEFAULT_ADVANCED_SKILL = "Prontidão";
// Compostura = the V5 attribute keyed "autocontrole". The GM dropdown can change it too.
export const WOD_V5_DEFAULT_ADVANCED_ATTR = "autocontrole";

// V5 clãs (14 + a "categoria extra" Sangue-Ralo). Lista definida pelo dono (story 180).
export const V5_CLANS: string[] = [
  "Banu Haqim", "Brujah", "Gangrel", "Hecata", "Lasombra", "Malkaviano", "Ministério",
  "Nosferatu", "Ravnos", "Salubri", "Toreador", "Tremere", "Tzimisce", "Ventrue",
  "Sangue-Ralo",
];

// Story 181 — Seitas do V5. Lista do dono (substitui as seitas V20). "Outro" é tratado
// como texto livre no criador.
export const V5_SECTS: string[] = ["Camarilla", "Anarquistas", "Independentes", "Sabbat", "Ashirra"];

// Story 181 — Fraqueza (bane) de cada clã do V5, condensada em UMA frase curta e direta
// (só a mecânica). Sangue-Ralo intencionalmente ausente (sem fraqueza). Exibida como linha
// DERIVADA somente-leitura no bloco de Status; a caixa livre "Maldição do Clã" (clanBane)
// continua separada e editável.
export const V5_CLAN_WEAKNESS: Record<string, string> = {
  "Banu Haqim": "Ao beber o sangue de outro vampiro, teste frenesi de Fome (dif. 2 + Potência de Sangue do alvo) ou entra em frenesi para drená-lo.",
  "Brujah": "Penalidade igual à sua Potência de Sangue para resistir a frenesi de fúria.",
  "Gangrel": "Ao entrar em frenesi, ganha traços bestiais por uma noite inteira: penalidade igual à Potência de Sangue em testes de Carisma/Manipulação.",
  "Hecata": "O Beijo causa dor agonizante, não êxtase: vítimas livres lutam para fugir e a mordida em combate causa um dano agravado extra.",
  "Lasombra": "Sua imagem aparece distorcida em espelhos/câmeras/gravações; penalidade igual à Potência de Sangue ao usar tecnologia (telas, microfones, celulares).",
  "Malkaviano": "Possui um Transtorno mental incurável que se manifesta com penalidades em ações por uma cena ao sofrer Falha Crítica ou Falha Bestial.",
  "Ministério": "Sob luz forte ou solar, penalidade igual à Potência de Sangue em todos os testes, somada também ao dano agravado recebido da luz solar.",
  "Nosferatu": "Não passa por humano sem Disciplinas: Aparência sempre 0 e penalidade em qualquer teste social em que a aparência possa pesar contra.",
  "Ravnos": "Dormir mais de uma vez por semana a menos de 1 km do mesmo lugar causa dano agravado ao acordar na noite seguinte.",
  "Salubri": "Ao usar uma Disciplina, o terceiro olho abre e chora sangue impossível de ocultar; seu sangue é saboroso demais e tenta outros vampiros a diablerizá-lo.",
  "Toreador": "Diante de algo de grande beleza, teste Autocontrole ou fica hipnotizado, com penalidades massivas em qualquer ação que não seja contemplá-lo.",
  "Tremere": "Nunca consegue criar um Laço de Sangue completo em outro vampiro (mas ainda pode ser laçado por outros).",
  "Tzimisce": "Deve descansar cercado por terra de sua terra natal ou dentro de seu domínio escolhido; senão sofre penalidades cumulativas a cada noite.",
  "Ventrue": "Só consegue se alimentar de um tipo específico de presa, escolhido na criação; qualquer outro sangue é vomitado e não sacia a Fome.",
};

export function getV5ClanWeakness(clan?: string): string {
  return V5_CLAN_WEAKNESS[clan ?? ""] ?? "";
}

// Story 181 — blindagem (proteção) por classe de armadura V5.
export const V5_ARMOR_VALUE: Record<NonNullable<Armor["armorType"]>, number> = {
  leve: 2, media: 4, pesada: 6, militar: 8,
};
export const V5_ARMOR_TYPE_LABEL: Record<NonNullable<Armor["armorType"]>, string> = {
  leve: "Leve", media: "Média", pesada: "Pesada", militar: "Militar",
};

// V5 disciplinas (12). Cada ficha guarda rating (bolinhas) + poderes nomeados.
export const V5_DISCIPLINES: string[] = [
  "Animalismo", "Auspício", "Celeridade", "Dominação", "Feitiçaria de Sangue", "Fortitude",
  "Metamorfose", "Oblívio", "Ofuscação", "Potência", "Presença", "Alquimia de Sangue-Ralo",
];

// Descrições curtas das disciplinas (para tooltips/ajuda na aba de Disciplinas). Texto do dono.
export const V5_DISCIPLINE_DESCRIPTIONS: Record<string, string> = {
  "Animalismo": "Permite comunicação e comando sobre animais, além de apaziguar ou enfurecer a Besta interior de outros vampiros.",
  "Auspício": "Concede sentidos sobrenaturais, permitindo ver no escuro, ler mentes, ver auras emocionais e receber premonições.",
  "Celeridade": "Fornece reflexos, precisão e velocidade sobre-humanas, quebrando as leis da física sem sofrer danos.",
  "Dominação": "Permite o controle mental direto, obrigando obediência e manipulando memórias através do contato visual e da voz.",
  "Feitiçaria de Sangue": "Converte o sangue vampírico em magia tangível, criando desde venenos paralisantes até ataques corrosivos.",
  "Fortitude": "Garante resistência inabalável contra danos físicos severos e imunidade contra tentativas de manipulação mental.",
  "Metamorfose": "Modifica o corpo do vampiro, permitindo criar garras de fera, fundir-se à terra ou transformar-se em animais selvagens.",
  "Oblívio": "Permite manipular as sombras do Abismo e conjurar os espectros e poderes diretamente do submundo.",
  "Ofuscação": "Engana o cérebro das pessoas ao redor para apagar a própria presença, tornando o vampiro invisível ou irreconhecível.",
  "Potência": "Confere força bruta de escala sobrenatural, capaz de realizar proezas físicas destrutivas e saltos imensos.",
  "Presença": "Manipula as emoções de grupos simultaneamente, forçando sentimentos como adoração apaixonada, fascínio cego ou puro terror.",
  "Alquimia de Sangue-Ralo": "Utiliza o sangue humano com emoções específicas misturado a materiais físicos para imitar temporariamente os poderes de outras disciplinas.",
};

// Disciplinas de clã do V5 (3 por clã; Sangue-Ralo = só Alquimia de Sangue-Ralo). Lista do dono.
export const V5_CLAN_DISCIPLINES: Record<string, string[]> = {
  "Banu Haqim": ["Celeridade", "Feitiçaria de Sangue", "Ofuscação"],
  Brujah: ["Celeridade", "Potência", "Presença"],
  Gangrel: ["Animalismo", "Fortitude", "Metamorfose"],
  Hecata: ["Auspício", "Fortitude", "Oblívio"],
  Lasombra: ["Dominação", "Oblívio", "Potência"],
  Malkaviano: ["Auspício", "Dominação", "Ofuscação"],
  Ministério: ["Metamorfose", "Ofuscação", "Presença"],
  Nosferatu: ["Animalismo", "Ofuscação", "Potência"],
  Ravnos: ["Animalismo", "Ofuscação", "Presença"],
  Salubri: ["Auspício", "Dominação", "Fortitude"],
  Toreador: ["Auspício", "Celeridade", "Presença"],
  Tremere: ["Auspício", "Dominação", "Feitiçaria de Sangue"],
  Tzimisce: ["Animalismo", "Dominação", "Metamorfose"],
  Ventrue: ["Dominação", "Fortitude", "Presença"],
  "Sangue-Ralo": ["Alquimia de Sangue-Ralo"],
};

// Story 181 — nome PT da disciplina V5 → slug de ícone (/vtm/disciplines/<slug>.webp).
// Os nomes V5 (Celeridade/Auspício/Oblívio/Feitiçaria de Sangue/Alquimia de Sangue-Ralo)
// diferem dos nomes V20 de DISCIPLINE_ICON_BY_NAME, por isso este mapa próprio.
export const V5_DISCIPLINE_ICON_BY_NAME: Record<string, string> = {
  "Animalismo": "animalism",
  "Auspício": "auspex",
  "Celeridade": "celerity",
  "Dominação": "dominate",
  "Feitiçaria de Sangue": "thaumaturgy",
  "Fortitude": "fortitude",
  "Metamorfose": "protean",
  "Oblívio": "oblivion",
  "Ofuscação": "obfuscate",
  "Potência": "potence",
  "Presença": "presence",
  "Alquimia de Sangue-Ralo": "thinblood-alchemy",
};

// Tipos de Predador (V5). Como o vampiro caça e se alimenta.
export const V5_PREDATOR_TYPES: string[] = [
  "Alley Cat", "Bagger", "Blood Leech", "Cleaver", "Consensualist", "Farmer",
  "Osiris", "Sandman", "Scene Queen", "Siren", "Extorquidor", "Grim Reaper",
  "Graveyard", "Pursuer", "Trapdoor", "Outro",
];

// Ressonâncias do sangue (V5): humor predominante do recipiente.
export const V5_RESONANCES: string[] = [
  "Sanguínea", "Colérica", "Melancólica", "Fleumática", "Vazia", "Animal",
];

// Tabela de Potência de Sangue (Blood Potency) do V5. Por nível (0..10): bônus de
// Investida de Sangue, dano superficial curado por Reavivar, bônus de Disciplina,
// nível de re-rolagem da Excitação (Rouse), Severidade da Maldição (Bane) e
// Penalização por Alimentação. Story 188 — feedingPenalty adicionado (antes era texto editável).
export const BLOOD_POTENCY_TABLE: { surge: number; mend: number; powerBonus: number; rouseReroll: number; bane: number; feedingPenalty: string }[] = [
  { surge: 1, mend: 1, powerBonus: 0, rouseReroll: 0, bane: 0, feedingPenalty: "Nenhuma." }, // 0 (Sangue Ralo)
  { surge: 2, mend: 1, powerBonus: 0, rouseReroll: 1, bane: 2, feedingPenalty: "Nenhuma." }, // 1
  { surge: 2, mend: 2, powerBonus: 1, rouseReroll: 1, bane: 2, feedingPenalty: "Sangue animal e de bolsa sacia metade da Fome." }, // 2
  { surge: 3, mend: 2, powerBonus: 1, rouseReroll: 2, bane: 3, feedingPenalty: "Sangue animal e de bolsa não sacia Fome." }, // 3
  { surge: 3, mend: 3, powerBonus: 2, rouseReroll: 2, bane: 3, feedingPenalty: "Sangue animal e de bolsa não sacia Fome. Saciar 1 de Fome exige drenar um humano até a morte." }, // 4
  { surge: 4, mend: 3, powerBonus: 2, rouseReroll: 3, bane: 4, feedingPenalty: "Sangue animal e de bolsa não sacia Fome. Saciar 1 de Fome exige drenar um humano até a morte." }, // 5
  { surge: 4, mend: 3, powerBonus: 3, rouseReroll: 3, bane: 4, feedingPenalty: "Saciar 1 de Fome exige drenar e matar um humano. Sangue animal e de bolsa não têm efeito." }, // 6
  { surge: 5, mend: 3, powerBonus: 3, rouseReroll: 4, bane: 5, feedingPenalty: "Saciar 1 de Fome exige drenar e matar um humano. Sangue animal e de bolsa não têm efeito." }, // 7
  { surge: 5, mend: 4, powerBonus: 4, rouseReroll: 4, bane: 5, feedingPenalty: "Saciar 1 de Fome exige drenar e matar um humano. Não baixa abaixo de 2 sem sangue de vampiro de Potência igual ou maior." }, // 8
  { surge: 6, mend: 4, powerBonus: 4, rouseReroll: 5, bane: 6, feedingPenalty: "Saciar 1 de Fome exige drenar e matar um humano. Não baixa abaixo de 2 sem sangue de vampiro de Potência igual ou maior." }, // 9
  { surge: 6, mend: 5, powerBonus: 5, rouseReroll: 5, bane: 6, feedingPenalty: "Saciar 1 de Fome exige drenar e matar um humano. Não baixa abaixo de 3 sem sangue de vampiro de Potência igual ou maior." }, // 10
];

export function getBloodPotencyDerived(bp = 0) {
  const i = Math.max(0, Math.min(10, Math.floor(bp)));
  return BLOOD_POTENCY_TABLE[i];
}

// V5 — caixas de Saúde = Vigor + 3; caixas de Vontade = Autocontrole + Determinação.
export function getV5HealthMax(stamina = 1): number {
  return Math.max(1, stamina) + 3;
}
export function getV5WillpowerMax(composure = 1, resolve = 1): number {
  return Math.max(0, composure) + Math.max(0, resolve);
}

// Health levels (7) — in order, with standard V20 penalty
export const HEALTH_LEVELS: { label: string; penalty: string }[] = [
  { label: "Machucado", penalty: "0" },
  { label: "Ferido", penalty: "-1" },
  { label: "Lesionado", penalty: "-1" },
  { label: "Gravemente Ferido", penalty: "-2" },
  { label: "Mutilado", penalty: "-2" },
  { label: "Aleijado", penalty: "-5" },
  { label: "Incapacitado", penalty: "—" },
];

// Story 167 — Regra de Figurantes (mortal "Comum"): vitalidade reduzida a 4 níveis,
// para mortais sem nome encontrados de forma aleatória. Machucado (−1), Mutilado (−3),
// Incapacitado (não age) e Morto (a 4ª caixa cheia = morte). NÃO usa níveis extras.
export const FIGURANTE_HEALTH_LEVELS: { label: string; penalty: string }[] = [
  { label: "Machucado", penalty: "-1" },
  { label: "Mutilado", penalty: "-3" },
  { label: "Incapacitado", penalty: "—" },
  { label: "Morto", penalty: "—" },
];

export type HealthProfile = "standard" | "figurante";

// Tabela de níveis de vitalidade conforme o perfil do personagem.
export function getHealthLevels(profile?: string): { label: string; penalty: string }[] {
  return profile === "figurante" ? FIGURANTE_HEALTH_LEVELS : HEALTH_LEVELS;
}
// Total de caixas de saúde: padrão = 7 + níveis extras; figurante = 4 fixo (sem extras).
export function getHealthTotalSlots(profile?: string, healthExtraLevels = 0): number {
  return profile === "figurante" ? FIGURANTE_HEALTH_LEVELS.length : HEALTH_LEVELS.length + healthExtraLevels;
}

export const HUMANITY_PATHS: string[] = [
  "Humanidade",
  "Caminho do Sangue",
  "Caminho de Caim",
  "Caminho dos Cátaros",
  "Caminho da Morte e da Alma",
  "Caminho do Acordo Honrado",
  "Caminho de Lilith",
  "Caminho da Noite",
  "Caminho do Poder e da Voz Interior",
  "Caminho de Tífon",
  "Caminho da Metamorfose",
  "Caminho do Coração Selvagem",
  "Outro",
];

// Tab 5 — entry types for the "Expand." page
export const EXPANDED_TYPES: string[] = [
  "Aliados",
  "Mentor",
  "Contatos",
  "Fama",
  "Rebanho",
  "Influência",
  "Recursos",
  "Lacaios",
  "Status",
  "Outro",
  "Campos de Caça",
  "Veículos",
  "Laços de Sangue",
  "Refúgios",
];

// ── Band colors (Story 139) ───────────────────────────────────────────────────
// Fixed colors for the always-colored section headers.
export const BAND_FIXED = {
  attributes: "#16223f",  // dark blue  — Físicos / Sociais / Mentais
  abilities:  "#5a2e08",  // dark orange — Talentos / Perícias / Conhecimentos
  disciplines:"#3d0f0f",  // dark red   — Disciplinas
  health:     "#0f3018",  // dark green — Saúde
  bloodPool:  "#3d0f0f",  // dark red   — Reserva de Sangue
} as const;

// Stable keys for the user-editable Q/Combate collapsible bands.
export const QC_SECTION_KEYS = {
  merits:  "qc.merits",
  others:  "qc.others",
  combat:  "qc.combat",
  rituals: "qc.rituals",
  xp:      "qc.xp",
} as const;

// Default band color for Q/Combate and Expand entries before user overrides.
export const QC_DEFAULT_COLOR = "#1e1610";

// ── Symbols (served from /public/vtm, tinted with the theme accent color) ─────
// Clan/bloodline display name -> file slug under /vtm/clans/<slug>.webp.
// Only clans with available art are listed; the rest fall back to the initial.
export const CLAN_SYMBOL_SLUGS: Record<string, string> = {
  Assamita: "assamita",
  Brujah: "brujah",
  Gangrel: "gangrel",
  Giovanni: "giovanni",
  Lasombra: "lasombra",
  Malkaviano: "malkaviano",
  Nosferatu: "nosferatu",
  Ravnos: "ravnos",
  "Seguidores de Set": "seguidores-de-set",
  Toreador: "toreador",
  Tremere: "tremere",
  Tzimisce: "tzimisce",
  Ventrue: "ventrue",
  Caitiff: "caitiff",
  "Sangue-Fraco": "sangue-fraco",
  Salubri: "salubri",
  Ahrimanes: "ahrimanes",
  Baali: "baali",
  Capadócios: "capadocios",
  "Filhas da Cacofonia": "filhas-da-cacofonia",
  Gárgulas: "gargulas",
  Kiasyd: "kiasyd",
  Lamia: "lamia",
  Nagaraja: "nagaraja",
  "Arautos das Caveiras": "arautos-das-caveiras",
  Samedi: "samedi",
  "Verdadeiro Brujah": "verdadeiro-brujah",
};

export function clanSymbolUrl(clan: string): string | null {
  const slug = CLAN_SYMBOL_SLUGS[clan];
  return slug ? `/vtm/clans/${slug}.webp` : null;
}

// Sect display name -> slug under /vtm/sects/<slug>.webp (converted from SVG/PNG).
// All sect symbols are .webp with transparent bg, tinted via SymbolMask CSS mask.
export const SECT_SYMBOL_SLUGS: Record<string, string> = {
  "Camarilla":            "camarilla",
  "Sabá":                 "saba",
  "Movimento Anarquista": "anarquista",
  "Independentes":        "independentes",
  "Mão Negra":            "mao-negra",
  "Tal'Mahe'Ra":          "talmahe-ra",
};

export function sectSymbolUrl(sect: string): string | null {
  const slug = SECT_SYMBOL_SLUGS[sect];
  return slug ? `/vtm/sects/${slug}.webp` : null;
}

// Available discipline icons for the per-discipline icon picker.
export const DISCIPLINE_ICONS: { slug: string; label: string }[] = [
  { slug: "animalism", label: "Animalismo" },
  { slug: "auspex", label: "Auspícios" },
  { slug: "celerity", label: "Celeridade" },
  { slug: "dominate", label: "Dominação" },
  { slug: "fortitude", label: "Fortitude" },
  { slug: "obfuscate", label: "Ofuscação" },
  { slug: "oblivion", label: "Oblívio" },
  { slug: "potence", label: "Potência" },
  { slug: "presence", label: "Presença" },
  { slug: "protean", label: "Protean" },
  { slug: "thaumaturgy", label: "Taumaturgia" },
  { slug: "thinblood-alchemy", label: "Alquimia de Sangue-Fraco" },
];

export function disciplineIconUrl(slug: string): string {
  return `/vtm/disciplines/${slug}.webp`;
}

// ─── Disciplinas iniciais por clã (V20) ───
// Aplicadas na CRIAÇÃO da ficha (ver reducer CHARACTER_CREATED + buildClanDisciplines).
// Caitiff e Sangue-Fraco ficam SEM disciplina inicial (ausentes do mapa).
export const CLAN_DISCIPLINES: Record<string, string[]> = {
  // 13 Clãs Principais
  Assamita: ["Rapidez", "Ofuscação", "Quietus"],
  Brujah: ["Rapidez", "Potência", "Presença"],
  Gangrel: ["Animalismo", "Fortitude", "Metamorfose"],
  Giovanni: ["Dominação", "Necromancia", "Potência"],
  Lasombra: ["Dominação", "Tenebrosidade", "Potência"],
  Malkaviano: ["Auspícios", "Demência", "Ofuscação"],
  Nosferatu: ["Animalismo", "Ofuscação", "Potência"],
  Ravnos: ["Animalismo", "Fortitude", "Quimerismo"],
  "Seguidores de Set": ["Ofuscação", "Presença", "Serpentis"],
  Toreador: ["Auspícios", "Rapidez", "Presença"],
  Tremere: ["Auspícios", "Dominação", "Taumaturgia"],
  Tzimisce: ["Animalismo", "Auspícios", "Vicissitude"],
  Ventrue: ["Dominação", "Fortitude", "Presença"],
  // Linhagens Menores
  Ahrimanes: ["Animalismo", "Presença", "Spiritus"],
  "Arautos das Caveiras": ["Auspícios", "Fortitude", "Necromancia"],
  Baali: ["Daimoinon", "Ofuscação", "Presença"],
  Capadócios: ["Auspícios", "Fortitude", "Necromancia"],
  "Filhas da Cacofonia": ["Fortitude", "Melpominee", "Presença"],
  Gárgulas: ["Fortitude", "Potência", "Visceratika", "Vôo"],
  Kiasyd: ["Dominação", "Mytherceria", "Tenebrosidade"],
  Lamia: ["Fortitude", "Necromancia", "Potência"],
  Nagaraja: ["Auspícios", "Dominação", "Necromancia"],
  Salubri: ["Auspícios", "Fortitude", "Obeah"],
  Samedi: ["Fortitude", "Ofuscação", "Tanatose"],
  "Verdadeiro Brujah": ["Potência", "Presença", "Temporis"],
};

// Salubri antitribu (guerreiros do Sabá) trocam Obeah por Valeren.
export const SALUBRI_ANTITRIBU_DISCIPLINES = ["Auspícios", "Fortitude", "Valeren"];

// Disciplinas que já começam com 1 ponto grátis (ex.: Gárgulas → Vôo 1).
export const CLAN_FREE_DISCIPLINE_DOT: Record<string, string> = {
  Gárgulas: "Vôo",
};

// Nome PT da disciplina → slug de ícone (arquivos reais em /vtm/disciplines/).
// Ícones disponíveis: animalism, auspex, celerity, dominate, fortitude, obfuscate,
// oblivion, potence, presence, protean, thaumaturgy, thinblood-alchemy.
export const DISCIPLINE_ICON_BY_NAME: Record<string, string> = {
  Rapidez: "celerity",
  Ofuscação: "obfuscate",
  Potência: "potence",
  Presença: "presence",
  Animalismo: "animalism",
  Fortitude: "fortitude",
  Metamorfose: "protean",
  Dominação: "dominate",
  Auspícios: "auspex",
  Taumaturgia: "thaumaturgy",
  // oblivion (V5: Necromancia + Obtenebração) → disciplinas de morte/sombra.
  Necromancia: "oblivion",
  Tenebrosidade: "oblivion",
  Tanatose: "oblivion",
  // ── Disciplinas de clã/linhagem sem ícone próprio → melhor ícone disponível ──
  Quietus: "oblivion",        // morte silenciosa (Assamita)
  Demência: "presence",       // manipulação mental/emocional (Malkaviano)
  Quimerismo: "obfuscate",    // ilusões (Ravnos)
  Serpentis: "protean",       // transformação serpentina (Seguidores de Set)
  Vicissitude: "protean",     // moldagem de carne (Tzimisce)
  Spiritus: "auspex",         // percepção espiritual (Ahrimanes)
  Daimoinon: "oblivion",      // poder demoníaco/trevas (Baali)
  Melpominee: "presence",     // voz/canto (Filhas da Cacofonia)
  Visceratika: "protean",     // fusão com pedra/terra (Gárgulas)
  Vôo: "celerity",            // voo/movimento (Gárgulas)
  Mytherceria: "thaumaturgy", // magia feérica (Kiasyd)
  Obeah: "thaumaturgy",       // cura mística (Salubri)
  Valeren: "potence",         // Salubri guerreiro (antitribu)
  Temporis: "celerity",       // manipulação do tempo (Verdadeiro Brujah)
  // Story 152 T5 — disciplinas de linhagem/suplemento que faltavam ícone.
  Bardo: "fortitude",         // pureza/autodomínio
  Sanguinus: "thinblood-alchemy", // manipulação de sangue (Sangue Frágil)
  Abombwe: "animalism",       // espírito predador (Laibon)
  Ogham: "thaumaturgy",       // magia ritual (V20 Idade das Trevas)
};

// Story 152 T5 — lista canônica de TODAS as disciplinas V20, agrupada para o
// seletor "+ Disciplina" da ficha (TabAtributosHabilidades). Os nomes DEVEM bater
// exatamente com CLAN_DISCIPLINES / DISCIPLINE_ICON_BY_NAME (a mecânica resolve
// Celeridade por NOME "Rapidez" — ver gameLogic.ts). Ícone via DISCIPLINE_ICON_BY_NAME.
export const V20_DISCIPLINE_GROUPS: { group: string; names: string[] }[] = [
  {
    group: "Disciplinas Comuns",
    names: ["Animalismo", "Auspícios", "Dominação", "Fortitude", "Ofuscação", "Potência", "Presença", "Rapidez"],
  },
  {
    group: "Exclusivas de Clã",
    names: ["Demência", "Metamorfose", "Necromancia", "Quimerismo", "Quietus", "Serpentis", "Taumaturgia", "Tenebrosidade", "Vicissitude"],
  },
  {
    group: "De Linhagens",
    names: ["Bardo", "Daimoinon", "Melpominee", "Mytherceria", "Obeah", "Sanguinus", "Spiritus", "Tanatose", "Temporis", "Valeren", "Visceratika", "Vôo"],
  },
  {
    group: "Outras (Suplementos / V20 Idade das Trevas)",
    names: ["Abombwe", "Ogham"],
  },
];

// ─── Story 140: identidade visual por clã (cor de tema + fonte dos nomes) ───
// Cores vêm das paletas de referência do owner ("Paleta de cores dos clãs").
// `accent`/`title` são aplicadas como a cor CUSTOMIZADA de acento/título do TEMA
// (semeadas na criação da ficha — ver CharacterCreator). `font` estiliza SOMENTE
// o nome do clã e o nome do personagem no WodHeader. `fontUrl` = query css2 do
// Google Fonts (omitido quando a família já é carregada pelo tema gótico: Cinzel).
export interface ClanStyle {
  accent: string;
  title: string;
  font: string; // CSS font-family
  fontUrl?: string; // query css2 do Google Fonts (sem a URL base)
}

export const DEFAULT_CLAN_STYLE: ClanStyle = {
  accent: "#FF2E51",
  title: "#F5F0EA",
  font: "'Cinzel', serif",
};

const FONT_MARCELLUS = "family=Marcellus+SC";
const FONT_OSWALD = "family=Oswald:wght@400;600;700";
const FONT_MEDIEVAL = "family=MedievalSharp";
const FONT_FELL = "family=IM+Fell+English+SC";
const FONT_METAMORPH = "family=Metamorphous";
const FONT_UNIFRAKTUR = "family=UnifrakturMaguntia";
const FONT_CINZEL_DECO = "family=Cinzel+Decorative:wght@400;700;900";

// NOTA: `accent` vira o --accent-color do tema, exibido sobre o FUNDO PRETO da
// página (texto, bordas, ícones, nome do clã). Por isso os accents são tons
// MÉDIOS/claros o bastante p/ ler no preto — mantendo o matiz/identidade de cada
// clã das paletas de referência (que tinham swatches escuros demais p/ esse uso).
const HECATA: ClanStyle = { accent: "#8794A3", title: "#F3EDF0", font: "'IM Fell English SC', serif", fontUrl: FONT_FELL };

export const CLAN_STYLE: Record<string, ClanStyle> = {
  // ── 13 Clãs Principais ──
  Assamita: { accent: "#C49A3C", title: "#F3E4B0", font: "'Marcellus SC', serif", fontUrl: FONT_MARCELLUS },
  Brujah: { accent: "#DA342B", title: "#FFB53D", font: "'Oswald', sans-serif", fontUrl: FONT_OSWALD },
  Gangrel: { accent: "#A3894A", title: "#CDB985", font: "'MedievalSharp', cursive", fontUrl: FONT_MEDIEVAL },
  Giovanni: { accent: "#8794A3", title: "#F3EDF0", font: "'IM Fell English SC', serif", fontUrl: FONT_FELL },
  Lasombra: { accent: "#7C73A0", title: "#C7C2E0", font: "'Marcellus SC', serif", fontUrl: FONT_MARCELLUS },
  Malkaviano: { accent: "#5E78B4", title: "#9CC2DC", font: "'Metamorphous', cursive", fontUrl: FONT_METAMORPH },
  Nosferatu: { accent: "#86A95C", title: "#BCE08C", font: "'UnifrakturMaguntia', cursive", fontUrl: FONT_UNIFRAKTUR },
  Ravnos: { accent: "#C13B2C", title: "#F1A63C", font: "'Cinzel Decorative', serif", fontUrl: FONT_CINZEL_DECO },
  "Seguidores de Set": { accent: "#9A57A3", title: "#7BD437", font: "'Cinzel Decorative', serif", fontUrl: FONT_CINZEL_DECO },
  Toreador: { accent: "#C81E4A", title: "#F3AFB6", font: "'Cinzel Decorative', serif", fontUrl: FONT_CINZEL_DECO },
  Tremere: { accent: "#B11D22", title: "#CCB2DC", font: "'Cinzel', serif" },
  Tzimisce: { accent: "#A03C8C", title: "#99B8AE", font: "'MedievalSharp', cursive", fontUrl: FONT_MEDIEVAL },
  Ventrue: { accent: "#3E4CA8", title: "#C8D2F0", font: "'Cinzel', serif" },

  // ── Exceções Essenciais (neutro, sem arte de referência) ──
  Caitiff: { accent: "#8A8A8A", title: "#C4C4C4", font: "'Cinzel', serif" },
  "Sangue-Fraco": { accent: "#82828E", title: "#B2B2BC", font: "'Cinzel', serif" },

  // ── Linhagens Menores ──
  // Clãs da morte herdam a paleta Hecata (clã unificado V5).
  Capadócios: HECATA,
  Lamia: HECATA,
  Nagaraja: HECATA,
  "Arautos das Caveiras": HECATA,
  Samedi: HECATA,
  Salubri: { accent: "#C04A62", title: "#E1FBFE", font: "'Cinzel', serif" },
  Ahrimanes: { accent: "#3E9582", title: "#8AD9C2", font: "'Metamorphous', cursive", fontUrl: FONT_METAMORPH },
  Baali: { accent: "#B02A22", title: "#F08C6E", font: "'UnifrakturMaguntia', cursive", fontUrl: FONT_UNIFRAKTUR },
  Gárgulas: { accent: "#888888", title: "#B4B4B4", font: "'MedievalSharp', cursive", fontUrl: FONT_MEDIEVAL },
  Kiasyd: { accent: "#4E4EA8", title: "#ABABE6", font: "'IM Fell English SC', serif", fontUrl: FONT_FELL },
  "Filhas da Cacofonia": { accent: "#C44E8E", title: "#F4A9D8", font: "'Cinzel Decorative', serif", fontUrl: FONT_CINZEL_DECO },
  "Verdadeiro Brujah": { accent: "#3E6A96", title: "#A9C0E6", font: "'Marcellus SC', serif", fontUrl: FONT_MARCELLUS },
};

export function getClanStyle(clan?: string | null): ClanStyle {
  if (!clan) return DEFAULT_CLAN_STYLE;
  return CLAN_STYLE[clan] ?? DEFAULT_CLAN_STYLE;
}

// URL completa do stylesheet Google Fonts para a query css2 do clã (ou null).
export function clanFontStylesheetUrl(fontUrl?: string): string | null {
  if (!fontUrl) return null;
  return `https://fonts.googleapis.com/css2?${fontUrl}&display=swap`;
}
