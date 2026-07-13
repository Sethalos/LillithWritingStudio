import { useEffect, useState } from "react";
import { Archive, Check, DatabaseBackup, Feather, HardDrive, LoaderCircle, RefreshCw, RotateCcw, Save, ShieldCheck } from "lucide-react";
import type { WritingProfile } from "../domain/models";
import { createProjectBackup, listProjectBackups, restoreProjectBackupCopy, verifyProjectBackup, type ProjectBackup } from "../lib/settingsRepository";
import { blankWritingProfile, loadWritingProfile, persistWritingProfile } from "../lib/writingProfileRepository";

const size = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const lines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);

export function SettingsPanel({ projectId, projectRoot }: { projectId: string; projectRoot?: string }) {
  const [tab, setTab] = useState<"voice" | "safety">("voice");
  const [profile, setProfile] = useState<WritingProfile>(() => blankWritingProfile(projectId));
  const [backups, setBackups] = useState<ProjectBackup[]>([]);
  const [busy, setBusy] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [recovered, setRecovered] = useState("");
  useEffect(() => { void loadWritingProfile(projectId).then(setProfile).catch(cause => setError(String(cause))); }, [projectId]);
  useEffect(() => { void listProjectBackups().then(setBackups).catch(cause => setError(String(cause))); }, [projectRoot]);
  const patch = <K extends keyof WritingProfile>(key: K, value: WritingProfile[K]) => setProfile(current => ({ ...current, [key]: value }));
  const saveProfile = async () => { setBusy("profile"); setError(""); setNotice(""); try { const saved = await persistWritingProfile(profile); setProfile(saved); setNotice(`Author Voice version ${saved.version} saved locally and will be included in AI context.`); } catch (cause) { setError(String(cause)); } finally { setBusy(""); } };
  const create = async () => { setBusy("create"); setError(""); try { const backup = await createProjectBackup(); setBackups(all => [backup, ...all.filter(item => item.id !== backup.id)]); } catch (cause) { setError(String(cause)); } finally { setBusy(""); } };
  const verify = async (id: string) => { setBusy(id); setError(""); try { const backup = await verifyProjectBackup(id); setBackups(all => all.map(item => item.id === id ? backup : item)); } catch (cause) { setError(String(cause)); } finally { setBusy(""); } };
  const restore = async (id: string) => { setBusy(`restore-${id}`); setError(""); setRecovered(""); try { const path = await restoreProjectBackupCopy(id); if (path) setRecovered(path); } catch (cause) { setError(String(cause)); } finally { setBusy(""); } };

  return <div className="settings-panel">
    <header><DatabaseBackup size={19}/><div><strong>Project Settings</strong><small>Author voice, editing rules, and local safety</small></div></header>
    <nav className="settings-tabs"><button className={tab === "voice" ? "active" : ""} onClick={() => setTab("voice")}><Feather size={13}/> Author Voice & Rules</button><button className={tab === "safety" ? "active" : ""} onClick={() => setTab("safety")}><ShieldCheck size={13}/> Storage & Backups</button></nav>
    {error && <div className="settings-error" role="alert">{error}</div>}
    {tab === "voice" ? <div className="writing-profile">
      <section className="profile-intro"><div><span>ACTIVE PROJECT PROFILE</span><strong>Teach Lillith what must sound like you</strong><p>This versioned profile is shown in every AI context package. It guides edits but never authorizes silent manuscript changes.</p></div><em>VERSION {profile.version || "DRAFT"}</em></section>
      <label><span>Authorial voice summary</span><textarea rows={4} value={profile.styleSummary} onChange={event => patch("styleSummary", event.target.value)} placeholder="Describe the qualities that make the prose recognizably yours…"/></label>
      <div className="profile-grid">
        <label><span>Point of view</span><input value={profile.pointOfView} onChange={event => patch("pointOfView", event.target.value)} placeholder="Close third, rotating limited…"/></label>
        <label><span>Default tense</span><input value={profile.tense} onChange={event => patch("tense", event.target.value)} placeholder="Past tense"/></label>
        <label><span>Language and spelling</span><input value={profile.dialect} onChange={event => patch("dialect", event.target.value)} placeholder="Canadian English"/></label>
        <label><span>Description density</span><select value={profile.descriptionLevel} onChange={event => patch("descriptionLevel", event.target.value)}><option value="spare">Spare</option><option value="balanced">Balanced</option><option value="lush">Lush</option><option value="scene-dependent">Scene-dependent</option></select></label>
      </div>
      <label><span>Sentence rhythm</span><input value={profile.sentenceRhythm} onChange={event => patch("sentenceRhythm", event.target.value)} placeholder="Long accumulating observations broken by clipped pressure beats…"/></label>
      <label><span>Dialogue style</span><input value={profile.dialogueStyle} onChange={event => patch("dialogueStyle", event.target.value)} placeholder="Subtext-heavy, interruptions, minimal dialogue tags…"/></label>
      <div className="profile-grid lists">
        <label><span>Always preserve <small>one per line</small></span><textarea rows={5} value={profile.preserve.join("\n")} onChange={event => patch("preserve", lines(event.target.value))} placeholder="Ambiguity in emotional scenes\nTechnical precision"/></label>
        <label><span>Avoid <small>one per line</small></span><textarea rows={5} value={profile.avoid.join("\n")} onChange={event => patch("avoid", lines(event.target.value))} placeholder="Generic emotional labels\nOver-explaining subtext"/></label>
        <label><span>Mechanics & style sheet <small>one per line</small></span><textarea rows={5} value={profile.mechanics.join("\n")} onChange={event => patch("mechanics", lines(event.target.value))} placeholder="Use em dashes without spaces\nUse the Oxford comma"/></label>
        <label><span>Project rules <small>one per line</small></span><textarea rows={5} value={profile.projectRules.join("\n")} onChange={event => patch("projectRules", lines(event.target.value))} placeholder="Never reveal the signal's source before Chapter 12"/></label>
      </div>
      <label><span>Approved prose examples <small>separate examples with a blank line</small></span><textarea rows={7} value={profile.approvedSamples.join("\n\n")} onChange={event => patch("approvedSamples", event.target.value.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean))} placeholder="Paste short passages that demonstrate the voice the AI should protect…"/></label>
      <footer className="profile-footer"><span>{notice && <><Check size={12}/>{notice}</>}</span><button onClick={saveProfile} disabled={!!busy}>{busy === "profile" ? <LoaderCircle className="spin" size={13}/> : <Save size={13}/>} Save new profile version</button></footer>
    </div> : <div className="safety-settings">
      <section className="storage-card"><HardDrive size={16}/><div><span>PROJECT FOLDER</span><strong>{projectRoot}</strong><small>Manuscript files remain readable outside Lillith.</small></div></section>
      <section className="backup-heading"><div><h3>Verified backups</h3><p>Each backup contains a consistent SQLite copy, manuscript, assets, snapshots, and a SHA-256 manifest.</p></div><button onClick={create} disabled={!!busy}>{busy === "create" ? <LoaderCircle className="spin" size={13}/> : <Archive size={13}/>} Back up now</button></section>
      {recovered && <div className="recovery-success"><Check size={13}/> Recovered copy created at <strong>{recovered}</strong></div>}
      <div className="backup-list">{backups.length ? backups.map(backup => <article key={backup.id}><span className={backup.verified ? "verified" : "failed"}>{backup.verified ? <ShieldCheck size={15}/> : <RefreshCw size={15}/>}</span><div><strong>{new Date(backup.createdAt).toLocaleString()}</strong><small>{backup.fileCount} files · {size(backup.totalBytes)}</small><em title={backup.path}>{backup.path}</em></div><button disabled={!!busy} onClick={() => restore(backup.id)}>{busy === `restore-${backup.id}` ? <LoaderCircle className="spin" size={12}/> : <><RotateCcw size={12}/> Recover copy</>}</button><button disabled={!!busy} onClick={() => verify(backup.id)}>{busy === backup.id ? <LoaderCircle className="spin" size={12}/> : backup.verified ? <><Check size={12}/> Verified</> : <>Verify</>}</button></article>) : <div className="no-backups"><Archive size={24}/><p>No project backups yet.</p><small>Create one before major imports, revisions, or model-assisted passes.</small></div>}</div>
      <footer>Backups never include API keys or operating-system credentials.</footer>
    </div>}
  </div>;
}
