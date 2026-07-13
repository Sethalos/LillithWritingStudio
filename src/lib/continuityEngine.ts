import type { BibleEntity, Character, CharacterArc, DynamicCharacterState, ManuscriptNode } from "../domain/models";

export type ContinuityCategory = "state" | "knowledge" | "promise" | "inventory" | "voice" | "bible" | "presence" | "arc" | "location";

export interface ContinuityFinding {
  id: string;
  severity: "error" | "warning" | "note";
  category: ContinuityCategory;
  title: string;
  explanation: string;
  evidence: string[];
  sceneIds: string[];
  characterId?: string;
  suggestions: string[];
}

export interface ContinuityAnalysis {
  findings: ContinuityFinding[];
  counts: { errors: number; warnings: number; notes: number };
  scenesAnalyzed: number;
  charactersAnalyzed: number;
}

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const key = (parts: string[]) => parts.join(":").toLowerCase().replace(/\W+/g, "-");
const normalize = (value: string) => value.trim().toLowerCase();

export function analyzeContinuity(input: {
  nodes: ManuscriptNode[];
  characters: Character[];
  states: DynamicCharacterState[];
  arcs: CharacterArc[];
  bible: BibleEntity[];
}): ContinuityAnalysis {
  const chapters = input.nodes.filter((node) => node.kind === "chapter").sort((a, b) => a.position - b.position);
  const ordered = chapters.flatMap((chapter) => [chapter, ...input.nodes.filter((node) => node.kind === "scene" && node.parentId === chapter.id).sort((a, b) => a.position - b.position)]);
  const scenes = ordered.filter((node) => node.kind === "scene");
  const order = new Map(ordered.map((node, index) => [node.id, index]));
  const findings: ContinuityFinding[] = [];
  const add = (finding: Omit<ContinuityFinding, "id">) => findings.push({ ...finding, id: key([finding.category, finding.characterId ?? "project", finding.title, ...finding.sceneIds]) });

  const locations = input.bible.filter((entity) => entity.entityType === "location" && entity.canonStatus !== "rejected" && entity.canonStatus !== "superseded");
  const locationById = new Map(locations.map((entity) => [entity.id, entity]));
  const locationByName = new Map(locations.map((entity) => [normalize(entity.name), entity]));

  for (const character of input.characters) {
    const states = input.states
      .filter((state) => state.characterId === character.id)
      .sort((a, b) => (order.get(a.effectiveFromNodeId) ?? 1e9) - (order.get(b.effectiveFromNodeId) ?? 1e9));

    for (let index = 0; index < states.length; index++) {
      const state = states[index];
      const from = order.get(state.effectiveFromNodeId);
      const to = state.effectiveToNodeId ? order.get(state.effectiveToNodeId) : undefined;

      if (from === undefined) {
        add({
          severity: "error",
          category: "state",
          title: `${character.identity.fullName} has an orphaned state`,
          explanation: "The state's starting story position no longer exists in the binder.",
          evidence: [state.effectiveFromNodeId],
          sceneIds: [],
          characterId: character.id,
          suggestions: ["Relink the state to an existing chapter or scene."],
        });
        continue;
      }

      if (to !== undefined && to < from) {
        add({
          severity: "error",
          category: "state",
          title: `${character.identity.fullName}'s state interval is reversed`,
          explanation: "The state ends before it begins in manuscript order.",
          evidence: [`Starts at ${input.nodes.find((n) => n.id === state.effectiveFromNodeId)?.title}`, `Ends at ${input.nodes.find((n) => n.id === state.effectiveToNodeId)?.title}`],
          sceneIds: [state.effectiveFromNodeId, state.effectiveToNodeId!],
          characterId: character.id,
          suggestions: ["Move the end boundary after the start boundary."],
        });
      }

      const next = states[index + 1];
      if (next && to !== undefined && to >= (order.get(next.effectiveFromNodeId) ?? 1e9)) {
        add({
          severity: "warning",
          category: "state",
          title: `Overlapping states for ${character.identity.fullName}`,
          explanation: "Two state records are effective at the same story position, making current knowledge and condition ambiguous.",
          evidence: [input.nodes.find((n) => n.id === state.effectiveFromNodeId)?.title ?? "State", input.nodes.find((n) => n.id === next.effectiveFromNodeId)?.title ?? "Next state"],
          sceneIds: [state.effectiveFromNodeId, next.effectiveFromNodeId],
          characterId: character.id,
          suggestions: ["Close the earlier state before the later state begins."],
        });
      }

      if (index) {
        const prior = states[index - 1];
        for (const [field, label] of [["injuries", "injury"], ["objectsCarried", "carried object"], ["equipment", "equipment"]] as const) {
          const removed = prior[field].filter((item) => !state[field].includes(item));
          if (removed.length && !state.recentEvents.length) {
            add({
              severity: "warning",
              category: field === "injuries" ? "state" : "inventory",
              title: `${character.identity.fullName} loses ${label} without an event`,
              explanation: `The later state removes ${removed.join(", ")} but cites no recent event explaining the change.`,
              evidence: [`Present: ${input.nodes.find((n) => n.id === prior.effectiveFromNodeId)?.title}`, `Missing: ${input.nodes.find((n) => n.id === state.effectiveFromNodeId)?.title}`],
              sceneIds: [prior.effectiveFromNodeId, state.effectiveFromNodeId],
              characterId: character.id,
              suggestions: [`Add the transfer, recovery, loss, or removal to recent events.`, `Keep the ${label} in the later state.`],
            });
          }
        }
      }

      if (state.physicalLocationId) {
        const canonicalLocation = locationById.get(state.physicalLocationId);
        const sceneNode = input.nodes.find((node) => node.id === state.effectiveFromNodeId && node.kind === "scene");
        if (canonicalLocation && sceneNode?.sceneLocation && normalize(sceneNode.sceneLocation) !== normalize(canonicalLocation.name)) {
          add({
            severity: "warning",
            category: "location",
            title: `${character.identity.fullName}'s location state conflicts with the scene`,
            explanation: "The state says the character is in one canonical place while the scene metadata names another.",
            evidence: [`State: ${canonicalLocation.name}`, `Scene: ${sceneNode.sceneLocation}`],
            sceneIds: [sceneNode.id],
            characterId: character.id,
            suggestions: ["Align the scene location with the character state.", "Add the missing transition scene if the move happened off-page."],
          });
        }
      }
    }

    const made = new Set<string>();
    const broken = new Set<string>();
    for (const state of states) {
      for (const promise of state.promisesBroken) {
        if (!made.has(promise.toLowerCase())) {
          add({
            severity: "error",
            category: "promise",
            title: `Promise broken before it is recorded`,
            explanation: `${character.identity.fullName}'s state marks “${promise}” broken without an earlier matching promise.`,
            evidence: [input.nodes.find((n) => n.id === state.effectiveFromNodeId)?.title ?? "Unknown scene"],
            sceneIds: [state.effectiveFromNodeId],
            characterId: character.id,
            suggestions: ["Record where the promise was made.", "Correct the promise wording so it matches."],
          });
        }
        broken.add(promise.toLowerCase());
      }
      for (const promise of state.promisesMade) made.add(promise.toLowerCase());
    }

    for (const promise of made) {
      if (!broken.has(promise)) {
        add({
          severity: "note",
          category: "promise",
          title: `Unresolved promise: ${promise}`,
          explanation: `${character.identity.fullName} has an active promise with no recorded break or resolution.`,
          evidence: ["Present in dynamic character state"],
          sceneIds: states.filter((state) => state.promisesMade.some((value) => value.toLowerCase() === promise)).map((state) => state.effectiveFromNodeId),
          characterId: character.id,
          suggestions: ["Plan a payoff, explicit release, or intentional betrayal."],
        });
      }
    }

    const avoided = character.voiceLock.avoidedWords.filter(Boolean);
    if (avoided.length) {
      for (const scene of scenes.filter((scene) => scene.povCharacterId === character.id)) {
        const content = strip(scene.content ?? "");
        const hits = avoided.filter((word) => new RegExp(`\\b${escape(word)}\\b`, "i").test(content));
        if (hits.length) {
          add({
            severity: "warning",
            category: "voice",
            title: `Voice Lock vocabulary appears in ${scene.title}`,
            explanation: `The POV text uses words ${hits.join(", ")} that ${character.identity.fullName}'s Voice Lock says to avoid.`,
            evidence: hits.map((word) => `Avoided word: ${word}`),
            sceneIds: [scene.id],
            characterId: character.id,
            suggestions: ["Review whether narration is in the character's internal voice.", "Replace the word or approve it as a deliberate exception."],
          });
        }
      }
    }

    const names = [character.identity.fullName, ...character.identity.aliases].filter(Boolean);
    const appearances = scenes
      .map((scene, index) => ({ scene, index, text: strip(scene.content ?? "") }))
      .filter(({ scene, text }) => scene.povCharacterId === character.id || names.some((name) => text.toLowerCase().includes(name.toLowerCase())));
    if (!appearances.length && character.role !== "minor") {
      add({
        severity: "warning",
        category: "presence",
        title: `${character.identity.fullName} is not present in the manuscript`,
        explanation: `A ${character.role} character has no detected POV or name appearance.`,
        evidence: ["No scene match"],
        sceneIds: [],
        characterId: character.id,
        suggestions: ["Give the character an independent scene purpose.", "Change the role if the absence is intentional."],
      });
    }

    for (let i = 1; i < appearances.length; i++) {
      const gap = appearances[i].index - appearances[i - 1].index - 1;
      if (gap >= 6) {
        add({
          severity: "warning",
          category: "presence",
          title: `${character.identity.fullName} disappears for ${gap} scenes`,
          explanation: "A long absence may make the character's goals or relationships feel forgotten.",
          evidence: [`Last seen: ${appearances[i - 1].scene.title}`, `Returns: ${appearances[i].scene.title}`],
          sceneIds: [appearances[i - 1].scene.id, appearances[i].scene.id],
          characterId: character.id,
          suggestions: ["Add a reminder, consequence, or intercut scene.", "Confirm the disappearance is intentional."],
        });
      }
    }

    for (const arc of input.arcs.filter((arc) => arc.characterId === character.id)) {
      if (!arc.pressureEvents.length) {
        add({
          severity: "warning",
          category: "arc",
          title: `${arc.title} has no pressure events`,
          explanation: "The arc defines a starting belief and need without manuscript events that challenge the coping strategy.",
          evidence: [`Character: ${character.identity.fullName}`],
          sceneIds: [],
          characterId: character.id,
          suggestions: ["Link escalating pressure scenes to the arc."],
        });
      }

      if (arc.momentOfRecognition && !arc.criticalChoice) {
        add({
          severity: "warning",
          category: "arc",
          title: `Recognition without a critical choice`,
          explanation: "The character recognizes the truth but has no linked scene where behaviour proves the change.",
          evidence: [input.nodes.find((node) => node.id === arc.momentOfRecognition)?.title ?? "Recognition scene"],
          sceneIds: [arc.momentOfRecognition],
          characterId: character.id,
          suggestions: ["Link or create a consequential choice scene."],
        });
      }

      if (arc.endingState && !arc.transformation) {
        add({
          severity: "warning",
          category: "arc",
          title: `Ending state lacks a transformation bridge`,
          explanation: "The arc records an ending state without describing the earned psychological transition.",
          evidence: [arc.endingState],
          sceneIds: [],
          characterId: character.id,
          suggestions: ["Describe the transformation and its visible behavioural evidence."],
        });
      }
    }
  }

  for (const scene of scenes) {
    if (scene.sceneLocation && !locationByName.has(normalize(scene.sceneLocation))) {
      add({
        severity: "note",
        category: "location",
        title: `Unlinked scene location in ${scene.title}`,
        explanation: "The scene names a location that is not yet represented as a canonical Story Bible place.",
        evidence: [scene.sceneLocation],
        sceneIds: [scene.id],
        suggestions: ["Create a Story Bible location record.", "Link the scene to the matching canonical place name."],
      });
    }
  }

  for (const entity of input.bible) {
    const groups = new Map<string, typeof entity.facts>();
    for (const fact of entity.facts.filter((fact) => fact.canonStatus === "canon")) {
      const group = groups.get(fact.fieldName.toLowerCase()) ?? [];
      group.push(fact);
      groups.set(fact.fieldName.toLowerCase(), group);
    }
    for (const [field, facts] of groups) {
      const values = new Set(facts.map((fact) => JSON.stringify(fact.value)));
      if (values.size > 1) {
        add({
          severity: "error",
          category: "bible",
          title: `Contradictory canon: ${entity.name} — ${field}`,
          explanation: "Multiple canonical facts assign different values to the same field.",
          evidence: facts.map((fact) => String(fact.value)),
          sceneIds: facts.map((fact) => fact.provenanceNodeId).filter((id): id is string => Boolean(id)),
          suggestions: ["Supersede the obsolete fact.", "Add story-position intervals if both values are true at different times."],
        });
      }
    }
  }

  findings.sort((a, b) => ({ error: 0, warning: 1, note: 2 }[a.severity] - { error: 0, warning: 1, note: 2 }[b.severity]));
  return {
    findings,
    counts: {
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length,
      notes: findings.filter((item) => item.severity === "note").length,
    },
    scenesAnalyzed: scenes.length,
    charactersAnalyzed: input.characters.length,
  };
}
