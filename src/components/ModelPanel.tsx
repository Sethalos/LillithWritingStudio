import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  TestTube2,
  Trash2,
  Wifi,
} from "lucide-react";
import {
  defaultTaskRoutes,
  providerDefaults,
  type DiscoveredModel,
  type ProviderConfiguration,
  type ProviderKind,
  type ProviderLocation,
  type TaskRoute,
} from "../domain/providers";
import { costForUsage, discoverModels, loadAiUsage, routePresetForLocation, saveProvider, testProviderModel, type AiUsageRun } from "../lib/providerRepository";

const initialProviders: ProviderConfiguration[] = [
  {
    id: "local-ollama",
    kind: "ollama",
    location: "local",
    label: "Ollama",
    baseUrl: "http://127.0.0.1:11434",
    hasCredential: false,
    enabled: true,
    defaultModel: "llama3.3:70b",
    headers: {},
    lastConnection: { status: "success", checkedAt: new Date().toISOString(), message: "Ollama is available", latencyMs: 24 },
  },
  {
    id: "remote-openai",
    kind: "openai",
    location: "remote",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    hasCredential: false,
    enabled: false,
    headers: {},
  },
];

const CONFIG_KEY = "lillith:model-config:v1";

export function ModelPanel({ onEditorModelChange }: { onEditorModelChange?: (label: string) => void }) {
  const restored = (() => {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "null") as { providers: ProviderConfiguration[]; models: DiscoveredModel[]; routes: TaskRoute[] } | null;
    } catch {
      return null;
    }
  })();

  const [providers, setProviders] = useState(restored?.providers?.length ? restored.providers : initialProviders);
  const [selectedId, setSelectedId] = useState((restored?.routes?.find(route=>route.task==="primary-editor")?.providerId ?? restored?.providers?.[0]?.id ?? initialProviders[0].id));
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<DiscoveredModel[]>(
    restored?.models ?? [{ id: "llama3.3:70b", label: "llama3.3:70b", providerId: "local-ollama", local: true }],
  );
  const [routes, setRoutes] = useState<TaskRoute[]>(
    restored?.routes ?? defaultTaskRoutes.map((route) => ({ ...route, providerId: "local-ollama", modelId: "llama3.3:70b" })),
  );
  const [busy, setBusy] = useState<"save" | "discover" | "test" | null>(null);
  const [notice, setNotice] = useState("");
  const [usage, setUsage] = useState<AiUsageRun[]>([]);
  const selected = providers.find((provider) => provider.id === selectedId) ?? providers[0];
  const requiresKey = providerDefaults[selected.kind].requiresKey;
  const selectedModels = useMemo(() => models.filter((model) => model.providerId === selected.id), [models, selected.id]);
  const allModelIds = useMemo(() => models.map((model) => model.id), [models]);
  const [modelName, setModelName] = useState(selected.defaultModel ?? "");
  const [testOutput, setTestOutput] = useState("");

  const syncRoutingWithModel = (providerId: string, modelId: string) => {
    setRoutes((all) =>
      all.map((item) =>
        item.providerId === providerId || (!item.providerId && providerId === selected.id)
          ? { ...item, providerId, modelId }
          : item,
      ),
    );
  };

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ providers, models, routes }));
    const editor = routes.find((route) => route.task === "primary-editor");
    if (editor) {
      const provider = providers.find((item) => item.id === editor.providerId);
      onEditorModelChange?.(`${provider?.label ?? "Unassigned"} · ${editor.modelId ?? "No model"}`);
    }
  }, [providers, models, routes, onEditorModelChange]);

  useEffect(() => {
    void loadAiUsage().then(setUsage);
  }, []);

  useEffect(() => {
    setModelName(selected.defaultModel ?? "");
  }, [selected.id, selected.defaultModel]);

  const update = (patch: Partial<ProviderConfiguration>) =>
    setProviders((all) => all.map((provider) => (provider.id === selected.id ? { ...provider, ...patch } : provider)));

  const setDefaultModel = (value: string) => {
    setModelName(value);
    const modelId = value.trim();
    update({ defaultModel: modelId || undefined });
    if (modelId) syncRoutingWithModel(selected.id, modelId);
  };

  const addProvider = (kind: ProviderKind) => {
    const defaults = providerDefaults[kind];
    const provider = {
      id: crypto.randomUUID(),
      kind,
      location: defaults.location,
      label: defaults.label,
      baseUrl: defaults.baseUrl,
      hasCredential: false,
      enabled: true,
      headers: {},
    } satisfies ProviderConfiguration;
    setProviders((all) => [...all, provider]);
    setSelectedId(provider.id);
    setApiKey("");
  };

  const applyRoutingPreset = (location: ProviderLocation) => {
    const next = routePresetForLocation(location, providers, models, routes);
    if (!next) {
      setNotice(`No enabled ${location} provider with discovered models is available yet.`);
      return;
    }
    setRoutes(next);
    setNotice(`${location === "local" ? "Local-only" : "Remote-only"} routing applied to every task.`);
  };

  const save = async () => {
    setBusy("save");
    setNotice("");
    try {
      const saved = await saveProvider(selected, apiKey);
      setProviders((all) => all.map((item) => (item.id === saved.id ? saved : item)));
      setApiKey("");
      setNotice("Configuration saved. Credentials are kept outside the project.");
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(null);
    }
  };

  const discover = async () => {
    setBusy("discover");
    setNotice("");
    const started = performance.now();
    try {
      const found = await discoverModels(selected, apiKey);
      setModels((all) => [...all.filter((model) => model.providerId !== selected.id), ...found]);
      update({
        lastConnection: {
          status: "success",
          checkedAt: new Date().toISOString(),
          message: `${found.length} model${found.length === 1 ? "" : "s"} discovered`,
          latencyMs: Math.round(performance.now() - started),
        },
      });
      setNotice(`Connected successfully. Found ${found.length} model${found.length === 1 ? "" : "s"}.`);
      if (found[0]) {
        setDefaultModel(found[0].id);
      }
    } catch (error) {
      update({ lastConnection: { status: "failure", checkedAt: new Date().toISOString(), message: String(error) } });
      setNotice(`Connection failed: ${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const probe = async () => {
    if (!modelName.trim()) {
      setNotice("Choose or paste a model name before testing.");
      return;
    }
    setBusy("test");
    setTestOutput("");
    setNotice("");
    try {
      const result = await testProviderModel(selected, modelName.trim(), apiKey);
      setNotice(result.message);
      setTestOutput(result.sample ?? "");
    } catch (error) {
      setNotice(`Model test failed: ${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="model-panel">
      <header className="model-heading">
        <div>
          <Cpu size={19} />
          <div>
            <h2>Models</h2>
            <p>Providers, local runtimes, task routing, and model testing</p>
          </div>
        </div>
        <div className="provider-add">
          <button>
            <Plus size={14} /> Add provider <ChevronDown size={13} />
          </button>
          <select aria-label="Add provider" value="" onChange={(event) => event.target.value && addProvider(event.target.value as ProviderKind)}>
            <option value="">Choose…</option>
            {Object.entries(providerDefaults).map(([kind, value]) => (
              <option key={kind} value={kind}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="provider-strip">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={selected.id === provider.id ? "active" : ""}
            onClick={() => {
              setSelectedId(provider.id);
              setApiKey("");
            }}
          >
            <span className={`provider-icon ${provider.location}`}>
              {provider.location === "local" ? <Server size={16} /> : <Cloud size={16} />}
            </span>
            <span>
              <strong>{provider.label}</strong>
              <small>{provider.location === "local" ? "Local runtime" : provider.hasCredential ? "API key saved" : "Needs API key"}</small>
            </span>
            <i className={provider.lastConnection?.status === "success" ? "online" : ""} />
          </button>
        ))}
      </section>

      <div className="model-scroll">
        <section className="model-card connection-card">
          <div className="model-card-title">
            <div>
              <Wifi size={16} />
              <strong>Connection</strong>
            </div>
            <label className="switch">
              <input type="checkbox" checked={selected.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
              <span />
            </label>
          </div>

          <div className="field-grid">
            <label>
              <span>Provider type</span>
              <div className="select-wrap">
                <select
                  value={selected.kind}
                  onChange={(event) => {
                    const kind = event.target.value as ProviderKind;
                    const defaults = providerDefaults[kind];
                    update({ kind, label: defaults.label, location: defaults.location, baseUrl: defaults.baseUrl });
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                  <option value="lm-studio">LM Studio</option>
                  <option value="vllm">vLLM</option>
                  <option value="openai-compatible">OpenAI-compatible</option>
                </select>
                <ChevronDown size={14} />
              </div>
            </label>

            <label>
              <span>Display name</span>
              <input value={selected.label} onChange={(event) => update({ label: event.target.value })} />
            </label>
          </div>

          <label className="full-field">
            <span>Base URL</span>
            <div className="url-input">
              <span>{selected.location === "local" ? <Server size={14} /> : <Cloud size={14} />}</span>
              <input value={selected.baseUrl} onChange={(event) => update({ baseUrl: event.target.value })} spellCheck={false} />
            </div>
            <small>{selected.location === "local" ? "Only this configured local address will be contacted." : "Requests may send the inspected manuscript context to this service."}</small>
          </label>

          <label className="full-field">
            <span>Model name</span>
            <input
              list="available-model-suggestions"
              value={modelName}
              onChange={(event) => setDefaultModel(event.target.value)}
              placeholder="Paste a model name or choose from the discovered list"
            />
            <datalist id="available-model-suggestions">
              {allModelIds.map((modelId) => (
                <option key={modelId} value={modelId} />
              ))}
            </datalist>
            <small>Use this field to paste an OpenRouter model name or to set the default for this provider.</small>
          </label>

          {selectedModels.length > 0 && (
            <div className="model-chip-row" aria-label="Discovered models">
              {selectedModels.map((model) => (
                <button
                  key={model.id}
                  className={selected.defaultModel === model.id ? "active" : ""}
                  onClick={() => {
                    setDefaultModel(model.id);
                    syncRoutingWithModel(selected.id, model.id);
                  }}
                >
                  <strong>{model.label}</strong>
                  <small>{model.local ? "Local" : "Remote"}</small>
                </button>
              ))}
            </div>
          )}

          {requiresKey && (
            <label className="full-field">
              <span>API key</span>
              <div className="secret-input">
                <KeyRound size={14} />
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={selected.hasCredential ? "Saved in operating-system credential store" : "Paste API key"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                />
                <button onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              <small className="secure-note">
                <ShieldCheck size={12} /> The key is never written to project files or sent to the frontend after saving.
              </small>
            </label>
          )}

          <div className="connection-actions">
            <button className="test-button" onClick={probe} disabled={Boolean(busy)}>
              {busy === "test" ? <LoaderCircle className="spin" size={14} /> : <TestTube2 size={14} />} Test selected model
            </button>
            <button className="test-button" onClick={discover} disabled={Boolean(busy)}>
              {busy === "discover" ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />} Discover {selected.label} models
            </button>
            <button className="save-button" onClick={save} disabled={Boolean(busy)}>
              {busy === "save" ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />} Save provider
            </button>
          </div>

          {notice && (
            <div className="model-notice">
              <Check size={13} />
              {notice}
            </div>
          )}
          {testOutput && (
            <div className="model-test-output">
              <strong>Test response</strong>
              <small>{testOutput}</small>
            </div>
          )}
        </section>

        <section className="model-card routes-card">
          <div className="model-card-title">
            <div>
              <RefreshCw size={16} />
              <strong>Task routing</strong>
            </div>
            <div className="route-actions">
              <button onClick={() => applyRoutingPreset("local")}>Local only</button>
              <button onClick={() => applyRoutingPreset("remote")}>Remote only</button>
            </div>
          </div>
          <div className="route-list">
            {routes.map((route) => (
              <div key={route.task} className="route-row">
                <div className="route-label">
                  <strong>{route.label}</strong>
                  <small>{route.description}</small>
                </div>
                <div className="route-controls">
                  <select
                    aria-label={`${route.label} provider`}
                    value={route.providerId ?? ""}
                    onChange={(event) => {
                      const providerId = event.target.value || undefined;
                      setRoutes((all) =>
                        all.map((item) =>
                          item.task === route.task ? { ...item, providerId, modelId: providerId ? item.modelId : undefined } : item,
                        ),
                      );
                    }}
                  >
                    <option value="">Unassigned</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`${route.label} model`}
                    list="available-model-suggestions"
                    value={route.modelId ?? ""}
                    onChange={(event) => {
                      const modelId = event.target.value;
                      setRoutes((all) => all.map((item) => (item.task === route.task ? { ...item, modelId: modelId || undefined } : item)));
                      if (route.providerId && modelId) {
                        const provider = providers.find((item) => item.id === route.providerId);
                        if (provider?.id === selected.id) {
                          setModelName(modelId);
                          update({ defaultModel: modelId });
                        }
                      }
                    }}
                    placeholder="Paste model id"
                  />
                  <button
                    className="route-test"
                    onClick={async () => {
                      const provider = providers.find((item) => item.id === route.providerId);
                      if (!provider || !route.modelId) {
                        setNotice(`Assign both a provider and model for “${route.label}” first.`);
                        return;
                      }
                      try {
                        setBusy("test");
                        const result = await testProviderModel(provider, route.modelId, apiKey);
                        setNotice(`Route test for “${route.label}” succeeded: ${result.message}`);
                        setTestOutput(result.sample ?? "");
                      } catch (error) {
                        setNotice(`Route test failed for “${route.label}”: ${String(error)}`);
                      } finally {
                        setBusy(null);
                      }
                    }}
                    disabled={Boolean(busy)}
                  >
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="model-card usage-card">
          <div className="model-card-title">
            <div>
              <BarChart3 size={16} />
              <strong>Recent AI usage</strong>
            </div>
            <span>Provider-reported where available</span>
          </div>
          <div className="usage-list">
            {usage.length ? (
              usage.map((run) => {
                const cost = costForUsage(run, providers, models);
                return (
                  <div key={run.id}>
                    <span className={run.status} />
                    <div>
                      <strong>
                        {run.providerLabel ?? "Provider"} · {run.model}
                      </strong>
                      <small>
                        {run.task} · {new Date(run.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <p>
                      <b>{(run.actualInputTokens ?? run.estimatedInputTokens).toLocaleString()}</b> in / <b>{run.actualOutputTokens?.toLocaleString() ?? "—"}</b> out
                      <small>{cost === undefined ? "price not set" : cost === 0 ? "local · $0 API" : `${cost.toFixed(4)}`}</small>
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="no-models">No AI runs recorded for this project.</div>
            )}
          </div>
        </section>

        <button
          className="remove-provider"
          disabled={providers.length === 1}
          onClick={() => {
            setProviders((all) => all.filter((provider) => provider.id !== selected.id));
            setSelectedId(providers.find((provider) => provider.id !== selected.id)!.id);
          }}
        >
          <Trash2 size={13} /> Remove this provider
        </button>
      </div>
    </div>
  );
}
