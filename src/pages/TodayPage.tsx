import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";
import { TaskCard } from "../components/study/TaskCard";
import { useStudyApp } from "../app/StudyAppProvider";

export function TodayPage() {
  const { today, todayTasks, todayCompletionRate, toggleTask } = useStudyApp();
  const completedCount = todayTasks.filter((task) => task.completed).length;
  const totalMinutes = todayTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow="今日任务"
        title="今天的学习安排"
        description={`日期：${formatDateLabel(today)}，先完成最重要的知识点。`}
      />

      <SectionCard title="今日进度" hint={`${completedCount}/${todayTasks.length || 0} 已完成`}>
        <div className="dashboard-grid dashboard-grid--hero">
          <div className="metric-card metric-card--primary">
            <strong>{todayCompletionRate}%</strong>
            <span>今日完成率</span>
          </div>
          <div className="metric-card">
            <strong>{todayTasks.length}</strong>
            <span>今日任务数</span>
          </div>
          <div className="metric-card">
            <strong>{totalMinutes}</strong>
            <span>预计总时长 / 分钟</span>
          </div>
        </div>
        <div className="progress-strip">
          <div className="progress-strip__bar">
            <div style={{ width: `${todayCompletionRate}%` }} />
          </div>
          <span>{todayCompletionRate}%</span>
        </div>
      </SectionCard>

      <SectionCard title="今日任务列表" hint={todayTasks.length ? "可直接勾选完成" : "今天暂无任务"}>
        {todayTasks.length ? (
          <div className="task-list">
            {todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>今天没有安排任务</strong>
            <span>可以去学习计划页查看后续安排，或在设置页重新生成计划。</span>
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
