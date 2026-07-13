import {invoke} from "@tauri-apps/api/core";
import type {BibleEntity} from "../domain/models";
import type{ProviderConfiguration}from"../domain/providers";
const isTauri=()=>"__TAURI_INTERNALS__" in window;
const key="lillith:story-bible";
const local=():BibleEntity[]=>{try{return JSON.parse(localStorage.getItem(key)??"[]")}catch{return[]}};
export const loadBibleEntities=():Promise<BibleEntity[]>=>isTauri()?invoke("list_bible_entities"):Promise.resolve(local());
export const saveBibleEntity=(bibleEntity:BibleEntity):Promise<BibleEntity>=>{if(isTauri())return invoke("save_bible_entity",{bibleEntity});const all=local();localStorage.setItem(key,JSON.stringify([...all.filter(item=>item.id!==bibleEntity.id),bibleEntity]));return Promise.resolve(bibleEntity)};
export const retrieveBibleContext=(query:string,limit=8):Promise<BibleEntity[]>=>{if(isTauri())return invoke("retrieve_bible_context",{query,limit});const terms=query.toLowerCase().split(/\W+/).filter(term=>term.length>1);return Promise.resolve(local().filter(item=>terms.some(term=>JSON.stringify(item).toLowerCase().includes(term))).slice(0,limit))};
export interface BibleExtractionSuggestion{id:string;batchId:string;entityType:string;name:string;summary?:string;facts:Array<{fieldName:string;value:string}>;confidence:number;evidence:string[];decision:"pending"|"accepted"|"rejected";createdAt:string;decidedAt?:string;documentId:string;documentTitle:string;model:string}
export const loadBibleExtractionSuggestions=():Promise<BibleExtractionSuggestion[]>=>isTauri()?invoke("list_bible_extraction_suggestions"):Promise.resolve([]);
export const extractStoryBible=(documentId:string,provider:ProviderConfiguration,model:string):Promise<BibleExtractionSuggestion[]>=>invoke("extract_story_bible",{request:{documentId,provider,model}});
export const decideBibleExtraction=(suggestionId:string,decision:"accepted"|"rejected",canonStatus:"canon"|"draft"|"possible"):Promise<BibleEntity|null>=>invoke("decide_bible_extraction",{suggestionId,decision,canonStatus});
