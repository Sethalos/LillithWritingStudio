import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, FolderOpen, MoreVertical, Plus } from "lucide-react";
import type { Id, ManuscriptNode } from "../domain/models";
import { buildTree, type TreeNode } from "../lib/manuscriptTree";

interface Props {
  nodes: ManuscriptNode[];
  activeId: Id;
  onSelect: (id: Id) => void;
  onCreate: (kind: "chapter" | "scene", parentId: Id) => void;
  onRename: (id: Id, title: string) => void;
  onDelete: (id: Id) => void;
}

// "book-root" and "chapter-root" are the synthetic ids the vault backend stamps
// onto its two scaffolding nodes (src-tauri/src/vault_commands.rs) — there is no
// file on disk backing either one, so they must never offer Rename or Delete.
const isSyntheticNode = (id: string) => id === "book-root" || id === "chapter-root";

export function ManuscriptTree({ nodes, activeId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState("");
  const [renameFor, setRenameFor] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [deleteFor, setDeleteFor] = useState("");
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const book = nodes.find((node) => node.kind === "book");
  // The vault is flat: every manuscript markdown file is a scene under the one
  // synthetic chapter, and nothing in the backend can create a level of
  // hierarchy. So the tree offers scenes only — a "New chapter" control here
  // would create a scene titled "New chapter" and look like it had done nothing.
  const chapterId = nodes.find((node) => node.kind === "chapter")?.id ?? "";
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

  // Dismiss an open row menu (or its rename/delete follow-up) on Escape or on a
  // click anywhere outside it. The data attribute keeps the owning ⋮ button, the
  // rename form, and the delete confirmation out of "outside", so interacting
  // with any of them never closes itself out from under the writer.
  useEffect(() => {
    if (!menuFor && !renameFor && !deleteFor) return;
    const closeAll = () => {
      setMenuFor("");
      setRenameFor("");
      setDeleteFor("");
    };
    const onPointerDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("[data-tree-menu]")) return;
      closeAll();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuFor, renameFor, deleteFor]);

  const startRename = (id: string, title: string) => {
    setMenuFor("");
    setDeleteFor("");
    setRenameValue(title);
    setRenameFor(id);
  };
  const startDelete = (id: string) => {
    setMenuFor("");
    setRenameFor("");
    setDeleteFor(id);
  };

  const renderRow = (item: TreeNode, depth: number) => {
    const { node, children, words } = item;
    const isContainer = children.length > 0 || node.kind !== "scene";
    const isCollapsed = collapsed.has(node.id);
    // Only scenes open a document. A chapter or part row expands and collapses —
    // clicking one must never swap the editor to some other scene.
    const isScene = node.kind === "scene";
    const isSynthetic = isSyntheticNode(node.id);
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
          <button
            className="tree-menu-toggle"
            data-tree-menu={node.id}
            aria-label={`Actions for ${node.title}`}
            aria-expanded={menuFor === node.id}
            onClick={() => {
              const opening = menuFor !== node.id;
              setMenuFor(opening ? node.id : "");
              setRenameFor("");
              setDeleteFor("");
            }}
          >
            <MoreVertical size={12} />
          </button>
        </div>
        {menuFor === node.id && (
          <div className="tree-menu" role="menu" data-tree-menu={node.id}>
            {isScene ? (
              <>
                <button onClick={() => startRename(node.id, node.title)}>Rename</button>
                <button onClick={() => startDelete(node.id)}>Delete</button>
              </>
            ) : (
              <>
                {node.kind === "chapter" && (
                  <button onClick={() => { onCreate("scene", node.id); setMenuFor(""); }}>New scene</button>
                )}
                {!isSynthetic && <button onClick={() => startRename(node.id, node.title)}>Rename</button>}
              </>
            )}
          </div>
        )}
        {renameFor === node.id && (
          <form
            className="tree-rename"
            data-tree-menu={node.id}
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = renameValue.trim();
              if (!trimmed) return;
              onRename(node.id, trimmed);
              setRenameFor("");
            }}
          >
            <input aria-label="Scene title" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} autoFocus />
          </form>
        )}
        {deleteFor === node.id && (
          <div className="tree-delete-confirm" role="alertdialog" data-tree-menu={node.id}>
            <p>{`Delete "${node.title}"? This cannot be undone from the app.`}</p>
            <div className="tree-delete-confirm-actions">
              <button onClick={() => { onDelete(node.id); setDeleteFor(""); }}>Delete scene</button>
              <button onClick={() => setDeleteFor("")}>Cancel</button>
            </div>
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
        <button aria-label="New scene" onClick={() => onCreate("scene", chapterId)} disabled={!chapterId}>
          <Plus size={13} />
        </button>
      </header>
      <div className="tree-scroll">
        {roots.length ? <ul>{roots.map((item) => renderRow(item, 0))}</ul> : <p className="tree-empty">No scenes yet. Use + to start one.</p>}
      </div>
    </nav>
  );
}
