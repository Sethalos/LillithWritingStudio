import {invoke} from "@tauri-apps/api/core";
import type {ManuscriptNode} from "../domain/models";
export interface DocumentRevision{id:string;documentId:string;revision:number;contentHash:string;source:"autosave"|"manual"|"ai-accepted"|"import"|"undo";createdAt:string;content:string;wordCount:number}export interface ProposalHistory{id:string;issue:string;before:string;after:string;createdAt:string;decision:string;decidedAt?:string;model?:string;provider?:string}export interface DocumentHistory{revisions:DocumentRevision[];proposals:ProposalHistory[]}export interface RestoredRevision{content:string;revision:number;restoredFrom:number}
const isTauri=()=>"__TAURI_INTERNALS__" in window;
export const loadDocumentHistory=(document:ManuscriptNode):Promise<DocumentHistory>=>isTauri()?invoke("document_history",{documentId:document.id}):Promise.resolve({revisions:[{id:`local-${document.revision}`,documentId:document.id,revision:document.revision,contentHash:"browser",source:"autosave",createdAt:document.updatedAt,content:document.content??"",wordCount:document.wordCount}],proposals:[]});
export const restoreDocumentRevision=(documentId:string,revision:number):Promise<RestoredRevision>=>invoke("restore_document_revision",{documentId,revision});
export const acceptHistoryProposal=(proposalId:string):Promise<{content:string;revision:number;proposalId:string}>=>(invoke("accept_editor_proposal",{proposalId}));
export const decideHistoryProposal=(proposalId:string,decision:"rejected"|"deferred"):Promise<void>=>(invoke("decide_editor_proposal",{proposalId,decision}));
