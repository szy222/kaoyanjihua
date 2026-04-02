import { useEffect, useState } from "react";

import { useStudyApp } from "../app/StudyAppProvider";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";
import { TaskCard } from "../components/study/TaskCard";

export function PlanPage() {
  const { today, planDates, getTasksByDate, toggleTask } = useStudyApp();
  const initialDate = planDates.includes(today) ? today : planDates[0] ?? today;
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    if (!planDates.includes(selectedDate)) {
      setSelectedDate(initialDate);
    }
  }, [initialDate, planDates, selectedDate]);

  const tasks = getTasksByDate(selectedDate);
  const completedCount = tasks.filter((task) => task.completed).length;
  const selectedIndex = planDates.indexOf(selectedDate);
  const previousDate = selectedIndex > 0 ? planDates[selectedIndex - 1] : null;
  const nextDate = selectedIndex >= 0 && selectedIndex < planDates.length - 1 ? planDates[selectedIndex + 1] : null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="全部计划"
        title="按日期查看学习安排"
        description="支持查看今天、未来和过往的每日任务，切换日期后会同步显示完成情况。"
      />

      <SectionCard title="日期切换" hint="可看未来任务">
        <div className="date-switcher">
          <button type="button" className="action-button action-button--ghost" onClick={() => previousDate && setSelectedDate(previousDate)} disabled={!previousDate}>
            上一天
          </button>
          <input
            className="date-input"
            type="date"
            value={selectedDate}
            min={planDates[0]}
            max={planDates[planDates.length - 1]}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <button type="button" className="action-button action-button--ghost" onClick={() => nextDate && setSelectedDate(nextDate)} disabled={!nextDate}>
            下一天
          </button>
        </div>
        <div className="plan-day-meta">
          <strong>{formatDateLabel(selectedDate)}</strong>
          <span>{completedCount}/{tasks.length} 已完成</span>
        </div>
      </SectionCard>

      <SectionCard title="当日任务" hint={`${tasks.length} 条安排`}>
        {tasks.length ? (
          <div className="task-list">
            {tasks.map((task) => (
              <TaskCard key={`${task.id}-${task.date}`} task={task} onToggle={toggleTask} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>这一天没有任务</strong>
            <span>请切换其他日期，或在设置页重新生成计划。</span>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}
