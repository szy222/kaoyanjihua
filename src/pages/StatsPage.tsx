import { useStudyApp } from "../app/StudyAppProvider";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";

export function StatsPage() {
  const { stats } = useStudyApp();
  const maxMinutes = Math.max(...stats.recentSevenDays.map((item) => item.completedMinutes), 1);

  return (
    <div className="page">
      <PageHeader
        eyebrow="进度统计"
        title="整体进度一目了然"
        description="查看总完成率、分科进度、最近 7 天学习情况，以及累计完成与连续打卡。"
      />

      <SectionCard title="总体进度" hint="实时更新">
        <div className="dashboard-grid">
          <div className="metric-card metric-card--primary">
            <strong>{stats.totalCompletionRate}%</strong>
            <span>总完成率</span>
          </div>
          <div className="metric-card">
            <strong>{stats.completedTaskCount}</strong>
            <span>累计完成任务</span>
          </div>
          <div className="metric-card">
            <strong>{stats.streakDays}</strong>
            <span>连续打卡天数</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="各科进度条">
        <div className="progress-list">
          {stats.subjectProgress.map((item) => (
            <div key={item.subjectId} className="progress-row">
              <div className="progress-row__head">
                <span>{item.subject}</span>
                <strong>{item.progress}%</strong>
              </div>
              <div className="progress-row__bar">
                <div style={{ width: `${item.progress}%` }} />
              </div>
              <small>{item.completedCount} / {item.totalCount} 个任务阶段已完成</small>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="最近 7 天学习情况">
        <div className="week-chart">
          {stats.recentSevenDays.map((item) => (
            <div key={item.date} className="week-chart__item">
              <div
                className="week-chart__bar"
                style={{ height: `${Math.max((item.completedMinutes / maxMinutes) * 100, 8)}%` }}
              />
              <span>{item.label}</span>
              <strong>{item.completedMinutes}</strong>
            </div>
          ))}
        </div>
        <div className="week-summary-list">
          {stats.recentSevenDays.map((item) => (
            <div key={item.date} className="week-summary-row">
              <span>{item.label}</span>
              <span>{item.completedCount} 项</span>
              <strong>{item.completedMinutes} 分钟</strong>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
