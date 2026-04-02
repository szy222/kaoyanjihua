import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const MATERIALS_DIR = path.join(ROOT_DIR, "materials");
const OUTPUT_FILE = path.join(ROOT_DIR, "src", "data", "syllabus.json");

const COMMON_TERMS_REGEX =
  /(计算|数据|信息|系统|程序|网络|编码|数据库|操作|服务|医学|生物|卫生|健康|医院|标准|统计|医疗|伦理|安全|概述|定义|发展|应用|结构|功能|原理|设计|技术|规范|采集|分析|存储|使用|命令|挑战|平台|模型|方法|关系|图像|历史|管理|文件|字符|语言|对象|智能|输入|输出|函数|算法|队列|数组|树|排序|路径|矩阵|递归|回溯|互联网|逻辑|服务器|局域网|病毒|攻击|大数据|云计算|物联网|虚拟|视图|角色|权限|查询|关系图|表的|主机|总线|接口|设备|数制|压缩|图像|声音|互联网|Shell|Linux|Windows|SQL|Server|Python|Biopython|Bioconductor|远程|移动|智慧医院|电子病历|公共卫生|妇幼|因果|贝叶斯|组学|序列|档案|临床|影像|通信|隐私|法律|政策)/;

const NOISE_LINE_REGEX =
  /^(?:PAGE|default|intro|LINK\d*|Root Entry|WordDocument|SummaryInformation|DocumentSummaryInformation|CompObj|commondata|普通表格|批注|页眉|默认段落字体|普通\(网站\)|湯整瑮呟灹獥)/i;

main();

function main() {
  const sourceFiles = fs
    .readdirSync(MATERIALS_DIR)
    .filter((fileName) => /\.(docx?|DOCX?)$/.test(fileName))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));

  if (sourceFiles.length === 0) {
    throw new Error("materials/ 目录下没有可处理的考试大纲文件。");
  }

  const subjectBuckets = new Map();

  for (const fileName of sourceFiles) {
    const filePath = path.join(MATERIALS_DIR, fileName);
    const meta = parseSourceMeta(fileName);
    const rawText = extractRawText(filePath);
    const contentSection = extractContentSection(rawText);
    const chapters = parseChapters(contentSection, meta);

    const subjectKey = meta.subject_code ?? meta.subject_name;
    const existing = subjectBuckets.get(subjectKey) ?? {
      subject_id: meta.subject_id,
      subject_code: meta.subject_code,
      subject_name: meta.subject_name,
      years_present: [],
      source_files: [],
      chapter_map: new Map(),
    };

    existing.years_present = uniqueSorted([...existing.years_present, meta.year]);
    existing.source_files.push({
      year: meta.year,
      file_name: fileName,
      file_type: path.extname(fileName).slice(1).toLowerCase(),
      relative_path: toPosixPath(path.relative(ROOT_DIR, filePath)),
    });

    mergeChaptersIntoSubject(existing.chapter_map, chapters);
    subjectBuckets.set(subjectKey, existing);
  }

  const subjects = [...subjectBuckets.values()]
    .map(finalizeSubject)
    .sort((left, right) =>
      `${left.subject_code}${left.subject_name}`.localeCompare(
        `${right.subject_code}${right.subject_name}`,
        "zh-CN",
      ),
    );

  const output = {
    generated_at: new Date().toISOString(),
    source_directory: "materials",
    extraction_version: 1,
    subjects,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
}

function parseSourceMeta(fileName) {
  const yearMatch = fileName.match(/(20\d{2})/);
  const titleMatch = fileName.match(/《([^》]+)》/);

  if (!yearMatch || !titleMatch) {
    throw new Error(`无法从文件名识别年份或科目: ${fileName}`);
  }

  const subjectLabel = titleMatch[1].trim();
  const codeMatch = subjectLabel.match(/^(\d+)/);
  const subjectCode = codeMatch ? codeMatch[1] : null;
  const subjectName = normalizeDisplayText(
    subjectCode ? subjectLabel.slice(subjectCode.length) : subjectLabel,
  );

  return {
    year: Number(yearMatch[1]),
    subject_code: subjectCode,
    subject_name: subjectName,
    subject_id: subjectCode ? `subject-${subjectCode}` : createId("subject", subjectName),
  };
}

function extractRawText(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".docx") {
    return extractDocxText(filePath);
  }

  if (extension === ".doc") {
    return extractDocText(filePath);
  }

  throw new Error(`暂不支持的文件类型: ${filePath}`);
}

function extractDocxText(filePath) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "syllabus-docx-"));
  const zipPath = path.join(tempRoot, "source.zip");
  const unpackDir = path.join(tempRoot, "unzipped");

  try {
    fs.copyFileSync(filePath, zipPath);
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath '${escapePowerShell(
          zipPath,
        )}' -DestinationPath '${escapePowerShell(unpackDir)}' -Force`,
      ],
      { stdio: "ignore" },
    );

    const documentXmlPath = path.join(unpackDir, "word", "document.xml");
    const xml = fs.readFileSync(documentXmlPath, "utf8");
    const text = decodeXmlEntities(
      xml
        .replace(/<w:tab[^>]*\/>/g, "\t")
        .replace(/<(?:w:br|w:cr|w:lastRenderedPageBreak)\b[^>]*\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, ""),
    );

    return normalizePlainText(text);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function extractDocText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const chunks = extractUtf16Chunks(buffer);
  const text = normalizePlainText(chunks.join("\n"));
  return text;
}

function extractUtf16Chunks(buffer) {
  const results = [];
  let current = "";

  for (let index = 0; index + 1 < buffer.length; index += 2) {
    const codePoint = buffer.readUInt16LE(index);

    if (isLikelyDocCharacter(codePoint)) {
      current += String.fromCharCode(codePoint);
      continue;
    }

    pushChunk(results, current);
    current = "";
  }

  pushChunk(results, current);
  return results;
}

function isLikelyDocCharacter(codePoint) {
  return (
    codePoint === 9 ||
    codePoint === 10 ||
    codePoint === 13 ||
    codePoint === 32 ||
    (codePoint >= 0x30 && codePoint <= 0x39) ||
    (codePoint >= 0x41 && codePoint <= 0x5a) ||
    (codePoint >= 0x61 && codePoint <= 0x7a) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0x3000 && codePoint <= 0x303f) ||
    (codePoint >= 0xff00 && codePoint <= 0xffef) ||
    "《》()（）【】、，。；：-./X".includes(String.fromCharCode(codePoint))
  );
}

function pushChunk(target, value) {
  const stripped = value.replace(/\s+/g, "");

  if (stripped.length >= 4) {
    target.push(value);
  }
}

function normalizePlainText(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractContentSection(rawText) {
  const text = normalizePlainText(rawText);
  const startMarkers = [/Ⅴ\s*[.、]?\s*考查内容/, /Ⅳ\s*[.、]?\s*考查内容/, /考查内容/];
  const endMarkers = [/参考教材/, /参考书目/];

  let startIndex = -1;
  let matchedLength = 0;

  for (const marker of startMarkers) {
    const match = marker.exec(text);
    if (match) {
      startIndex = match.index;
      matchedLength = match[0].length;
      break;
    }
  }

  if (startIndex === -1) {
    throw new Error("未找到“考查内容”章节。");
  }

  let endIndex = text.length;

  for (const marker of endMarkers) {
    const match = marker.exec(text.slice(startIndex + matchedLength));
    if (match) {
      endIndex = startIndex + matchedLength + match.index;
      break;
    }
  }

  return text.slice(startIndex + matchedLength, endIndex).trim();
}

function parseChapters(contentSection, meta) {
  const normalized = normalizeContentSection(contentSection);
  const lines = buildStructuredLines(normalized);

  const chapters = [];
  let currentChapter = null;
  let currentPrimaryTopic = null;

  for (const line of lines) {
    if (isChapterLine(line)) {
      currentChapter = createChapter(meta, chapters.length + 1, line);
      chapters.push(currentChapter);
      currentPrimaryTopic = null;
      continue;
    }

    if (isPrimaryTopicLine(line)) {
      if (!currentChapter) {
        currentChapter = createChapter(meta, 1, "未分章内容");
        chapters.push(currentChapter);
      }

      currentPrimaryTopic = createPrimaryTopic(
        meta,
        currentChapter,
        currentChapter.primary_topics.length + 1,
        line,
      );
      currentChapter.primary_topics.push(currentPrimaryTopic);
      currentChapter.primary_topic_map.set(currentPrimaryTopic.normalized_title, currentPrimaryTopic);

      for (const inlineSecondaryTitle of currentPrimaryTopic.inline_secondary_titles) {
        const inlineSecondaryTopic = createSecondaryTopic(
          meta,
          currentChapter,
          currentPrimaryTopic,
          currentPrimaryTopic.secondary_topics.length + 1,
          inlineSecondaryTitle,
          false,
        );
        currentPrimaryTopic.secondary_topics.push(inlineSecondaryTopic);
        currentPrimaryTopic.secondary_topic_map.set(
          inlineSecondaryTopic.normalized_title,
          inlineSecondaryTopic,
        );
      }

      continue;
    }

    if (isSecondaryTopicLine(line) && currentPrimaryTopic) {
      const secondaryTopic = createSecondaryTopic(
        meta,
        currentChapter,
        currentPrimaryTopic,
        currentPrimaryTopic.secondary_topics.length + 1,
        line,
      );
      currentPrimaryTopic.secondary_topics.push(secondaryTopic);
      currentPrimaryTopic.secondary_topic_map.set(secondaryTopic.normalized_title, secondaryTopic);
      continue;
    }

    if (!currentPrimaryTopic) {
      continue;
    }

    if (shouldAppendToPrevious(currentPrimaryTopic, line)) {
      const lastSecondary = currentPrimaryTopic.secondary_topics.at(-1);

      if (lastSecondary) {
        lastSecondary.topic_title = normalizeDisplayText(
          `${lastSecondary.topic_title}${line}`,
        );
        lastSecondary.normalized_title = normalizeMatchText(lastSecondary.topic_title);
      } else {
        currentPrimaryTopic.topic_title = normalizeDisplayText(
          `${currentPrimaryTopic.topic_title}${line}`,
        );
        currentPrimaryTopic.normalized_title = normalizeMatchText(currentPrimaryTopic.topic_title);
      }

      continue;
    }

    const syntheticSecondaryTopic = createSecondaryTopic(
      meta,
      currentChapter,
      currentPrimaryTopic,
      currentPrimaryTopic.secondary_topics.length + 1,
      line,
      true,
    );
    currentPrimaryTopic.secondary_topics.push(syntheticSecondaryTopic);
    currentPrimaryTopic.secondary_topic_map.set(
      syntheticSecondaryTopic.normalized_title,
      syntheticSecondaryTopic,
    );
  }

  return chapters;
}

function normalizeContentSection(contentSection) {
  return contentSection
    .replace(/\r\n?/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/(第[一二三四五六七八九十百0-9]+章[^\n]*?)(?=\d+[.、])/g, "$1\n")
    .replace(/([^\n])(\d+[.、])/g, "$1\n$2")
    .replace(/([^\n])([（(]\d+[）)])/g, "$1\n$2")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function buildStructuredLines(content) {
  const rawLines = content
    .split("\n")
    .map((line) => normalizeDisplayText(line))
    .filter(Boolean);

  const structured = [];

  for (const line of rawLines) {
    if (NOISE_LINE_REGEX.test(line) || !looksMeaningful(line)) {
      continue;
    }

    if (structured.length === 0) {
      structured.push(line);
      continue;
    }

    if (!isMarkerLine(line)) {
      const previous = structured.at(-1);

      if (previous && shouldJoinLooseLine(previous, line)) {
        structured[structured.length - 1] = normalizeDisplayText(`${previous}${line}`);
        continue;
      }
    }

    structured.push(line);
  }

  return structured;
}

function looksMeaningful(line) {
  if (!line) {
    return false;
  }

  if (isMarkerLine(line)) {
    return true;
  }

  if (/[A-Za-z]/.test(line)) {
    return true;
  }

  if (/[，。；：、]/.test(line)) {
    return true;
  }

  if (COMMON_TERMS_REGEX.test(line)) {
    return true;
  }

  return false;
}

function shouldJoinLooseLine(previous, current) {
  if (!previous || !current) {
    return false;
  }

  if (/[，。；：、]$/.test(previous)) {
    return false;
  }

  if (current.length > 8) {
    return false;
  }

  if (/[，。；：、]/.test(current)) {
    return false;
  }

  return true;
}

function shouldAppendToPrevious(primaryTopic, line) {
  const lastSecondary = primaryTopic.secondary_topics.at(-1);
  const previous = lastSecondary?.topic_title ?? primaryTopic.topic_title;

  if (!previous) {
    return false;
  }

  if (line.length > 8) {
    return false;
  }

  if (/[，。；：、]/.test(line)) {
    return false;
  }

  return !/[，。；：、]$/.test(previous);
}

function isMarkerLine(line) {
  return isChapterLine(line) || isPrimaryTopicLine(line) || isSecondaryTopicLine(line);
}

function isChapterLine(line) {
  return /^第[一二三四五六七八九十百0-9]+章/.test(line);
}

function isPrimaryTopicLine(line) {
  return /^\d+[.、]/.test(line);
}

function isSecondaryTopicLine(line) {
  return /^[（(]\d+[）)]/.test(line);
}

function createChapter(meta, order, rawLine) {
  const chapterTitle = normalizeDisplayText(rawLine);
  const normalizedTitle = normalizeMatchText(chapterTitle);

  return {
    chapter_id: `${meta.subject_id}-chapter-${String(order).padStart(2, "0")}`,
    chapter_order: order,
    chapter_title: chapterTitle,
    normalized_title: normalizedTitle,
    years_present: [meta.year],
    source_refs: [
      {
        year: meta.year,
        chapter_title: chapterTitle,
      },
    ],
    primary_topics: [],
    primary_topic_map: new Map(),
  };
}

function createPrimaryTopic(meta, chapter, order, rawLine) {
  const parsedPrimaryTopic = extractInlineSecondaryTitles(
    normalizeDisplayText(rawLine.replace(/^\d+[.\u3001]\s*/, "")),
  );
  const topicTitle = parsedPrimaryTopic.primary_title;
  const normalizedTitle = normalizeMatchText(topicTitle);

  return {
    topic_id: `${chapter.chapter_id}-topic-${String(order).padStart(2, "0")}` ,
    topic_order: order,
    topic_title: topicTitle,
    normalized_title: normalizedTitle,
    priority: "normal",
    years_present: [meta.year],
    source_refs: [
      {
        year: meta.year,
        chapter_title: chapter.chapter_title,
        raw_title: topicTitle,
      },
    ],
    secondary_topics: [],
    secondary_topic_map: new Map(),
    inline_secondary_titles: parsedPrimaryTopic.secondary_titles,
  };
}

function createSecondaryTopic(meta, chapter, primaryTopic, order, rawLine, synthetic = false) {
  const topicTitle = normalizeDisplayText(rawLine.replace(/^[（(]?\d+[）).、]?\s*/, ""));
  const normalizedTitle = normalizeMatchText(topicTitle);

  return {
    topic_id: `${primaryTopic.topic_id}-subtopic-${String(order).padStart(2, "0")}`,
    topic_order: order,
    topic_title: topicTitle,
    normalized_title: normalizedTitle,
    priority: "normal",
    years_present: [meta.year],
    source_refs: [
      {
        year: meta.year,
        chapter_title: chapter.chapter_title,
        primary_topic_title: primaryTopic.topic_title,
        raw_title: topicTitle,
      },
    ],
    synthetic,
  };
}

function mergeChaptersIntoSubject(chapterMap, incomingChapters) {
  for (const incomingChapter of incomingChapters) {
    const chapterKey = incomingChapter.normalized_title;
    const existingChapter = chapterMap.get(chapterKey);

    if (!existingChapter) {
      chapterMap.set(chapterKey, incomingChapter);
      continue;
    }

    existingChapter.chapter_order = Math.min(existingChapter.chapter_order, incomingChapter.chapter_order);
    existingChapter.years_present = uniqueSorted([
      ...existingChapter.years_present,
      ...incomingChapter.years_present,
    ]);
    existingChapter.source_refs = dedupeRefs([
      ...existingChapter.source_refs,
      ...incomingChapter.source_refs,
    ]);

    for (const incomingPrimaryTopic of incomingChapter.primary_topics) {
      const primaryKey = incomingPrimaryTopic.normalized_title;
      const existingPrimaryTopic = existingChapter.primary_topic_map.get(primaryKey);

      if (!existingPrimaryTopic) {
        existingChapter.primary_topics.push(incomingPrimaryTopic);
        existingChapter.primary_topic_map.set(primaryKey, incomingPrimaryTopic);
        continue;
      }

      existingPrimaryTopic.topic_order = Math.min(
        existingPrimaryTopic.topic_order,
        incomingPrimaryTopic.topic_order,
      );
      existingPrimaryTopic.years_present = uniqueSorted([
        ...existingPrimaryTopic.years_present,
        ...incomingPrimaryTopic.years_present,
      ]);
      existingPrimaryTopic.source_refs = dedupeRefs([
        ...existingPrimaryTopic.source_refs,
        ...incomingPrimaryTopic.source_refs,
      ]);

      for (const incomingSecondaryTopic of incomingPrimaryTopic.secondary_topics) {
        const secondaryKey = incomingSecondaryTopic.normalized_title;
        const existingSecondaryTopic = existingPrimaryTopic.secondary_topic_map.get(secondaryKey);

        if (!existingSecondaryTopic) {
          existingPrimaryTopic.secondary_topics.push(incomingSecondaryTopic);
          existingPrimaryTopic.secondary_topic_map.set(secondaryKey, incomingSecondaryTopic);
          continue;
        }

        existingSecondaryTopic.topic_order = Math.min(
          existingSecondaryTopic.topic_order,
          incomingSecondaryTopic.topic_order,
        );
        existingSecondaryTopic.synthetic =
          existingSecondaryTopic.synthetic && incomingSecondaryTopic.synthetic;
        existingSecondaryTopic.years_present = uniqueSorted([
          ...existingSecondaryTopic.years_present,
          ...incomingSecondaryTopic.years_present,
        ]);
        existingSecondaryTopic.source_refs = dedupeRefs([
          ...existingSecondaryTopic.source_refs,
          ...incomingSecondaryTopic.source_refs,
        ]);
      }
    }
  }
}

function finalizeSubject(subject) {
  const chapters = [...subject.chapter_map.values()]
    .sort((left, right) => left.chapter_order - right.chapter_order)
    .map((chapter) => {
      const primaryTopics = chapter.primary_topics
        .sort((left, right) => left.topic_order - right.topic_order)
        .map((primaryTopic) => {
          const secondaryTopics = primaryTopic.secondary_topics
            .sort((left, right) => left.topic_order - right.topic_order)
            .map((secondaryTopic) => ({
              topic_id: secondaryTopic.topic_id,
              topic_order: secondaryTopic.topic_order,
              topic_title: secondaryTopic.topic_title,
              priority:
                secondaryTopic.years_present.length >= 2 ? "high_priority" : "normal",
              years_present: uniqueSorted(secondaryTopic.years_present),
              source_refs: dedupeRefs(secondaryTopic.source_refs),
              synthetic: secondaryTopic.synthetic,
            }));

          return {
            topic_id: primaryTopic.topic_id,
            topic_order: primaryTopic.topic_order,
            topic_title: primaryTopic.topic_title,
            priority: primaryTopic.years_present.length >= 2 ? "high_priority" : "normal",
            years_present: uniqueSorted(primaryTopic.years_present),
            source_refs: dedupeRefs(primaryTopic.source_refs),
            secondary_topics: secondaryTopics,
          };
        });

      return {
        chapter_id: chapter.chapter_id,
        chapter_order: chapter.chapter_order,
        chapter_title: chapter.chapter_title,
        years_present: uniqueSorted(chapter.years_present),
        source_refs: dedupeRefs(chapter.source_refs),
        primary_topics: primaryTopics,
      };
    });

  return {
    subject_id: subject.subject_id,
    subject_code: subject.subject_code,
    subject_name: subject.subject_name,
    years_present: uniqueSorted(subject.years_present),
    source_files: subject.source_files.sort((left, right) => left.year - right.year),
    chapters,
  };
}


function extractInlineSecondaryTitles(topicTitle) {
  const includeToken = '包括';
  const includeIndex = topicTitle.indexOf(includeToken);

  if (includeIndex !== -1) {
    const primaryTitle = normalizeDisplayText(topicTitle.slice(0, includeIndex));
    const detailText = topicTitle.slice(includeIndex + includeToken.length);

    if (/、/.test(detailText)) {
      return {
        primary_title: primaryTitle.replace(/[，、]$/, ''),
        secondary_titles: splitSecondaryList(detailText),
      };
    }
  }

  const colonParts = topicTitle.split(/：/);

  if (colonParts.length === 2 && /、/.test(colonParts[1])) {
    return {
      primary_title: normalizeDisplayText(colonParts[0]),
      secondary_titles: splitSecondaryList(colonParts[1]),
    };
  }

  return {
    primary_title: topicTitle,
    secondary_titles: [],
  };
}

function splitSecondaryList(value) {
  return value
    .split(/[、；]/)
    .map((item) => normalizeDisplayText(item))
    .map((item) => item.replace(/^[：，]/, '').trim())
    .filter(Boolean);
}

function normalizeDisplayText(value) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .replace(/[．]/g, ".")
    .replace(/[。]+$/, "")
    .trim();
}

function normalizeMatchText(value) {
  return normalizeDisplayText(value)
    .toLowerCase()
    .replace(/[《》【】（）()、，。；：:,.·\-\s]/g, "")
    .replace(/sql\s*server/g, "sqlserver")
    .replace(/windows/g, "windows")
    .replace(/linux/g, "linux");
}

function createId(prefix, value) {
  return `${prefix}-${normalizeMatchText(value).slice(0, 40)}`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function dedupeRefs(refs) {
  const seen = new Set();
  const result = [];

  for (const ref of refs) {
    const key = JSON.stringify(ref);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(ref);
  }

  return result;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function escapePowerShell(value) {
  return value.replace(/'/g, "''");
}

function decodeXmlEntities(value) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
