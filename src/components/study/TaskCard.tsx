import type { StudyStage } from "../../types/study";

type TaskCardProps = {
  task: {
    id: string;
    subject: string;
    chapter: string;
    knowledgePoint: string;
    estimatedMinutes: number;
    studyStage: StudyStage;
    completed: boolean;
    priority: "high_priority" | "normal";
  };
  onToggle: (taskId: string, completed: boolean) => void;
};

const stageLabelMap: Record<StudyStage, string> = {
  initial: "初学",
  review: "复习",
  intensive: "强化",
};

export function TaskCard({ task, onToggle }: TaskCardProps) {
  return (
    <article className={`task-card ${task.completed ? "task-card--completed" : ""}`}>
      <label className="task-card__check">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={(event) => onToggle(task.id, event.target.checked)}
          aria-label={`切换任务 ${task.knowledgePoint} 的完成状态`}
        />
        <span className="task-card__checkbox" aria-hidden="true" />
      </label>

      <div className="task-card__content">
        <div className="task-card__topline">
          <span className="task-card__subject">{task.subject}</span>
          {task.priority === "high_priority" ? (
            <span className="task-badge task-badge--priority">高优先级</span>
          ) : null}
        </div>

        <h3>{task.knowledgePoint}</h3>
        <p>{task.chapter}</p>

        <div className="task-card__footer">
          <span className="task-badge">{stageLabelMap[task.studyStage]}</span>
          <span className="task-badge">{task.estimatedMinutes} 分钟</span>
          <span className={`task-badge ${task.completed ? "task-badge--done" : "task-badge--pending"}`}>
            {task.completed ? "已完成" : "未完成"}
          </span>
        </div>
      </div>
    </article>
  );
}
