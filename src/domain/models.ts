export type Id = string;
export type CanonStatus = "canon" | "draft" | "possible" | "rejected" | "superseded" | "unknown";
export type DocumentKind = "book" | "part" | "act" | "chapter" | "scene" | "interlude" | "note" | "research";

export interface Project {
  id: Id;
  title: string;
  subtitle?: string;
  author?: string;
  coverImageDataUrl?: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  rootPath?: string;
}

export interface WorkspaceData { project: Project; nodes: ManuscriptNode[] }
export type ResearchSourceType="website"|"book"|"paper"|"interview"|"archive"|"other";
export interface ResearchSource{id:Id;projectId:Id;sourceType:ResearchSourceType;title:string;author?:string;publisher?:string;url?:string;publishedDate?:string;accessedDate?:string;citation?:string;excerpt?:string;notes?:string;tags:string[];linkedNodeIds:Id[];createdAt:string;updatedAt:string}
export interface WritingProfile{projectId:Id;version:number;styleSummary:string;pointOfView:string;tense:string;dialect:string;sentenceRhythm:string;descriptionLevel:string;dialogueStyle:string;preserve:string[];avoid:string[];mechanics:string[];projectRules:string[];approvedSamples:string[];updatedAt?:string}
export type SeriesContinuityCategory="character"|"relationship"|"world-rule"|"location"|"organization"|"technology"|"object"|"event"|"timeline"|"terminology"|"plot-thread"|"other";
export interface SeriesSettings{projectId:Id;seriesName:string;bookTitle:string;bookNumber?:number;updatedAt?:string}
export interface SeriesContinuityEntry{id:Id;projectId:Id;category:SeriesContinuityCategory;subject:string;fieldName:string;value:string;canonStatus:CanonStatus;sourceBook?:string;notes?:string;createdAt:string;updatedAt:string}

export interface ManuscriptNode {
  id: Id;
  projectId: Id;
  parentId?: Id;
  kind: DocumentKind;
  title: string;
  synopsis?: string;
  sceneGoal?: string;
  wordGoal?: number;
  tags?: string[];
  sceneType?: "action" | "dialogue" | "reflection" | "exposition" | "mixed";
  sceneLocation?: string;
  position: number;
  povCharacterId?: Id;
  wordCount: number;
  content?: string;
  revision: number;
  updatedAt: string;
  children?: ManuscriptNode[];
}

export interface CharacterIdentity {
  fullName: string;
  aliases: string[];
  age?: string;
  birthDate?: string;
  gender?: string;
  occupation?: string;
  education?: string;
  culturalBackground?: string;
  socialBackground?: string;
  familyHistory?: string;
  physicalAppearance?: string;
  distinguishingFeatures?: string;
  skills: string[];
  limitations: string[];
  habits: string[];
  mannerisms: string[];
  personalPossessions: string[];
  currentStatus?: string;
  firstAppearanceId?: Id;
  lastAppearanceId?: Id;
}

export interface CharacterPsychology {
  coreWound?: string;
  coreFear?: string;
  consciousDesire?: string;
  unconsciousNeed?: string;
  shameTriggers: string[];
  angerTriggers: string[];
  stressResponse?: string;
  conflictResponse?: string;
  copingMechanisms: string[];
  defenceMechanisms: string[];
  attachmentStyle?: string;
  emotionalBlindSpots: string[];
  selfImage?: string;
  publicPersona?: string;
  privatePersona?: string;
  moralBoundaries: string[];
  beliefs: string[];
  contradictions: string[];
  regrets: string[];
  secrets: string[];
  sourcesOfGuilt: string[];
  sourcesOfPride: string[];
  capacityForIntimacy?: string;
  capacityForViolence?: string;
  behaviourUnderAuthority?: string;
  behaviourWhenResponsible?: string;
  behaviourWhenControlLost?: string;
}

export interface VoiceLock {
  vocabulary: string;
  sentenceLength: string;
  sentenceStructure: string;
  formality: string;
  speechRhythm: string;
  educationInSpeech: string;
  regionalOrProfessionalLanguage: string;
  humourStyle: string;
  sarcasm: string;
  emotionalDirectness: string;
  profanityLevel: string;
  commonPhrases: string[];
  verbalHabits: string[];
  frequentWords: string[];
  avoidedWords: string[];
  metaphorPreferences: string;
  internalMonologueStyle: string;
  spokenDialogueStyle: string;
  behaviourDuringSilence: string;
  speechUnderStress: string;
  speechWhileAngry: string;
  speechWhileAfraid: string;
  speechWhileGrieving: string;
  speechWhenLying: string;
  speechToAuthority: string;
  speechToFamily: string;
  approvedExamples: string[];
  rejectedExamples: string[];
  version: number;
}

export interface Character {
  id: Id;
  projectId: Id;
  role: "major" | "supporting" | "minor";
  identity: CharacterIdentity;
  psychology: CharacterPsychology;
  voiceLock: VoiceLock;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicCharacterState {
  id: Id;
  characterId: Id;
  effectiveFromNodeId: Id;
  effectiveToNodeId?: Id;
  physicalLocationId?: Id;
  physicalCondition?: string;
  injuries: string[];
  illness: string[];
  fatigue?: string;
  clothing: string[];
  equipment: string[];
  objectsCarried: string[];
  emotionalState: string[];
  recentEvents: Id[];
  currentGoal?: string;
  currentFear?: string;
  currentKnowledge: string[];
  incorrectBeliefs: string[];
  secretsKnown: string[];
  secretsWithheld: string[];
  promisesMade: string[];
  promisesBroken: string[];
  relationshipChanges: string[];
  trustChanges: string[];
  moralCompromises: string[];
  recentLosses: string[];
  recentVictories: string[];
  immediatePriorities: string[];
  source: "manual" | "accepted-extraction" | "revision";
  confidence?: number;
}

export interface DirectionalRelationship {
  id: Id;
  fromCharacterId: Id;
  toCharacterId: Id;
  relationshipType: string;
  sharedHistory: string;
  publicRelationship: string;
  privateRelationship: string;
  trust: number;
  affection: number;
  loyalty: number;
  resentment: number;
  fear: number;
  dependency: number;
  respect: number;
  powerImbalance: string;
  secrets: string[];
  obligations: string[];
  unspokenTension: string;
  wants: string;
  misunderstandings: string;
  recentChanges: string[];
  futureConflictOpportunities: string[];
}

export interface ProjectRelationship extends DirectionalRelationship { projectId: Id }

export interface CharacterArc {
  id: Id;
  characterId: Id;
  title: string;
  startingState: string;
  falseBelief: string;
  coreWound: string;
  externalGoal: string;
  internalNeed: string;
  pressureEvents: Id[];
  failedCopingStrategies: string[];
  escalatingConsequences: string[];
  momentOfRecognition?: Id;
  criticalChoice?: Id;
  sacrifice?: string;
  transformation?: string;
  endingState?: string;
}

export type BibleEntityType = "location"|"organization"|"government"|"military-unit"|"technology"|"vehicle"|"object"|"religion"|"historical-event"|"rule"|"theme"|"symbol"|"plot-thread"|"mystery"|"promise"|"foreshadowing"|"payoff";
export interface BibleFact { id:Id; fieldName:string; value:string; canonStatus:CanonStatus; validFromNodeId?:Id; validToNodeId?:Id; provenanceNodeId?:Id; reviewedAt?:string; createdAt:string }
export interface BibleEntity { id:Id; projectId:Id; entityType:BibleEntityType; name:string; summary?:string; canonStatus:CanonStatus; facts:BibleFact[]; createdAt:string; updatedAt:string }
export interface TimelineParticipant{entityId:Id;role?:string}
export interface TimelineEvent{id:Id;projectId:Id;title:string;description?:string;storyTimeStart?:string;storyTimeEnd?:string;orderKey:number;nodeId?:Id;canonStatus:CanonStatus;participants:TimelineParticipant[];createdAt:string;updatedAt:string}
export interface RevisionPass{id:Id;name:string;instructions:string;characterIds:Id[];documentIds:Id[];taskRole:string;providerId?:Id;modelId?:string;contextSources:string[];creativity:number;changeLimit:"conservative"|"moderate"|"substantial";outputFormat:"tracked-proposals"|"issues-only"|"report";reviewRequired:boolean}
export interface RevisionPipeline{id:Id;projectId:Id;name:string;description?:string;isDefault:boolean;passes:RevisionPass[];createdAt:string;updatedAt:string}
export interface PipelineRunItem{id:Id;passId:Id;documentId:Id;position:number;status:string}export interface PipelineRun{id:Id;pipelineId:Id;status:string;totalItems:number;completedItems:number;items:PipelineRunItem[];createdAt:string;updatedAt:string}
