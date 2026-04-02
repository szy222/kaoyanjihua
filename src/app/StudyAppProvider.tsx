import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import defaultStudyPlan from "../data/study-plan.json";
import syllabusData from "../data/syllabus.json";
import { readStorage, writeStorage } from "../services/storage";
import {
  generateStudyPlan,
  type SyllabusData,
} from "../services/studyPlan";
import type { StudyPlan, StudyPlanTask } from "../types/study";

type TaskRecord = {
  completed: boolean;
  completedAt: string | null;
};

type StudySettings = {
  examDate: string;
  maxDailyMinutes: number;
  maxDailyTasks: number;
};

type AppTask = StudyPlanTask & {
  completed: boolean;
  completedAt: string | null;
};

type SubjectProgressItem = {
  subjectId: string;
  subject: string;
  completedCount: number;
  totalCount: number;
  progress: number;
};

type RecentStudyItem = {
  date: string;
  label: string;
  completedCount: number;
  completedMinutes: number;
};

type KnowledgeLibraryItem = {
  knowledgePointId: string;
  subjectId: string;
  subject: string;
  chapterId: string;
  chapter: string;
  knowledgePoint: string;
  priority: "high_priority" | "normal";
  completedStageCount: number;
  totalStageCount: number;
  completed: boolean;
};

type StudyStats = {
  totalTasks: number;
  completedTasks: number;
  totalCompletionRate: number;
  subjectProgress: SubjectProgressItem[];
  recentSevenDays: RecentStudyItem[];
  completedTaskCount: number;
  streakDays: number;
};

type StudyAppContextValue = {
  today: string;
  plan: StudyPlan;
  settings: StudySettings;
  tasks: AppTask[];
  todayTasks: AppTask[];
  todayCompletionRate: number;
  stats: StudyStats;
  knowledgeLibrary: KnowledgeLibraryItem[];
  planDates: string[];
  syllabus: SyllabusData;
  getTasksByDate: (date: string) => AppTask[];
  toggleTask: (taskId: string, completed: boolean) => void;
  regeneratePlan: (nextSettings: StudySettings) => void;
  resetAllRecords: () => void;
};

const PLAN_STORAGE_KEY = "kaoyan-study-plan";
const SETTINGS_STORAGE_KEY = "kaoyan-study-settings";
const RECORDS_STORAGE_KEY = "kaoyan-study-records";

const typedDefaultStudyPlan = defaultStudyPlan as StudyPlan;
const typedSyllabusData = syllabusData as SyllabusData;
const today = formatLocalDate(new Date());

const defaultSettings: StudySettings = {
  examDate: typedDefaultStudyPlan.config.endDate,
  maxDailyMinutes: typedDefaultStudyPlan.config.maxDailyMinutes,
  maxDailyTasks: typedDefaultStudyPlan.config.maxDailyTasks,
};

const StudyAppContext = createContext<StudyAppContextValue | null>(null);

export function StudyAppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<StudyPlan>(() =>
    readStorage<StudyPlan>(PLAN_STORAGE_KEY, typedDefaultStudyPlan),
  );
  const [settings, setSettings] = useState<StudySettings>(() =>
    readStorage<StudySettings>(SETTINGS_STORAGE_KEY, defaultSettings),
  );
  const [records, setRecords] = useState<Record<string, TaskRecord>>(() =>
    readStorage<Record<string, TaskRecord>>(RECORDS_STORAGE_KEY, {}),
  );

  const tasks = useMemo(() => mergeTaskRecords(plan.tasks, records), [plan.tasks, records]);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, AppTask[]>();

    tasks.forEach((task) => {
      const bucket = map.get(task.date) ?? [];
      bucket.push(task);
      map.set(task.date, bucket);
    });

    map.forEach((bucket) => {
      bucket.sort((left, right) => {
        if (left.completed !== right.completed) {
          return Number(left.completed) - Number(right.completed);
        }

        return left.subject.localeCompare(right.subject, "zh-CN");
      });
    });

    return map;
  }, [tasks]);

  const todayTasks = tasksByDate.get(today) ?? [];
  const todayCompletionRate = calculateCompletionRate(todayTasks);
  const knowledgeLibrary = useMemo(() => buildKnowledgeLibrary(tasks), [tasks]);
  const stats = useMemo(() => buildStats(tasks, records), [tasks, records]);

  const value: StudyAppContextValue = {
    today,
    plan,
    settings,
    tasks,
    todayTasks,
    todayCompletionRate,
    stats,
    knowledgeLibrary,
    planDates: plan.days.map((day) => day.date),
    syllabus: typedSyllabusData,
    getTasksByDate(date: string) {
      return tasksByDate.get(date) ?? [];
    },
    toggleTask(taskId: string, completed: boolean) {
      const task = taskMap.get(taskId);
      if (!task) {
        return;
      }

      setRecords((currentRecords) => {
        const nextRecords = {
          ...currentRecords,
          [taskId]: {
            completed,
            completedAt: completed ? `${today}T12:00:00` : null,
          },
        };
        writeStorage(RECORDS_STORAGE_KEY, nextRecords);
        return nextRecords;
      });
    },
    regeneratePlan(nextSettings: StudySettings) {
      const nextPlan = generateStudyPlan(typedSyllabusData, {
        startDate: plan.config.startDate,
        examDate: nextSettings.examDate,
        maxDailyMinutes: nextSettings.maxDailyMinutes,
        maxDailyTasks: nextSettings.maxDailyTasks,
      });

      const validTaskIds = new Set(nextPlan.tasks.map((task) => task.id));
      const nextRecords = Object.fromEntries(
        Object.entries(records).filter(([taskId, record]) => record.completed && validTaskIds.has(taskId)),
      );

      setPlan(nextPlan);
      setSettings(nextSettings);
      setRecords(nextRecords);
      writeStorage(PLAN_STORAGE_KEY, nextPlan);
      writeStorage(SETTINGS_STORAGE_KEY, nextSettings);
      writeStorage(RECORDS_STORAGE_KEY, nextRecords);
    },
    resetAllRecords() {
      setRecords({});
      writeStorage(RECORDS_STORAGE_KEY, {});
    },
  };

  return <StudyAppContext.Provider value={value}>{children}</StudyAppContext.Provider>;
}

export function useStudyApp() {
  const context = useContext(StudyAppContext);

  if (!context) {
    throw new Error("useStudyApp must be used within StudyAppProvider");
  }

  return context;
}

function mergeTaskRecords(tasks: StudyPlanTask[], records: Record<string, TaskRecord>) {
  return tasks.map((task) => {
    const record = records[task.id];
    return {
      ...task,
      completed: record?.completed ?? false,
      completedAt: record?.completedAt ?? null,
    };
  });
}

function buildKnowledgeLibrary(tasks: AppTask[]): KnowledgeLibraryItem[] {
  const map = new Map<string, KnowledgeLibraryItem>();

  tasks.forEach((task) => {
    const existing = map.get(task.knowledgePointId);

    if (!existing) {
      map.set(task.knowledgePointId, {
        knowledgePointId: task.knowledgePointId,
        subjectId: task.subjectId,
        subject: task.subject,
        chapterId: task.chapterId,
        chapter: task.chapter,
        knowledgePoint: task.knowledgePoint,
        priority: task.priority,
        completedStageCount: task.completed ? 1 : 0,
        totalStageCount: 1,
        completed: task.completed,
      });
      return;
    }

    existing.completedStageCount += task.completed ? 1 : 0;
    existing.totalStageCount += 1;
    existing.completed = existing.completedStageCount === existing.totalStageCount;
  });

  return [...map.values()].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority === "high_priority" ? -1 : 1;
    }

    if (left.subject !== right.subject) {
      return left.subject.localeCompare(right.subject, "zh-CN");
    }

    if (left.chapter !== right.chapter) {
      return left.chapter.localeCompare(right.chapter, "zh-CN");
    }

    return left.knowledgePoint.localeCompare(right.knowledgePoint, "zh-CN");
  });
}

function buildStats(tasks: AppTask[], records: Record<string, TaskRecord>): StudyStats {
  const completedTasks = tasks.filter((task) => task.completed);
  const subjectMap = new Map<string, SubjectProgressItem>();

  tasks.forEach((task) => {
    const bucket = subjectMap.get(task.subjectId) ?? {
      subjectId: task.subjectId,
      subject: task.subject,
      completedCount: 0,
      totalCount: 0,
      progress: 0,
    };

    bucket.totalCount += 1;
    if (task.completed) {
      bucket.completedCount += 1;
    }
    bucket.progress = roundPercentage((bucket.completedCount / bucket.totalCount) * 100);
    subjectMap.set(task.subjectId, bucket);
  });

  const recentSevenDays = buildRecentSevenDays(tasks, records);

  return {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    totalCompletionRate: roundPercentage((completedTasks.length / Math.max(tasks.length, 1)) * 100),
    subjectProgress: [...subjectMap.values()].sort((left, right) => left.subject.localeCompare(right.subject, "zh-CN")),
    recentSevenDays,
    completedTaskCount: completedTasks.length,
    streakDays: calculateStreak(records),
  };
}

function buildRecentSevenDays(tasks: AppTask[], records: Record<string, TaskRecord>) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const items: RecentStudyItem[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset);
    let completedCount = 0;
    let completedMinutes = 0;

    Object.entries(records).forEach(([taskId, record]) => {
      if (!record.completed || !record.completedAt?.startsWith(date)) {
        return;
      }

      completedCount += 1;
      completedMinutes += taskMap.get(taskId)?.estimatedMinutes ?? 0;
    });

    items.push({
      date,
      label: date.slice(5),
      completedCount,
      completedMinutes,
    });
  }

  return items;
}

function calculateStreak(records: Record<string, TaskRecord>) {
  const completedDates = new Set(
    Object.values(records)
      .filter((record) => record.completed && record.completedAt)
      .map((record) => record.completedAt!.slice(0, 10)),
  );

  let streak = 0;
  let cursor = today;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function calculateCompletionRate(tasks: AppTask[]) {
  if (tasks.length === 0) {
    return 0;
  }

  return roundPercentage((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(value: string, dayOffset: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + dayOffset);
  return formatLocalDate(date);
}

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}
