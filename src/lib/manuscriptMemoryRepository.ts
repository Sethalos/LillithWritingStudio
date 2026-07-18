import type { ChatMessage } from "../domain/ai";
import type { BibleEntity, BibleEntityType, Character, ManuscriptNode, TimelineEvent } from "../domain/models";
import type { ProviderConfiguration } from "../domain/providers";
import { blankCharacter, loadCharacters, persistCharacter } from "./characterRepository";
import { runAiChat } from "./aiChatRepository";
import { loadBibleEntities, saveBibleEntity } from "./storyBibleRepository";
import { loadTimelineEvents, saveTimelineEvent } from "./timelineRepository";

export interface MemoryActivity { id:string; projectId:string; documentId:string; summary:string; details:string[]; contradictions:string[]; createdAt:string }
interface ExtractedCharacter { name:string; role?:"major"|"supporting"|"minor"; storyRole?:string; occupation?:string; appearance?:string; skills?:string[]; strengths?:string[]; weaknesses?:string[]; limitations?:string[]; desires?:string; fears?:string; traits?:string[]; notes?:string }
interface ExtractedEntity { type:BibleEntityType; name:string; summary?:string; facts?:Array<{field:string;value:string}> }
interface ExtractedEvent { title:string; description?:string; storyTime?:string; participants?:string[] }
interface Extraction { synopsis?:string; characters?:ExtractedCharacter[]; entities?:ExtractedEntity[]; timeline?:ExtractedEvent[]; contradictions?:string[] }

const activityKey=(projectId:string)=>`lillith:memory-activity:v1:${projectId}`;
export const loadMemoryActivities=(projectId:string):MemoryActivity[]=>{try{return JSON.parse(localStorage.getItem(activityKey(projectId))??"[]") as MemoryActivity[]}catch{return[]}};
const saveActivity=(activity:MemoryActivity)=>localStorage.setItem(activityKey(activity.projectId),JSON.stringify([activity,...loadMemoryActivities(activity.projectId)].slice(0,30)));
const clean=(value:string)=>value.trim().replace(/\s+/g," ");
const union=(current:string[],incoming:string[]|undefined)=>[...new Set([...current,...(incoming??[]).map(clean).filter(Boolean)])];
const parseJson=(text:string):Extraction=>{
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]??text;
  const start=fenced.indexOf("{");const end=fenced.lastIndexOf("}");
  if(start<0||end<start)throw new Error("Lillith returned memory notes in an unreadable format.");
  return JSON.parse(fenced.slice(start,end+1)) as Extraction;
};
const compatible=(current:string|undefined,next:string|undefined)=>!current?.trim()||!next?.trim()||current.trim().toLowerCase()===next.trim().toLowerCase();
const fill=(current:string|undefined,next:string|undefined)=>current?.trim()?current:next?.trim()||current;

export async function extractManuscriptMemory(input:{projectId:string;document:ManuscriptNode;content:string;provider:ProviderConfiguration;model:string}):Promise<{characters:Character[];activity:MemoryActivity}> {
  const plain=input.content.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim();
  if(plain.length<40)throw new Error("There is not enough manuscript text to update project memory yet.");
  const system=`You maintain the structured memory for a novelist. Analyze ONLY facts supported by the accepted manuscript. Return one JSON object and no commentary. Never invent missing details. Characters may be partial and should be progressively enriched. Put suspected conflicts with established facts in contradictions. Schema: {"synopsis":"brief account of what this section establishes","characters":[{"name":"","role":"major|supporting|minor","storyRole":"protagonist, antagonist, mentor, etc.","occupation":"","appearance":"","skills":[],"strengths":[],"weaknesses":[],"limitations":[],"desires":"","fears":"","traits":[],"notes":""}],"entities":[{"type":"location|organization|government|military-unit|technology|vehicle|object|religion|historical-event|rule|theme|symbol|plot-thread|mystery|promise|foreshadowing|payoff","name":"","summary":"","facts":[{"field":"","value":""}]}],"timeline":[{"title":"","description":"","storyTime":"","participants":[]}],"contradictions":[]}. Include named fictional characters, meaningful plot threads, locations, world facts and events; omit generic nouns.`;
  const messages:ChatMessage[]=[{role:"user",content:`Document: ${input.document.title}\n\n${plain.slice(-24000)}`,createdAt:new Date().toISOString()}];
  const response=await runAiChat({provider:input.provider,model:input.model,system,messages,temperature:0.05,maxOutputTokens:2600});
  const extraction=parseJson(response.text);const now=new Date().toISOString();const contradictions=[...(extraction.contradictions??[])];const details:string[]=[];
  const characters=await loadCharacters(input.projectId);
  for(const found of extraction.characters??[]){
    if(!found.name?.trim())continue;
    let character=characters.find(item=>item.identity.fullName.localeCompare(found.name,undefined,{sensitivity:"accent"})===0);
    const created=!character;
    if(!character){character=blankCharacter(input.projectId);character.identity.fullName=clean(found.name);character.role=found.role??"supporting";characters.push(character)}
    const scalarChecks:Array<[string,string|undefined,string|undefined]>=[["occupation",character.identity.occupation,found.occupation],["appearance",character.identity.physicalAppearance,found.appearance],["desire",character.psychology.consciousDesire,found.desires],["fear",character.psychology.coreFear,found.fears]];
    scalarChecks.forEach(([field,current,next])=>{if(!compatible(current,next))contradictions.push(`${character!.identity.fullName}: manuscript suggests ${field} “${next}”, but memory says “${current}”.`) });
    character={...character,role:created?(found.role??character.role):character.role,identity:{...character.identity,occupation:fill(character.identity.occupation,found.occupation),physicalAppearance:fill(character.identity.physicalAppearance,found.appearance),skills:union(character.identity.skills,[...(found.skills??[]),...(found.strengths??[])]),limitations:union(character.identity.limitations,[...(found.limitations??[]),...(found.weaknesses??[])])},psychology:{...character.psychology,consciousDesire:fill(character.psychology.consciousDesire,found.desires),coreFear:fill(character.psychology.coreFear,found.fears),beliefs:union(character.psychology.beliefs,found.traits)},notes:[character.notes,found.storyRole&&`Story role: ${found.storyRole}`,found.notes,`Observed in ${input.document.title}.`].filter(Boolean).join("\n"),updatedAt:now};
    const saved=await persistCharacter(character);characters.splice(characters.findIndex(item=>item.id===saved.id),1,saved);details.push(`${created?"Created":"Enriched"} character: ${saved.identity.fullName}`);
  }
  const entities=await loadBibleEntities();
  for(const found of extraction.entities??[]){if(!found.name?.trim()||!found.type)continue;let entity=entities.find(item=>item.projectId===input.projectId&&item.entityType===found.type&&item.name.toLowerCase()===found.name.toLowerCase());const created=!entity;if(!entity)entity={id:crypto.randomUUID(),projectId:input.projectId,entityType:found.type,name:clean(found.name),summary:found.summary,canonStatus:"canon",facts:[],createdAt:now,updatedAt:now};else entity={...entity,summary:fill(entity.summary,found.summary),updatedAt:now};for(const fact of found.facts??[]){if(!fact.field||!fact.value)continue;const prior=entity.facts.find(item=>item.fieldName.toLowerCase()===fact.field.toLowerCase());if(prior&&prior.value.toLowerCase()!==fact.value.toLowerCase()){contradictions.push(`${entity.name}: ${fact.field} may conflict with “${prior.value}”.`);continue}if(!prior)entity.facts.push({id:crypto.randomUUID(),fieldName:fact.field,value:fact.value,canonStatus:"canon",provenanceNodeId:input.document.id,createdAt:now})}await saveBibleEntity(entity);details.push(`${created?"Created":"Enriched"} ${found.type}: ${entity.name}`)}
  const events=await loadTimelineEvents();
  for(const found of extraction.timeline??[]){if(!found.title?.trim()||events.some(event=>event.projectId===input.projectId&&event.title.toLowerCase()===found.title.toLowerCase()&&event.nodeId===input.document.id))continue;const event:TimelineEvent={id:crypto.randomUUID(),projectId:input.projectId,title:clean(found.title),description:found.description,storyTimeStart:found.storyTime,orderKey:events.length+1,nodeId:input.document.id,canonStatus:"canon",participants:[],createdAt:now,updatedAt:now};await saveTimelineEvent(event);events.push(event);details.push(`Added timeline event: ${event.title}`)}
  const activity:MemoryActivity={id:crypto.randomUUID(),projectId:input.projectId,documentId:input.document.id,summary:extraction.synopsis?.trim()||`Updated memory from ${input.document.title}.`,details:[...new Set(details)],contradictions:[...new Set(contradictions)],createdAt:now};saveActivity(activity);return{characters,activity};
}
