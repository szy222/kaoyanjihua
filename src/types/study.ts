export type DailyTask = {
  id: string;
  subject: string;
  chapter: string;
  knowledgePoint: string;
  estimatedMinutes: number;
  completed: boolean;
};

export type StudyStage = "initial" | "review" | "intensive";

export type StudyTaskStatus = "pending" | "completed";

export type StudyPlanTask = {
  id: string;
  date: string;
  dayIndex: number;
  subjectId: string;
  subject: string;
  chapterId: string;
  chapter: string;
  knowledgePointId: string;
  knowledgePoint: string;
  studyStage: StudyStage;
  estimatedMinutes: number;
  status: StudyTaskStatus;
  priority: "high_priority" | "normal";
};

export type StudyDayPlan = {
  date: string;
  dayIndex: number;
  taskCount: number;
  totalEstimatedMinutes: number;
  tasks: StudyPlanTask[];
};

export type StudyPlanGeneratorConfig = {
  startDate: string;
  durationDays?: number;
  examDate?: string;
  maxDailyTasks?: number;
  maxDailyMinutes?: number;
  reviewGapDays?: number;
  intensiveGapDays?: number;
  stageDurations?: Record<StudyStage, number>;
};

export type ResolvedStudyPlanGeneratorConfig = {
  startDate: string;
  endDate: string;
  durationDays: number;
  maxDailyTasks: number;
  maxDailyMinutes: number;
  reviewGapDays: number;
  intensiveGapDays: number;
  stageDurations: Record<StudyStage, number>;
};

export type StudyPlanSummary = {
  totalTasks: number;
  totalDays: number;
  totalEstimatedMinutes: number;
  averageTasksPerDay: number;
  averageMinutesPerDay: number;
  tasksByStage: Record<StudyStage, number>;
  tasksByPriority: Record<"high_priority" | "normal", number>;
  tasksBySubject: Array<{
    subjectId: string;
    subject: string;
    taskCount: number;
    estimatedMinutes: number;
  }>;
};

export type StudyPlan = {
  generatedAt: string;
  source: string;
  config: ResolvedStudyPlanGeneratorConfig;
  summary: StudyPlanSummary;
  days: StudyDayPlan[];
  tasks: StudyPlanTask[];
};

export type SubjectProgress = {
  subject: string;
  completedCount: number;
  totalCount: number;
  progress: number;
};

export type WeekStudyRecord = {
  date: string;
  minutes: number;
};
