export interface SavingsSnapshot {
  tickets: number;
  auto_sent: number;
  escalated: number;
  deflection_rate: number;
  usd_per_ticket: number;
  hours_saved: number;
}

export interface ReadmeInput {
  demoUrl: string;
  repoUrl: string;
  models: { super: string; nano: string };
  ledgerExample: SavingsSnapshot;
}

export interface ReadmeOutput {
  path: string;
  content: string;
  sections: string[];
}

export interface SubmissionInput {
  title: string;
  pitch: string;
  demoUrl: string;
  repoUrl: string;
  models: { super: string; nano: string };
  savings: SavingsSnapshot;
  tavilyEvidence: { endpoint: string; citations: number; example_query: string };
  feedback: { tokenFactory: string; nebiusCloud: string; nvidiaModels: string };
}

export interface SubmissionOutput {
  path: string;
  content: string;
  sections: string[];
}

export interface HealthCheckInput {
  demoUrl: string;
  timeoutMs: number;
}

export interface HealthCheckOutput {
  ok: boolean;
  models: string[];
  url: string;
  status: number;
}
