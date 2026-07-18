import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock3, Eye, FileText, Image as ImageIcon, MessageSquare, Paperclip, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";
import type { ChangeProposal, ChatAttachment, ContextPackage, EditingMode, ProposalDecision } from "../domain/ai";
import type { ProposalSegmentDecision, ReviewProposal } from "../lib/aiEditorRepository";
import { configuredExecution, estimateExecutionCost } from "../lib/providerRepository";
import { runAiChat } from "../lib/aiChatRepository";
import type { WorkflowState } from "../domain/workflow";
import { buildChangeHunks, composeTrackedText } from "../lib/trackedChanges";

type PanelMode = "chat" | "review";

interface Props {
  workflow: WorkflowState;
  context: ContextPackage;
  proposal?: ReviewProposal | ChangeProposal;
  decision: ProposalDecision;
  onDecision: (d: ProposalDecision, replacement?: string, segments?:ProposalSegmentDecision[]) => void;
  modelLabel: string;
  onRun: (instruction: string, mode: EditingMode) => void;
  running: boolean;
  error?: string;
  selectedText?: string;
  onKeepText?: (text:string) => void;
}

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}

const chatKey = (projectId: string) => `lillith:ai-chat:v1:${projectId}`;

function summarizeList(values: string[], emptyLabel: string) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  if (!cleaned.length) return emptyLabel;
  return cleaned.slice(0, 4).join(" · ") + (cleaned.length > 4 ? ` · +${cleaned.length - 4}` : "");
}

function buildSystemPrompt(workflow: WorkflowState, context: ContextPackage, selectedText?: string) {
  return [
    "You are Lillith, the user's embedded writing assistant.",
    "Help with brainstorming, drafting, revising, and decision-making.",
    "Use the project context below as guidance, not as something to repeat verbatim.",
    "When the user asks for prose, produce usable text the user can paste into the manuscript.",
    "When the user asks for ideas, offer clear options and explain tradeoffs briefly.",
    "Never overwrite manuscript text silently.",
    "",
    `Workflow phase: ${workflow.currentPhaseId}`,
    `Current recommendation: ${workflow.recommendation.title}`,
    `Recommendation reason: ${workflow.recommendation.reason}`,
    `Project brief: ${workflow.projectBrief.workingTitle || workflow.projectBrief.originalPremise || "Not filled yet."}`,
    `Creative North Star: ${workflow.creativeNorthStar.emotionalPromise || workflow.creativeNorthStar.readerExperience || "Not filled yet."}`,
    selectedText?.trim() ? `Selected manuscript text:\n${selectedText.trim()}` : "No manuscript selection is currently active.",
    `Context package: ${context.items.length} sources, ${context.estimatedInputTokens.toLocaleString()} estimated tokens.`,
  ].join("\n");
}

export function AiPanel({ workflow, context, proposal, decision, onDecision, modelLabel, onRun, running, error, selectedText, onKeepText }: Props) {
  const [mode, setMode] = useState<PanelMode>("chat");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [chatUsage, setChatUsage] = useState<{ inputTokens?: number; outputTokens?: number }>({});
  const [attachments,setAttachments]=useState<ChatAttachment[]>([]);
  const [openContext, setOpenContext] = useState(false);
  const [acceptedHunks, setAcceptedHunks] = useState<Set<string>>(new Set());
  const [editingProposal, setEditingProposal] = useState(false);
  const [editedProposal, setEditedProposal] = useState("");
  const [editingMode, setEditingMode] = useState<EditingMode>("tracked-rewrite");
  const [directApplyConfirmed, setDirectApplyConfirmed] = useState(false);
  const [regenerationInstruction,setRegenerationInstruction]=useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const attachmentRef=useRef<HTMLInputElement>(null);
  const execution = configuredExecution("brainstorm") ?? configuredExecution("primary-editor");
  const selectedPromptCost = estimateExecutionCost("brainstorm", Math.max(1, Math.ceil((selectedText?.length ?? 0) / 4) + 2000));
  const storedKey = chatKey(workflow.projectId);
  const unresolvedDecisionTitles = useMemo(() => workflow.decisions.filter((decisionItem) => decisionItem.status === "open" || decisionItem.status === "deferred").map((decisionItem) => decisionItem.title), [workflow.decisions]);
  const changeHunks = useMemo(() => proposal ? buildChangeHunks(proposal.before, proposal.after) : [], [proposal]);
  const changedHunks = useMemo(() => changeHunks.filter((hunk) => hunk.changed), [changeHunks]);

  useEffect(() => {
    setAcceptedHunks(new Set(changedHunks.map((hunk) => hunk.id)));
    setEditedProposal(proposal?.after ?? "");
    setEditingProposal(false);
    if(proposal&&"editingMode" in proposal)setEditingMode(proposal.editingMode);
  }, [proposal?.id, changedHunks.length]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storedKey);
      if (!stored) {
        setChatEntries([
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `I’m ready. Start with an idea, a scene, or a question, and I’ll help shape it with the current project context.`,
            createdAt: new Date().toISOString(),
          },
        ]);
        setChatLoaded(true);
        return;
      }
      const parsed = JSON.parse(stored) as ChatEntry[];
      if (Array.isArray(parsed) && parsed.length) setChatEntries(parsed);
      setChatLoaded(true);
    } catch {
      setChatEntries([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I’m ready. Start with an idea, a scene, or a question, and I’ll help shape it with the current project context.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setChatLoaded(true);
    }
  }, [storedKey]);

  useEffect(() => {
    if (!chatLoaded) return;
    const persistent=chatEntries.map(entry=>({...entry,attachments:entry.attachments?.map(({dataUrl:_,text:__,...attachment})=>attachment)}));
    localStorage.setItem(storedKey, JSON.stringify(persistent));
  }, [chatEntries, chatLoaded, storedKey]);

  useEffect(() => {
    const node = transcriptRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chatEntries, mode, proposal]);

  useEffect(() => {
    if (mode === "chat") queueMicrotask(() => composerRef.current?.focus());
  }, [mode]);

  useEffect(() => {
    if (selectedText?.trim()) setMode("chat");
  }, [selectedText]);

  const sendChat = async (messageText: string) => {
    const text = messageText.trim();
    if ((!text&&!attachments.length) || sending) return;
    if (!execution) {
      setChatError("Configure a Brainstorming or Primary editor model in Models first.");
      return;
    }
    setSending(true);
    setChatError("");
    const userMessage: ChatEntry = { id: crypto.randomUUID(), role: "user", content: text||"Please review the attached material.", createdAt: new Date().toISOString(), attachments };
    const conversation = [...chatEntries, userMessage];
    setChatEntries((all) => [...all, userMessage]);
    setDraft("");
    setAttachments([]);
    try {
      const response = await runAiChat({
        provider: execution.provider,
        model: execution.model,
        system: buildSystemPrompt(workflow, context, selectedText),
        messages: conversation.map((entry) => ({ role: entry.role, content: entry.content, createdAt:entry.createdAt, attachments:entry.attachments })),
        temperature: 0.55,
        maxOutputTokens: 1200,
      });
      setChatEntries((all) => [
        ...all,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.text,
          createdAt: new Date().toISOString(),
        },
      ]);
      setChatUsage({ inputTokens: response.inputTokens, outputTokens: response.outputTokens });
    } catch (cause) {
      setChatError(String(cause));
    } finally {
      setSending(false);
    }
  };

  const insertSelection = () => {
    if (!selectedText?.trim()) return;
    setDraft((current) => (current.trim() ? `${current}\n\n> ${selectedText.trim()}` : `> ${selectedText.trim()}`));
    setMode("chat");
    queueMicrotask(() => composerRef.current?.focus());
  };

  const clearChat = () => {
    setChatEntries([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `I’m ready. Start with an idea, a scene, or a question, and I’ll help shape it with the current project context.`,
        createdAt: new Date().toISOString(),
      },
    ]);
    setChatUsage({});
    setChatError("");
    setDraft("");
  };

  const selectionCost = selectedPromptCost
    ? selectedPromptCost.local
      ? "Local · $0 API cost"
      : selectedPromptCost.priced
        ? `${selectedPromptCost.minimum.toFixed(4)}–${selectedPromptCost.maximum.toFixed(4)} estimated`
        : "Pricing not configured"
    : "No cost estimate";

  const attachFiles=async(files:FileList|null)=>{
    if(!files)return;
    setChatError("");
    const next:ChatAttachment[]=[];
    for(const file of Array.from(files)){
      if(file.size>10*1024*1024){setChatError(`${file.name} is larger than the 10 MB chat attachment limit.`);continue;}
      if(file.type.startsWith("image/")){
        const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result??""));reader.onerror=()=>reject(new Error(`Could not read ${file.name}.`));reader.readAsDataURL(file)});
        next.push({name:file.name,mimeType:file.type,dataUrl,size:file.size});
      }else if(file.type.startsWith("text/")||/\.(md|txt|csv|json|html?)$/i.test(file.name)){
        next.push({name:file.name,mimeType:file.type||"text/plain",text:await file.text(),size:file.size});
      }else{
        setChatError("This first attachment pass supports images and readable text, Markdown, CSV, JSON, and HTML documents. PDF and DOCX extraction comes next.");
      }
    }
    setAttachments(current=>[...current,...next]);
    if(attachmentRef.current)attachmentRef.current.value="";
  };

  if(onKeepText){return <div className="lillith-chat-simple">
    <header className="lillith-chat-header"><div className="lillith-avatar">L</div><div><strong>Lillith</strong><small>{execution?`${execution.provider.label} · ${execution.model}`:"Configure a model to begin"}</small></div></header>
    <div className="chat-transcript" ref={transcriptRef}>
      {chatEntries.map(entry=><article key={entry.id} className={`chat-message ${entry.role}`}><span>{entry.role==="user"?"You":"Lillith"}</span><p>{entry.content}</p>{entry.attachments?.length?<div className="message-attachments">{entry.attachments.map(item=><span key={`${entry.id}-${item.name}`}>{item.mimeType.startsWith("image/")?<ImageIcon size={12}/>:<FileText size={12}/>} {item.name}</span>)}</div>:null}{entry.role==="assistant"&&<button className="keep-chat-text" onClick={()=>onKeepText(entry.content)}><Check size={13}/> Keep in manuscript</button>}</article>)}
      {sending&&<div className="lillith-typing"><i/><i/><i/><span>Lillith is thinking…</span></div>}
    </div>
    {selectedText?.trim()&&<button className="simple-selection" onClick={insertSelection}>Add selected manuscript text to this message</button>}
    {attachments.length>0&&<div className="pending-attachments">{attachments.map((item,index)=><div key={`${item.name}-${index}`}>{item.mimeType.startsWith("image/")&&item.dataUrl?<img src={item.dataUrl} alt=""/>:item.mimeType.startsWith("image/")?<ImageIcon size={18}/>:<FileText size={18}/>}<span><strong>{item.name}</strong><small>{Math.max(1,Math.round(item.size/1024))} KB</small></span><button aria-label={`Remove ${item.name}`} onClick={()=>setAttachments(all=>all.filter((_,itemIndex)=>itemIndex!==index))}><Trash2 size={13}/></button></div>)}</div>}
    <div className="simple-chat-composer"><button className="attach-button" aria-label="Attach files" title="Attach images or documents" onClick={()=>attachmentRef.current?.click()}><Paperclip size={19}/></button><input ref={attachmentRef} hidden multiple type="file" accept="image/*,.txt,.md,.csv,.json,.html,.htm,text/*" onChange={event=>void attachFiles(event.target.files)}/><textarea ref={composerRef} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Message Lillith…" onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void sendChat(draft)}}}/><button className="simple-send" aria-label="Send message" onClick={()=>void sendChat(draft)} disabled={sending||(!draft.trim()&&!attachments.length)}><Send size={18}/></button></div>
    {chatError&&<div className="simple-chat-error" role="alert">{chatError}</div>}
    <footer>Enter to send · Shift+Enter for a new line · Images require a vision-capable model</footer>
  </div>}

  return (
    <div className="ai-panel">
      <div className="ai-title">
        <div>
          <Sparkles size={17} />
          <strong>AI Workspace</strong>
        </div>
        <button title={modelLabel}>
          <ChevronDown size={15} /> {modelLabel}
        </button>
      </div>

      <div className="ai-mode-tabs" role="tablist" aria-label="AI panel mode">
        <button className={mode === "chat" ? "active" : ""} onClick={() => setMode("chat")} role="tab" aria-selected={mode === "chat"}>
          <MessageSquare size={14} /> Chat
        </button>
        <button className={mode === "review" ? "active" : ""} onClick={() => setMode("review")} role="tab" aria-selected={mode === "review"}>
          <Eye size={14} /> Review
        </button>
      </div>

      <div className="ai-context-strip">
        <button onClick={() => setOpenContext((value) => !value)}>
          Workflow: {workflow.currentPhaseId.replaceAll("_", " ")} · {context.items.length} sources <ChevronDown size={13} />
        </button>
        {openContext && (
          <div className="ai-context-details">
            <div><strong>Project brief</strong><p>{workflow.projectBrief.originalPremise || workflow.projectBrief.workingTitle || "Not filled yet."}</p></div>
            <div><strong>North Star</strong><p>{workflow.creativeNorthStar.emotionalPromise || workflow.creativeNorthStar.readerExperience || "Not filled yet."}</p></div>
            <div><strong>Unresolved decisions</strong><p>{summarizeList(unresolvedDecisionTitles, "None currently unresolved.")}</p></div>
          </div>
        )}
      </div>

      {mode === "chat" && (
        <>
          <div className="chat-status-row">
            <span>Brainstorm route</span>
            <small>{execution ? `${execution.provider.label} · ${execution.model}` : "No model configured"}</small>
            <small>{chatUsage.inputTokens ? `${chatUsage.inputTokens.toLocaleString()} in` : "No usage yet"}{chatUsage.outputTokens ? ` · ${chatUsage.outputTokens.toLocaleString()} out` : ""}</small>
          </div>

          {selectedText?.trim() && (
            <div className="selection-preview">
              <div>
                <strong>Selected manuscript text</strong>
                <p>{selectedText.trim()}</p>
              </div>
              <button onClick={insertSelection}>Send to chat</button>
            </div>
          )}

          <div className="chat-transcript" ref={transcriptRef}>
            {chatEntries.map((entry) => (
              <article key={entry.id} className={`chat-message ${entry.role}`}>
                <span>{entry.role === "user" ? "You" : "Lillith"}</span>
                <p>{entry.content}</p>
              </article>
            ))}
          </div>

          <div className="chat-composer">
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask for ideas, draft prose, or discuss the next step…"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendChat(draft);
                }
              }}
            />
            <div className="chat-composer-actions">
              <button onClick={clearChat} disabled={sending}>
                <RotateCcw size={14} /> Reset
              </button>
              <button className="primary" onClick={() => void sendChat(draft)} disabled={sending || !draft.trim()}>
                {sending ? <><RotateCcw className="spin" size={14} /> Sending…</> : <><Send size={14} /> Send</>}
              </button>
            </div>
            <small>{selectionCost}</small>
            {chatError && <small className="ai-error">{chatError}</small>}
          </div>

          <div className="chat-quick-actions">
            <button onClick={() => setDraft("Brainstorm 5 story directions for this project. Give me the tradeoffs for each.")}>Brainstorm directions</button>
            <button onClick={() => setDraft("Draft the next scene in a clean, readable voice. Keep it reviewable and usable.")}>Draft next scene</button>
            <button onClick={() => setDraft("What unresolved questions should I answer before moving forward?")}>Find gaps</button>
          </div>
        </>
      )}

      {mode === "review" && (
        <>
          <div className="ai-run-box">
            <span className="eyebrow">SELECTION ACTION</span>
            <div className="editing-mode-picker" role="group" aria-label="Editing mode">
              {([ ["suggest-only","Suggest Only"], ["tracked-rewrite","Tracked Rewrite"], ["direct-apply","Direct Apply"] ] as const).map(([value,label])=><button key={value} className={editingMode===value?"active":""} onClick={()=>{setEditingMode(value);setDirectApplyConfirmed(false)}}>{label}</button>)}
            </div>
            <small>{editingMode==="suggest-only"?"Findings and repair strategies only; manuscript text cannot be applied.":editingMode==="tracked-rewrite"?"Review every proposed change before it reaches the manuscript.":"Applies the generated replacement immediately after a snapshot and safety checks."}</small>
            {editingMode==="direct-apply"&&<label className="direct-apply-confirm"><input type="checkbox" checked={directApplyConfirmed} onChange={event=>setDirectApplyConfirmed(event.target.checked)}/> I understand this skips proposal review for this operation.</label>}
            <select id="editor-action" defaultValue="Strengthen character voice">
              <option>Strengthen character voice</option>
              <option>Improve dialogue</option>
              <option>Improve prose</option>
              <option>Increase emotional depth</option>
              <option>Add subtext</option>
              <option>Increase tension</option>
              <option>Condense</option>
              <option>Expand</option>
              <option>Clarify</option>
              <option>Continue scene</option>
            </select>
            <button disabled={running || !selectedText || (editingMode==="direct-apply"&&!directApplyConfirmed)} onClick={() => onRun((document.getElementById("editor-action") as HTMLSelectElement).value,editingMode)}>
              {running ? <><RotateCcw className="spin" size={14} /> Working…</> : <><Sparkles size={14} /> Generate reviewed change</>}
            </button>
            {!selectedText && <small>Select text in the manuscript, then switch to review or use the chat tab.</small>}
            {error && <small className="ai-error">{error}</small>}
          </div>

          {proposal ? (
            <>
              <div className="issue-block">
                <span className="eyebrow">VOICE LOCK FINDING</span>
                <h3>{proposal.issue}</h3>
                <p>{proposal.rationale}</p>
              </div>
              <div className="context-summary">
                <div>
                  <Eye size={16} />
                  <strong>Context supplied</strong>
                </div>
                <button>
                  {context.items.length} sources · {context.estimatedInputTokens.toLocaleString()} tokens{context.estimatedCost ? ` · ${context.estimatedCost.minimum.toFixed(4)}${context.estimatedCost.maximum !== context.estimatedCost.minimum ? `–${context.estimatedCost.maximum.toFixed(4)}` : ""}` : ""} <ChevronDown size={14} />
                </button>
              </div>
              <div className="context-list">
                {context.items.map((item) => (
                  <div key={item.id}>
                    <span className={`source-dot ${item.source}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.reason} · {item.tokenEstimate} tokens</small>
                    </div>
                    <em>{Math.round(item.relevance * 100)}%</em>
                  </div>
                ))}
              </div>
              {editingMode!=="suggest-only"&&<div className="comparison">
                <span className="eyebrow">DRAFTED CORRECTION</span>
                <div className="before"><small>ORIGINAL</small><p>“{proposal.before}”</p></div>
                <div className="after">
                  <small>PROPOSED · {changedHunks.length} REVIEWABLE {changedHunks.length === 1 ? "CHANGE" : "CHANGES"}</small>
                  {editingProposal ? (
                    <textarea className="proposal-editor" value={editedProposal} onChange={(event) => setEditedProposal(event.target.value)} />
                  ) : (
                    <p className="inline-diff">“{changeHunks.map((hunk) => hunk.changed ? (
                      <button key={hunk.id} className={acceptedHunks.has(hunk.id) ? "change accepted" : "change rejected"} title="Toggle this change" onClick={() => setAcceptedHunks((current) => { const next = new Set(current); if (next.has(hunk.id)) next.delete(hunk.id); else next.add(hunk.id); return next; })}>
                        {hunk.before && <del>{hunk.before}</del>}{hunk.after && <ins>{hunk.after}</ins>}
                      </button>
                    ) : <span key={hunk.id}>{hunk.after}</span>)}”</p>
                  )}
                  <div className="segment-tools">
                    <button onClick={() => setAcceptedHunks(new Set(changedHunks.map((hunk) => hunk.id)))}>Accept all segments</button>
                    <button onClick={() => setAcceptedHunks(new Set())}>Reject all segments</button>
                    <button onClick={() => { setEditedProposal(composeTrackedText(changeHunks, acceptedHunks)); setEditingProposal((value) => !value); }}>{editingProposal ? "Return to segments" : "Edit proposed text"}</button>
                  </div>
                </div>
              </div>}
              {editingMode==="suggest-only" ? <div className="suggest-only-result"><strong>No manuscript changes drafted.</strong><p>{proposal.strategies.join(" · ")||"Use the finding and evidence above to guide your revision."}</p><button onClick={()=>onDecision("deferred")}><Clock3 size={15}/> Save finding for later</button></div> : decision === "pending" ? (
                <><div className="regenerate-box"><input value={regenerationInstruction} onChange={event=>setRegenerationInstruction(event.target.value)} placeholder="Additional instructions for another version…"/><button disabled={running||!regenerationInstruction.trim()} onClick={()=>onRun(`[Regenerate parent=${proposal.id}] ${regenerationInstruction.trim()}`,"tracked-rewrite")}><RotateCcw size={14}/> Regenerate</button></div><div className="decision-bar">
                  <button className="accept" onClick={() => {const replacement=editingProposal?editedProposal:composeTrackedText(changeHunks,acceptedHunks);const segments:ProposalSegmentDecision[]=editingProposal?[{segmentId:"author-edit",ordinal:0,beforeText:proposal.before,afterText:editedProposal,decision:"edited"}]:changeHunks.map((hunk,ordinal)=>({segmentId:hunk.id,ordinal,beforeText:hunk.before,afterText:hunk.after,decision:hunk.changed?(acceptedHunks.has(hunk.id)?"accepted":"rejected"):"unchanged"}));onDecision(editingProposal?"edited":"accepted",replacement,segments)}}><Check size={16} /> Apply reviewed version</button>
                  <button onClick={() => onDecision("rejected")}><X size={16} /> Reject</button>
                  <button onClick={() => onDecision("deferred")}><Clock3 size={16} /> Defer</button>
                </div></>
              ) : (
                <div className="decision-result"><span>Proposal {decision}.</span></div>
              )}
            </>
          ) : (
            <div className="ai-empty-review">
              <Eye size={22} />
              <p>Your inspectable context and tracked proposal will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
