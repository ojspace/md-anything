// Types for graphs
export interface GraphType {
    id: string;
    name: string;
    nodes: NodeType[];
    edges: EdgeType[];
}

export interface NodeType {
    id: string;
    label: string;
}

export interface EdgeType {
    from: string;
    to: string;
    label?: string;
}