import type {
  ResolvedStudyPlanGeneratorConfig,
  StudyDayPlan,
  StudyPlan,
  StudyPlanGeneratorConfig,
  StudyPlanSummary,
  StudyPlanTask,
  StudyStage,
} from "../types/study";

type PriorityLevel = "high_priority" | "normal";

type SyllabusSecondaryTopic = {
  topic_id: string;
  topic_order: number;
  topic_title: string;
  priority: PriorityLevel;
};

type SyllabusPrimaryTopic = {
  topic_id: string;
  topic_order: number;
  topic_title: string;
  priority: PriorityLevel;
  secondary_topics: SyllabusSecondaryTopic[];
};

type SyllabusChapter = {
  chapter_id: string;
  chapter_order: number;
  chapter_title: string;
  primary_topics: SyllabusPrimaryTopic[];
};

type SyllabusSubject = {
  subject_id: string;
  subject_code: string | null;
  subject_name: string;
  chapters: SyllabusChapter[];
};

export type SyllabusData = {
  generated_at: string;
  source_directory: string;
  extraction_version: number;
  subjects: SyllabusSubject[];
};

type KnowledgePointSeed = {
  subjectId: string;
  subject: string;
  subjectSortKey: number;
  chapterId: string;
  chapter: string;
  chapterOrder: number;
  knowledgePointId: string;
  knowledgePoint: string;
  priority: PriorityLevel;
  order: number;
};

type ScheduleDay = {
  date: string;
  dayIndex: number;
  tasks: StudyPlanTask[];
  totalEstimatedMinutes: number;
};

const DEFAULT_DURATION_DAYS = 90;
const DEFAULT_MAX_DAILY_TASKS = 12;
const DEFAULT_MAX_DAILY_MINUTES = 210;
const DEFAULT_REVIEW_GAP_DAYS = 7;
const DEFAULT_INTENSIVE_GAP_DAYS = 21;
const DEFAULT_STAGE_DURATIONS: Record<StudyStage, number> = {
  initial: 20,
  review: 10,
  intensive: 15,
};

export function generateStudyPlan(
  syllabus: SyllabusData,
  config: StudyPlanGeneratorConfig,
): StudyPlan {
  const resolvedConfig = resolveConfig(config);
  const knowledgePoints = extractKnowledgePoints(syllabus);
  const scheduledDays = createScheduleDays(
    resolvedConfig.startDate,
    resolvedConfig.durationDays,
  );
  const maxInitialDayIndex = Math.max(
    0,
    resolvedConfig.durationDays - 1 - resolvedConfig.reviewGapDays - resolvedConfig.intensiveGapDays,
  );

  knowledgePoints.forEach((knowledgePoint, knowledgeIndex) => {
    const initialTargetDay = Math.min(
      maxInitialDayIndex,
      Math.floor((knowledgeIndex * (maxInitialDayIndex + 1)) / Math.max(knowledgePoints.length, 1)),
    );
    const initialDayIndex = assignTaskToBestDay({
      scheduledDays,
      earliestDayIndex: 0,
      latestDayIndex: maxInitialDayIndex,
      preferredDayIndex: initialTargetDay,
      estimatedMinutes: resolvedConfig.stageDurations.initial,
      config: resolvedConfig,
    });

    const initialTask = createTask({
      knowledgePoint,
      studyStage: "initial",
      estimatedMinutes: resolvedConfig.stageDurations.initial,
      date: scheduledDays[initialDayIndex].date,
      dayIndex: initialDayIndex,
    });
    addTaskToDay(scheduledDays[initialDayIndex], initialTask);

    const reviewEarliestDay = Math.min(
      resolvedConfig.durationDays - 1,
      initialDayIndex + resolvedConfig.reviewGapDays,
    );
    const reviewLatestDay = Math.max(
      reviewEarliestDay,
      resolvedConfig.durationDays - 1 - resolvedConfig.intensiveGapDays,
    );
    const reviewDayIndex = assignTaskToBestDay({
      scheduledDays,
      earliestDayIndex: reviewEarliestDay,
      latestDayIndex: reviewLatestDay,
      preferredDayIndex: reviewEarliestDay,
      estimatedMinutes: resolvedConfig.stageDurations.review,
      config: resolvedConfig,
    });

    const reviewTask = createTask({
      knowledgePoint,
      studyStage: "review",
      estimatedMinutes: resolvedConfig.stageDurations.review,
      date: scheduledDays[reviewDayIndex].date,
      dayIndex: reviewDayIndex,
    });
    addTaskToDay(scheduledDays[reviewDayIndex], reviewTask);

    const intensiveEarliestDay = Math.min(
      resolvedConfig.durationDays - 1,
      reviewDayIndex + resolvedConfig.intensiveGapDays,
    );
    const intensiveDayIndex = assignTaskToBestDay({
      scheduledDays,
      earliestDayIndex: intensiveEarliestDay,
      latestDayIndex: resolvedConfig.durationDays - 1,
      preferredDayIndex: intensiveEarliestDay,
      estimatedMinutes: resolvedConfig.stageDurations.intensive,
      config: resolvedConfig,
    });

    const intensiveTask = createTask({
      knowledgePoint,
      studyStage: "intensive",
      estimatedMinutes: resolvedConfig.stageDurations.intensive,
      date: scheduledDays[intensiveDayIndex].date,
      dayIndex: intensiveDayIndex,
    });
    addTaskToDay(scheduledDays[intensiveDayIndex], intensiveTask);
  });

  const days: StudyDayPlan[] = scheduledDays.map((day) => ({
    date: day.date,
    dayIndex: day.dayIndex,
    taskCount: day.tasks.length,
    totalEstimatedMinutes: day.totalEstimatedMinutes,
    tasks: day.tasks,
  }));
  const tasks = days.flatMap((day) => day.tasks);
  const summary = buildSummary(tasks, days);

  return {
    generatedAt: new Date().toISOString(),
    source: `syllabus:${syllabus.source_directory}`,
    config: resolvedConfig,
    summary,
    days,
    tasks,
  };
}

export function createDefaultStudyPlan(
  syllabus: SyllabusData,
  startDate: string,
): StudyPlan {
  return generateStudyPlan(syllabus, {
    startDate,
    durationDays: DEFAULT_DURATION_DAYS,
    maxDailyTasks: DEFAULT_MAX_DAILY_TASKS,
    maxDailyMinutes: DEFAULT_MAX_DAILY_MINUTES,
    reviewGapDays: DEFAULT_REVIEW_GAP_DAYS,
    intensiveGapDays: DEFAULT_INTENSIVE_GAP_DAYS,
    stageDurations: DEFAULT_STAGE_DURATIONS,
  });
}

export const defaultStudyPlanConfig = {
  durationDays: DEFAULT_DURATION_DAYS,
  maxDailyTasks: DEFAULT_MAX_DAILY_TASKS,
  maxDailyMinutes: DEFAULT_MAX_DAILY_MINUTES,
  reviewGapDays: DEFAULT_REVIEW_GAP_DAYS,
  intensiveGapDays: DEFAULT_INTENSIVE_GAP_DAYS,
  stageDurations: DEFAULT_STAGE_DURATIONS,
};

function resolveConfig(
  config: StudyPlanGeneratorConfig,
): ResolvedStudyPlanGeneratorConfig {
  const startDate = normalizeDate(config.startDate);
  const durationDays = resolveDurationDays(startDate, config.examDate, config.durationDays);
  const endDate = formatDate(addDays(startDate, durationDays - 1));

  return {
    startDate: formatDate(startDate),
    endDate,
    durationDays,
    maxDailyTasks: config.maxDailyTasks ?? DEFAULT_MAX_DAILY_TASKS,
    maxDailyMinutes: config.maxDailyMinutes ?? DEFAULT_MAX_DAILY_MINUTES,
    reviewGapDays: config.reviewGapDays ?? DEFAULT_REVIEW_GAP_DAYS,
    intensiveGapDays: config.intensiveGapDays ?? DEFAULT_INTENSIVE_GAP_DAYS,
    stageDurations: {
      ...DEFAULT_STAGE_DURATIONS,
      ...config.stageDurations,
    },
  };
}

function resolveDurationDays(
  startDate: Date,
  examDate: string | undefined,
  durationDays: number | undefined,
) {
  if (examDate) {
    const normalizedExamDate = normalizeDate(examDate);
    const milliseconds = normalizedExamDate.getTime() - startDate.getTime();
    const days = Math.floor(milliseconds / 86400000) + 1;
    return Math.max(days, 1);
  }

  return Math.max(durationDays ?? DEFAULT_DURATION_DAYS, 1);
}

function extractKnowledgePoints(syllabus: SyllabusData) {
  const seeds: KnowledgePointSeed[] = [];

  syllabus.subjects.forEach((subject, subjectIndex) => {
    subject.chapters.forEach((chapter) => {
      chapter.primary_topics.forEach((primaryTopic) => {
        if (primaryTopic.secondary_topics.length === 0) {
          seeds.push({
            subjectId: subject.subject_id,
            subject: formatSubjectName(subject),
            subjectSortKey: resolveSubjectSortKey(subject, subjectIndex),
            chapterId: chapter.chapter_id,
            chapter: chapter.chapter_title,
            chapterOrder: chapter.chapter_order,
            knowledgePointId: primaryTopic.topic_id,
            knowledgePoint: primaryTopic.topic_title,
            priority: primaryTopic.priority,
            order: primaryTopic.topic_order,
          });
          return;
        }

        primaryTopic.secondary_topics.forEach((secondaryTopic) => {
          seeds.push({
            subjectId: subject.subject_id,
            subject: formatSubjectName(subject),
            subjectSortKey: resolveSubjectSortKey(subject, subjectIndex),
            chapterId: chapter.chapter_id,
            chapter: chapter.chapter_title,
            chapterOrder: chapter.chapter_order,
            knowledgePointId: secondaryTopic.topic_id,
            knowledgePoint: `${primaryTopic.topic_title} - ${secondaryTopic.topic_title}`,
            priority: secondaryTopic.priority,
            order: Number(`${primaryTopic.topic_order}.${secondaryTopic.topic_order}`),
          });
        });
      });
    });
  });

  const groupedBySubject = new Map<string, { high: KnowledgePointSeed[]; normal: KnowledgePointSeed[] }>();

  seeds.forEach((seed) => {
    const bucket = groupedBySubject.get(seed.subjectId) ?? { high: [], normal: [] };
    if (seed.priority === "high_priority") {
      bucket.high.push(seed);
    } else {
      bucket.normal.push(seed);
    }
    groupedBySubject.set(seed.subjectId, bucket);
  });

  const orderedSubjects = [...groupedBySubject.values()].sort((left, right) => {
    const leftSeed = left.high[0] ?? left.normal[0];
    const rightSeed = right.high[0] ?? right.normal[0];
    return leftSeed.subjectSortKey - rightSeed.subjectSortKey;
  });

  return [
    ...roundRobinKnowledgePoints(orderedSubjects.map((bucket) => sortKnowledgePoints(bucket.high))),
    ...roundRobinKnowledgePoints(orderedSubjects.map((bucket) => sortKnowledgePoints(bucket.normal))),
  ];
}

function roundRobinKnowledgePoints(groups: KnowledgePointSeed[][]) {
  const queues = groups.map((group) => [...group]);
  const ordered: KnowledgePointSeed[] = [];
  let hasRemainingItems = true;

  while (hasRemainingItems) {
    hasRemainingItems = false;

    queues.forEach((queue) => {
      const next = queue.shift();
      if (!next) {
        return;
      }

      ordered.push(next);
      hasRemainingItems = true;
    });
  }

  return ordered;
}

function sortKnowledgePoints(points: KnowledgePointSeed[]) {
  return [...points].sort((left, right) => {
    if (left.chapterOrder !== right.chapterOrder) {
      return left.chapterOrder - right.chapterOrder;
    }

    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.knowledgePoint.localeCompare(right.knowledgePoint, "zh-CN");
  });
}

function assignTaskToBestDay({
  scheduledDays,
  earliestDayIndex,
  latestDayIndex,
  preferredDayIndex,
  estimatedMinutes,
  config,
}: {
  scheduledDays: ScheduleDay[];
  earliestDayIndex: number;
  latestDayIndex: number;
  preferredDayIndex: number;
  estimatedMinutes: number;
  config: ResolvedStudyPlanGeneratorConfig;
}) {
  const safeStart = clamp(earliestDayIndex, 0, scheduledDays.length - 1);
  const safeEnd = clamp(Math.max(latestDayIndex, safeStart), safeStart, scheduledDays.length - 1);
  const safePreferred = clamp(preferredDayIndex, safeStart, safeEnd);

  const candidateIndexes = buildCandidateIndexes(safeStart, safeEnd, safePreferred);
  const withinLimitIndex = candidateIndexes.find((index) => {
    const day = scheduledDays[index];
    return (
      day.tasks.length < config.maxDailyTasks &&
      day.totalEstimatedMinutes + estimatedMinutes <= config.maxDailyMinutes
    );
  });

  if (withinLimitIndex !== undefined) {
    return withinLimitIndex;
  }

  return candidateIndexes.reduce((bestIndex, currentIndex) => {
    const bestDay = scheduledDays[bestIndex];
    const currentDay = scheduledDays[currentIndex];
    const bestScore = calculateDayScore(bestDay, estimatedMinutes, config, safePreferred);
    const currentScore = calculateDayScore(currentDay, estimatedMinutes, config, safePreferred);
    return currentScore < bestScore ? currentIndex : bestIndex;
  }, candidateIndexes[0]);
}

function buildCandidateIndexes(start: number, end: number, preferred: number) {
  const indexes: number[] = [];
  for (let offset = 0; preferred - offset >= start || preferred + offset <= end; offset += 1) {
    const left = preferred - offset;
    const right = preferred + offset;

    if (left >= start) {
      indexes.push(left);
    }

    if (right <= end && right !== left) {
      indexes.push(right);
    }
  }

  return indexes;
}

function calculateDayScore(
  day: ScheduleDay,
  estimatedMinutes: number,
  config: ResolvedStudyPlanGeneratorConfig,
  preferredDayIndex: number,
) {
  const nextTaskCount = day.tasks.length + 1;
  const nextMinutes = day.totalEstimatedMinutes + estimatedMinutes;
  const taskLoadRatio = nextTaskCount / config.maxDailyTasks;
  const minuteLoadRatio = nextMinutes / config.maxDailyMinutes;
  const distancePenalty = Math.abs(day.dayIndex - preferredDayIndex) * 0.01;

  return taskLoadRatio + minuteLoadRatio + distancePenalty;
}

function createTask({
  knowledgePoint,
  studyStage,
  estimatedMinutes,
  date,
  dayIndex,
}: {
  knowledgePoint: KnowledgePointSeed;
  studyStage: StudyStage;
  estimatedMinutes: number;
  date: string;
  dayIndex: number;
}): StudyPlanTask {
  return {
    id: `${knowledgePoint.knowledgePointId}-${studyStage}`,
    date,
    dayIndex,
    subjectId: knowledgePoint.subjectId,
    subject: knowledgePoint.subject,
    chapterId: knowledgePoint.chapterId,
    chapter: knowledgePoint.chapter,
    knowledgePointId: knowledgePoint.knowledgePointId,
    knowledgePoint: knowledgePoint.knowledgePoint,
    studyStage,
    estimatedMinutes,
    status: "pending",
    priority: knowledgePoint.priority,
  };
}

function addTaskToDay(day: ScheduleDay, task: StudyPlanTask) {
  day.tasks.push(task);
  day.totalEstimatedMinutes += task.estimatedMinutes;
}

function createScheduleDays(startDate: string, durationDays: number): ScheduleDay[] {
  const start = normalizeDate(startDate);
  return Array.from({ length: durationDays }, (_, dayIndex) => ({
    date: formatDate(addDays(start, dayIndex)),
    dayIndex,
    tasks: [],
    totalEstimatedMinutes: 0,
  }));
}

function buildSummary(tasks: StudyPlanTask[], days: StudyDayPlan[]): StudyPlanSummary {
  const tasksByStage: Record<StudyStage, number> = {
    initial: 0,
    review: 0,
    intensive: 0,
  };
  const tasksByPriority: Record<PriorityLevel, number> = {
    high_priority: 0,
    normal: 0,
  };
  const subjectMap = new Map<string, { subjectId: string; subject: string; taskCount: number; estimatedMinutes: number }>();

  tasks.forEach((task) => {
    tasksByStage[task.studyStage] += 1;
    tasksByPriority[task.priority] += 1;

    const subjectSummary = subjectMap.get(task.subjectId) ?? {
      subjectId: task.subjectId,
      subject: task.subject,
      taskCount: 0,
      estimatedMinutes: 0,
    };
    subjectSummary.taskCount += 1;
    subjectSummary.estimatedMinutes += task.estimatedMinutes;
    subjectMap.set(task.subjectId, subjectSummary);
  });

  const totalEstimatedMinutes = tasks.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0,
  );

  return {
    totalTasks: tasks.length,
    totalDays: days.length,
    totalEstimatedMinutes,
    averageTasksPerDay: roundToOneDecimal(tasks.length / Math.max(days.length, 1)),
    averageMinutesPerDay: roundToOneDecimal(totalEstimatedMinutes / Math.max(days.length, 1)),
    tasksByStage,
    tasksByPriority,
    tasksBySubject: [...subjectMap.values()].sort((left, right) => left.subject.localeCompare(right.subject, "zh-CN")),
  };
}

function resolveSubjectSortKey(subject: SyllabusSubject, fallbackIndex: number) {
  const code = Number(subject.subject_code);
  return Number.isFinite(code) ? code : fallbackIndex + 1000;
}

function formatSubjectName(subject: SyllabusSubject) {
  return subject.subject_code
    ? `${subject.subject_code} ${subject.subject_name}`
    : subject.subject_name;
}

function normalizeDate(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));

  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${value}`);
  }

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
