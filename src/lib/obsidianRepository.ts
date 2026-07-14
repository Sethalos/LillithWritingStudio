import { invoke } from "@tauri-apps/api/core";
export interface ObsidianConfig{projectId:string;vaultRoot:string;vaultMode:"master"|"independent";projectFolder:string;enabled:boolean;updatedAt:string}
export interface ObsidianSyncResult{id:string;status:string;createdCount:number;updatedCount:number;unchangedCount:number;conflictCount:number;completedAt:string;vaultPath:string}
export interface ObsidianConflict{id:string;entityType:string;entityId:string;relativePath:string;reason:string;createdAt:string}
export const loadObsidianConfig=():Promise<ObsidianConfig|null>=>invoke("load_obsidian_config");
export const saveObsidianConfig=(obsidianConfig:ObsidianConfig):Promise<ObsidianConfig>=>invoke("save_obsidian_config",{obsidianConfig});
export const syncObsidian=():Promise<ObsidianSyncResult>=>invoke("sync_obsidian");
export const loadObsidianConflicts=():Promise<ObsidianConflict[]>=>invoke("list_obsidian_conflicts");
