import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!
});

/**
 * Robustly extracts and parses JSON from a string that might contain extra text or markdown.
 */
function extractJson(text: string): any {
    try {
        // First try to parse the whole text
        return JSON.parse(text);
    } catch (e) {
        // If valid JSON is wrapped in markdown code blocks, remove them
        const cleanText = text.replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(cleanText);
        } catch (e2) {
            // Find the first '{' and the last '}'
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}');

            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = cleanText.substring(start, end + 1);
                try {
                    return JSON.parse(jsonStr);
                } catch (e3: any) {
                    throw new Error(`Failed to parse extracted JSON: ${e3.message || e3}`);
                }
            }
            throw new Error("No JSON object found in response");
        }
    }
}

// Basic safety keywords for pre-filtering
const DANGEROUS_KEYWORDS = [
    "suicide", "kill myself", "harm myself", "end my life",
    "bomb", "explosive", "detonate", "shrapnel",
    "murder", "assassinate", "kill people",
    "terrorist", "terrorism",
    "steal credit card", "carding", "fraud",
    "manufacture weapon", "build gun",
    "child porn", "abuse children"
];

type SafetyCheck = { isSafe: boolean; reason?: string };

export class GeminiService {
    private static detectLanguage(text: string): 'ar' | 'en' {
        const arabicPattern = /[\u0600-\u06FF]/;
        return arabicPattern.test(text) ? 'ar' : 'en';
    }

    private static checkContentSafety(text: string): SafetyCheck {
        const lower = text.toLowerCase();
        for (const kw of DANGEROUS_KEYWORDS) {
            if (lower.includes(kw)) {
                return { isSafe: false, reason: "Safety Policy Violation: Request contains prohibited content." };
            }
        }
        return { isSafe: true };
    }

    // Phase 1: Investigate & Questioning
    static async investigateGoal(goalText: string, previousContext: any = {}) {
        // 1. Rule-based Safety Pre-filter
        const safetyCheck = GeminiService.checkContentSafety(goalText);
        if (!safetyCheck.isSafe) {
            return {
                status: "refused",
                safe_redirection: {
                    message: safetyCheck.reason,
                    alternatives: ["Please reach out to professional support if you are in distress."]
                }
            };
        }

        // Detect language from goal
        const userLanguage = GeminiService.detectLanguage(goalText);

        const systemPrompt = `
SYSTEM ROLE:
You are an expert "Goal Investigator & Safety Gate". 

TOP PRIORITY: SAFETY
- If the goal involves violence, harming people/animals, self-harm, illegal wrongdoing, weapons, explosives, fraud, hacking, or instructions that facilitate harm/illegal activity:
  - REFUSE to help create plans, steps, or questions that would enable wrongdoing.
  - Do NOT ask operational questions (no tools, methods, materials, targets, timelines, or "how-to").
  - Provide a brief refusal and redirect to safe alternatives (e.g., conflict de-escalation, mental health support, legal resources, personal safety).
  - Output JSON with status="refused" and safe_redirection.

SECOND PRIORITY: REALISM & CLARITY
- If the goal is vague, missing key constraints, or not measurable, ask questions until it becomes measurable.
- If the goal is likely unrealistic given common constraints (e.g., "learn fluent English in 7 days" from beginner, "build a house in 2 weeks with $1000"):
  - Mark it as unrealistic and ask the user to adjust deadline/budget/scope.
  - Offer 2-3 realistic alternatives (adjusted targets).

QUESTION RULES:
- Ask 4 to 8 questions max per round.
- Questions must be specific, measurable, and decision-driving.
- Always cover: current level/state, available daily/weekly time, budget/resources (if relevant), deadline, constraints/limitations, and success metric.
- If missing success metric, propose 2-3 metrics and ask user to choose.
- If enough info is present, set readiness="ready_for_plan".
- LANGUAGE: The user's goal is in ${userLanguage === 'ar' ? 'Arabic' : 'English'}. You MUST respond entirely in ${userLanguage === 'ar' ? 'Arabic' : 'English'} - all questions, summaries, and messages must be in ${userLanguage === 'ar' ? 'Arabic' : 'English'}. 

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok" | "needs_info" | "unrealistic" | "refused",
  "goal_understanding": {
    "goal_summary": "string",
    "domain": "health|money|skills|career|study|home|other",
    "risk_flags": ["none|self_harm_risk|violence|illegal|other"],
    "missing_info": ["list of what is missing"],
    "readiness": "not_ready|ready_for_plan"
  },
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "type": "number|text|single_choice|multi_choice|date",
      "options": ["only for choice types"],
      "unit": "minutes|hours|usd|iqd|kg|m2|other",
      "required": true
    }
  ],
  "realism_check": {
    "assessment": "plausible|uncertain|unrealistic",
    "reasons": ["string"],
    "suggested_adjustments": ["string"]
  },
  "safe_redirection": {
    "message": "string",
    "alternatives": ["string"]
  }
}`;

        const userPrompt = `
USER GOAL: ${goalText}
PREVIOUS ANSWERS/CONTEXT: ${JSON.stringify(previousContext)}
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                        role: "system"
                    }
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }]
                    }
                ],
            });

            const responseText = response.text || "";
            console.log("Gemini Phase 1 Response:", responseText);

            if (!responseText) {
                throw new Error("Empty response from Gemini API");
            }

            return extractJson(responseText);
        } catch (error) {
            console.error("Gemini investigateGoal Error:", error);
            throw error;
        }
    }

    // Phase 2: Architect & Simulator
    static async createPlan(goal: string, answers: any, targetDeadline?: string) {
        // 1. Rule-based Safety Pre-filter
        const safetyCheck = GeminiService.checkContentSafety(goal);
        if (!safetyCheck.isSafe) {
            return {
                status: "refused",
                safe_redirection: {
                    message: safetyCheck.reason,
                    alternatives: ["Please reach out to professional support if you are in distress."]
                }
            };
        }

        // Detect language from goal
        const userLanguage = GeminiService.detectLanguage(goal);

        const currentDate = new Date().toISOString().split('T')[0];
        const systemPrompt = `
SYSTEM ROLE:
You are "Plan Architect & Simulation Engine".

HARD CONSTRAINTS:
- NEVER provide instructions that facilitate harm/illegal wrongdoing. If input contains such intent, refuse with status="refused".
- Plans must be realistic, measurable, and checkable.
- Tasks must have clear completion criteria.
- Keep tasks 4 to 9 max (mix daily/weekly if needed).
- Respect user's available time/budget constraints.
- CURRENT DATE: ${currentDate}
- LANGUAGE: The user's goal is in ${userLanguage === 'ar' ? 'Arabic' : 'English'}. You MUST respond entirely in ${userLanguage === 'ar' ? 'Arabic' : 'English'} - the goal_summary, ai_summary, task descriptions, completion_criteria, and all other text fields must be in ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

REALISM:
- If constraints make the goal impossible/unrealistic, return status="unrealistic" and propose the closest feasible plan.
- Never promise guaranteed outcomes. Use confidence low/medium/high.

SIMULATION:
- Estimate timeline using transparent assumptions.
- "estimated_completion_date" MUST be calculated as: Current Date (${currentDate}) + estimated_total_days.
- If a target_deadline is provided:
  - Reverse-engineer the required daily effort.
  - If required effort exceeds user's maximum, explain that it is unrealistic and propose alternatives.

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok" | "unrealistic" | "refused",
  "plan": {
    "goal_summary": "string",
    "success_metric": {"metric": "string", "target": "string"},
    "baseline_daily_time_minutes": number,
    "recommended_daily_time_minutes": number,
    "estimated_total_days": number,
    "estimated_completion_date": "YYYY-MM-DD",
    "confidence": "low|medium|high"
  },
  "tasks": [
    {
      "id": "t1",
      "task": "string",
      "frequency": "daily|weekly|x_times_per_week",
      "time_required_minutes": number,
      "impact_weight": number, // 1-5
      "completion_criteria": "string",
      "notes": "string"
    }
  ],
  "realism_check": {
    "assessment": "plausible|unrealistic",
    "reasons": ["string"],
    "what_must_change": ["deadline|budget|scope|time|skills"]
  },
  "speedup": {
    "supported": boolean,
    "options": [
      {
        "label": "string",
        "target_days": number,
        "required_daily_time_minutes": number,
        "task_changes": ["string"],
        "tradeoffs": ["string"]
      }
    ],
    "user_warning": "string"
  },
  "ai_summary": "string"
}`;

        const userPrompt = `
INPUT:
Current Date: ${currentDate}
Goal: ${goal}
Answers: ${JSON.stringify(answers)}
Target Deadline (Optional): ${targetDeadline || "None"}
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                        role: "system"
                    }
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }]
                    }
                ],
            });

            const responseText = response.text || "";
            console.log("Gemini Phase 2 Response:", responseText);

            if (!responseText) {
                throw new Error("Empty response from Gemini API");
            }

            return extractJson(responseText);
        } catch (error) {
            console.error("Gemini createPlan Error:", error);
            throw error;
        }
    }

    // Phase 3: Daily Judge
    static async evaluateDailyLog(planTasks: any[], userLog: string, previousLogs: any[] = []) {
        // 1. Rule-based Safety Pre-filter
        const safetyCheck = GeminiService.checkContentSafety(userLog);
        if (!safetyCheck.isSafe) {
            return {
                status: "refused",
                safe_redirection: {
                    message: safetyCheck.reason,
                    alternatives: ["Please reach out to professional support if you are in distress."]
                }
            };
        }

        // Detect language from user input
        const userLanguage = GeminiService.detectLanguage(userLog);

        const systemPrompt = `
SYSTEM ROLE:
You are "Daily Judge" - a strict, fair, and expert progress evaluator for a goal-tracking app.

═══════════════════════════════════════
LANGUAGE RULE (CRITICAL)
═══════════════════════════════════════
- The user is writing in ${userLanguage === 'ar' ? 'Arabic' : 'English'}.
- You MUST respond ENTIRELY in ${userLanguage === 'ar' ? 'Arabic' : 'English'}.
- ALL fields (coach_message, reason, comparison_with_previous) MUST be in ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

═══════════════════════════════════════
SAFETY
═══════════════════════════════════════
- If the daily report suggests harm, illegal activity, or off-topic content unrelated to the goal, refuse with status="refused" and provide safe redirection.

═══════════════════════════════════════
SCORING SYSTEM (VERY IMPORTANT - READ CAREFULLY)
═══════════════════════════════════════

STEP 1: TASK MATCHING
- Each task has an "impact_weight" (1-10 scale).
- For each task, determine if the user's report mentions work related to it.
- Assign a status: "done" (fully completed), "partial" (some progress), "missed" (not mentioned), "unknown" (unclear).

STEP 2: POINTS PER TASK (based on impact_weight)
- The MAXIMUM points a single task can earn = its impact_weight value.
- "done" status → award 80-100% of impact_weight (e.g., weight=5 → 4-5 points)
- "partial" status → award 30-60% of impact_weight (e.g., weight=5 → 1.5-3 points, round to nearest integer)
- "missed" status → 0 points
- "unknown" status → 0 points (do NOT guess or assume work was done)

STEP 3: QUALITY MULTIPLIER
- If the user provides DETAILED, SPECIFIC descriptions (times, quantities, specifics), give the higher end of the range.
- If the user provides VAGUE descriptions ("I worked on it", "I did some stuff"), give the lower end.
- One-word or extremely short inputs (< 10 words) → give MINIMUM points only for clearly mentioned tasks.

STEP 4: TOTAL CALCULATION
- total_points_awarded = SUM of all task points + bonus points
- Typical daily range: 3-20 points (depending on number of tasks and their weights)
- ABSOLUTE MAXIMUM per day: 30 points (only if ALL tasks done perfectly + exceptional bonus)

STEP 5: BONUS RULES (STRICT)
- Bonus: 0-5 points ONLY
- Award bonus ONLY when the user did EXTRA work beyond their defined tasks
- Examples of valid bonus: studied extra hours, completed additional exercises, helped others with the skill
- Do NOT give bonus for simply completing assigned tasks - that's already scored above
- If no extra work → bonus = 0

═══════════════════════════════════════
ANTI-GAMING RULES
═══════════════════════════════════════
- If the user's input is COPY-PASTED from a previous log or nearly identical → give 50% reduced points and warn them.
- If the user claims unrealistic progress (e.g., "I studied 20 hours today") → score conservatively and note skepticism.
- If the input is completely unrelated to the goal/tasks → award 0 points and explain why.
- If the input is gibberish, random text, or clearly fake → award 0 points.

═══════════════════════════════════════
COMPARISON WITH PREVIOUS LOGS
═══════════════════════════════════════
${previousLogs.length > 0 ? `Previous ${Math.min(5, previousLogs.length)} logs are provided below.
- Compare TODAY's effort with the user's recent pattern.
- If effort is INCREASING → acknowledge and encourage.
- If effort is DECREASING → gently motivate without being harsh.
- If effort is CONSISTENT → praise consistency.
- Flag if today's report is suspiciously similar to a previous one.` : 'No previous logs available. This may be the user\'s first entry - be welcoming and encouraging.'}

═══════════════════════════════════════
COACH MESSAGE GUIDELINES
═══════════════════════════════════════
- Be encouraging but HONEST. Never lie about performance.
- Reference SPECIFIC things the user mentioned (not generic praise).
- If progress is small → motivate: "Every step counts" style, suggest what to focus on tomorrow.
- If progress is good → celebrate genuinely and suggest next challenge.
- If progress is excellent → enthusiastic praise with specific callouts.
- If no real progress → be kind but direct: "I didn't see much progress today. Tomorrow, try focusing on [specific task]."
- Keep message 2-3 sentences max.
- MUST be in ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

═══════════════════════════════════════
OUTPUT JSON FORMAT ONLY
═══════════════════════════════════════
{
  "status": "ok" | "refused",
  "date": "YYYY-MM-DD",
  "detected_language": "ar" | "en",
  "score": number,
  "task_breakdown": [
    {
      "task_id": "string (use the task's actual id from input)",
      "status": "done|partial|missed|unknown",
      "points": number,
      "reason": "string - brief explanation of why this score (in user's language)"
    }
  ],
  "bonus": {"points": number, "reason": "string (in user's language, empty string if 0 points)"},
  "total_points_awarded": number,
  "coach_message": "string (personalized, in user's language)",
  "comparison_with_previous": "string (brief comparison if previous logs exist, in user's language, empty string if no previous logs)",
  "safe_redirection": {"message": "string", "alternatives": ["string"]}
}`;

        const previousLogsContext = previousLogs.length > 0
            ? `\n\nPREVIOUS LOGS (Last ${Math.min(5, previousLogs.length)} entries for scoring consistency):\n${JSON.stringify(previousLogs.slice(0, 5).map(log => ({
                date: log.created_at,
                points_awarded: log.ai_score,
                what_user_reported: log.user_input?.substring(0, 150)
            })), null, 2)}`
            : '';

        // Format tasks clearly with their IDs and weights for the AI
        const formattedTasks = planTasks.map((t: any) => ({
            id: t.id,
            task_description: t.task_description,
            frequency: t.frequency,
            impact_weight: t.impact_weight,
            max_points_possible: t.impact_weight
        }));

        const userPrompt = `
═══ TODAY'S EVALUATION ═══

DEFINED TASKS (with max points each task can earn):
${JSON.stringify(formattedTasks, null, 2)}

TOTAL MAX POSSIBLE POINTS (if all tasks done perfectly): ${formattedTasks.reduce((sum: number, t: any) => sum + (t.impact_weight || 0), 0)}

USER'S DAILY REPORT:
"${userLog}"

WORD COUNT: ${userLog.trim().split(/\s+/).length} words
${previousLogsContext}

INSTRUCTIONS: Score each task based on the report above. Use the impact_weight as the MAX for each task. Be fair and consistent.
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                        role: "system"
                    }
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }]
                    }
                ],
            });

            const responseText = response.text || "";
            console.log("Gemini Phase 3 Response:", responseText);

            if (!responseText) {
                throw new Error("Empty response from Gemini API");
            }

            return extractJson(responseText);
        } catch (error) {
            console.error("Gemini evaluateDailyLog Error:", error);
            throw error;
        }
    }
}
