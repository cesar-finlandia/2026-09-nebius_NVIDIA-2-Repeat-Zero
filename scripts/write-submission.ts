import { writeFileSync } from "node:fs";
import { MODELS } from "../src/repeatzero/config.js";
import { savings } from "../src/repeatzero/ledger/index.js";
import { buildSubmissionDoc } from "../src/repeatzero/submit/submission.js";

const doc = buildSubmissionDoc({
  title: "RepeatZero",
  pitch: "Cited repeat-ticket triage for internal IT leads.",
  demoUrl: "https://demo.example.invalid",
  repoUrl: "https://github.com/example/repeatzero",
  models: { super: MODELS.super, nano: MODELS.nano },
  savings: savings(),
  tavilyEvidence: {
    endpoint: "POST https://api.tavily.com/search",
    citations: 2,
    example_query: "vpn client error 629 fix",
  },
  feedback: {
    tokenFactory: "The Token Factory OpenAI-compatible endpoint let one code path serve both the Super reasoner and the Nano pinger; model choice stayed a config value.",
    nebiusCloud: "Nebius AI Cloud hosting keeps the demo URL live and free through judging with the same container image validated locally.",
    nvidiaModels: "Nemotron 3 Super handles classification and cited drafting while Nemotron 3 Nano handles short pings; the policy gate decides sends, never the model.",
  },
});
writeFileSync(doc.path, doc.content + "\n", "utf8");
console.log(`wrote ${doc.path}`);
