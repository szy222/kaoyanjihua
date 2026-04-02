import type { DailyTask, SubjectProgress, WeekStudyRecord } from "../types/study";

export const todayTasks: DailyTask[] = [
  {
    id: "task-001",
    subject: "804 计算机综合",
    chapter: "第一章 计算机与计算思维基础",
    knowledgePoint: "计算机的诞生与分代",
    estimatedMinutes: 45,
    completed: false,
  },
  {
    id: "task-002",
    subject: "750 生物医学信息学综合",
    chapter: "第四章 生物信息学基础",
    knowledgePoint: "序列比对与 BLAST",
    estimatedMinutes: 60,
    completed: true,
  },
  {
    id: "task-003",
    subject: "804 计算机综合",
    chapter: "第五章 数据库技术基础",
    knowledgePoint: "SQL Server 查询设计",
    estimatedMinutes: 40,
    completed: false,
  },
];

export const subjectProgress: SubjectProgress[] = [
  { subject: "804 计算机综合", completedCount: 18, totalCount: 72, progress: 25 },
  { subject: "750 生物医学信息学综合", completedCount: 26, totalCount: 104, progress: 25 },
];

export const weekStudyRecords: WeekStudyRecord[] = [
  { date: "03-27", minutes: 90 },
  { date: "03-28", minutes: 120 },
  { date: "03-29", minutes: 150 },
  { date: "03-30", minutes: 80 },
  { date: "03-31", minutes: 110 },
  { date: "04-01", minutes: 160 },
  { date: "04-02", minutes: 105 },
];

export const syllabusPreview = [
  {
    subject: "804 计算机综合",
    chapters: [
      "第一章 计算机与计算思维基础",
      "第三章 操作系统基础",
      "第五章 数据库技术基础",
      "第七章 程序设计基础",
    ],
  },
  {
    subject: "750 生物医学信息学综合",
    chapters: [
      "第一章 生物医学卫生信息学概述",
      "第四章 生物信息学基础",
      "第五章 生物医学统计学",
      "第九章 临床信息学",
    ],
  },
];
