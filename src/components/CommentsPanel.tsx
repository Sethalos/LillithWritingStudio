import { useEffect, useState } from "react";
import { AlertTriangle, Check, CornerUpLeft, LoaderCircle, MessageSquarePlus, Save } from "lucide-react";
import type { ManuscriptNode } from "../domain/models";
import { createDocumentComment, loadDocumentComments, updateDocumentComment, type DocumentComment } from "../lib/commentsRepository";

export interface CommentSelection { from:number; to:number; text:string }

export function CommentsPanel({document,selection,onNavigate,onSelectionConsumed}:{document:ManuscriptNode;selection?:CommentSelection;onNavigate:(text:string)=>void;onSelectionConsumed:()=>void}) {
  const [comments,setComments]=useState<DocumentComment[]>([]);
  const [body,setBody]=useState("");
  const [showResolved,setShowResolved]=useState(false);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const load=()=>loadDocumentComments(document.id).then(setComments);
  useEffect(()=>{void load()},[document.id,document.revision]);
  const add=async()=>{
    if(!body.trim())return;
    const anchor=selection??{from:0,to:0,text:"Scene note"};
    setBusy("add");setError("");
    try{const comment=await createDocumentComment(document.id,anchor.from,anchor.to,anchor.text,body);setComments(all=>[comment,...all]);setBody("");onSelectionConsumed()}
    catch(cause){setError(String(cause))}finally{setBusy("")}
  };
  const status=async(comment:DocumentComment,next:"open"|"resolved")=>{setBusy(comment.id);setError("");try{await updateDocumentComment(comment,{status:next});await load()}catch(cause){setError(String(cause))}finally{setBusy("")}};
  const visible=comments.filter(comment=>showResolved||comment.status==="open");
  return <div className="comments-panel"><header><MessageSquarePlus size={18}/><div><strong>Comments & Notes</strong><small>{document.title}</small></div><label><input type="checkbox" checked={showResolved} onChange={event=>setShowResolved(event.target.checked)}/> Resolved</label></header>
    <section className="new-comment"><span>{selection?"SELECTED MANUSCRIPT TEXT":"SCENE NOTE"}</span>{selection&&<blockquote>“{selection.text}”</blockquote>}<textarea rows={4} value={body} onChange={event=>setBody(event.target.value)} placeholder={selection?"Add an editorial comment…":"Write or paste a note about this scene…"}/><div>{selection&&<button onClick={onSelectionConsumed}>Clear selection</button>}<button className="save-comment" disabled={!body.trim()||!!busy} onClick={add}>{busy==="add"?<LoaderCircle className="spin" size={13}/>:<Save size={13}/>} Save {selection?"comment":"scene note"}</button></div></section>
    {error&&<div className="comments-error" role="alert">{error}</div>}<div className="comment-list">{visible.length?visible.map(comment=><article key={comment.id} className={comment.status}><button className="comment-anchor" onClick={()=>comment.selectedText!=="Scene note"&&onNavigate(comment.selectedText)}><span className={comment.anchorState}>{comment.anchorState==="stale"?<AlertTriangle size={11}/>:<CornerUpLeft size={11}/>} {comment.selectedText==="Scene note"?"note":comment.anchorState}</span><blockquote>“{comment.selectedText}”</blockquote></button><p>{comment.body}</p><footer><time>{new Date(comment.createdAt).toLocaleString()}</time>{comment.status==="open"?<button disabled={!!busy} onClick={()=>status(comment,"resolved")}><Check size={11}/> Resolve</button>:<button disabled={!!busy} onClick={()=>status(comment,"open")}><CornerUpLeft size={11}/> Reopen</button>}</footer></article>):<div className="no-comments"><MessageSquarePlus size={23}/><p>No {showResolved?"":"open "}comments or notes for this scene.</p><small>Write a scene note above, or select manuscript text to anchor a comment.</small></div>}</div>
  </div>;
}
