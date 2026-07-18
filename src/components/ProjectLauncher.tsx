import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { BookOpen, FolderOpen, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import type { WorkspaceData } from "../domain/models";
import { chooseAndCreateProject, chooseAndOpenProject, listSavedWorkspaces, loadCurrentWorkspace } from "../lib/repository";

const supportedCoverTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxCoverBytes = 6 * 1024 * 1024;

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The selected cover could not be read as an image.")); };
    image.src = url;
  });
}

async function browserCoverThumbnail(file: File): Promise<string> {
  const image = await readImage(file);
  const scale = Math.min(1, 600 / image.naturalWidth, 900 / image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the selected cover image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("The selected cover image could not be read."));
    reader.readAsDataURL(file);
  });
}

export function ProjectLauncher({ onClose, onWorkspace }: { onClose: () => void; onWorkspace: (workspace: WorkspaceData) => void }) {
  const [mode, setMode] = useState<"home" | "create" | "browse">("home");
  const [title, setTitle] = useState("");
  const [coverImageDataUrl, setCoverImageDataUrl] = useState("");
  const [savedProjects, setSavedProjects] = useState<WorkspaceData[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[onClose]);
  const run = async (operation: () => Promise<WorkspaceData | null>) => { setBusy(true); setError(""); try { const workspace = await operation(); if (workspace) onWorkspace(workspace); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } };
  const pickCoverImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setError("");
    if (!supportedCoverTypes.has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP cover image.");
      return;
    }
    if (file.size > maxCoverBytes) {
      setError("Cover images must be 6 MB or smaller.");
      return;
    }
    try {
      const inDesktop = "__TAURI_INTERNALS__" in window;
      setCoverImageDataUrl(inDesktop ? await readDataUrl(file) : await browserCoverThumbnail(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const openCurrentProjectPicker = () => {
    setSavedProjects(listSavedWorkspaces());
    setMode("browse");
  };
  const openExistingProject = async () => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      await run(chooseAndOpenProject);
      return;
    }
    openCurrentProjectPicker();
  };
  return <div className="launcher-backdrop"><section className="project-launcher" role="dialog" aria-modal="true" aria-labelledby="launcher-title"><button className="launcher-close" aria-label="Close project launcher" onClick={onClose}><X size={17} /></button><div className="launcher-brand"><img src="/assets/lillith-portrait.png" alt="Lillith" /><div><span>LILLITH</span><strong>Writing Studio</strong></div></div>{mode === "home" ? <><div className="launcher-copy"><h2 id="launcher-title">Your stories live here.</h2><p>Create a private local project or open an existing <code>.lillith</code> folder.</p></div><div className="launcher-actions"><button className="primary" onClick={() => setMode("create")}><Plus size={20} /><span><strong>New writing project</strong><small>Create a manuscript, database, and local snapshots</small></span></button><button onClick={() => void openExistingProject()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={20} /> : <FolderOpen size={20} />}<span><strong>Open existing project</strong><small>Select a project folder from this computer</small></span></button><button onClick={() => loadCurrentWorkspace() ? openCurrentProjectPicker() : void openExistingProject()} disabled={busy}><BookOpen size={20} /><span><strong>Current project</strong><small>Reload the local workspace currently stored here</small></span></button></div></> : mode === "browse" ? <div className="project-picker"><button className="back-link" onClick={() => setMode("home")}>← Back</button><BookOpen size={26} /><h2 id="launcher-title">Choose a project</h2><p>Select one of the saved local projects below.</p><div className="project-picker-list">{savedProjects.length === 0 ? <div className="project-picker-empty">No saved projects found yet.</div> : savedProjects.map((workspace) => <button key={workspace.project.id} className="project-picker-item" onClick={() => { void run(async () => workspace); }}><strong>{workspace.project.title || "Untitled project"}</strong><small>Updated {new Date(workspace.project.updatedAt).toLocaleString()}</small></button>)}</div></div> : <div className="create-project"><button className="back-link" onClick={() => setMode("home")}>← Back</button><BookOpen size={26} /><h2 id="launcher-title">Name your project</h2><p>You can change the title later. The folder remains portable and readable outside Lillith.</p><div className="image-frame-row"><button className="image-frame" onClick={() => fileInput.current?.click()} type="button" aria-label="Choose project image">{coverImageDataUrl ? <img src={coverImageDataUrl} alt="" /> : <span>BUR</span>}</button><div className="image-frame-copy"><strong>Project image</strong><small>Add a PNG, JPEG, or WebP cover (up to 6 MB).</small><div className="image-actions"><button type="button" onClick={() => fileInput.current?.click()}><ImagePlus size={14} /> Choose image</button><button type="button" onClick={() => setCoverImageDataUrl("")} disabled={!coverImageDataUrl}><Trash2 size={14} /> Remove</button></div></div><input ref={fileInput} aria-label="Project image file" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickCoverImage} /></div><label><span>PROJECT TITLE</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The name of your novel" onKeyDown={(event) => event.key === "Enter" && title.trim() && run(() => chooseAndCreateProject(title, coverImageDataUrl))} /></label><button className="create-button" disabled={!title.trim() || busy} onClick={() => run(() => chooseAndCreateProject(title, coverImageDataUrl))}>{busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Create local project</button></div>}{error && <div className="launcher-error" role="alert">{error}</div>}<footer><span><i /> Local-first</span><span>No cloud account required</span></footer></section></div>;
}
