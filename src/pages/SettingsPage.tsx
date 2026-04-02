import { useEffect, useState } from "react";

import { useStudyApp } from "../app/StudyAppProvider";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";

export function SettingsPage() {
  const { plan, settings, regeneratePlan, resetAllRecords } = useStudyApp();
  const [examDate, setExamDate] = useState(settings.examDate);
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(settings.maxDailyMinutes);
  const [maxDailyTasks, setMaxDailyTasks] = useState(settings.maxDailyTasks);

  useEffect(() => {
    setExamDate(settings.examDate);
    setMaxDailyMinutes(settings.maxDailyMinutes);
    setMaxDailyTasks(settings.maxDailyTasks);
  }, [settings]);

  const isFormValid = examDate && maxDailyMinutes > 0 && maxDailyTasks > 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="设置"
        title="调整计划和学习强度"
        description="修改考试日期和每日学习量后，可以立即重新生成学习计划；学习记录支持一键重置。"
      />

      <SectionCard title="当前计划信息" hint="已接入本地持久化">
        <div className="settings-list">
          <div className="settings-row">
            <span>计划起始日期</span>
            <strong>{plan.config.startDate}</strong>
          </div>
          <div className="settings-row">
            <span>计划结束日期</span>
            <strong>{plan.config.endDate}</strong>
          </div>
          <div className="settings-row">
            <span>当前计划天数</span>
            <strong>{plan.config.durationDays} 天</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="学习参数">
        <div className="form-grid">
          <label className="form-field">
            <span>考试日期</span>
            <input className="text-input" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
          </label>
          <label className="form-field">
            <span>每日学习总时长（分钟）</span>
            <input
              className="text-input"
              type="number"
              min={60}
              step={10}
              value={maxDailyMinutes}
              onChange={(event) => setMaxDailyMinutes(Number(event.target.value))}
            />
          </label>
          <label className="form-field">
            <span>每日最多任务数</span>
            <input
              className="text-input"
              type="number"
              min={3}
              step={1}
              value={maxDailyTasks}
              onChange={(event) => setMaxDailyTasks(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="button-stack">
          <button
            type="button"
            className="action-button"
            disabled={!isFormValid}
            onClick={() => regeneratePlan({ examDate, maxDailyMinutes, maxDailyTasks })}
          >
            重新生成学习计划
          </button>
          <button type="button" className="action-button action-button--danger" onClick={resetAllRecords}>
            重置所有学习记录
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
