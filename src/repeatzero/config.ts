import { readFileSync } from "node:fs";

export interface PolicyConfig {
  min_confidence: number;
  min_citations: number;
  auto_send_risk_classes: Array<"low" | "medium" | "high">;
}

export const POLICY_DEFAULTS: Readonly<PolicyConfig> = Object.freeze({
  min_confidence: 0.85,
  min_citations: 1,
  auto_send_risk_classes: ["low" as const],
});

export interface ModelsConfig {
  super: string;
  nano: string;
  superContextTokens: number;
  nanoContextTokens: number;
}

function loadModels(): Readonly<ModelsConfig> {
  const defaults: ModelsConfig = {
    super: "nvidia/nemotron-3-super-120b-a12b",
    nano: "nvidia/nemotron-3-nano-30b-a3b",
    superContextTokens: 256000,
    nanoContextTokens: 262000,
  };
  try {
    const raw = readFileSync("config/models.resolved.json", "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[repeatzero] models.resolved.json ignored: ${msg}`);
      return Object.freeze(defaults);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn("[repeatzero] models.resolved.json ignored: expected object");
      return Object.freeze(defaults);
    }
    const obj = parsed as Record<string, unknown>;
    if (typeof obj["super"] === "string" && (obj["super"] as string).length > 0) {
      defaults.super = obj["super"] as string;
    }
    if (typeof obj["nano"] === "string" && (obj["nano"] as string).length > 0) {
      defaults.nano = obj["nano"] as string;
    }
    return Object.freeze(defaults);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "ENOENT") {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[repeatzero] models.resolved.json ignored: ${msg}`);
    }
    return Object.freeze(defaults);
  }
}

export const MODELS: Readonly<ModelsConfig> = loadModels();

export interface AppConfig {
  nebiusBaseUrl: string;
  nebiusApiKey: string;
  tavilyApiKey: string;
  forcedDegraded: boolean;
  corpusPath: string;
  ledgerSnapshotPath: string;
  policy: PolicyConfig;
}

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.warn(`[repeatzero] ${name} is unset \u2014 calls will degrade`);
    return "";
  }
  return v;
}

function isValidRisk(value: unknown): value is "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high";
}

function loadPolicy(): PolicyConfig {
  const policy: PolicyConfig = {
    min_confidence: POLICY_DEFAULTS.min_confidence,
    min_citations: POLICY_DEFAULTS.min_citations,
    auto_send_risk_classes: [...POLICY_DEFAULTS.auto_send_risk_classes],
  };
  let raw: string;
  try {
    raw = readFileSync("config/policy.json", "utf8");
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "ENOENT") {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[repeatzero] policy.json ignored: ${msg}`);
    }
    return policy;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[repeatzero] policy.json ignored: ${msg}`);
    return policy;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    console.warn("[repeatzero] policy.json ignored: expected object");
    return policy;
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj["min_confidence"] !== "undefined") {
    const v = obj["min_confidence"];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1) {
      policy.min_confidence = v;
    } else {
      console.warn("[repeatzero] policy.json field min_confidence invalid, using default");
    }
  }
  if (typeof obj["min_citations"] !== "undefined") {
    const v = obj["min_citations"];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      policy.min_citations = v;
    } else {
      console.warn("[repeatzero] policy.json field min_citations invalid, using default");
    }
  }
  if (typeof obj["auto_send_risk_classes"] !== "undefined") {
    const v = obj["auto_send_risk_classes"];
    if (Array.isArray(v) && v.every(isValidRisk)) {
      policy.auto_send_risk_classes = [...v];
    } else {
      console.warn("[repeatzero] policy.json field auto_send_risk_classes invalid, using default");
    }
  }
  return policy;
}

function buildConfig(): Readonly<AppConfig> {
  const nebiusApiKey = readEnv("NEBIUS_API_KEY");
  const tavilyApiKey = readEnv("TAVILY_API_KEY");
  let nebiusBaseUrl = process.env["NEBIUS_BASE_URL"] || "https://api.tokenfactory.us-central1.nebius.com/v1/";
  if (!nebiusBaseUrl.endsWith("/")) {
    nebiusBaseUrl = `${nebiusBaseUrl}/`;
  }
  const forcedDegraded = process.env["RES_FORCED_DEGRADED"] === "1";
  const corpusPath = process.env["REPEATZERO_CORPUS_PATH"] || "engine/rag/runbooks";
  const ledgerSnapshotPath = process.env["REPEATZERO_LEDGER_PATH"] || "artifacts/cost-store.json";
  const policy = Object.freeze(loadPolicy());
  const config: AppConfig = {
    nebiusBaseUrl,
    nebiusApiKey,
    tavilyApiKey,
    forcedDegraded,
    corpusPath,
    ledgerSnapshotPath,
    policy,
  };
  return Object.freeze(config);
}

export const CONFIG: Readonly<AppConfig> = buildConfig();
