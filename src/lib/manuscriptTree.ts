import type { Id, ManuscriptNode } from "../domain/models";

export interface TreeNode {
  node: ManuscriptNode;
  children: TreeNode[];
  words: number;
}

// Nest a flat node array by parentId and order siblings by position. A node whose
// parent is missing or involved in a cycle attaches at the root, so an inconsistent
// vault still renders every scene the writer has rather than silently hiding some.
export function buildTree(nodes: ManuscriptNode[]): TreeNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const byParent = new Map<string, ManuscriptNode[]>();

  // Detect cycles: follow each node's parent chain to see if it reaches root without cycles.
  // If a cycle is detected, treat the node as an orphan (bucket at root).
  const getParentBucket = (nodeId: string): string => {
    const startNode = byId.get(nodeId);
    if (!startNode?.parentId || !byId.has(startNode.parentId)) {
      return ""; // No parent or parent not found -> root bucket
    }

    // Traverse parent chain looking for cycles
    const visited = new Set<string>();
    let current: ManuscriptNode | undefined = startNode;
    while (current?.parentId) {
      const parentId = current.parentId;
      if (visited.has(parentId)) {
        // Cycle detected - bucket at root
        return "";
      }
      visited.add(parentId);
      current = byId.get(parentId);
      if (!current) {
        // Parent not found - this node is an orphan at root
        return "";
      }
    }

    // Traversed to root without cycle - use direct parent as bucket
    return startNode.parentId;
  };

  // Bucket each node
  for (const node of nodes) {
    const key = getParentBucket(node.id);
    const bucket = byParent.get(key);
    if (bucket) bucket.push(node);
    else byParent.set(key, [node]);
  }

  // Build tree recursively, with cycle detection during recursion as a safety measure
  const build = (parentKey: string, visiting: Set<string> = new Set()): TreeNode[] => {
    // Prevent infinite recursion if cycles somehow persist (defense in depth)
    if (visiting.has(parentKey)) return [];

    const newVisiting = new Set(visiting);
    newVisiting.add(parentKey);

    const result = [...(byParent.get(parentKey) ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((node) => {
        const children = build(node.id, newVisiting);
        const words = children.length
          ? children.reduce((total, child) => total + child.words, 0)
          : node.wordCount;
        return { node, children, words };
      });

    return result;
  };

  return build("");
}

// "Chapter One › The Sluice Crew" — the writer-facing name for a location in the
// manuscript. Shared by the tree and the proposal card so the two cannot disagree.
export function describePath(nodes: ManuscriptNode[], id: Id): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parts: string[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.kind !== "book") parts.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(" › ");
}
