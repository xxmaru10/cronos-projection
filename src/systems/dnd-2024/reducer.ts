// src/systems/dnd-2024/reducer.ts
//
// Reducer do D&D 5E. 2024 para uso no BACKEND (snapshot).
// Copiado de front_sistema_rpg/src/systems/dnd-2024/reducer.ts — MANTER EM SYNC.
// Sem isto o pacote não conhecia o D&D: `getSystem("dnd-2024")` caía no Fate, e todo
// `DND_SYSTEM_DATA_PATCH` (PV, recursos gastos, marcas de combate) e o estado de mesa `DND_*`
// (iniciativa, zonas de magia, ofertas de reação) sumiam no snapshot do servidor.
//
// ÚNICA diferença do front: o CHARACTER_CREATED NÃO semeia a ficha. A semeadura
// (`seedDnd2014SystemData`) puxa o ruleset inteiro e o catálogo de magias; o front a reaplica
// e grava a ficha completa por CHARACTER_UPDATED. Aqui a ficha nasce com o systemData do payload.

import type { ActionEvent, SessionState, Character } from "../../types";

type DndTurnState = Record<string, any>;
type DndFallPending = { id: string; characterId: string; [k: string]: any };

/** Cópia de `DND_TURN_DEFAULTS` (front: src/systems/dnd-2024/types.ts). */
const DND_TURN_DEFAULTS: DndTurnState = {
  setupPhase: false,
  initiativeMode: "ability",
  traitByCharacter: {},
  totals: {},
  dice: {},
  order: [],
  manualOrdered: false,
};

/**
 * Story 272 — o saco de iniciativa, sempre completo. `state.dndTurn` pode não existir (sessão que
 * nunca abriu combate, ou logo depois de um `reset`), então TODO caso parte daqui em vez de
 * espalhar `?? {}` por seis lugares.
 */
function turnBag(state: SessionState): DndTurnState {
  return { ...DND_TURN_DEFAULTS, ...(((state as any).dndTurn as Partial<DndTurnState>) || {}) };
}

/** Devolve o estado com o saco de iniciativa trocado. `SessionState` não declara o campo (é o
 *  mesmo `as any` que os dois reducers de WoD usam para os seus). */
function withTurn(state: SessionState, next: DndTurnState): SessionState {
  return { ...state, dndTurn: next } as any;
}

/* Story 475 — o carimbo de "levou dano em fúria" (story 271) saiu: no SRD 5.2.1 levar dano não sustenta
   mais a Fúria. Quem a estende é o ataque, a salvaguarda forçada ou a Ação Bônus (`ruleset/rage.ts`). */

export function reduceDnd2024(state: SessionState, event: ActionEvent): SessionState {
  const { type, payload } = event;
  if (!payload) return state;
  const p = payload as any;

  switch (type as string) {
    case "CHARACTER_CREATED": {
      // Backend: sem semeadura (ver o cabeçalho). O front semeia e grava a ficha completa.
      const createdCharacter: Character = {
        ...p,
        source: p.source ?? "active",
        systemData: (p.systemData as Record<string, unknown>) || {},
      } as Character;
      return { ...state, characters: { ...state.characters, [p.id]: createdCharacter } };
    }

    case "CHARACTER_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const changes = { ...(p.changes || {}) };
      const nextSystemData = { ...(char.systemData || {}) } as Record<string, unknown>;
      if (changes.systemData) {
        Object.assign(nextSystemData, changes.systemData);
        delete changes.systemData;
      }
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, ...changes, systemData: nextSystemData },
        },
      };
    }

    case "DND_SYSTEM_DATA_PATCH": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const patch = (p.patch as Record<string, unknown>) || {};
      const nextSystemData = { ...(char.systemData || {}), ...patch } as Record<string, unknown>;
      return {
        ...state,
        characters: {
          ...state.characters,
          [p.characterId]: { ...char, systemData: nextSystemData },
        },
      };
    }

    case "DND_CHRONICLE_UPDATED": {
      // Denormalize the shared chronicle onto every character's systemData (mirror wod).
      const chronicle = String(p.chronicle ?? "");
      const characters: SessionState["characters"] = {};
      for (const [id, c] of Object.entries(state.characters)) {
        characters[id] = { ...c, systemData: { ...(c.systemData || {}), chronicle } };
      }
      return { ...state, characters };
    }

    case "CHARACTER_MOVED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, currentZoneId: p.toZoneId } } };
    }

    case "CHARACTER_DELETED": {
      const { [p.characterId]: _removed, ...remaining } = state.characters;
      return {
        ...state,
        characters: remaining,
        turnOrder: (state.turnOrder || []).filter((id) => id !== p.characterId),
      };
    }

    case "CHARACTER_NAME_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, name: p.name } } };
    }

    case "CHARACTER_BIO_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, biography: p.biography } } };
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

    case "CHARACTER_NOTE_ADDED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const notes = (char as any).linkedNotes || [];
      const idx = notes.findIndex((n: any) => n.id === p.note.id);
      const newNotes = idx === -1 ? [...notes, p.note] : notes.map((n: any, i: number) => (i === idx ? { ...n, ...p.note } : n));
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, linkedNotes: newNotes } } };
    }

    case "CHARACTER_NOTE_UPDATED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const notes = ((char as any).linkedNotes || []).map((n: any) => (n.id === p.noteId ? { ...n, ...p.patch } : n));
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, linkedNotes: notes } } };
    }

    case "CHARACTER_NOTE_DELETED": {
      const char = state.characters[p.characterId];
      if (!char) return state;
      const notes = ((char as any).linkedNotes || []).filter((n: any) => n.id !== p.noteId);
      return { ...state, characters: { ...state.characters, [p.characterId]: { ...char, linkedNotes: notes } } };
    }

    // ── Story 267 — combate na arena ─────────────────────────────────────────
    // Espelha os casos de `systems/fate/reducer.ts`: a mecânica de ALVO/REAÇÃO é da plataforma
    // (quem rola, quem responde, quando a janela fecha), não de regra de RPG, então o D&D usa
    // exatamente a mesma. Nada aqui interpreta d20, CD ou vantagem — isso é do rolador.

    case "ROLL_RESOLVED": {
      // Uma DEFESA rolada pelo alvo consome a vez dele na fila de reação; esvaziada a fila, a
      // reação termina e o cronômetro do turno volta a correr.
      if (state.isReaction && p.actionType === "DEFEND") {
        const remaining = (state.pendingTargetIds || []).filter((id: string) => id !== p.characterId);
        if (remaining.length > 0) {
          return { ...state, targetId: remaining[0], pendingTargetIds: remaining, isReaction: true };
        }
        return { ...state, isReaction: false, targetId: undefined, pendingTargetIds: [], timerPaused: false };
      }
      return state;
    }

    case "ROLL_VISIBILITY_UPDATED": {
      return {
        ...state,
        rollVisibilityOverrides: {
          ...(state.rollVisibilityOverrides || {}),
          [p.rollEventId]: { hiddenForPlayers: p.hiddenForPlayers },
        },
      };
    }

    case "COMBAT_TARGET_SET": {
      return {
        ...state,
        targetId: p.targetId || (p.targetIds?.[0]) || undefined,
        pendingTargetIds: p.targetIds || [],
        damageType: p.damageType || state.damageType,
        isReaction: p.isReaction ?? !!(p.targetId || p.targetIds?.length),
      };
    }

    case "COMBAT_REACTION_ENDED":
      return { ...state, isReaction: false, targetId: undefined, pendingTargetIds: [], damageType: undefined, timerPaused: false };

    // COMBAT_OUTCOME é só uma linha de MENSAGEM para o log de combate (o `CombatLog` lê o evento
    // cru). Não há estado a dobrar; o caso existe para o tipo ser reconhecido pelo plugin em vez de
    // cair no `default` sem ninguém saber por quê.
    case "COMBAT_OUTCOME":
      return state;

    // ── Story 272 — cerimônia de iniciativa (STORE-ONLY) ─────────────────────
    // Nada aqui ordena nem rola: a regra mora em `gameLogic.computeDndInitiativeOrder` e é a UI do
    // mestre que devolve o resultado por `DND_INITIATIVE_ORDER_SET`. Mesmo contrato do wod-v5.

    case "DND_COMBAT_SETUP_SET": {
      // `reset` apaga o saco INTEIRO (sair do combate). Sem ele, `open` só levanta/baixa o blackout.
      if (p.reset) {
        const next = { ...(state as any) };
        delete next.dndTurn;
        // Story 303 — a disputa morre junto. Ela é uma pergunta feita DENTRO de um combate ("você
        // resiste?"), e deixá-la de pé faria o rolador de alguém nascer travado em Atletismo na
        // próxima luta, esperando um agarrão que ninguém declarou.
        delete next.dndContest;
        // Story 338 — o pedido de resistência morre junto, pela MESMA razão da disputa: ele é uma
        // pergunta feita DENTRO de um combate ("você resiste a esta magia?"), e deixá-lo de pé faria
        // a cápsula de alguém nascer travada num teste de Destreza na próxima luta, esperando uma
        // Bola de Fogo que ninguém lançou.
        delete next.dndSpellSave;
        // Story 341 — e o recado do Mestre também. Um aviso de Regeneração pendurado depois da luta
        // é uma janela que o Mestre teria de fechar na próxima sessão sem saber por quê.
        delete next.dndGmNotice;
        return next as SessionState;
      }
      return withTurn(state, { ...turnBag(state), setupPhase: !!p.open });
    }

    /**
     * Story 303 — A DISPUTA DO AGARRÃO (STORE-ONLY, mesmo contrato do saco de iniciativa acima).
     *
     * O reducer não decide nada: quem compara os dois totais é o cliente que rolou a DEFESA (é o
     * único que tem os dois números no mesmo instante), e o que trafega aqui é só a FASE — de quem é
     * a vez de rolar, e com que número o defensor está competindo.
     *
     * `clear` é a saída: fim normal da disputa e também o botão de escape do mestre.
     */
    case "DND_CONTEST_SET": {
      if (p.clear || !p.contest) {
        const next = { ...(state as any) };
        delete next.dndContest;
        return next as SessionState;
      }
      return { ...state, dndContest: p.contest } as any;
    }

    /**
     * Story 328 — O PEDIDO DE TESTE DE CONCENTRAÇÃO. STORE-ONLY, como a disputa acima.
     *
     * O reducer não rola nada e não decide se a magia caiu: ele só carrega o RECADO até o cliente do
     * alvo ("você levou dano, deve um teste de CD N"). Quem rola é o dono da ficha, e quem apaga a
     * concentração ao falhar é `setConcentrationPatch`, na ficha dele.
     *
     * A CHAVE É O PERSONAGEM, e um saco por personagem: dois combatentes concentrados podem ser
     * cobrados na mesma rodada, e uma entrada só faria o segundo pedido apagar o primeiro.
     */
    case "DND_CONCENTRATION_CHECK": {
      const bag = { ...((state as any).dndConcentration || {}) } as Record<string, unknown>;
      const characterId = String(p.characterId || "");
      if (!characterId) return state;
      if (p.clear) {
        delete bag[characterId];
      } else {
        bag[characterId] = {
          dc: Math.max(10, Math.trunc(Number(p.dc) || 10)),
          sourceLabel: p.sourceLabel ? String(p.sourceLabel) : undefined,
          nonce: String(p.nonce || ""),
        };
      }
      // Saco vazio some por inteiro: um `{}` pendurado no estado é um carimbo que nunca fecha, e a
      // leitura teria de aprender a ignorá-lo num segundo lugar (mesma decisão de `opportunity`).
      if (Object.keys(bag).length === 0) {
        const next = { ...(state as any) };
        delete next.dndConcentration;
        return next as SessionState;
      }
      return { ...state, dndConcentration: bag } as any;
    }

    /**
     * Story 338 — O PEDIDO DE TESTE DE RESISTÊNCIA DE UMA MAGIA. STORE-ONLY, como os dois acima.
     *
     * O reducer não rola nada, não compara nada e não decide se a magia acertou: ele carrega o
     * recado até o cliente do alvo ("uma magia te obriga a um teste de CD N") e depois carrega de
     * volta o que cada alvo respondeu. Quem compara `total >= dc` é o cliente que ROLOU — é o único
     * que tem o total e a CD no mesmo tique.
     *
     * ⚠ UM PEDIDO POR VEZ, e a substituição é DELIBERADA. Um segundo `DND_SPELL_SAVE_SET` com
     * `request` troca o anterior por inteiro. Isto é o que faz a atualização de UM alvo funcionar:
     * o cliente que rolou reenvia a lista INTEIRA com o veredito dele preenchido, e não um patch —
     * `undefined` some no JSON do evento (a mesma armadilha do `DND_SYSTEM_DATA_PATCH`), então um
     * patch parcial não teria como distinguir "ainda não rolou" de "não veio no payload".
     *
     * ⚠ DUAS MAGIAS SIMULTÂNEAS NÃO SÃO SUPORTADAS, e a segunda atropela a primeira. É a mesma
     * escolha do `dndContest`, e pelo mesmo motivo: a mesa resolve uma coisa de cada vez, e um saco
     * indexado aqui obrigaria toda a leitura a aprender qual dos pedidos é o "meu".
     */
    case "DND_SPELL_SAVE_SET": {
      if (p.clear || !p.request) {
        const next = { ...(state as any) };
        delete next.dndSpellSave;
        return next as SessionState;
      }
      return { ...state, dndSpellSave: p.request } as any;
    }

    /**
     * Story 341 — O RECADO DO MESTRE. STORE-ONLY, mesmo contrato dos três acima.
     *
     * O reducer não interpreta o texto e não sabe de que magia ele veio: carrega o aviso até a tela
     * de quem NARRA. Hoje só a Regeneração o levanta — a cura instantânea sai automática, e o 1 PV
     * por turno durante 1 minuto é do Mestre, por decisão do dono.
     *
     * ⚠ UM RECADO POR VEZ, e o segundo atropela o primeiro — a mesma escolha (e o mesmo motivo) do
     * `dndSpellSave` logo acima. `{ clear: true }` é a saída, e é o que o botão ENTENDIDO emite.
     */
    /** Story 425 — QUEDAS PENDENTES. Store-only, lista (duas pessoas podem cair no mesmo empurrão). */
    case "DND_FALL_PENDING_SET": {
      const cur = ((state as any).dndFalls as DndFallPending[] | undefined) || [];
      if (p.clear) {
        const next = { ...(state as any) };
        delete next.dndFalls;
        return next as SessionState;
      }
      if (p.resolve) return { ...state, dndFalls: cur.filter((f) => f.id !== String(p.resolve)) } as any;
      const add = p.add as DndFallPending | undefined;
      if (!add?.id || !add.characterId || cur.some((f) => f.id === add.id)) return state;
      return { ...state, dndFalls: [...cur, add] } as any;
    }

    case "DND_GM_NOTICE_SET": {
      if (p.clear || !p.notice) {
        const next = { ...(state as any) };
        delete next.dndGmNotice;
        return next as SessionState;
      }
      return { ...state, dndGmNotice: p.notice } as any;
    }

    /**
     * Story 342 (FASE A) — A ZONA PLANTADA. STORE-ONLY, e a ÚNICA DOS QUATRO QUE É LISTA.
     *
     * ⚠ `zone` ACRESCENTA, nunca substitui. Os três casos acima (`dndContest`, `dndSpellSave`,
     * `dndGmNotice`) trocam o conteúdo de propósito, porque a mesa resolve uma coisa de cada vez.
     * Zona é o contrário: duas Teias no mapa é jogo legítimo, e uma Teia de outro conjurador não pode
     * sumir porque alguém conjurou uma Névoa. Substituir aqui apagaria a zona alheia em silêncio.
     *
     * Reconjurar a MESMA zona (mesmo `id`) sobrescreve a linha, e isso é o certo: o `id` é a chave da
     * concentração, então dois registros com o mesmo `id` seriam a mesma zona contada duas vezes.
     *
     * ⚠ O reducer NÃO PODA NADA. Quem decide se a zona ainda existe é a LEITURA (`liveSpellZones`),
     * pela concentração e pelo carimbo de rodada — mesma doutrina de `liveSpellWeapons`, da Fúria
     * (271) e do deslocamento (322). Um faxineiro aqui apagaria a zona no replay.
     *
     * `removeId` é o DISPERSAR (conjurador ou Mestre); `clear` esvazia a lista.
     */
    case "DND_SPELL_ZONE_SET": {
      const current: any[] = ((state as any).dndSpellZones as any[]) || [];
      if (p.clear) {
        const next = { ...(state as any) };
        delete next.dndSpellZones;
        return next as SessionState;
      }
      if (p.removeId) {
        const id = String(p.removeId);
        const kept = current.filter((z) => z?.id !== id);
        if (kept.length === current.length) return state;
        return { ...state, dndSpellZones: kept } as any;
      }
      if (!p.zone || !p.zone.id) return state;
      const zone = p.zone;
      const without = current.filter((z) => z?.id !== zone.id);
      return { ...state, dndSpellZones: [...without, zone] } as any;
    }

    /**
     * Story 314 (T1) — A AÇÃO PREPARADA, vista pelo MESTRE.
     *
     * O caminho do jogador NÃO passa por aqui: preparar é uma escrita na própria ficha, e ela sai
     * como `DND_SYSTEM_DATA_PATCH` junto do gasto da ação (um patch só, senão os dois correm contra
     * o flush debounced do card). Este evento existe para o outro lado — o mestre cancelando a
     * preparação de alguém —, porque ali quem escreve não é o dono da ficha.
     *
     * `readied: null` é o apagador, e o `null` é obrigatório: `undefined` some no JSON e o merge
     * raso do patch não apagaria nada (regra 2 da story).
     */
    case "DND_READY_SET": {
      const id = String(p.characterId || "");
      const char = state.characters[id];
      if (!char) return state;
      return {
        ...state,
        characters: {
          ...state.characters,
          [id]: { ...char, systemData: { ...(char.systemData || {}), readied: p.readied ?? null } },
        },
      };
    }

    /**
     * Story 314 (T1d) — A JANELA DE REAÇÃO (STORE-ONLY, no saco de turno).
     *
     * O reducer não decide nada e não mexe na fila: quem reordena e quem anda a vez continuam sendo
     * `TURN_ORDER_UPDATED` e `TURN_STEPPED`, que são da PLATAFORMA e viajam no mesmo burst. O que
     * mora aqui é só a MEMÓRIA do salto — a fila como ela estava, para quem a vez volta, e qual foi
     * a ação guardada.
     *
     * `actionId` fica no ESTADO DA MESA de propósito. A restrição do livro (só a ação preparada é
     * clicável) tem de valer em todo cliente, e a `readied` da ficha é apagada no instante em que a
     * mão dispara — ler de lá deixaria a barra do mestre destravada enquanto a do jogador trava.
     *
     * `{ clear: true }` é a saída, e é a única: a janela fecha pela ação resolvida ou pelo botão
     * ENCERRAR REAÇÃO, e as duas emitem este mesmo `clear` junto do retorno da fila.
     */
    case "DND_READY_INTERRUPT": {
      if (p.clear || !p.characterId) {
        const bag = turnBag(state);
        const { interrupt: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      return withTurn(state, {
        ...turnBag(state),
        interrupt: {
          characterId: String(p.characterId),
          savedOrder: Array.isArray(p.savedOrder) ? p.savedOrder.map(String) : [],
          returnCharacterId: String(p.returnCharacterId || ""),
          actionId: String(p.actionId || ""),
          ...(p.trigger ? { trigger: String(p.trigger) } : {}),
        },
      });
    }

    /* Story 322 — a oferta de ataque de oportunidade. STORE-ONLY: o reducer só guarda o que a tela
       calculou, exatamente como faz com `interrupt`. Nada aqui mede distância nem decide quem tem
       reação — isso é `ruleset/opportunity.ts` mais a geometria do battlemap. */
    case "DND_OPPORTUNITY_SET": {
      if (p.clear || !p.moverId) {
        const bag = turnBag(state);
        const { opportunity: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      const reactorIds = Array.isArray(p.reactorIds) ? p.reactorIds.map(String).filter(Boolean) : [];
      // Lista vazia = não há oferta nenhuma. Guardar o objeto assim mesmo deixaria um carimbo vivo
      // que nunca fecha e que o `opportunityLive` teria de aprender a ignorar num segundo lugar.
      if (reactorIds.length === 0) {
        const bag = turnBag(state);
        const { opportunity: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      return withTurn(state, {
        ...turnBag(state),
        opportunity: {
          moverId: String(p.moverId),
          reactorIds,
          round: Math.max(0, Math.trunc(Number(p.round) || 0)),
        },
      });
    }

    /**
     * Story 347 §5 — A OFERTA DE RETALIAÇÃO. Cópia deliberada do caso acima, campo por campo: as duas
     * ofertas têm a mesma forma, o mesmo prazo lido e a mesma regra de "lista vazia = não guardar
     * nada". O que muda é só o gatilho e o nome de quem provocou (`attackerId`, não `moverId`).
     *
     * ⚠ NÃO fundir os dois casos num só com um parâmetro: as duas ofertas coexistem (ver
     * `DndTurnState.retaliation`), e um `case` compartilhado convidaria a compartilhar o CAMPO
     * também — que é exatamente o que não pode acontecer.
     */
    case "DND_RETALIATION_SET": {
      if (p.clear || !p.attackerId) {
        const bag = turnBag(state);
        const { retaliation: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      const reactorIds = Array.isArray(p.reactorIds) ? p.reactorIds.map(String).filter(Boolean) : [];
      if (reactorIds.length === 0) {
        const bag = turnBag(state);
        const { retaliation: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      return withTurn(state, {
        ...turnBag(state),
        retaliation: {
          attackerId: String(p.attackerId),
          reactorIds,
          round: Math.max(0, Math.trunc(Number(p.round) || 0)),
        },
      });
    }

    /**
     * Story 350 §4 — A OFERTA DAS PALAVRAS DE INTERRUPÇÃO. Cópia deliberada dos dois casos acima,
     * campo por campo, pela MESMA razão que a story 347 escreveu para a Retaliação: as três ofertas
     * têm a mesma forma, o mesmo prazo lido e a mesma regra de "lista vazia = não guardar nada".
     *
     * O que muda são os dois campos que só esta tem, porque só ela nasce de uma ROLAGEM:
     * `rollEventId` (QUAL rolagem — o goblin pode ter rolado duas vezes) e `total` (o número que a
     * dica e o log precisam para dizer "17 → 12").
     *
     * ⚠ NÃO fundir com os vizinhos num `case` parametrizado: as três ofertas coexistem, e um caso
     * compartilhado convidaria a compartilhar o CAMPO — que é exatamente o que não pode acontecer.
     *
     * ⚠ O REDUCER NÃO DECIDE NADA: quem decide se a oferta nasce é `ruleset/lore.ts`
     * (`cuttingWordsOffered`), e quem faz a conta do corte é o cliente do bardo.
     */
    case "DND_CUTTING_WORDS_SET": {
      if (p.clear || !p.rollerId) {
        const bag = turnBag(state);
        const { cuttingWords: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      const reactorIds = Array.isArray(p.reactorIds) ? p.reactorIds.map(String).filter(Boolean) : [];
      if (reactorIds.length === 0) {
        const bag = turnBag(state);
        const { cuttingWords: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      const kind = p.kind === "attack" || p.kind === "damage" ? p.kind : "check";
      return withTurn(state, {
        ...turnBag(state),
        cuttingWords: {
          rollerId: String(p.rollerId),
          rollEventId: String(p.rollEventId || ""),
          kind,
          total: Math.trunc(Number(p.total) || 0),
          reactorIds,
          round: Math.max(0, Math.trunc(Number(p.round) || 0)),
        },
      });
    }

    /**
     * Story 476 — CONTRA-ENCANTAMENTO (Bardo 7º). Mesmo contrato da oferta acima, em CAMPO PRÓPRIO.
     * ⚠ O REDUCER NÃO DECIDE NADA: quem decide se a oferta nasce é `ruleset/bard.ts`
     * (`countercharmOffered`), e quem gasta a reação é o cliente do bardo.
     */
    case "DND_COUNTERCHARM_SET": {
      const reactorIds = Array.isArray(p.reactorIds) ? p.reactorIds.map(String).filter(Boolean) : [];
      if (p.clear || !p.rollerId || reactorIds.length === 0) {
        const bag = turnBag(state);
        const { countercharm: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      return withTurn(state, {
        ...turnBag(state),
        countercharm: {
          rollerId: String(p.rollerId),
          rollEventId: String(p.rollEventId || ""),
          reactorIds,
          round: Math.max(0, Math.trunc(Number(p.round) || 0)),
          // Story 496 (resultado da mesa) — o que a rerrolagem automática precisa. Aditivos: ausentes = só o aviso.
          ...(typeof p.bonus === "number" ? { bonus: Math.trunc(p.bonus) } : {}),
          ...(typeof p.dc === "number" ? { dc: Math.trunc(p.dc) } : {}),
          ...(p.label ? { label: String(p.label) } : {}),
          ...(p.saveNonce ? { saveNonce: String(p.saveNonce) } : {}),
          ...(Array.isArray(p.conditions) ? { conditions: p.conditions.map(String) } : {}),
        },
      });
    }

    /**
     * Story 477 — BÊNÇÃO DO TENEBROSO (Patrono Ínfero 3º) quando OUTRA pessoa derruba um inimigo. Mesmo
     * contrato das ofertas acima, em CAMPO PRÓPRIO. O reducer não decide nada: quem escolhe os bruxos é o
     * rolador de quem derrubou, e quem escreve os PV temporários é o cliente do bruxo que aceita.
     */
    case "DND_DARK_BLESSING_SET": {
      const reactorIds = Array.isArray(p.reactorIds) ? p.reactorIds.map(String).filter(Boolean) : [];
      if (p.clear || !p.byId || reactorIds.length === 0) {
        const bag = turnBag(state);
        const { darkBlessing: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      return withTurn(state, {
        ...turnBag(state),
        darkBlessing: {
          byId: String(p.byId),
          targetNames: String(p.targetNames || ""),
          reactorIds,
          round: Math.max(0, Math.trunc(Number(p.round) || 0)),
        },
      });
    }

    /**
     * Story 416 — ESQUIVA SOBRENATURAL. Contrato de oferta com VÁRIOS que aceitam (cada ladino acertado
     * responde pelo próprio dano). Resposta a pedido que já não é o vigente é descartada. (A Proteção da
     * story 415, que tinha o mesmo contrato, saiu na story 482: o SRD 5.2.1 não tem o estilo.)
     */
    case "DND_UNCANNY_DODGE_SET": {
      const bag = turnBag(state);
      const cur = bag.uncannyDodge;
      if (p.clear) {
        if (p.requestId && cur && cur.requestId !== String(p.requestId)) return state;
        const { uncannyDodge: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      const requestId = String(p.requestId || "");
      if (!requestId) return state;
      if (p.acceptedBy || p.declinedBy) {
        if (!cur || cur.requestId !== requestId) return state;
        const who = String(p.acceptedBy || p.declinedBy);
        if (!cur.reactorIds.includes(who)) return state;
        if ((cur.acceptedIds || []).includes(who) || (cur.declinedIds || []).includes(who)) return state;
        // Story 418 — o monge aceita com a redução JÁ rolada (Defletir Projéteis).
        const reduction = Math.trunc(Number(p.reduction));
        return withTurn(state, {
          ...bag,
          uncannyDodge: p.acceptedBy
            ? {
              ...cur,
              acceptedIds: [...(cur.acceptedIds || []), who],
              ...(Number.isFinite(reduction) && reduction >= 0
                ? { reductions: { ...(cur.reductions || {}), [who]: reduction } }
                : {}),
            }
            : { ...cur, declinedIds: [...(cur.declinedIds || []), who] },
        });
      }
      const reactorIds = Array.isArray(p.reactorIds) ? p.reactorIds.map(String).filter(Boolean) : [];
      if (reactorIds.length === 0 || !p.attackerId) {
        const { uncannyDodge: _drop, ...rest } = bag;
        return withTurn(state, rest as DndTurnState);
      }
      return withTurn(state, {
        ...bag,
        uncannyDodge: {
          requestId,
          attackerId: String(p.attackerId),
          reactorIds,
          round: Math.max(0, Math.trunc(Number(p.round) || 0)),
          // Story 418 — quem desta lista reage com Defletir Projéteis (subtrai) em vez da Esquiva (divide).
          ...(Array.isArray(p.deflectIds)
            ? { deflectIds: p.deflectIds.map(String).filter((id: string) => reactorIds.includes(id)) }
            : {}),
          // Story 481 — quem desta lista reage com a Defesa do Caçador Superior, e o tipo do dano do golpe.
          ...(Array.isArray(p.superiorIds) && p.damageTypeId
            ? {
              superiorIds: p.superiorIds.map(String).filter((id: string) => reactorIds.includes(id)),
              damageTypeId: String(p.damageTypeId),
            }
            : {}),
        },
      });
    }

    case "DND_INITIATIVE_MODE_SET": {
      // Trocar o modo INVALIDA tudo que já foi rolado: misturar linhas "d20 + 3" com linhas de d20
      // puro na mesma lista faria a ordem mentir. Por isso limpa totais, dados, ordem e o manual.
      const initiativeMode = p.initiativeMode === "flat" ? "flat" : "ability";
      return withTurn(state, {
        ...turnBag(state), initiativeMode,
        totals: {}, dice: {}, pairs: {}, order: [], manualOrdered: false,
      });
    }

    case "DND_INITIATIVE_TRAIT_SET": {
      const id = String(p.characterId || "");
      if (!id) return state;
      const bag = turnBag(state);
      const totals = { ...bag.totals }; delete totals[id];
      const dice = { ...bag.dice }; delete dice[id];
      const pairs = { ...(bag.pairs || {}) }; delete pairs[id];
      // Mesmo motivo do caso acima, em escala de UMA linha: o total antigo foi rolado contra o
      // atributo antigo, então ele morre junto com a troca.
      return withTurn(state, {
        ...bag,
        traitByCharacter: { ...bag.traitByCharacter, [id]: String(p.ability || "dex") },
        totals, dice, pairs,
      });
    }

    case "DND_INITIATIVE_SUBMITTED": {
      const id = String(p.characterId || "");
      if (!id) return state;
      const bag = turnBag(state);
      const dice = { ...bag.dice };
      // Valor digitado à mão pelo mestre não tem dado atrás — a linha precisa saber disso para
      // escrever "manual" em vez de inventar um "d20 N + M" que ninguém rolou.
      if (p.die == null) delete dice[id];
      else dice[id] = Number(p.die);
      /* Story 496 (resultado da mesa, b11-09) — com Vantagem/Desvantagem a linha mostra OS DOIS d20 (o dono via só
         o que ficou e achou que o Atleta Extraordinário não valia). Ausente = um d20 só ou valor digitado. */
      const pairs = { ...(bag.pairs || {}) };
      if (p.die != null && p.otherDie != null && (p.rollMode === "advantage" || p.rollMode === "disadvantage")) {
        pairs[id] = { other: Number(p.otherDie), mode: p.rollMode };
      } else delete pairs[id];
      return withTurn(state, { ...bag, totals: { ...bag.totals, [id]: Number(p.total) || 0 }, dice, pairs });
    }

    case "DND_INITIATIVE_CLEARED": {
      const bag = turnBag(state);
      const id = p.characterId ? String(p.characterId) : "";
      if (!id) return withTurn(state, { ...bag, totals: {}, dice: {}, pairs: {}, order: [], manualOrdered: false });
      const totals = { ...bag.totals }; delete totals[id];
      const dice = { ...bag.dice }; delete dice[id];
      const pairs = { ...(bag.pairs || {}) }; delete pairs[id];
      return withTurn(state, { ...bag, totals, dice, pairs, manualOrdered: false });
    }

    case "DND_INITIATIVE_ORDER_SET":
      return withTurn(state, {
        ...turnBag(state),
        order: Array.isArray(p.order) ? [...p.order] : [],
        manualOrdered: !!p.manual,
      });

    default:
      return state;
  }
}
