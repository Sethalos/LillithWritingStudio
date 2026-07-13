import { invoke } from "@tauri-apps/api/core";
import type { AiTask } from "../domain/ai";
import type { DiscoveredModel, ProviderConfiguration, ProviderLocation, TaskRoute } from "../domain/providers";
import { providerBrowserApi, resolveBrowserProviderKey, saveBrowserProviderSecret } from "./providerBrowserApi";

const isTauri = () => "__TAURI_INTERNALS__" in window;

export async function saveProvider(configuration: ProviderConfiguration, apiKey?: string): Promise<ProviderConfiguration> {
  if (isTauri()) return invoke<ProviderConfiguration>("save_provider_configuration", { configuration, apiKey: apiKey || null });
  await new Promise((resolve) => setTimeout(resolve, 300));
  saveBrowserProviderSecret(configuration.id, apiKey);
  const hasCredential = configuration.hasCredential || Boolean(apiKey) || Boolean(resolveBrowserProviderKey(configuration));
  return { ...configuration, hasCredential, credentialRef: apiKey ? `keyring:${configuration.id}` : configuration.credentialRef ?? (hasCredential ? `keyring:${configuration.id}` : undefined) };
}

export async function discoverModels(configuration: ProviderConfiguration, apiKey?: string): Promise<DiscoveredModel[]> {
  if (isTauri()) return invoke<DiscoveredModel[]>("discover_provider_models", { configuration, transientApiKey: apiKey || null });
  const secret = resolveBrowserProviderKey(configuration, apiKey);
  if (configuration.location === "remote" && !secret) throw new Error(`Save an API key for ${configuration.label} before discovering models.`);
  return providerBrowserApi.discover(configuration, secret ?? undefined);
}

export interface ProviderTestResult { message: string; sample?: string; latencyMs: number }

export async function testProviderModel(configuration: ProviderConfiguration, model: string, apiKey?: string): Promise<ProviderTestResult> {
  if (isTauri()) return invoke<ProviderTestResult>("test_provider_model", { configuration, model, transientApiKey: apiKey || null });
  const secret = resolveBrowserProviderKey(configuration, apiKey);
  if (configuration.location === "remote" && !secret) throw new Error(`Save an API key for ${configuration.label} before testing a remote model.`);
  return providerBrowserApi.test(configuration, model, secret ?? undefined);
}

export function configuredExecution(task: AiTask): { provider: ProviderConfiguration; model: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem("lillith:model-config:v1") ?? "null") as { providers: ProviderConfiguration[]; routes: TaskRoute[] } | null;
    const route = saved?.routes.find((item) => item.task === task);
    const provider = saved?.providers.find((item) => item.id === route?.providerId);
    return provider && route?.modelId ? { provider, model: route.modelId } : null;
  } catch { return null; }
}

export function configuredExecutionFor(providerId?: string, modelId?: string, task: AiTask = "primary-editor"): { provider: ProviderConfiguration; model: string } | null {
  if (!providerId || !modelId) return configuredExecution(task);
  try {
    const saved = JSON.parse(localStorage.getItem("lillith:model-config:v1") ?? "null") as { providers: ProviderConfiguration[] } | null;
    const provider = saved?.providers.find((item) => item.id === providerId);
    return provider ? { provider, model: modelId } : configuredExecution(task);
  } catch {
    return configuredExecution(task);
  }
}

export function configuredModelOptions():Array<{providerId:string;providerLabel:string;modelId:string}>{try{const saved=JSON.parse(localStorage.getItem("lillith:model-config:v1")??"null")as{providers:ProviderConfiguration[];models:DiscoveredModel[]}|null;return(saved?.models??[]).map(model=>({providerId:model.providerId,providerLabel:saved?.providers.find(provider=>provider.id===model.providerId)?.label??"Provider",modelId:model.id}))}catch{return[]}}

export function routePresetForLocation(location: ProviderLocation, providers: ProviderConfiguration[], models: DiscoveredModel[], routes: TaskRoute[]): TaskRoute[] | null {
  const provider = providers.find((item) => item.enabled && item.location === location && models.some((model) => model.providerId === item.id));
  if (!provider) return null;
  const model = models.find((item) => item.providerId === provider.id);
  if (!model) return null;
  return routes.map((route) => ({ ...route, providerId: provider.id, modelId: model.id }));
}

export interface AiCostEstimate{inputTokens:number;outputTokens:number;minimum:number;maximum:number;currency:"USD";local:boolean;priced:boolean}
export interface AiUsageRun{id:string;providerId:string;providerLabel?:string;model:string;task:string;status:string;createdAt:string;completedAt?:string;estimatedInputTokens:number;actualInputTokens?:number;actualOutputTokens?:number;usageSource?:string}
export const loadAiUsage=(limit=30):Promise<AiUsageRun[]>=>isTauri()?invoke("list_ai_usage",{limit}):Promise.resolve([]);
export function costForUsage(run:AiUsageRun,providers:ProviderConfiguration[],models:DiscoveredModel[]):number|undefined{const provider=providers.find(item=>item.id===run.providerId);if(provider?.location==="local")return 0;const model=models.find(item=>item.providerId===run.providerId&&item.id===run.model);if(!model||model.inputCostPerMillion===undefined||model.outputCostPerMillion===undefined)return undefined;return(run.actualInputTokens??run.estimatedInputTokens)/1_000_000*model.inputCostPerMillion+(run.actualOutputTokens??0)/1_000_000*model.outputCostPerMillion}
export function estimateExecutionCost(task:AiTask,inputTokens:number,outputTokens=1200):AiCostEstimate|null{try{const saved=JSON.parse(localStorage.getItem("lillith:model-config:v1")??"null")as{providers:ProviderConfiguration[];models:DiscoveredModel[];routes:TaskRoute[]}|null;const route=saved?.routes.find(item=>item.task===task);const provider=saved?.providers.find(item=>item.id===route?.providerId);const model=saved?.models.find(item=>item.providerId===route?.providerId&&item.id===route?.modelId);if(!provider||!model)return null;if(provider.location==="local")return{inputTokens,outputTokens,minimum:0,maximum:0,currency:"USD",local:true,priced:true};const inputRate=model.inputCostPerMillion;const outputRate=model.outputCostPerMillion;if(inputRate===undefined||outputRate===undefined)return{inputTokens,outputTokens,minimum:0,maximum:0,currency:"USD",local:false,priced:false};const minimum=inputTokens/1_000_000*inputRate;const maximum=minimum+outputTokens/1_000_000*outputRate;return{inputTokens,outputTokens,minimum,maximum,currency:"USD",local:false,priced:true}}catch{return null}}
