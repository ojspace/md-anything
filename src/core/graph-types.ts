export interface GraphEntity {
  id: string;
  label: string;
  type: "concept" | "person" | "place" | "thing" | "event";
}

export interface GraphRelation {
  from: string;
  to: string;
  type: string;
}

export interface GraphResult {
  entities: GraphEntity[];
  relations: GraphRelation[];
  relatedNotes: string[];
}
