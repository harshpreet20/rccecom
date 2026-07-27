"use client";

import { useState } from "react";

function sanitizeReport(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "");
  const firstTag = text.indexOf("<");
  const lastTag = text.lastIndexOf(">");
  if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
    text = text.substring(firstTag, lastTag + 1);
  }
  if (!text.startsWith("<")) {
    text = `<div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
  }
  return text;
}

interface ConfigOption {
  label: string;
  value: string;
}

interface AgentCardProps {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  endpoint: string;
  configOptions?: ConfigOption[];
  configKey?: string;
  defaultBody?: Record<string, string>;
}

export default function AgentCard({ name, description, icon, color, bgColor, endpoint, configOptions, configKey, defaultBody }: AgentCardProps) {
  const [result, setResult] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [agentKey, setAgentKey] = useState<string>("");
  const [learningsUsed, setLearningsUsed] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runTime, setRunTime] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>(configOptions?.[0]?.value || "");

  async function runAgent() {
    setLoading(true);
    setError(null);
    setResult(null);
    setRunTime(null);
    setReportId(null);
    setFeedback(null);
    setLearningsUsed(0);
    const start = Date.now();
    try {
      const fetchOptions: RequestInit = { method: "POST" };
      const bodyData: Record<string, string> = { ...defaultBody };
      if (configKey && selectedConfig) {
        bodyData[configKey] = selectedConfig;
      }
      if (Object.keys(bodyData).length > 0) {
        fetchOptions.headers = { "Content-Type": "application/json" };
        fetchOptions.body = JSON.stringify(bodyData);
      }
      const res = await fetch(endpoint, fetchOptions);
      const json = await res.json();
      setRunTime(Math.round((Date.now() - start) / 1000));
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.result);
        setReportId(json.reportId || null);
        setAgentKey(json.agent || "");
        setLearningsUsed(json.learningsUsed || 0);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(rating: number) {
    if (!reportId || !agentKey) return;
    setFeedbackSending(true);
    try {
      await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, agentName: agentKey, rating }),
      });
      setFeedback(rating);
    } catch {
      // silent fail
    } finally {
      setFeedbackSending(false);
    }
  }

  return (
    <div className="bg-[#f5f6f8] rounded-2xl neu-card transition-all flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl neu-raised-sm"
            style={{ backgroundColor: bgColor }}
          >
            {icon}
          </div>
          <div className="flex items-center gap-2">
            {learningsUsed > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-600">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {learningsUsed} learnings
              </span>
            )}
            {result && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full" style={{ color, backgroundColor: bgColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                Done{runTime ? ` ${runTime}s` : ""}
              </span>
            )}
          </div>
        </div>
        <h3 className="text-base font-bold text-gray-900 leading-tight">{name}</h3>
        <p className="text-gray-400 text-sm mt-0.5 leading-snug">{description}</p>
      </div>

      {/* Output area */}
      {(error || result) && (
        <div className="px-5 pb-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50/80 rounded-xl text-red-500 text-xs leading-relaxed neu-pressed">
              {error}
            </div>
          )}
          {result && (
            <>
              <div
                className="bg-[#f5f6f8] rounded-xl p-4 text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto report-html neu-pressed"
                dangerouslySetInnerHTML={{ __html: sanitizeReport(result) }}
              />
              {/* Feedback buttons */}
              {reportId && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] text-gray-400 font-medium">Rate this output:</span>
                  <button
                    onClick={() => sendFeedback(1)}
                    disabled={feedback !== null || feedbackSending}
                    className={`p-1.5 rounded-lg transition-all text-sm ${
                      feedback === 1
                        ? "text-green-600 neu-pressed"
                        : feedback !== null
                        ? "opacity-30 cursor-default text-gray-300"
                        : "text-gray-400 hover:text-green-600 neu-flat"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => sendFeedback(-1)}
                    disabled={feedback !== null || feedbackSending}
                    className={`p-1.5 rounded-lg transition-all text-sm ${
                      feedback === -1
                        ? "text-red-500 neu-pressed"
                        : feedback !== null
                        ? "opacity-30 cursor-default text-gray-300"
                        : "text-gray-400 hover:text-red-500 neu-flat"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                    </svg>
                  </button>
                  {feedback !== null && (
                    <span className="text-[10px] text-gray-400 ml-1">
                      {feedback === 1 ? "Thanks! This helps improve future outputs." : "Noted. This helps the agent learn."}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Config selector */}
      {configOptions && configOptions.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex gap-2">
            {configOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedConfig(opt.value)}
                disabled={loading}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border-0 ${
                  selectedConfig === opt.value
                    ? "neu-pressed"
                    : "text-gray-400 neu-flat"
                }`}
                style={selectedConfig === opt.value ? { color } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="p-5 pt-0 mt-auto">
        <button
          onClick={runAgent}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.98] neu-btn"
          style={{
            backgroundColor: loading ? bgColor : color,
            color: loading ? color : "#fff",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Thinking...
            </span>
          ) : result ? (
            "Run Again"
          ) : (
            "Run Agent"
          )}
        </button>
      </div>
    </div>
  );
}
