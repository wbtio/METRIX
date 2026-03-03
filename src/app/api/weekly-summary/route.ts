import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const mistralApiKey = process.env.MISTRAL_API_KEY!;

function getWeekRange(date = new Date()) {
  // Week starts on Monday
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isArabicText(text: string) {
  return /[\u0600-\u06ff]/.test(text);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function POST(req: Request) {
  try {
    if (!mistralApiKey) {
      console.error("Missing Mistral API key");
      return NextResponse.json({ error: "Server configuration error: Missing Mistral API key" }, { status: 500 });
    }

    const { goalId, forceRefresh = false } = await req.json();

    if (!goalId) {
      return NextResponse.json({ error: "goalId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { start, end } = getWeekRange();
    const weekStart = start.toISOString().slice(0, 10);
    const weekEnd = end.toISOString().slice(0, 10);

    // 1) Check if summary already exists for this week
    if (!forceRefresh) {
      const { data: existing, error: existingError } = await supabase
        .from("weekly_summaries")
        .select("summary_json, created_at")
        .eq("goal_id", goalId)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking existing summary:", existingError);
      }

      if (existing) {
        return NextResponse.json({ cached: true, data: existing.summary_json });
      }
    }

    // 2) Fetch goal details
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("title, target_points, current_points")
      .eq("id", goalId)
      .single();

    console.log("Goal query result:", { goal, goalError });

    if (goalError || !goal) {
      console.error("Goal not found error:", goalError);
      return NextResponse.json({ error: "Goal not found", details: goalError }, { status: 404 });
    }

    // 3) Fetch daily logs for the week
    const { data: logs, error: logsError } = await supabase
      .from("daily_logs")
      .select("created_at, user_input, ai_score, ai_feedback, breakdown")
      .eq("goal_id", goalId)
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd + "T23:59:59")
      .order("created_at", { ascending: true });

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }

    // 4) Fetch sub_layers for context
    const { data: subLayers, error: subLayersError } = await supabase
      .from("sub_layers")
      .select("task_description, frequency, impact_weight")
      .eq("goal_id", goalId);

    if (subLayersError) {
      console.error("Error fetching sub_layers:", subLayersError);
    }

    const normalizedLogs = (logs || []).map((log) => ({
      created_at: log.created_at,
      user_input: log.user_input || "",
      ai_score: Number.isFinite(Number(log.ai_score)) ? Number(log.ai_score) : 0,
      ai_feedback: log.ai_feedback || "",
      breakdown: log.breakdown,
    }));

    // Require at least 7 unique days of logs for a weekly summary.
    const uniqueDays = new Set(normalizedLogs.map((log) => log.created_at?.split("T")[0]).filter(Boolean));
    if (uniqueDays.size < 7) {
      return NextResponse.json(
        {
          code: "INSUFFICIENT_DAYS",
          error: "At least 7 days of logs are required to generate a weekly summary",
          daysLogged: uniqueDays.size,
        },
        { status: 400 },
      );
    }

    const totalScoredPoints = normalizedLogs.reduce((sum, log) => sum + log.ai_score, 0);

    // If logs exist but all scores are null/zero, return deterministic zero-point summary.
    if (totalScoredPoints <= 0) {
      const dayCounts = new Map<string, number>();
      for (const log of normalizedLogs) {
        const date = log.created_at?.split("T")[0];
        if (!date) continue;
        dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
      }

      let bestDay: string | null = null;
      let bestCount = -1;
      for (const [day, count] of dayCounts.entries()) {
        if (count > bestCount) {
          bestCount = count;
          bestDay = day;
        }
      }

      const mostlyArabic = normalizedLogs.filter((log) => isArabicText(log.user_input)).length >= Math.ceil(normalizedLogs.length / 2);
      const bestActivity = normalizedLogs.find((log) => log.user_input.trim().length > 0)?.user_input?.slice(0, 140) || null;

      const zeroPointSummary = {
        completed_count: normalizedLogs.length,
        total_points: 0,
        best_day: bestDay,
        best_activity: bestActivity,
        patterns: mostlyArabic
          ? [
              "تم تسجيل الأنشطة خلال الأسبوع لكن التقييم بالنقاط كان صفراً.",
              "الاستمرارية موجودة، وتحتاج فقط لتحسين جودة الإنجاز لكل نشاط.",
            ]
          : [
              "You logged activities this week, but all scores were zero.",
              "Consistency is present; focus on improving execution quality for each activity.",
            ],
        improvements: mostlyArabic
          ? [
              "أضف تفاصيل أكثر لكل سجل يومي لتمكين تقييم أدق.",
              "نفّذ خطوة واضحة قابلة للقياس في كل نشاط يومي.",
            ]
          : [
              "Add more detail to each daily log so scoring can be more accurate.",
              "Execute one clear, measurable step in each daily activity.",
            ],
        next_week_plan: subLayers?.slice(0, 3).map((sl) => ({
          task: sl.task_description,
          frequency: sl.frequency,
        })) || [],
        coach_message: mostlyArabic
          ? "استمر، أنت على الطريق الصحيح. ركّز على خطوة أقوى كل يوم."
          : "Keep going, you are on track. Focus on one stronger step each day.",
      };

      await supabase.from("weekly_summaries").upsert(
        {
          goal_id: goalId,
          week_start: weekStart,
          week_end: weekEnd,
          summary_json: zeroPointSummary,
        },
        { onConflict: "goal_id,week_start" },
      );

      return NextResponse.json({ cached: false, data: zeroPointSummary });
    }

    // 5) AI Prompt for summary generation
    const systemPrompt = `
You are a Weekly Progress Summarizer for goal tracking app.
Return JSON only. No markdown, no explanation, just valid JSON.

Analyze the user's weekly activity logs and provide an encouraging, actionable summary.

Output JSON structure must be:
{
  "completed_count": number (count of activities),
  "total_points": number (sum of ai_score),
  "best_day": string (YYYY-MM-DD or null),
  "best_activity": string (description of best activity or null),
  "patterns": string[] (2-3 observations about their week),
  "improvements": string[] (2-3 actionable suggestions),
  "next_week_plan": [{"task": string, "frequency": string}] (3-5 items),
  "coach_message": string (encouraging personalized message, max 100 chars, Arabic preferred if input has Arabic)
}

Rules:
- Be encouraging but honest about gaps
- Base patterns on actual log data
- Suggest specific, actionable improvements
- Keep coach_message warm and motivating
- Use Arabic if the user's inputs are mostly Arabic
`;

    const userPrompt = JSON.stringify({
      goalTitle: goal.title,
      goalProgress: `${goal.current_points}/${goal.target_points}`,
      weekStart,
      weekEnd,
      logsCount: normalizedLogs.length,
      logs: normalizedLogs.map((log) => ({
        date: log.created_at,
        input: log.user_input?.slice(0, 200), // Truncate long inputs
        score: log.ai_score,
        feedback: log.ai_feedback?.slice(0, 100),
      })),
      subLayers: subLayers?.map((sl) => ({
        task: sl.task_description,
        frequency: sl.frequency,
        impact: sl.impact_weight,
      })) || [],
    });

    // 6) Generate summary with AI (using Mistral)
    let raw;
    try {
      console.log("Calling Mistral API...");
      const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });

      if (!mistralResponse.ok) {
        const errorText = await mistralResponse.text();
        throw new Error(`Mistral API error: ${mistralResponse.status} - ${errorText}`);
      }

      const mistralData = await mistralResponse.json();
      raw = mistralData.choices?.[0]?.message?.content ?? "";
      console.log("Mistral API response received");
    } catch (aiError: unknown) {
      console.error("Mistral API error:", aiError);
      return NextResponse.json({ 
        error: "AI generation failed", 
        message: getErrorMessage(aiError),
        details: aiError 
      }, { status: 500 });
    }
    
    // Extract JSON from response
    const startIdx = raw.indexOf("{");
    const endIdx = raw.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      console.error("Invalid JSON from model:", raw);
      return NextResponse.json({ error: "Invalid response from AI", raw }, { status: 500 });
    }

    let summaryJson;
    try {
      summaryJson = JSON.parse(raw.slice(startIdx, endIdx + 1));
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw:", raw);
      return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
    }

    // 7) Store the summary
    const { error: insertError } = await supabase.from("weekly_summaries").upsert({
      goal_id: goalId,
      week_start: weekStart,
      week_end: weekEnd,
      summary_json: summaryJson,
    }, { onConflict: "goal_id,week_start" });

    if (insertError) {
      console.error("Error storing summary:", insertError);
    }

    return NextResponse.json({ cached: false, data: summaryJson });

  } catch (error: unknown) {
    console.error("API Error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
