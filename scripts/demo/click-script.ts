export type ClickStep = {
  seq: number;
  action: string;
  target: string;
  expect_step_id: string;
  note: string;
};

export type ClickScript = {
  version: "1.0.0";
  base_url: string;
  ticket_id: string;
  steps: ClickStep[];
};

export function buildClickScript(ticketId: string): ClickScript {
  const id: string = ticketId === "" ? "T-0007" : ticketId;
  return {
    version: "1.0.0",
    base_url: "http://127.0.0.1:8787",
    ticket_id: id,
    steps: [
      { seq: 1, action: "open", target: "/", expect_step_id: "ticket-intake", note: "queue visible" },
      { seq: 2, action: "submit", target: "/api/tickets", expect_step_id: "classify", note: "repeat ticket" },
      { seq: 3, action: "observe", target: "/api/stream", expect_step_id: "ground", note: "citations appear" },
      { seq: 4, action: "approve", target: "/api/tickets", expect_step_id: "dispatch", note: "auto-send" },
      { seq: 5, action: "submit", target: "/api/tickets", expect_step_id: "escalate", note: "novel ticket" },
      { seq: 6, action: "open", target: "/api/savings", expect_step_id: "ledger", note: "dashboard" },
    ],
  };
}

const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("artifacts/demodrive", { recursive: true });
writeFileSync(
  "artifacts/demodrive/click-script.json",
  JSON.stringify(buildClickScript("T-0007"), null, 2) + "\n",
  "utf8",
);
console.log("wrote artifacts/demodrive/click-script.json");
