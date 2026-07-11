// src/types.ts
// Tipos de domínio necessários para projeção de estado.
// Copiados de front_sistema_rpg/src/types/domain.ts — manter em sync.

export interface ActionEvent {
  id: string;
  sessionId: string;
  seq: number;
  type: string;
  actorUserId: string;
  visibility: any;
  createdAt: string;
  payload: any;
}

export interface Character {
  id: string;
  name: string;
  ownerUserId?: string;
  isNPC?: boolean;
  npcType?: string;
  source?: string;
  scope?: string;
  activeInArena?: boolean;
  currentZoneId?: string;
  fatePoints?: number;
  refresh?: number;
  stress?: Record<string, boolean[]>;
  stressValues?: Record<string, number[]>;
  skills?: Record<string, number>;
  consequences?: Record<string, any>;
  extraConsequenceSlots?: string[];
  removedDefaultSlots?: string[];
  inventory?: any[];
  stunts?: any[];
  spells?: any[];
  magicLevel?: number;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  biography?: string;
  sheetAspects?: string[];
  linkedNotes?: any[];
  skillResources?: Record<string, { current: number; max: number }>;
  systemData?: any;
  impulseArrows?: number;
  money?: number;
  [key: string]: any;
}

export interface Aspect {
  id: string;
  name: string;
  scope?: string;
  freeInvokes: number;
  revealed?: boolean;
  ownerId?: string;
  description?: string;
}

export interface Note {
  id: string;
  content?: string;
  folderId?: string;
  [key: string]: any;
}

export interface BattlemapObject {
  id: string;
  imageUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  animated?: boolean;
  states?: any[];
  lastAnimationTriggerAt?: string;
  isConversable?: boolean;
  [key: string]: any;
}

export interface BattlemapCombatLayer {
  id: string;
  kind: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  [key: string]: any;
}

export interface BattlemapState {
  isActive?: boolean;
  sceneModeActive?: boolean;
  scenePlayerAssignments?: Record<string, string>;
  imageUrl?: string;
  gridSize?: number;
  gridColor?: string;
  gridThickness?: number;
  gridSizeX?: number;
  gridSizeY?: number;
  gridShape?: string;
  gridOpacity?: number;
  offsetX?: number;
  offsetY?: number;
  zoom?: number;
  strokes?: any[];
  objects?: BattlemapObject[];
  shapes?: any[];
  scenes?: any[];
  activeSceneId?: string;
  layers?: BattlemapCombatLayer[];
  activeLayerId?: string;
  battlemaps?: any[];
  fogOfWar?: any;
  [key: string]: any;
}

export interface SessionState {
  id: string;
  system?: string;
  gmUserId?: string;
  seats?: any[];
  characters: Record<string, Character>;
  aspects: Record<string, Aspect>;
  zones: Record<string, any>;
  links?: any[];
  headerImages?: Record<string, string>;
  currentRound?: number;
  notes: Note[];
  noteFolders?: any[];
  themeColor?: string;
  themeTitleColor?: string | null;
  themePreset?: string;
  missions?: any[];
  timeline?: any[];
  skills?: any[];
  items?: any[];
  mindMaps?: any[];
  agendas?: any[]; // Story 195 — GM-only Notes "Agenda" spreadsheets
  sessionNumber?: number;
  /** Story 222 — "Regras da Mesa": texto de regras editável pelo GM, visível a todos. */
  tableRules?: string;
  stickyNotes?: any[];
  /** Story 178 F1 — Arena GM Cards keyed by cardId (fate family only). */
  arenaCards?: Record<string, any>;
  themeLocked?: boolean;
  rollVisibilityOverrides?: Record<string, any>;
  systemSkills?: any[];
  soundSettings?: any;
  characterAssignments?: Record<string, string[]>;
  battlemap?: BattlemapState;
  worldEntities?: Record<string, any>;
  currentTurnUserId?: string;
  currentTurnIndex?: number;
  turnOrder?: string[];
  challenge?: any;
  targetId?: string;
  pendingTargetIds?: string[];
  damageType?: string;
  isReaction?: boolean;
  attackerCharacterId?: string;
  timerPaused?: boolean;
  timerPausedAt?: string;
  lastTurnChangeTimestamp?: string;
  currentMusic?: any;
  atmosphericEffects?: string[];
  atmosphericEffect?: string;
  activeSceneId?: string;
  name?: string;
  turnOrderMode?: string;
  turnOrderSkillId?: string;
  electiveActiveId?: string | null;
  actedThisRound?: string[];
  electionPending?: boolean;
  [key: string]: any;
}