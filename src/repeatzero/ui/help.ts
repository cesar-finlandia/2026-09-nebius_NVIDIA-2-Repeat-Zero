export interface HelpEntry {
  regionId: string;
  ariaLabel: string;
  copy: string;
}

export const helpContent: Record<string, HelpEntry> = {
  queue: {
    regionId: "queue",
    ariaLabel: "What is the queue?",
    copy: "Every ticket in this shift, sorted into two lanes: the ones the tool answered with a citation, and the short list that still needs you.",
  },
  "draft-review": {
    regionId: "draft-review",
    ariaLabel: "How do I read a draft?",
    copy: "The proposed reply, with the sources it was grounded in. No citation means no Send button — the policy gate decides sends, never the model.",
  },
  sources: {
    regionId: "sources",
    ariaLabel: "What is the Sources panel?",
    copy: "Every document the draft quoted, with a link. If it is empty, the draft was written without grounding and cannot be sent.",
  },
  "escalation-inbox": {
    regionId: "escalation-inbox",
    ariaLabel: "What is the escalation inbox?",
    copy: "Tickets the gate refused to auto-send, each with the classification, the candidates it considered and a Start here panel so you do not begin from a blank box.",
  },
  savings: {
    regionId: "savings",
    ariaLabel: "What do the savings figures mean?",
    copy: "Deflection is measured from this run. Cost per ticket is a local estimate, and hours saved uses a labelled six-minute-per-deflection assumption — both are marked as assumptions, not measurements.",
  },
  "cost-ledger": {
    regionId: "cost-ledger",
    ariaLabel: "What is the cost ledger?",
    copy: "Per-step model calls, tokens and estimated cost, so every figure above can be traced to the call that produced it.",
  },
};

export const EXPLAINER_TITLE = "How RepeatZero works";

export const explainerCopy: {
  what: string;
  who: string;
  flow: string[];
  howToRead: string;
  rule: string;
  tryIt: string;
} = {
  what: "RepeatZero reads every incoming support ticket, decides whether it repeats a problem the team has already solved, and drafts a reply with its sources attached — so the queue answers itself wherever it safely can, and only the tickets that truly need a human reach one.",
  who: "It is for the support lead running an inherited ticket queue where most tickets repeat known fixes and every one is still sorted by hand, while the novel incidents that need senior attention wait behind them.",
  flow: [
    "Load the sample queue, or let live tickets arrive.",
    "Watch each ticket move through retrieval, classification, grounding, drafting and the policy gate.",
    "Open any draft to read the proposed reply and the Sources it was grounded in.",
    "Rows the gate trusts clear themselves; rows it doubts land in Escalations with a Start here panel.",
    "Check Savings for deflection, cost per ticket and hours returned.",
  ],
  howToRead:
    "Two lanes: quiet rows the tool answered, marked teal with a filled circle and the word sent — and a short amber lane marked with a triangle and the words needs you. That amber lane is the whole product: everything else already happened.",
  rule: "A draft with an empty Sources panel has no Send button. No citation means no send — the policy gate decides, never the model.",
  tryIt: "Press Load the sample queue below and watch a shift's worth of tickets clear in about a minute.",
};
