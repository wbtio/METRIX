export const promptStyleValues = [
  "cinematic",
  "minimal",
  "neon",
  "realistic",
  "anime",
  "luxury",
] as const;

export type PromptStyle = (typeof promptStyleValues)[number];

export type MilestoneImagePromptContext = {
  goalTitle: string;
  goalSummary?: string;
  tasksDescriptions?: string[];
};

type BuildMilestoneImagePromptParams = MilestoneImagePromptContext & {
  milestoneName: string;
  milestoneDescription: string;
  style?: PromptStyle | string;
  aspectRatio?: string;
};

const MAX_PROMPT_TASKS = 8;
const MAX_PROMPT_TASK_LENGTH = 180;

const styleDirections: Record<PromptStyle, string> = {
  cinematic:
    "modern cinematic digital art, dramatic directional lighting, rich materials, atmospheric depth, premium color grading",
  minimal:
    "clean premium editorial illustration, refined geometry, restrained color accents, precise spacing, calm but still multi-layered",
  neon:
    "futuristic neon digital art, luminous edges, energetic accent colors, deep contrast, polished technology mood",
  realistic:
    "photorealistic conceptual scene, believable materials, natural shadows, real-world scale, polished commercial lighting",
  anime:
    "anime key visual, crisp silhouettes, detailed environment, expressive lighting, polished cinematic finish",
  luxury:
    "luxury editorial artwork, refined metallic and glass details, soft dramatic light, premium materials, elegant depth",
};

const styleMoods: Record<PromptStyle, string> = {
  cinematic: "triumphant, focused, breakthrough energy",
  minimal: "quiet confidence, clean achievement, precise progress",
  neon: "charged momentum, futuristic breakthrough, high-energy win",
  realistic: "credible success, tangible progress, grounded accomplishment",
  anime: "heroic breakthrough, disciplined ambition, vivid momentum",
  luxury: "elite achievement, polished confidence, rare high-value progress",
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizePromptStyle(value: unknown): PromptStyle {
  return promptStyleValues.includes(value as PromptStyle)
    ? (value as PromptStyle)
    : "cinematic";
}

export function normalizePromptTasks(value: unknown) {
  if (!Array.isArray(value)) return [];

  const uniqueTasks = new Set<string>();
  for (const item of value) {
    const task = cleanText(item, MAX_PROMPT_TASK_LENGTH);
    if (task) uniqueTasks.add(task);
    if (uniqueTasks.size >= MAX_PROMPT_TASKS) break;
  }

  return Array.from(uniqueTasks);
}

function getGoalSummary(goalContext: Record<string, unknown> | undefined) {
  if (!goalContext) return "";

  const summary =
    cleanText(goalContext.ai_summary, 420) ||
    cleanText(goalContext.description, 420) ||
    cleanText(goalContext.domain, 180);

  const domain = cleanText(goalContext.domain, 120);
  if (domain && summary && !summary.includes(domain)) {
    return `${summary}. Domain: ${domain}`;
  }

  return summary || domain;
}

export function buildMilestonePromptContext(params: {
  goalTitle: string;
  goalContext?: Record<string, unknown>;
  tasksDescriptions?: string[];
}): MilestoneImagePromptContext {
  const goalTitle = cleanText(params.goalTitle, 180) || "Current goal";
  const goalSummary = getGoalSummary(params.goalContext);
  const tasksDescriptions = normalizePromptTasks(params.tasksDescriptions);
  const context: MilestoneImagePromptContext = {
    goalTitle,
    tasksDescriptions,
  };

  if (goalSummary) context.goalSummary = goalSummary;

  return context;
}

export function buildMilestoneImagePrompt(params: BuildMilestoneImagePromptParams) {
  const style = normalizePromptStyle(params.style);
  const goalTitle = cleanText(params.goalTitle, 180) || "Current goal";
  const milestoneName =
    cleanText(params.milestoneName, 180) || "meaningful milestone";
  const milestoneDescription = cleanText(params.milestoneDescription, 1_200);
  const goalSummary = cleanText(params.goalSummary, 520);
  const tasksDescriptions = normalizePromptTasks(params.tasksDescriptions);
  const aspectRatio = cleanText(params.aspectRatio, 24) || "4:3";
  const taskContext =
    tasksDescriptions.length > 0
      ? `Related tasks and work signals: ${tasksDescriptions
          .map((task, index) => `${index + 1}. ${task}`)
          .join("; ")}.`
      : "Related tasks and work signals: infer concrete tools, outputs, steps, and evidence from the milestone narrative.";

  return [
    `Create a premium ${aspectRatio} milestone artwork for "${milestoneName}".`,
    `Goal: ${goalTitle}.`,
    goalSummary ? `Goal details: ${goalSummary}.` : "",
    milestoneDescription
      ? `Milestone narrative: ${milestoneDescription}.`
      : "",
    taskContext,
    "Scene brief: show a coherent multi-element scene, not a single icon and not a vertical stack of unrelated symbols.",
    "Include at least five distinct, coordinated visual elements: 1) a main achievement centerpiece specific to the milestone, 2) a visual anchor for the larger goal, 3) two or more task/process artifacts drawn from the work signals, 4) a transformation cue such as an opened gate, assembled structure, connected pathway, finished launch, upgraded system, or completed bridge, 5) an environment/background layer that supports the story, plus small connective details that make the scene feel unified.",
    "Every element must help explain this exact achievement. Avoid generic trophy-only images, random stars, empty backgrounds, scattered icons, or one-object compositions.",
    `Style: ${styleDirections[style]}.`,
    "Composition: balanced premium composition with clear foreground, middle ground, and background; 5 to 8 visible objects; strong focal hierarchy; enough breathing room; no clutter.",
    `Mood: ${styleMoods[style]}.`,
    "Strict content rules: ABSOLUTELY NO readable text, NO letters, NO numbers, NO logos, NO watermarks, NO UI screenshots, NO charts, NO graphs, NO progress bars. NO humans, NO people, NO faces, NO bodies, NO hands, NO silhouettes, NO characters, NO portraits, NO anatomy of any kind. Only objects, environments, architecture, light, texture, and symbolic elements.",
  ]
    .filter(Boolean)
    .join(" ");
}
