import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { useEventStream } from "src/platform/transport";
import { withResilience } from "src/resilience";
import type { DegradedResult } from "src/resilience";
import type { EventEnvelope } from "src/platform/transport";
import type { TriageResult } from "../types.js";
import { applyTheme, initialTheme } from "./theme.js";
import type { ThemeId } from "./theme.js";
import { SideNav } from "./components/SideNav.js";
import { AppBar } from "./components/AppBar.js";
import { ExplainerPanel } from "./components/ExplainerPanel.js";
import { HelpPopover } from "./components/HelpPopover.js";
import { DegradedBanner } from "./components/DegradedBanner.js";
import { WorkIndicator } from "./components/WorkIndicator.js";
import { QueueView } from "./views/QueueView.js";
import { DraftReviewView } from "./views/DraftReviewView.js";
import { EscalationInboxView } from "./views/EscalationInboxView.js";
import { SavingsView } from "./views/SavingsView.js";
import {
  selectActivityLine,
  selectDegraded,
  selectDraft,
  selectEscalations,
  selectQueueRows,
} from "./selectors.js";
import type { SavingsFigures } from "./selectors.js";

export type AppViewId = "queue" | "draft" | "escalations" | "savings";

export interface AppProps {
  initialView: AppViewId;
  apiBaseUrl: string;
}

export function App(props: AppProps): React.JSX.Element {
  const [activeView, setActiveView] = useState<AppViewId>(props.initialView);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [queue, setQueue] = useState<TriageResult[]>([]);
  const [savings, setSavings] = useState<SavingsFigures | null>(null);
  const [theme, setThemeState] = useState<ThemeId>(() => initialTheme());
  const [filter, setFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [queueBackfillFailed, setQueueBackfillFailed] = useState(false);
  const [firstEnvelopeAt, setFirstEnvelopeAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [savingsDegraded, setSavingsDegraded] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [runningSample, setRunningSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const runSampleTicket = async (): Promise<void> => {
    setRunningSample(true);
    setSampleError(null);
    try {
      const res = await fetch(`${props.apiBaseUrl}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `sample-${Date.now()}`,
          subject: "Password reset link expired",
          body: "Requester followed the reset link twice and it expired both times. Known issue with a runbook.",
          requester: "maya@example.com",
          created_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`sample_${res.status}`);
    } catch (e: unknown) {
      setSampleError("That run did not start — check the connection and try again.");
      void e;
    } finally {
      setRunningSample(false);
    }
  };

  useEffect(() => {
    applyTheme(initialTheme());
  }, []);

  const stream = useEventStream({
    url: `${props.apiBaseUrl}/api/stream`,
    transport: "sse",
  });

  const postedEnvelopes: EventEnvelope[] = useMemo(() => {
    const out: EventEnvelope[] = [];
    for (const r of queue) {
      const withEnv = r as TriageResult & { envelopes?: EventEnvelope[] };
      if (Array.isArray(withEnv.envelopes)) {
        for (const e of withEnv.envelopes) {
          out.push(e);
        }
      }
    }
    return out;
  }, [queue]);

  const envelopes: EventEnvelope[] = useMemo(() => {
    if (stream.envelopes.length > 0) return stream.envelopes;
    return postedEnvelopes;
  }, [stream.envelopes, postedEnvelopes]);

  useEffect(() => {
    if (envelopes.length === 0 || firstEnvelopeAt !== null) return;
    setFirstEnvelopeAt(Date.now());
  }, [envelopes.length, firstEnvelopeAt]);

  useEffect(() => {
    if (firstEnvelopeAt === null) return;
    const timer = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(timer);
  }, [firstEnvelopeAt]);

  useEffect(() => {
    let cancelled = false;
    const load = withResilience(
      async () => {
        const qRes = await fetch(`${props.apiBaseUrl}/api/queue`, { signal: AbortSignal.timeout(5000) });
        if (!qRes.ok) throw new Error(`queue_${qRes.status}`);
        const qJson: TriageResult[] = (await qRes.json()) as TriageResult[];
        const sRes = await fetch(`${props.apiBaseUrl}/api/savings`, { signal: AbortSignal.timeout(5000) });
        if (!sRes.ok) throw new Error(`savings_${sRes.status}`);
        const sJson: SavingsFigures = (await sRes.json()) as SavingsFigures;
        return { qJson, sJson };
      },
      { timeout_ms: 5000, retries: 1, fallback_chain: { order: ["none"] } },
    );
    load()
      .then((out: { qJson: TriageResult[]; sJson: SavingsFigures } | DegradedResult<{ qJson: TriageResult[]; sJson: SavingsFigures }>) => {
        if (cancelled) return;
        if (out !== null && typeof out === "object" && "degraded" in (out as object)) {
          setQueueBackfillFailed(true);
          setSavingsDegraded(true);
          return;
        }
        const data = out as { qJson: TriageResult[]; sJson: SavingsFigures };
        setQueue(data.qJson);
        setSavings(data.sJson);
      })
      .catch(() => {
        if (!cancelled) {
          setQueueBackfillFailed(true);
          setSavingsDegraded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.apiBaseUrl]);

  const rows = useMemo(() => selectQueueRows(envelopes, queue), [envelopes, queue]);
  const degradedReasons = useMemo(() => {
    const base = selectDegraded(envelopes);
    if (queueBackfillFailed) {
      return [{ step: "queue", detail: "Queue history unavailable — showing live tickets only" }, ...base];
    }
    return base;
  }, [envelopes, queueBackfillFailed]);
  const escalations = useMemo(() => selectEscalations(queue), [queue]);
  const escalationCount: number = useMemo(() => {
    let n = 0;
    for (const bucket of escalations.values()) n += bucket.length;
    return n;
  }, [escalations]);
  const draft: TriageResult | null = useMemo(
    () => selectDraft(envelopes, queue, selectedTraceId),
    [envelopes, queue, selectedTraceId],
  );
  const activity = useMemo(() => selectActivityLine(envelopes), [envelopes]);
  const bannerReasons = useMemo(() => {
    if (queueBackfillFailed) {
      return [{ step: "queue", detail: "Queue history unavailable — showing live tickets only" }];
    }
    return degradedReasons.map((r) => ({ step: r.step, detail: r.detail }));
  }, [degradedReasons, queueBackfillFailed]);

  const elapsedS: number = firstEnvelopeAt === null ? 0 : (nowMs - firstEnvelopeAt) / 1000;
  const newestAt: number | null = envelopes.length > 0 ? Date.parse((envelopes[envelopes.length - 1] as EventEnvelope).timestamp) : null;
  const stalledS: number | null =
    newestAt !== null && Number.isFinite(newestAt) ? Math.max(0, (nowMs - newestAt) / 1000) : null;

  const onSend = (traceId: string): void => {    setSending(true);
    setSendError(null);
    fetch(`${props.apiBaseUrl}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trace_id: traceId }),
      signal: AbortSignal.timeout(5000),
    })
      .then(() => setSending(false))
      .catch((e: unknown) => {
        setSending(false);
        setSendError(e instanceof Error ? e.message : String(e));
      });
  };

  return (
    <div className="rz-layout">
      <AppBar
        onExplainer={() => setExplainerOpen(true)}
        theme={theme}
        onThemeChange={(t) => {
          setThemeState(t);
          applyTheme(t);
        }}
      />
      <ExplainerPanel
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
        onTryIt={() => {
          setExplainerOpen(false);
          setActiveView("queue");
          void runSampleTicket();
        }}
      />
      <SideNav
        active={activeView}
        escalationCount={escalationCount}
        onNavigate={setActiveView}
        status={stream.status}
        onReconnect={stream.reconnect}
        corpusAgeHours={null}
        buildMarker="build: unknown"
        collapsed={false}
      />
      <main className="rz-main">
        <DegradedBanner reasons={bannerReasons} />
        <WorkIndicator active={envelopes.length > 0} line={activity} elapsedS={elapsedS} stalledS={stalledS} />
        {activeView === "queue" ? (
          <div data-result-region="queue">
            <div className="rz-view-header">
              <h1 className="h1">Queue</h1>
              <HelpPopover regionId="queue" />
              <button
                type="button"
                className="rz-run-button"
                disabled={runningSample}
                onClick={() => void runSampleTicket()}
              >
                Clear the queue
              </button>
              {sampleError !== null ? <p className="support">{sampleError}</p> : null}
            </div>
            <QueueView
              rows={rows}
              selectedTraceId={selectedTraceId}
              onSelect={(t) => {
                setSelectedTraceId(t);
                setActiveView("draft");
              }}
              filter={filter}
              onFilter={setFilter}
            />
          </div>
        ) : null}
        {activeView === "draft" ? (
          <div data-result-region="draft-review">
            <div className="rz-view-header">
              <h1 className="h1">Draft review</h1>
              <HelpPopover regionId="draft-review" />
            </div>
            <DraftReviewView result={draft} envelopes={envelopes} onSend={onSend} sending={sending} error={sendError} />
          </div>
        ) : null}
        {activeView === "escalations" ? (
          <div data-result-region="escalation-inbox">
            <div className="rz-view-header">
              <h1 className="h1">Escalations</h1>
              <HelpPopover regionId="escalation-inbox" />
            </div>
            <EscalationInboxView
              items={[...escalations.values()].flat()}
              onSelect={(t) => {
                setSelectedTraceId(t);
                setActiveView("draft");
              }}
            />
          </div>
        ) : null}
        {activeView === "savings" ? (
          <div data-result-region="savings">
            <div className="rz-view-header">
              <h1 className="h1">Savings</h1>
              <HelpPopover regionId="savings" />
            </div>
            <SavingsView savings={savings} degraded={savingsDegraded} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
