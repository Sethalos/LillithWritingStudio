import{invoke}from"@tauri-apps/api/core";
import{open}from"@tauri-apps/plugin-dialog";
export interface ProjectBackup{id:string;createdAt:string;fileCount:number;totalBytes:number;verified:boolean;path:string}
export const listProjectBackups=():Promise<ProjectBackup[]>=>invoke("list_project_backups");
export const createProjectBackup=():Promise<ProjectBackup>=>invoke("create_project_backup");
export const verifyProjectBackup=(backupId:string):Promise<ProjectBackup>=>invoke("verify_project_backup",{backupId});
export const restoreProjectBackupCopy=async(backupId:string):Promise<string|null>=>{const parentPath=await open({directory:true,multiple:false,title:"Choose where to create the recovered project copy"});return parentPath?invoke<string>("restore_project_backup_copy",{backupId,parentPath}):null};
