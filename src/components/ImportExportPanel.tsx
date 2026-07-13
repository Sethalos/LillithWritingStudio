import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Download, FileOutput, FileUp, LoaderCircle, Upload } from "lucide-react";
import type { ManuscriptNode } from "../domain/models";
import {
  chooseAndExportDocument,
  chooseAndInspectDocument,
  commitDocumentImport,
  type DocumentPreview,
  type ExportFormat,
} from "../lib/documentRepository";

export function ImportExportPanel({ projectTitle, onImported }: { projectTitle: string; onImported: (nodes: ManuscriptNode[]) => void }) {
  const [preview, setPreview] = useState<DocumentPreview>();
  const [busy, setBusy] = useState<"inspect" | "import" | "export">();
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inspect = async () => {
    setBusy("inspect"); setError("");
    try { const result = await chooseAndInspectDocument(); if (result) setPreview(result); }
    catch (cause) { setError(String(cause)); }
    finally { setBusy(undefined); }
  };
  const commit = async () => {
    if (!preview) return;
    setBusy("import"); setError("");
    try {
      const nodes = await commitDocumentImport(preview); onImported(nodes);
      setMessage(`Imported ${preview.counts.chapters} chapters and ${preview.counts.scenes} scenes.`); setPreview(undefined);
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(undefined); }
  };
  const exportFile = async () => {
    setBusy("export"); setError(""); setMessage("");
    try {
      const result = await chooseAndExportDocument(projectTitle, format);
      if (result) setMessage(`Exported ${result.chapters} chapters and ${result.scenes} scenes to ${result.outputPath}`);
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(undefined); }
  };
  const kdp = format === "kdp-docx";

  return <div className="files-panel">
    <header><FileOutput size={18}/><div><strong>Import & Export</strong><small>Portable manuscript files</small></div></header>
    <div className="files-scroll">
      <section className="file-card">
        <div className="file-card-title"><span><Upload size={16}/><strong>Reviewed import</strong></span><em>DOCX · MD · TXT · HTML · EPUB</em></div>
        <p>Inspect a manuscript, review the detected chapters and scenes, then choose whether to add them to this project.</p>
        <button onClick={inspect} disabled={!!busy}>{busy === "inspect" ? <LoaderCircle className="spin" size={14}/> : <FileUp size={14}/>} Choose manuscript to inspect</button>
      </section>
      {preview && <section className="import-preview">
        <header><div><strong>Import preview</strong><small>{preview.sourcePath}</small></div><span>{preview.counts.words.toLocaleString()} words</span></header>
        <div className="preview-counts"><span><b>{preview.counts.chapters}</b> chapters</span><span><b>{preview.counts.scenes}</b> scenes</span><span><b>{preview.counts.words.toLocaleString()}</b> words</span></div>
        {preview.warnings.map(warning => <div className="import-warning" key={warning}><AlertTriangle size={12}/>{warning}</div>)}
        <div className="preview-tree">{preview.chapters.map((chapter, index) => <details key={`${chapter.title}-${index}`} open={index === 0}>
          <summary><ChevronDown size={12}/><strong>{chapter.title}</strong><span>{chapter.scenes.length} scenes</span></summary>
          {chapter.scenes.map((scene, sceneIndex) => <div key={`${scene.title}-${sceneIndex}`}><i/><span>{scene.title}</span><small>{scene.wordCount.toLocaleString()} words</small></div>)}
        </details>)}</div>
        <footer><button className="cancel-import" onClick={() => setPreview(undefined)}>Cancel</button><button className="commit-import" onClick={commit} disabled={!!busy}>{busy === "import" ? <LoaderCircle className="spin" size={14}/> : <Check size={14}/>} Add to project</button></footer>
      </section>}
      <section className="file-card export-card">
        <div className="file-card-title"><span><Download size={16}/><strong>Complete manuscript export</strong></span><em>PORTABLE OUTPUT</em></div>
        <p>Export the binder in chapter and scene order with essential formatting and scene separators.</p>
        <label className="export-format"><span>FORMAT</span><select aria-label="Export format" value={format} onChange={event => setFormat(event.target.value as ExportFormat)}>
          <option value="docx">DOCX — editable manuscript</option>
          <option value="kdp-docx">KDP DOCX — 6 × 9 paperback interior</option>
          <option value="md">Markdown</option><option value="txt">Plain text</option><option value="html">Standalone HTML</option><option value="epub">EPUB 3</option><option value="pdf">PDF proof</option>
        </select></label>
        {kdp && <div className="kdp-summary" role="note"><strong>KDP paperback preset</strong><span>6 × 9 inch trim · mirrored gutter margins · Garamond 11 pt · title page · chapter page breaks · page numbers</span><small>Review the generated DOCX in Word or LibreOffice and use KDP Previewer before publishing.</small></div>}
        <button onClick={exportFile} disabled={!!busy}>{busy === "export" ? <LoaderCircle className="spin" size={14}/> : <FileOutput size={14}/>} {kdp ? "Export KDP-ready DOCX" : `Export as ${format.toUpperCase()}`}</button>
      </section>
      {message && <div className="file-message"><Check size={13}/><span>{message}</span></div>}
      {error && <div className="file-error"><AlertTriangle size={13}/><span>{error}</span></div>}
    </div>
  </div>;
}
