import { useState } from "react";

import { useStudyApp } from "../app/StudyAppProvider";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";

type FilterMode = "all" | "completed" | "pending" | "high_priority";

export function LibraryPage() {
  const { knowledgeLibrary } = useStudyApp();
  const [keyword, setKeyword] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<FilterMode>("all");

  const subjectOptions = [...new Set(knowledgeLibrary.map((item) => item.subject))];
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredItems = knowledgeLibrary.filter((item) => {
    const matchesKeyword =
      !normalizedKeyword ||
      item.subject.toLowerCase().includes(normalizedKeyword) ||
      item.chapter.toLowerCase().includes(normalizedKeyword) ||
      item.knowledgePoint.toLowerCase().includes(normalizedKeyword);
    const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && item.completed) ||
      (statusFilter === "pending" && !item.completed) ||
      (statusFilter === "high_priority" && item.priority === "high_priority");

    return matchesKeyword && matchesSubject && matchesStatus;
  });

  const groupedItems = groupKnowledgeItems(filteredItems);

  return (
    <div className="page">
      <PageHeader
        eyebrow="知识点库"
        title="按科目和章节浏览知识点"
        description="支持关键词搜索和完成状态筛选，方便快速定位重点和查漏补缺。"
      />

      <SectionCard title="筛选条件" hint={`${filteredItems.length} 个知识点`}>
        <div className="filter-grid">
          <input
            className="text-input"
            type="search"
            placeholder="搜索科目、章节、知识点"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select className="select-input" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
            <option value="all">全部科目</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select className="select-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FilterMode)}>
            <option value="all">全部</option>
            <option value="completed">已完成</option>
            <option value="pending">未完成</option>
            <option value="high_priority">高优先级</option>
          </select>
        </div>
      </SectionCard>

      {groupedItems.length ? (
        groupedItems.map((group) => (
          <SectionCard key={`${group.subject}-${group.chapter}`} title={group.chapter} hint={group.subject}>
            <div className="knowledge-list">
              {group.items.map((item) => (
                <article key={item.knowledgePointId} className="knowledge-card">
                  <div className="knowledge-card__topline">
                    <span>{item.subject}</span>
                    <span>{item.completedStageCount}/{item.totalStageCount} 阶段完成</span>
                  </div>
                  <strong>{item.knowledgePoint}</strong>
                  <div className="knowledge-card__footer">
                    <span className={`task-badge ${item.priority === "high_priority" ? "task-badge--priority" : ""}`}>
                      {item.priority === "high_priority" ? "高优先级" : "普通"}
                    </span>
                    <span className={`task-badge ${item.completed ? "task-badge--done" : "task-badge--pending"}`}>
                      {item.completed ? "已完成" : "未完成"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        ))
      ) : (
        <SectionCard title="知识点结果">
          <div className="empty-state">
            <strong>没有找到匹配结果</strong>
            <span>可以试试更短的关键词，或切换筛选条件。</span>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function groupKnowledgeItems(items: ReturnType<typeof useStudyApp>["knowledgeLibrary"]) {
  const map = new Map<string, { subject: string; chapter: string; items: typeof items }>();

  items.forEach((item) => {
    const key = `${item.subject}-${item.chapter}`;
    const bucket = map.get(key) ?? { subject: item.subject, chapter: item.chapter, items: [] };
    bucket.items.push(item);
    map.set(key, bucket);
  });

  return [...map.values()];
}
