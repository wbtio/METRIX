/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from "@google/genai";
import {
  buildTaskHierarchy,
  calculateDailyCap,
  deriveMainBreakdown,
  getScorableTasks,
  type TaskRow,
  type MainTask,
} from "@/lib/task-hierarchy";
import { analyzeDailyPerformance } from "@/lib/daily-log-feedback";
import type {
  DailyFocusGoalContext,
  DailyFocusHistoryItem,
  DailyFocusLogContext,
  DailyFocusResult,
} from "@/lib/daily-focus";
import { DAILY_FOCUS_REQUIRED_DAYS } from "@/lib/daily-focus";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiQuotaError extends Error {
  isQuotaExceeded = true;
  retryAfterSeconds: number;
  constructor(retryAfter: number) {
    super("Gemini API quota exceeded");
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfter;
  }
}

export class GeminiImageUnavailableError extends Error {
  constructor(message = "Image generation is not available for this API plan") {
    super(message);
    this.name = "GeminiImageUnavailableError";
  }
}

function getApiErrorText(error: any) {
  if (typeof error?.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseApiErrorPayload(error: any) {
  const text = getApiErrorText(error);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getRetryDelaySeconds(error: any) {
  const payload = parseApiErrorPayload(error);
  const details = payload?.error?.details;
  if (Array.isArray(details)) {
    const retryInfo = details.find(
      (item: any) =>
        item?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    );
    const retryDelay = retryInfo?.retryDelay;
    if (typeof retryDelay === "string") {
      const seconds = Number(retryDelay.replace("s", ""));
      if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
    }
  }

  const match = getApiErrorText(error).match(/retry in\s+([\d.]+)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  }

  return 60;
}

function isQuotaError(error: any) {
  const text = getApiErrorText(error).toLowerCase();
  return (
    error?.status === 429 ||
    text.includes("resource_exhausted") ||
    text.includes("quota exceeded") ||
    text.includes("rate-limits")
  );
}

function isImagePlanError(error: any) {
  const text = getApiErrorText(error).toLowerCase();
  return (
    text.includes("only available on paid plans") ||
    text.includes("upgrade your account")
  );
}

/**
 * Robustly extracts and parses JSON from a string that might contain extra text or markdown.
 */
function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const cleanText = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleanText);
    } catch {
      const start = cleanText.indexOf("{");
      const end = cleanText.lastIndexOf("}");

      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = cleanText.substring(start, end + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e3: any) {
          throw new Error(
            `Failed to parse extracted JSON: ${e3.message || e3}`,
          );
        }
      }
      throw new Error("No JSON object found in response");
    }
  }
}

const DANGEROUS_KEYWORDS = [
  "suicide",
  "kill myself",
  "harm myself",
  "end my life",
  "bomb",
  "explosive",
  "detonate",
  "shrapnel",
  "murder",
  "assassinate",
  "kill people",
  "terrorist",
  "terrorism",
  "steal credit card",
  "carding",
  "fraud",
  "manufacture weapon",
  "build gun",
  "child porn",
  "abuse children",
];

type SafetyCheck = { isSafe: boolean; reason?: string };

const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const DAILY_FOCUS_ANGLES = [
  {
    enLabel: "Method Fit",
    arLabel: "ملاءمة الطريقة",
    prompt:
      "Ask whether the current learning or work method truly fits the user's reality and strengths.",
  },
  {
    enLabel: "Yesterday Review",
    arLabel: "مراجعة الأمس",
    prompt:
      "Anchor the question in yesterday or the latest real execution, not abstract motivation.",
  },
  {
    enLabel: "Task Value",
    arLabel: "قيمة المهمة",
    prompt:
      "Check if the current tasks are actually moving the user closer to the goal or just keeping them busy.",
  },
  {
    enLabel: "Obstacle",
    arLabel: "العائق",
    prompt:
      "Surface the specific friction, blocker, or pattern that is slowing execution.",
  },
  {
    enLabel: "Evidence",
    arLabel: "الدليل",
    prompt:
      "Ask for real evidence that the current plan is producing progress toward the target.",
  },
  {
    enLabel: "Sustainability",
    arLabel: "الاستمرارية الواقعية",
    prompt:
      "Check whether the plan is sustainable day after day and what should change to keep it realistic.",
  },
];

function normalizeFrequency(value: any): "daily" | "weekly" {
  return value === "weekly" ? "weekly" : "daily";
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickDailyFocusAngle(seed: string, language: "ar" | "en") {
  const angle = DAILY_FOCUS_ANGLES[hashSeed(seed) % DAILY_FOCUS_ANGLES.length];
  return {
    label: language === "ar" ? angle.arLabel : angle.enLabel,
    prompt: angle.prompt,
  };
}

function normalizePlanHierarchy(rawPlan: any) {
  const result = { ...rawPlan };
  const mainTasks = Array.isArray(result.main_tasks) ? result.main_tasks : [];
  const legacyTasks = Array.isArray(result.tasks) ? result.tasks : [];

  if (mainTasks.length === 0 && legacyTasks.length > 0) {
    result.main_tasks = [
      {
        id: "m1",
        task: result.plan?.goal_summary || "Main Goal Track",
        impact_weight: 7,
        frequency: "weekly",
        completion_criteria: "Consistent progress across subtasks",
        subtasks: legacyTasks.map((task: any, idx: number) => ({
          id: task.id || `s${idx + 1}`,
          task: task.task || task.task_description || `Task ${idx + 1}`,
          frequency: normalizeFrequency(task.frequency),
          time_required_minutes: Number(task.time_required_minutes) || 0,
          impact_weight: clamp(Number(task.impact_weight) || 1, 1, 5),
          completion_criteria: task.completion_criteria || "",
          notes: task.notes || "",
        })),
      },
    ];
  }

  if (!Array.isArray(result.main_tasks) || result.main_tasks.length === 0) {
    result.main_tasks = [
      {
        id: "m1",
        task: result.plan?.goal_summary || "Main Goal Track",
        impact_weight: 7,
        frequency: "weekly",
        completion_criteria: "Consistent progress across subtasks",
        subtasks: [],
      },
    ];
  }

  // Ensure structure shape
  result.main_tasks = result.main_tasks.map((main: any, mainIdx: number) => {
    const subtasks = Array.isArray(main.subtasks) ? main.subtasks : [];
    return {
      id: main.id || `m${mainIdx + 1}`,
      task: main.task || main.task_description || `Main Task ${mainIdx + 1}`,
      impact_weight: clamp(Number(main.impact_weight) || 5, 1, 10),
      frequency: normalizeFrequency(main.frequency),
      completion_criteria: main.completion_criteria || "",
      notes: main.notes || "",
      subtasks: subtasks.map((sub: any, subIdx: number) => ({
        id: sub.id || `m${mainIdx + 1}-s${subIdx + 1}`,
        task: sub.task || sub.task_description || `Subtask ${subIdx + 1}`,
        frequency: normalizeFrequency(sub.frequency),
        time_required_minutes: Math.max(
          0,
          Number(sub.time_required_minutes) || 0,
        ),
        impact_weight: clamp(Number(sub.impact_weight) || 1, 1, 5),
        completion_criteria: sub.completion_criteria || "",
        notes: sub.notes || "",
      })),
    };
  });

  // Keep a flattened legacy-compatible tasks array derived from subtasks.
  result.tasks = result.main_tasks.flatMap((main: any) =>
    (main.subtasks || []).map((sub: any) => ({
      id: sub.id,
      task: sub.task,
      frequency: sub.frequency,
      time_required_minutes: sub.time_required_minutes,
      impact_weight: sub.impact_weight,
      completion_criteria: sub.completion_criteria,
      notes: sub.notes,
      parent_task_id: main.id,
    })),
  );

  return result;
}

function convertMainTasksToRows(mainTasksInput: any[]): TaskRow[] {
  if (!Array.isArray(mainTasksInput)) return [];
  const rows: TaskRow[] = [];

  for (const main of mainTasksInput) {
    const mainId = main.id || `m-${Math.random().toString(36).slice(2, 8)}`;
    rows.push({
      id: mainId,
      goal_id: main.goal_id || "virtual-goal",
      task_description: main.task_description || main.task || "Main Task",
      impact_weight: clamp(Number(main.impact_weight) || 5, 1, 10),
      frequency: normalizeFrequency(main.frequency),
      task_type: "main",
      parent_task_id: null,
      time_required_minutes: Number(main.time_required_minutes) || 0,
      completion_criteria: main.completion_criteria || "",
      sort_order: Number(main.sort_order) || 0,
    });

    const subtasks = Array.isArray(main.subtasks) ? main.subtasks : [];
    subtasks.forEach((sub: any, idx: number) => {
      rows.push({
        id: sub.id || `${mainId}-s${idx + 1}`,
        goal_id: main.goal_id || "virtual-goal",
        task_description: sub.task_description || sub.task || "Subtask",
        impact_weight: clamp(Number(sub.impact_weight) || 1, 1, 5),
        frequency: normalizeFrequency(sub.frequency),
        task_type: "sub",
        parent_task_id: mainId,
        time_required_minutes: Number(sub.time_required_minutes) || 0,
        completion_criteria: sub.completion_criteria || "",
        sort_order: Number(sub.sort_order) || idx,
      });
    });
  }

  return rows;
}

export class GeminiService {
  private static async callWithRetry(config: any, content: any): Promise<any> {
    let lastError: any = null;

    for (const model of MODEL_FALLBACK_CHAIN) {
      try {
        const response = await ai.models.generateContent({
          model,
          config,
          contents: [content],
        });
        console.log(`Gemini call succeeded with model: ${model}`);
        return response;
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.code;

        if (status === 429) {
          console.warn(
            `Model ${model} quota exhausted (429), trying next fallback...`,
          );
          continue;
        }

        if (status === 503) {
          console.warn(`Model ${model} returned 503, retrying once in 3s...`);
          await delay(3000);
          try {
            const retryResponse = await ai.models.generateContent({
              model,
              config,
              contents: [content],
            });
            console.log(`Gemini 503 retry succeeded with model: ${model}`);
            return retryResponse;
          } catch (retryError: any) {
            lastError = retryError;
            const retryStatus = retryError?.status || retryError?.code;
            if (retryStatus === 429) {
              console.warn(
                `Model ${model} hit 429 on 503 retry, trying next fallback...`,
              );
              continue;
            }
            console.warn(
              `Model ${model} failed on 503 retry, trying next fallback...`,
            );
            continue;
          }
        }

        if (status === 404) {
          console.warn(
            `Model ${model} not found (404), trying next fallback...`,
          );
          continue;
        }

        throw error;
      }
    }

    console.error("All Gemini models exhausted their quotas.");
    const errorMsg = lastError?.message || "";
    const retryMatch = errorMsg.match(/retryDelay[":]\s*["']?(\d+)/i);
    const apiRetrySeconds = retryMatch ? parseInt(retryMatch[1]) : 60;
    throw new GeminiQuotaError(apiRetrySeconds);
  }

  private static detectLanguage(text: string): "ar" | "en" {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? "ar" : "en";
  }

  private static checkContentSafety(text: string): SafetyCheck {
    const lower = text.toLowerCase();
    for (const kw of DANGEROUS_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          isSafe: false,
          reason:
            "Safety Policy Violation: Request contains prohibited content.",
        };
      }
    }
    return { isSafe: true };
  }

  // Phase 1: Investigate & Questioning
  static async investigateGoal(
    goalText: string,
    previousContext: any = {},
    structuredInput: any = null,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(goalText);
    if (!safetyCheck.isSafe) {
      return {
        status: "refused",
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const userLanguage = GeminiService.detectLanguage(goalText);
    const systemPrompt = `
SYSTEM ROLE:
You are an expert "Goal Investigator & Safety Gate".

TOP PRIORITY: SAFETY
- If the goal involves violence, harming people/animals, self-harm, illegal wrongdoing, weapons, explosives, fraud, hacking, or instructions that facilitate harm/illegal activity:
  - REFUSE to help create plans, steps, or questions that would enable wrongdoing.
  - Output JSON with status="refused" and safe_redirection.

SECOND PRIORITY: REALISM & CLARITY
- If the goal is vague, missing key constraints, or not measurable, ask questions until it becomes measurable.
- Ask only what is needed for a practical plan.
- You are allowed to use STRUCTURED_INPUT (title/description/target_points/main/sub tasks) as additional user intent.

CONTEXT AWARENESS
- Do NOT re-ask already answered information.
- Use both goal text and structured input.

EXIT CONDITION
Set readiness="ready_for_plan" and return empty questions when Core 4 are available:
1) current state
2) target state
3) timeline
4) available effort per day/week

QUESTION RULES
- Ask 2 to 4 questions max per round.
- LANGUAGE: The user's goal is in ${userLanguage === "ar" ? "Arabic" : "English"}. Respond entirely in ${userLanguage === "ar" ? "Arabic" : "English"}.

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

    const contextEntries = Object.entries(previousContext || {});
    const formattedContext =
      contextEntries.length > 0
        ? contextEntries
            .map(
              ([question, answer], i) =>
                `${i + 1}. Question: "${question}"\n   Answer: "${answer}"`,
            )
            .join("\n")
        : "No previous answers yet.";

    const userPrompt = `
USER GOAL:
<<<BEGIN_USER_INPUT>>>
${goalText}
<<<END_USER_INPUT>>>

STRUCTURED_INPUT (optional):
${JSON.stringify(structuredInput || {}, null, 2)}

PREVIOUS_ANSWERS (${contextEntries.length} answers already collected — DO NOT re-ask these):
${formattedContext}

INSTRUCTION:
If Core 4 are already covered by goal + structured_input + previous answers, set readiness="ready_for_plan" and return empty questions.
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: {
            parts: [{ text: systemPrompt }],
            role: "system",
          },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");
      return extractJson(responseText);
    } catch (error) {
      console.error("Gemini investigateGoal Error:", error);
      throw error;
    }
  }

  // Phase 2: Architect & Simulator
  static async createPlan(
    goal: string,
    answers: any,
    targetDeadline?: string,
    structuredInput: any = null,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(goal);
    if (!safetyCheck.isSafe) {
      return {
        status: "refused",
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const userLanguage = GeminiService.detectLanguage(goal);
    const currentDate = new Date().toISOString().split("T")[0];

    const systemPrompt = `
SYSTEM ROLE:
You are "Plan Architect & Simulation Engine".

HARD CONSTRAINTS:
- Never provide instructions for harm/illegal activity.
- Plan must be measurable, realistic, and executable.
- Use a 2-level hierarchy:
  - main_tasks[] (weight 1-10)
  - each main task has subtasks[] (weight 1-5)
- Subtasks frequency must be only "daily" or "weekly".
- Do NOT use monthly or x_times_per_week.
- Keep total subtasks between 4 and 12.
- LANGUAGE: Respond entirely in ${userLanguage === "ar" ? "Arabic" : "English"}.
- CURRENT DATE: ${currentDate}

REALISM:
- If unrealistic, return status="unrealistic" with best feasible alternative.

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
  "main_tasks": [
    {
      "id": "m1",
      "task": "string",
      "impact_weight": number,
      "frequency": "daily|weekly",
      "completion_criteria": "string",
      "notes": "string",
      "subtasks": [
        {
          "id": "s1",
          "task": "string",
          "frequency": "daily|weekly",
          "time_required_minutes": number,
          "impact_weight": number,
          "completion_criteria": "string",
          "notes": "string"
        }
      ]
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
}
`;

    const userPrompt = `
INPUT:
Current Date: ${currentDate}
Goal:
<<<BEGIN_USER_INPUT>>>
${goal}
<<<END_USER_INPUT>>>
Answers: ${JSON.stringify(answers)}
Structured Input: ${JSON.stringify(structuredInput || {})}
Target Deadline (Optional): ${targetDeadline || "None"}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: {
            parts: [{ text: systemPrompt }],
            role: "system",
          },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");

      const parsed = extractJson(responseText);
      return normalizePlanHierarchy(parsed);
    } catch (error) {
      console.error("Gemini createPlan Error:", error);
      throw error;
    }
  }

  static async generateDailyFocus(
    goalContext: DailyFocusGoalContext,
    taskRows: TaskRow[],
    recentLogs: DailyFocusLogContext[] = [],
    options: {
      date?: string;
      answer?: string;
      existingQuestion?: string;
      history?: DailyFocusHistoryItem[];
      language?: "ar" | "en";
    } = {},
  ): Promise<DailyFocusResult> {
    const safetySource = [
      goalContext.title,
      goalContext.ai_summary || "",
      options.answer || "",
    ]
      .join("\n")
      .trim();
    const safetyCheck = GeminiService.checkContentSafety(safetySource);
    if (!safetyCheck.isSafe) {
      return {
        status: "refused",
        date: options.date || new Date().toISOString().split("T")[0],
        angle_label: "",
        question: "",
        question_why: "",
        answer_coaching: "",
        suggestions: [],
        suggestions_unlocked: false,
        answered_days_count: 0,
        required_answer_days: DAILY_FOCUS_REQUIRED_DAYS,
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const languageProbe = [
      options.answer || "",
      goalContext.title,
      goalContext.ai_summary || "",
      recentLogs.map((log) => log.user_input || "").join("\n"),
    ]
      .filter(Boolean)
      .join("\n");
    const requestedLanguage =
      options.language === "ar" || options.language === "en"
        ? options.language
        : undefined;
    const userLanguage =
      requestedLanguage ||
      GeminiService.detectLanguage(languageProbe || goalContext.title);
    const date = options.date || new Date().toISOString().split("T")[0];
    const hierarchy = buildTaskHierarchy(taskRows);
    const history = Array.isArray(options.history) ? options.history : [];
    const answeredDaysCount = history.length + (options.answer?.trim() ? 1 : 0);
    const suggestionsUnlocked = answeredDaysCount >= DAILY_FOCUS_REQUIRED_DAYS;
    const focusAngle = pickDailyFocusAngle(
      `${goalContext.id || goalContext.title}:${date}`,
      userLanguage,
    );

    const scopedMainTasks = hierarchy.map((main) => ({
      id: main.id,
      title: main.task_description,
      frequency: main.frequency,
      impact_weight: main.impact_weight,
      subtasks: main.subtasks.map((sub) => ({
        id: sub.id,
        title: sub.task_description,
        frequency: sub.frequency,
        impact_weight: sub.impact_weight,
      })),
    }));

    const existingSubtaskNames = hierarchy.flatMap((main) =>
      main.subtasks.map((sub) => sub.task_description),
    );

    const systemPrompt = `
SYSTEM ROLE:
You are "Plan Feedback Strategist" inside a goal-tracking app.

PRIMARY OBJECTIVE:
- Read the goal, task structure, recent progress logs, previous daily answers, and previous questions.
- Produce exactly one diagnostic question for today that helps improve future task suggestions and accelerates the user's path to the goal.
- The question should extract missing information about one focused topic: plan quality, method, bottleneck, task details, environment, schedule, skill gap, or progress pattern.
- Explain briefly why this question matters now.
- Produce 0 to 4 suggested tasks only when enough answer history exists.

QUESTION RULES:
- One question only, but it may contain short bullet points under the same topic so the user knows exactly what details to answer.
- Format the question as 1 short opening line, then 3 to 5 bullets using the "•" character. Every bullet must ask for a different detail inside the same topic. Do not ask unrelated multi-topic questions.
- Keep it direct and useful for plan evaluation, but detailed enough that the answer reveals actionable context for better task suggestions.
- It must be tightly connected to the goal, current task system, recent execution logs, and previous answers.
- Use today's angle hint to vary the perspective.
- The question must be SPECIFIC and PRECISE — not generic or broad. Reference actual tasks, recent logs, completion patterns, goal description, target/current points, or concrete execution details.
- BAD (too generic): "Is your plan working?" or "How do you feel about your progress?"
- GOOD (specific): "بخصوص مهمة القراءة اللي تكررت بس التطبيق العملي قليل، وضّحلي وين دا يصير التعطيل:\n• شنو الجزء اللي تقراه وما يتحول لتطبيق؟\n• بأي وقت عادة تفقد التركيز؟\n• شنو خطوة صغيرة تخلي التطبيق يصير أسهل باچر؟"
- The question should often reference yesterday or the latest real day of work, not vague feelings.
- question_why must explain specifically WHY this question matters TODAY based on the user's actual data — not a generic explanation. Reference specific tasks, logs, or patterns.

NON-REPETITION RULES:
- Do not repeat a previous daily question or the same underlying topic from PREVIOUS DAILY FEEDBACK ANSWERS.
- Before writing the question, infer 5 to 8 keyword/topic fingerprints from the candidate question and compare them mentally with previous questions. If the overlap is high, choose a new angle.
- If today's angle conflicts with the non-repetition rule, keep the angle broad but ask about a different task, log pattern, bottleneck, or detail.
- Do not ask the user to re-answer information that already exists clearly in the goal, tasks, logs, or previous answers.

SUGGESTION RULES:
- Produce 2 to 4 high-signal suggestions. Empty array is allowed only if nothing meaningful applies.
- Each suggestion must be specific, actionable, and measurable.
- Analyze the COMPLETE goal context: goal title, description, target points, current points, and all task hierarchy.
- Use the full task map (main tasks + subtasks) to understand current progress and identify gaps.
- Leverage recent logs to see what worked/didn't work and execution patterns.
- Consider answer history to understand user's challenges, preferences, and feedback patterns.
- Suggestions should address specific gaps in the current plan, execution bottlenecks, or missing strategic elements.
- Avoid duplicating existing subtasks unless the logs or answers clearly show the user needs a better version of that step.
- Each suggestion MUST have a single emoji that best represents its nature (e.g. 📖 for reading, 🏃 for exercise, 💡 for insight, 🧘 for mindfulness, 🎯 for focus). Choose the most fitting emoji.
- support_type MUST be exactly one of:
    "goal_task"        -> the suggestion belongs INSIDE the goal plan (a new main track or sub-step under an existing main task).
    "external_booster" -> the suggestion is OUTSIDE the goal plan but indirectly accelerates the goal (e.g. sleep, walking, focus block, environment fix). External boosters MUST set target_type="main" and parent_task_id=null.
- For "goal_task" suggestions:
    - If it fits under an existing main task, set target_type="sub" and use one valid parent_task_id from the provided main tasks list.
    - If it introduces a new strategic track inside the goal, set target_type="main" and parent_task_id=null.
- Try to mix at least one "external_booster" when the data shows lifestyle / environment is hurting execution; otherwise stay inside the goal.
- frequency must be only "daily" or "weekly".
- impact_weight must be 1..5 for sub tasks and 1..10 for main tasks.
- If ANSWER_HISTORY_COUNT is lower than REQUIRED_ANSWER_DAYS, you may still propose 1-2 lightweight starter suggestions strictly derived from the goal+tasks+logs (no fabrication).

ANSWER HANDLING:
- If USER_ANSWER exists, keep the same daily question and refine the suggestions using the answer.
- answer_coaching should become a short coach line that reacts to the answer.
- If USER_ANSWER is empty, answer_coaching can be an empty string.

LANGUAGE:
- Respond fully in ${userLanguage === "ar" ? "Iraqi Arabic dialect" : "English"}.
- If Arabic is used, use natural Iraqi dialect only. Avoid formal Modern Standard Arabic wording where possible.
- In Arabic questions, invite the user to answer باللهجة العراقية naturally.

OUTPUT JSON ONLY:
{
  "status": "ok" | "refused",
  "date": "YYYY-MM-DD",
  "angle_label": "string",
  "question": "string",
  "question_why": "string",
  "answer_coaching": "string",
  "suggestions_unlocked": boolean,
  "answered_days_count": number,
  "required_answer_days": number,
  "suggestions": [
    {
      "id": "s1",
      "emoji": "a single emoji that best represents this suggestion (e.g. 📖, 🏃, 💡, 🧘, 🎯)",
      "title": "string",
      "reason": "string",
      "frequency": "daily|weekly",
      "impact_weight": number,
      "target_type": "main|sub",
      "parent_task_id": "string or null",
      "support_type": "goal_task|external_booster"
    }
  ],
  "safe_redirection": {
    "message": "string",
    "alternatives": ["string"]
  }
}`;

    const userPrompt = `
DATE:
${date}

ANGLE HINT:
${focusAngle.label} - ${focusAngle.prompt}

ANSWER HISTORY COUNT:
${history.length}

REQUIRED ANSWER DAYS BEFORE SUGGESTIONS:
${DAILY_FOCUS_REQUIRED_DAYS}

GOAL:
${JSON.stringify(goalContext, null, 2)}

MAIN TASK OPTIONS FOR parent_task_id:
${JSON.stringify(
  scopedMainTasks.map((main) => ({
    id: main.id,
    title: main.title,
    frequency: main.frequency,
  })),
  null,
  2,
)}

CURRENT TASK MAP:
${JSON.stringify(scopedMainTasks, null, 2)}

EXISTING SUBTASK TITLES:
${JSON.stringify(existingSubtaskNames, null, 2)}

RECENT LOGS:
${JSON.stringify(
  recentLogs.slice(0, 8).map((log) => ({
    created_at: log.created_at,
    ai_score: log.ai_score ?? null,
    ai_feedback: log.ai_feedback ?? "",
    user_input: log.user_input ?? "",
  })),
  null,
  2,
)}

PREVIOUS DAILY FEEDBACK ANSWERS:
${JSON.stringify(history.slice(0, 12), null, 2)}

PREVIOUS QUESTION TEXTS TO AVOID REPEATING:
${JSON.stringify(
  history.slice(0, 12).map((item) => item.question),
  null,
  2,
)}

EXISTING QUESTION TO KEEP:
${options.existingQuestion || ""}

USER_ANSWER:
${options.answer || ""}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: {
            parts: [{ text: systemPrompt }],
            role: "system",
          },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");

      const parsed = extractJson(responseText);
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];

      return {
        status: parsed.status === "refused" ? "refused" : "ok",
        date: typeof parsed.date === "string" ? parsed.date : date,
        angle_label:
          typeof parsed.angle_label === "string" && parsed.angle_label.trim()
            ? parsed.angle_label.trim()
            : focusAngle.label,
        question:
          typeof parsed.question === "string" && parsed.question.trim()
            ? parsed.question.trim()
            : options.existingQuestion?.trim() || "",
        question_why:
          typeof parsed.question_why === "string"
            ? parsed.question_why.trim()
            : "",
        answer_coaching:
          typeof parsed.answer_coaching === "string"
            ? parsed.answer_coaching.trim()
            : "",
        suggestions_unlocked: suggestionsUnlocked,
        answered_days_count: answeredDaysCount,
        required_answer_days: DAILY_FOCUS_REQUIRED_DAYS,
        suggestions: suggestions
          .map((item: any, index: number) => {
            const supportType =
              item?.support_type === "external_booster"
                ? "external_booster"
                : "goal_task";
            const rawTargetType = item?.target_type === "sub" ? "sub" : "main";
            const targetType =
              supportType === "external_booster" ? "main" : rawTargetType;
            return {
              id:
                typeof item?.id === "string"
                  ? item.id
                  : `daily-focus-${index + 1}`,
              title: typeof item?.title === "string" ? item.title.trim() : "",
              reason:
                typeof item?.reason === "string" ? item.reason.trim() : "",
              emoji:
                typeof item?.emoji === "string" && item.emoji.trim()
                  ? item.emoji.trim()
                  : supportType === "external_booster"
                    ? "⚡"
                    : "🎯",
              frequency: normalizeFrequency(item?.frequency),
              impact_weight: clamp(
                Number(item?.impact_weight) || 1,
                1,
                targetType === "sub" ? 5 : 10,
              ),
              target_type: targetType,
              parent_task_id:
                supportType === "goal_task" &&
                targetType === "sub" &&
                typeof item?.parent_task_id === "string"
                  ? item.parent_task_id
                  : null,
              support_type: supportType,
            };
          })
          .filter((item: any) => item.title),
        safe_redirection: parsed.safe_redirection,
      };
    } catch (error) {
      console.error("Gemini generateDailyFocus Error:", error);
      throw error;
    }
  }

  // Phase 3: Daily Judge
  static async evaluateDailyLog(
    planTasks: any[],
    userLog: string,
    previousLogs: any[] = [],
    goalContext: any = {},
    mainTasksInput: any[] = [],
    calculateTimeBonus: boolean = false,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(userLog);
    if (!safetyCheck.isSafe) {
      return {
        status: "refused",
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const userLanguage = GeminiService.detectLanguage(userLog);

    const sourceRows: TaskRow[] =
      Array.isArray(planTasks) && planTasks.length > 0
        ? planTasks
        : convertMainTasksToRows(mainTasksInput);

    const hierarchy = buildTaskHierarchy(sourceRows);
    const scorableTasks = getScorableTasks(sourceRows);
    const fallbackTasks =
      scorableTasks.length > 0
        ? scorableTasks
        : [
            {
              id: "general-progress",
              task_description: "General progress",
              impact_weight: 3,
              frequency: "daily" as const,
              parent_task_id: null,
            },
          ];

    const dynamicDailyCap = calculateDailyCap(sourceRows);
    const maxBasePoints = fallbackTasks.reduce(
      (sum, t) => sum + (t.impact_weight || 0),
      0,
    );

    const timeBonusInstruction = calculateTimeBonus
      ? `
TIME-BASED BONUS:
- If user mentions time spent on a task that exceeds the task's time_required_minutes, award bonus points.
- Bonus calculation: (actual_time / expected_time - 1) * base_points * 0.5
- Add time_bonus field to subtask_breakdown items when applicable.
- Include total time bonus in the main bonus.points field.
`
      : "";

    const systemPrompt = `
SYSTEM ROLE:
You are "Daily Judge" for a goal-tracking app.

LANGUAGE RULE:
- User language is ${userLanguage === "ar" ? "Arabic" : "English"}.
- Respond fully in ${userLanguage === "ar" ? "Arabic" : "English"}.

SCORING RULES:
- Score SUBTASKS only.
- Each subtask has impact_weight 1..5 and this is the max points for that subtask.
- status mapping:
  - done => 80%..100% of weight
  - partial => 30%..60% of weight
  - missed/unknown => 0
- Bonus allowed only for extra work beyond defined subtasks: 0..5
- MAX BASE POINTS today = ${maxBasePoints}
- ABSOLUTE DAILY CAP = ${dynamicDailyCap}
- total_points_awarded = min(ABSOLUTE DAILY CAP, sum(subtask points) + bonus)
${timeBonusInstruction}
ANTI-GAMING:
- Repeated/copied logs => conservative score and warning in reason.
- Unrealistic claims => conservative scoring.
- Off-topic/gibberish => 0.
- If the report contains multiple same-day updates, evaluate net progress so far and do not count the same accomplishment twice.
- Your scoring must reflect actual output, not polite encouragement.
- If progress is weak, reasons should say it is below the required level.

OUTPUT JSON ONLY:
{
  "status": "ok" | "refused",
  "date": "YYYY-MM-DD",
  "detected_language": "ar" | "en",
  "subtask_breakdown": [
    {
      "task_id": "string",
      "status": "done|partial|missed|unknown",
      "points": number,
      "reason": "string",
      "time_bonus": number (optional, if time exceeded)
    }
  ],
  "bonus": {"points": number, "reason": "string"},
  "total_points_awarded": number,
  "base_points": number,
  "bonus_points": number,
  "coach_message": "string",
  "comparison_with_previous": "string",
  "safe_redirection": {"message": "string", "alternatives": ["string"]}
}
`;

    const previousLogsContext =
      previousLogs.length > 0
        ? `\nPREVIOUS LOGS (for consistency):\n${JSON.stringify(
            previousLogs.slice(0, 5).map((log) => ({
              date: log.created_at,
              points_awarded: log.ai_score,
              what_user_reported: log.user_input?.substring(0, 150),
            })),
            null,
            2,
          )}`
        : "";

    const userPrompt = `
GOAL CONTEXT:
${JSON.stringify(goalContext || {}, null, 2)}

DEFINED SUBTASKS:
${JSON.stringify(
  fallbackTasks.map((t) => {
    const taskRow = sourceRows.find((row) => row.id === t.id);
    return {
      id: t.id,
      task_description: t.task_description,
      frequency: t.frequency,
      impact_weight: t.impact_weight,
      max_points_possible: t.impact_weight,
      time_required_minutes: taskRow?.time_required_minutes || null,
    };
  }),
  null,
  2,
)}

USER REPORT:
<<<BEGIN_USER_INPUT>>>
${userLog}
<<<END_USER_INPUT>>>

WORD COUNT: ${userLog.trim().split(/\s+/).length}
${previousLogsContext}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: {
            parts: [{ text: systemPrompt }],
            role: "system",
          },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");

      const parsed = extractJson(responseText);
      const aiBreakdown = Array.isArray(parsed.subtask_breakdown)
        ? parsed.subtask_breakdown
        : Array.isArray(parsed.task_breakdown)
          ? parsed.task_breakdown
          : [];

      const normalizedSubtaskBreakdown = aiBreakdown.map((item: any) => ({
        task_id: String(item.task_id || ""),
        status: (item.status || "unknown") as
          | "done"
          | "partial"
          | "missed"
          | "unknown",
        points: Math.max(0, Number(item.points) || 0),
        reason: item.reason || "",
        time_bonus: item.time_bonus
          ? Math.max(0, Number(item.time_bonus))
          : undefined,
      }));

      const bonusPoints = clamp(Number(parsed?.bonus?.points) || 0, 0, 10);
      const sumSubtaskPoints = normalizedSubtaskBreakdown.reduce(
        (sum: number, item: any) => sum + (Number(item.points) || 0),
        0,
      );
      const totalAwarded = clamp(
        sumSubtaskPoints + bonusPoints,
        0,
        dynamicDailyCap,
      );
      const basePoints = clamp(sumSubtaskPoints, 0, maxBasePoints);
      const responseBonusPoints = bonusPoints;

      const mainBreakdown = deriveMainBreakdown(
        hierarchy as MainTask[],
        normalizedSubtaskBreakdown,
      );

      const performance = analyzeDailyPerformance({
        source: "ai",
        language: userLanguage,
        logText: userLog,
        items: normalizedSubtaskBreakdown,
        totalPoints: totalAwarded,
        basePoints,
        bonusPoints: responseBonusPoints,
        dailyCap: dynamicDailyCap,
        maxBasePoints,
        totalTasks: fallbackTasks.length,
        previousLogs,
      });

      return {
        ...parsed,
        detected_language: parsed.detected_language || userLanguage,
        subtask_breakdown: normalizedSubtaskBreakdown,
        task_breakdown: normalizedSubtaskBreakdown, // backward compatibility alias
        main_breakdown: mainBreakdown,
        daily_cap: dynamicDailyCap,
        bonus: {
          points: bonusPoints,
          reason: parsed?.bonus?.reason || "",
        },
        base_points: basePoints,
        bonus_points: responseBonusPoints,
        total_points_awarded: totalAwarded,
        day_label: performance.copy.day_label,
        comparison_message: performance.copy.comparison_message,
        warning_message: performance.copy.warning_message,
        performance_meta: performance.meta,
        full_feedback: performance.copy.full_feedback,
        coach_message: performance.copy.coach_message,
        comparison_with_previous: performance.copy.comparison_message,
        score: totalAwarded,
      };
    } catch (error) {
      console.error("Gemini evaluateDailyLog Error:", error);
      throw error;
    }
  }

  static async evaluateMilestone(
    goalContext: any,
    tasksDescriptions: string[],
    userInput: string,
    language: "ar" | "en",
  ) {
    const safetyCheck = GeminiService.checkContentSafety(userInput);
    if (!safetyCheck.isSafe) {
      return {
        is_milestone_accepted: false,
        rejection_reason: safetyCheck.reason,
        milestone_tier: "minor",
        suggested_base_points_multiplier: 1,
        coaching_message: safetyCheck.reason,
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const systemPrompt = `
SYSTEM ROLE:
You are the "Milestone Evaluator" for a goal-tracking app.

Your job:
1. STRICT MATH EVALUATION (IGNORE HYPERBOLE): The user's Goal Title or Description might use extreme, hyperbolic, or metaphorical language for personal motivation (e.g., 'Becoming a machine'). DO NOT use the Goal Title to judge the validity of the milestone.
You MUST base your decision SOLELY on comparing the 'User Claimed Achievement' against their 'Regular Tasks'.
- If the claimed effort is >= 3x the normal task effort, you MUST ACCEPT it.
- If it's < 3x, REJECT it.
2. TONE & MESSAGING: Use the Goal Title and Description ONLY to set the tone, vocabulary, and theme of the \`coaching_message\`. Make it match their specific ambition.
3. NAME GENERATION: Generate a short, epic name for the milestone based on the action performed.
4. CLASSIFY TIER:
   - 'minor' (3x-4x effort)
   - 'major' (5x-9x effort)
   - 'legendary' (10x+ effort)
5. SHORT DESCRIPTION: Generate a concise summary of the user's milestone description in ONE clear sentence (max 18 words). It must capture the core achievement, not motivation.

Respond entirely in ${language === "ar" ? "Arabic" : "English"}.

OUTPUT JSON ONLY:
{
  "is_milestone_accepted": boolean,
  "rejection_reason": "string (if rejected, explain why based on effort comparison)",
  "milestone_tier": "minor" | "major" | "legendary",
  "suggested_base_points_multiplier": number,
  "generated_name": "string (short epic name)",
  "short_description": "string (one-sentence summary of the achievement, max 18 words)",
  "coaching_message": "string (encouraging message if accepted, or explanation if rejected. Match the hyperbole tone)"
}
`;

    const userPrompt = `
GOAL CONTEXT:
${JSON.stringify(goalContext, null, 2)}

REGULAR TASKS:
${JSON.stringify(tasksDescriptions, null, 2)}

USER MILESTONE CLAIM:
<<<BEGIN_USER_INPUT>>>
${userInput}
<<<END_USER_INPUT>>>
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: {
            parts: [{ text: systemPrompt }],
            role: "system",
          },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");

      return extractJson(responseText);
    } catch (error) {
      console.error("Gemini evaluateMilestone Error:", error);
      throw error;
    }
  }

  static async generateMilestoneImage(
    userInput: string,
    goalDomain: string,
    milestoneTier: "minor" | "major" | "legendary",
    aspectRatio: "1:1" | "4:3" | "16:9" | "9:16" | "3:4" = "4:3",
    style: "matrix" | "cinematic" | "poster" | "minimal" = "matrix",
  ) {
    const stylePrompts = {
      matrix:
        "Matrix-inspired cyberpunk, emerald code energy, futuristic neon glow, abstract but premium, heroic atmosphere, 4:3 aspect ratio",
      cinematic:
        "cinematic achievement poster, dramatic volumetric lighting, epic depth, high-end movie key art, premium composition, 4:3 aspect ratio",
      poster:
        "modern social media achievement poster, bold central composition, luxury digital art, clean negative space, 4:3 aspect ratio",
      minimal:
        "minimal premium abstract achievement artwork, elegant geometry, soft gradients, luxury editorial design, 4:3 aspect ratio",
    };

    const prompt = `A premium 4:3 visual milestone artwork.
Style: ${stylePrompts[style]}.
Tier: ${milestoneTier}.
Goal domain: ${goalDomain}.
Achievement context: ${userInput}.
Visual concept: Depict the RESULT, the TOOL, the ENVIRONMENT, or the ABSTRACT CONCEPT using objects, atmospheric effects, architectural elements, textures, light, and metaphor. The scene must embody the accomplishment through things and atmosphere — never through a person or character.
Composition: Centered focal subject, balanced visual weight, generous negative space at top or center for text overlay, clear foreground / middle ground / background separation.
Strict content rules: ABSOLUTELY NO humans, NO people, NO faces, NO bodies, NO hands, NO silhouettes of people, NO characters, NO figurines, NO portraits, NO anatomy of any kind. Only objects, environments, architecture, textures, light, and symbolic elements. NO readable text, NO letters, NO numbers, NO logos, NO watermarks, NO UI elements, NO interface screenshots, NO charts, NO graphs, NO progress bars.`;

    try {
      console.log(
        `Generating milestone image with imagen-4.0-generate-001, aspect ${aspectRatio}, style ${style}`,
      );
      const response = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
        } as any,
      });

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (imageBytes) return imageBytes;

      throw new Error("No image bytes returned from imagen-4.0-generate-001");
    } catch (imagenError: any) {
      const imagenPlanUnavailable = isImagePlanError(imagenError);
      if (isQuotaError(imagenError) && !imagenPlanUnavailable) {
        throw new GeminiQuotaError(getRetryDelaySeconds(imagenError));
      }

      console.warn(
        "Imagen milestone image generation failed; falling back to gemini-2.5-flash-image:",
        imagenPlanUnavailable
          ? "Imagen requires a paid Google AI plan for this project."
          : imagenError?.message || imagenError,
      );

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: prompt,
          config: {
            responseModalities: ["Image"],
            imageConfig: { aspectRatio },
          } as any,
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            console.log(
              `Fallback image generated, mimeType: ${part.inlineData.mimeType}`,
            );
            return part.inlineData.data;
          }
        }

        throw new Error("No image bytes returned from fallback image model");
      } catch (error: any) {
        if (isQuotaError(error)) {
          throw new GeminiQuotaError(getRetryDelaySeconds(error));
        }

        if (imagenPlanUnavailable || isImagePlanError(error)) {
          throw new GeminiImageUnavailableError();
        }

        console.error(
          "Gemini generateMilestoneImage Error:",
          error?.message || error,
        );
        throw error;
      }
    }
  }
}
