import { createAdminClient } from "./supabase-server";
import { askClaude } from "./claude";

export async function getLearnings(agentName: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("learnings")
    .select("learning, score")
    .eq("agent_name", agentName)
    .eq("active", true)
    .order("score", { ascending: false })
    .limit(10);

  return (data || []).map((d) => d.learning);
}

export function buildEnhancedPrompt(
  baseSystem: string,
  learnings: string[]
): string {
  if (learnings.length === 0) return baseSystem;

  const learningBlock = learnings
    .map((l, i) => `${i + 1}. ${l}`)
    .join("\n");

  return `${baseSystem}

LEARNED PATTERNS (from past performance — follow these):
${learningBlock}`;
}

export async function saveFeedback(
  reportId: string,
  agentName: string,
  rating: number
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("feedback").insert({
    report_id: reportId,
    agent_name: agentName,
    rating,
  });
  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("agent_name", agentName);

  if (count && count % 5 === 0) {
    try {
      await retrain(agentName);
    } catch (e: any) {
      // The feedback row is already saved -- a retrain failure (external
      // Claude API call) shouldn't fail the whole feedback submission.
      console.error(`retrain(${agentName}) failed:`, e?.message || e);
    }
  }
}

export async function retrain(agentName: string) {
  const supabase = createAdminClient();

  const { data: feedback } = await supabase
    .from("feedback")
    .select("rating, report_id")
    .eq("agent_name", agentName)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!feedback || feedback.length < 3) return;

  const reportIds = feedback.map((f) => f.report_id);
  const { data: reports } = await supabase
    .from("reports")
    .select("id, result")
    .in("id", reportIds);

  if (!reports || reports.length === 0) return;

  const ratedOutputs = feedback
    .map((f) => {
      const report = reports.find((r) => r.id === f.report_id);
      if (!report) return null;
      return {
        rating: f.rating === 1 ? "GOOD" : "BAD",
        output: report.result.slice(0, 500),
      };
    })
    .filter(Boolean);

  const { data: existingLearnings } = await supabase
    .from("learnings")
    .select("learning")
    .eq("agent_name", agentName)
    .eq("active", true);

  const existingBlock =
    existingLearnings && existingLearnings.length > 0
      ? `\nEXISTING LEARNINGS (refine or replace these):\n${existingLearnings.map((l) => `- ${l.learning}`).join("\n")}`
      : "";

  const metaPrompt = `You are a meta-learning system. Analyze these rated outputs from the "${agentName}" agent and extract concise improvement rules.

RATED OUTPUTS:
${ratedOutputs.map((r) => `[${r!.rating}] ${r!.output}`).join("\n\n")}
${existingBlock}

Extract 3-5 actionable rules the agent should follow to produce more GOOD outputs and avoid BAD patterns.
Each rule must be one sentence, specific, and actionable.
Output as a JSON array of strings. Example: ["Use specific numbers instead of vague claims", "Start hooks with questions"]`;

  const result = await askClaude(
    "You extract learning patterns from rated AI outputs. Return only a JSON array of strings.",
    metaPrompt
  );

  let newLearnings: string[];
  try {
    const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    newLearnings = JSON.parse(cleaned);
    if (!Array.isArray(newLearnings)) throw new Error("Not an array");
  } catch {
    return;
  }

  await supabase
    .from("learnings")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("agent_name", agentName)
    .eq("active", true);

  const rows = newLearnings.map((learning) => ({
    agent_name: agentName,
    learning,
    source: "retrain",
    score: 1.0,
    active: true,
  }));

  await supabase.from("learnings").insert(rows);
}
