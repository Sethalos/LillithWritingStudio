import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, FolderOpen, MoreVertical, Plus } from "lucide-react";
import type { Id, ManuscriptNode } from "../domain/models";
import { buildTree, type TreeNode } from "../lib/manuscriptTree";

interface Props {
  nodes: ManuscriptNode[];
  activeId: Id;
  onSelect: (id: Id) => void;
  onCreate: (kind: "chapter" | "scene", parentId: Id) => void;
}

export function ManuscriptTree({ nodes, activeId, onSelect, onCreate }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState("");
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const book = nodes.find((node) => node.kind === "book");
  const bookId = book?.id ?? "";
  // The book row is redundant with the header above (which now carries the book's
  // title and total word count), so start the visible list at its children
  // (chapters, or whatever sits under the book — parts, acts, orphans, etc).
  const roots = tree.flatMap((item) => (item.node.kind === "book" ? item.children : [item]));
  const totalWords = roots.reduce((total, item) => total + item.words, 0);

  const toggle = (id: string) =>
    setCollapsed((all) => {
      const next = new Set(all);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Dismiss an open row menu on Escape or on a click anywhere outside it. The
  // data attribute keeps the owning ⋮ button out of "outside", so re-clicking it
  // still closes the menu through its own toggle rather than closing and reopening.
  useEffect(() => {
    if (!menuFor) return;
    const onPointerDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("[data-tree-menu]")) return;
      setMenuFor("");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuFor("");
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuFor]);

  const renderRow = (item: TreeNode, depth: number) => {
    const { node, children, words } = item;
    const isContainer = children.length > 0 || node.kind !== "scene";
    const isCollapsed = collapsed.has(node.id);
    // Only scenes open a document. A chapter or part row expands and collapses —
    // clicking one must never swap the editor to some other scene.
    const isScene = node.kind === "scene";
    return (
      <li key={node.id}>
        <div className={`tree-row ${node.id === activeId ? "current" : ""}`} style={{ paddingLeft: `${8 + depth * 14}px` }}>
          {isContainer ? (
            <button className="tree-twisty" aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${node.title}`} onClick={() => toggle(node.id)}>
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          ) : (
            <span className="tree-twisty" />
          )}
          <button className="tree-label" aria-current={node.id === activeId ? "true" : undefined} aria-expanded={isScene ? undefined : !isCollapsed} onClick={() => (isScene ? onSelect(node.id) : toggle(node.id))}>
            {isScene ? <FileText size={12} /> : <FolderOpen size={12} />}
            <span>{node.title}</span>
          </button>
          <span className="tree-words">{words.toLocaleString()}</span>
          {!isScene && (
            <button className="tree-menu-toggle" data-tree-menu={node.id} aria-label={`Actions for ${node.title}`} aria-expanded={menuFor === node.id} onClick={() => setMenuFor(menuFor === node.id ? "" : node.id)}>
              <MoreVertical size={12} />
            </button>
          )}
        </div>
        {menuFor === node.id && (
          <div className="tree-menu" role="menu" data-tree-menu={node.id}>
            {node.kind === "chapter" && (
              <button onClick={() => { onCreate("scene", node.id); setMenuFor(""); }}>New scene</button>
            )}
            <button
              disabled={!bookId}
              onClick={() => { if (!bookId) return; onCreate("chapter", bookId); setMenuFor(""); }}
            >
              New chapter
            </button>
          </div>
        )}
        {children.length > 0 && !isCollapsed && <ul>{children.map((child) => renderRow(child, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <nav className="manuscript-tree panel" aria-label="Manuscript contents">
      <header className="tree-header">
        <div className="tree-header-info">
          <span className="tree-header-label">Manuscript</span>
          {book && (
            <div className="tree-header-book">
              <span className="tree-header-book-title">{book.title}</span>
              <span className="tree-header-book-words">{totalWords.toLocaleString()} words</span>
            </div>
          )}
        </div>
        <button aria-label="New chapter" onClick={() => onCreate("chapter", bookId)} disabled={!bookId}>
          <Plus size={13} />
        </button>
      </header>
      <div className="tree-scroll">
        {roots.length ? <ul>{roots.map((item) => renderRow(item, 0))}</ul> : <p className="tree-empty">No chapters yet. Use + to start one.</p>}
      </div>
    </nav>
  );
}
