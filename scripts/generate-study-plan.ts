import fs from "node:fs";
import path from "node:path";

import syllabus from "../src/data/syllabus.json" with { type: "json" };
import { createDefaultStudyPlan } from "../src/services/studyPlan.ts";

const outputPath = path.join(process.cwd(), "src", "data", "study-plan.json");
const defaultStartDate = process.env.STUDY_PLAN_START_DATE ?? "2026-04-03";

const plan = createDefaultStudyPlan(syllabus, defaultStartDate);

fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
console.log(`Study plan generated: ${outputPath}`);
console.log(`Start date: ${plan.config.startDate}`);
console.log(`End date: ${plan.config.endDate}`);
console.log(`Total tasks: ${plan.summary.totalTasks}`);
console.log(`Average tasks per day: ${plan.summary.averageTasksPerDay}`);
console.log(`Average minutes per day: ${plan.summary.averageMinutesPerDay}`);
