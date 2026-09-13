export const STEP_IDS = [
  "ticket-intake",
  "retrieve",
  "classify",
  "ground",
  "draft",
  "policy-gate",
  "ledger",
  "dispatch",
  "escalate",
] as const;

export type StepId = (typeof STEP_IDS)[number];
