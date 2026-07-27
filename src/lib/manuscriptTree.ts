import type { Id, ManuscriptNode } from "../domain/models";

export interface TreeNode {
  node: ManuscriptNode;
  children: TreeNode[];
  words: number;
}

// Nest a flat node array by parentId and order siblings by position. A node whose
// parent is missing attaches at the root, so an inconsistent vault still renders
// every scene the writer has rather than silently hiding some.
export function buildTree(nodes: ManuscriptNode[]): TreeNode[] {
  const byParent = new Map<string, ManuscriptNode[]>();
  const known = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    const key = node.parentId && known.has(node.parentId) ? node.parentId : "";
    const bucket = byParent.get(key);
    if (bucket) bucket.push(node);
    else byParent.set(key, [node]);
  }
  const build = (parentKey: string): TreeNode[] =>
    [...(byParent.get(parentKey) ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((node) => {
        const children = build(node.id);
        const words = children.length
          ? children.reduce((total, child) => total + child.words, 0)
          : node.wordCount;
        return { node, children, words };
      });
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
