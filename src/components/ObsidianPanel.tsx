import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, CheckCircle2, FolderOpen, RefreshCw, Save } from "lucide-react";
import { loadObsidianConfig, loadObsidianConflicts, saveObsidianConfig, syncObsidian, type ObsidianConfig, type ObsidianConflict, type ObsidianSyncResult } from "../lib/obsidianRepository";

const blankConfig=(projectId:string,projectTitle:string):ObsidianConfig=>({projectId,vaultRoot:"",vaultMode:"master",projectFolder:projectTitle,enabled:true,updatedAt:new Date().toISOString()});

export function ObsidianPanel({projectId,projectTitle}:{projectId:string;projectTitle:string}) {
  const [config,setConfig]=useState<ObsidianConfig>(()=>blankConfig(projectId,projectTitle));
  const [conflicts,setConflicts]=useState<ObsidianConflict[]>([]);
  const [result,setResult]=useState<ObsidianSyncResult>();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    setConfig(blankConfig(projectId,projectTitle));setConflicts([]);setResult(undefined);setError("");
    void Promise.all([loadObsidianConfig(),loadObsidianConflicts()]).then(([saved,items])=>{
      if(cancelled)return;setConfig(saved??blankConfig(projectId,projectTitle));setConflicts(items);
    }).catch(cause=>{if(!cancelled)setError(`Vault configuration could not be loaded: ${String(cause)}`)});
    return()=>{cancelled=true};
  },[projectId,projectTitle]);

  const choose=async()=>{const selected=await open({directory:true,multiple:false,title:"Choose Lillith Studio Obsidian vault"});if(typeof selected==="string")setConfig(current=>({...current,vaultRoot:selected}))};
  const save=async()=>{setBusy(true);setError("");try{setConfig(await saveObsidianConfig(config))}catch(cause){setError(String(cause))}finally{setBusy(false)}};
  const sync=async()=>{setBusy(true);setError("");try{const next=await syncObsidian();setResult(next);setConflicts(await loadObsidianConflicts())}catch(cause){setError(String(cause))}finally{setBusy(false)}};

  return <div className="obsidian-panel"><header><div><h2>Obsidian Vault</h2><p>Human-readable project memory · one-way from Lillith</p></div><button disabled={busy||!config.vaultRoot} onClick={()=>void sync()}><RefreshCw size={14}/>Sync approved data</button></header><section className="obsidian-card"><h3>Vault configuration</h3><label><span>Vault arrangement</span><select value={config.vaultMode} onChange={event=>setConfig({...config,vaultMode:event.target.value as ObsidianConfig["vaultMode"]})}><option value="master">Master vault with project folders (recommended)</option><option value="independent">Independent vault for this project</option></select></label><label><span>Vault root</span><div className="vault-path"><input value={config.vaultRoot} readOnly placeholder="Choose a local Obsidian vault folder"/><button onClick={()=>void choose()}><FolderOpen size={14}/>Choose</button></div></label>{config.vaultMode==="master"&&<label><span>Project folder</span><input value={config.projectFolder} onChange={event=>setConfig({...config,projectFolder:event.target.value})}/></label>}<button className="save-vault" disabled={busy||!config.vaultRoot} onClick={()=>void save()}><Save size={14}/>Save configuration</button><p className="vault-policy">Lillith exports approved characters and Story Bible records. Author Notes are preserved. External changes to generated sections create conflicts and are never imported automatically.</p></section>{result&&<section className="obsidian-card sync-result"><CheckCircle2/><div><h3>Sync {result.status}</h3><p>{result.createdCount} created · {result.updatedCount} updated · {result.unchangedCount} unchanged · {result.conflictCount} conflicts</p><small>{result.vaultPath}</small></div></section>}{error&&<div className="vault-error" role="alert">{error}</div>}<section className="obsidian-card"><h3>External edit conflicts</h3>{conflicts.length?conflicts.map(item=><article key={item.id}><AlertTriangle size={15}/><div><strong>{item.relativePath}</strong><p>{item.reason}</p></div></article>):<p className="vault-empty">No conflicts detected.</p>}</section></div>;
}
