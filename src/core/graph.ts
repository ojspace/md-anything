import type { GraphEntity, GraphRelation, GraphResult } from "./graph-types";
import type { NormalizedDocument } from "./types";

// Patterns for simple heuristic entity extraction (no cloud APIs)
const PERSON_PATTERN = /\b([A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+)\b/g;
const PLACE_PATTERN = /\b(?:in|at|from|near|to) ([A-Z][a-zA-Z ]{2,30})\b/g;
const CONCEPT_PATTERN = /(?:^|[.!?]\s+)([A-Z][a-zA-Z]{3,}(?:\s+[a-z]+){0,2})/gm;

const STOP_WORDS = new Set([
  "The", "This", "That", "These", "Those", "There", "Their", "They",
  "When", "Where", "What", "Which", "While", "With", "From", "Into",
  "Also", "More", "Some", "Such", "Each", "Both", "Many", "Much",
  "However", "Although", "Because", "Therefore", "Furthermore",
]);

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

function extractPersons(text: string): GraphEntity[] {
  const seen = new Set<string>();
  const entities: GraphEntity[] = [];

  for (const match of text.matchAll(PERSON_PATTERN)) {
    const label = match[1].trim();
    if (STOP_WORDS.has(label.split(" ")[0])) continue;
    const id = slugify(label);
    if (!seen.has(id)) {
      seen.add(id);
      entities.push({ id, label, type: "person" });
    }
  }

  return entities;
}

function extractPlaces(text: string): GraphEntity[] {
  const seen = new Set<string>();
  const entities: GraphEntity[] = [];

  for (const match of text.matchAll(PLACE_PATTERN)) {
    const label = match[1].trim();
    if (STOP_WORDS.has(label)) continue;
    const id = slugify(label);
    if (!seen.has(id)) {
      seen.add(id);
      entities.push({ id, label, type: "place" });
    }
  }

  return entities;
}

function extractConcepts(text: string, existingIds: Set<string>): GraphEntity[] {
  const seen = new Set<string>(existingIds);
  const entities: GraphEntity[] = [];

  for (const match of text.matchAll(CONCEPT_PATTERN)) {
    const label = match[1].trim();
    if (label.length < 4 || STOP_WORDS.has(label)) continue;
    const id = slugify(label);
    if (!seen.has(id)) {
      seen.add(id);
      entities.push({ id, label, type: "concept" });
    }
  }

  return entities.slice(0, 20);
}

function inferRelations(entities: GraphEntity[]): GraphRelation[] {
  const relations: GraphRelation[] = [];
  const persons = entities.filter((e) => e.type === "person");
  const places = entities.filter((e) => e.type === "place");
  const concepts = entities.filter((e) => e.type === "concept");

  for (const person of persons) {
    for (const place of places.slice(0, 3)) {
      relations.push({ from: person.id, to: place.id, type: "located-in" });
    }
    for (const concept of concepts.slice(0, 3)) {
      relations.push({ from: person.id, to: concept.id, type: "related-to" });
    }
  }

  return relations.slice(0, 30);
}

export function extractGraph(doc: NormalizedDocument): GraphResult {
  const fullText = doc.sections.map((s) => s.content).join("\n\n");

  if (fullText.length < 50) {
    return { entities: [], relations: [], relatedNotes: [] };
  }

  const persons = extractPersons(fullText);
  const places = extractPlaces(fullText);
  const existingIds = new Set([...persons, ...places].map((e) => e.id));
  const concepts = extractConcepts(fullText, existingIds);

  const entities = [...persons, ...places, ...concepts];
  const relations = inferRelations(entities);

  return { entities, relations, relatedNotes: [] };
}

export function graphToMarkdown(graph: GraphResult): string {
  if (graph.entities.length === 0) return "";

  const lines: string[] = ["## Graph", ""];

  const byType = new Map<string, GraphEntity[]>();
  for (const entity of graph.entities) {
    const group = byType.get(entity.type) ?? [];
    group.push(entity);
    byType.set(entity.type, group);
  }

  for (const [type, entities] of byType) {
    lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}s`);
    for (const e of entities) {
      lines.push(`- ${e.label}`);
    }
    lines.push("");
  }

  if (graph.relations.length > 0) {
    lines.push("### Relations");
    for (const r of graph.relations) {
      lines.push(`- ${r.from} → ${r.type} → ${r.to}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
