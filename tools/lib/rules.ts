import type { Channel, Chapter, Meta } from './schema.ts';

export interface Problem {
  file: string;
  field?: string;
  message: string;
}

export const LIMITS = {
  title: 100,
  description: 5000,
  tags: 500,
  channelDescription: 1000,
  channelKeywords: 500,
  minChapters: 3,
  minChapterSeconds: 10,
} as const;

export const toSeconds = (time: string) =>
  time.split(':').reduce((total, part) => total * 60 + Number(part), 0);

const hasAngleBrackets = (text: string) => /[<>]/.test(text);

export function checkTitle(title: string, file: string): Problem[] {
  const problems: Problem[] = [];
  if ([...title].length > LIMITS.title) {
    problems.push({ file, field: 'title', message: `is ${[...title].length} characters, limit is ${LIMITS.title}` });
  }
  if (hasAngleBrackets(title)) {
    problems.push({ file, field: 'title', message: 'cannot contain < or >' });
  }
  return problems;
}

// YouTube counts a multi-word tag as if it were quoted, plus a comma between tags.
export function tagsLength(tags: string[]) {
  const quoted = tags.reduce((total, tag) => total + [...tag].length + (tag.includes(' ') ? 2 : 0), 0);
  return quoted + Math.max(tags.length - 1, 0);
}

export function checkTags(meta: Meta, file: string): Problem[] {
  const length = tagsLength(meta.tags);
  return length > LIMITS.tags
    ? [{ file, field: 'tags', message: `total ${length} characters, limit is ${LIMITS.tags}` }]
    : [];
}

export function checkDescription(text: string, file: string): Problem[] {
  const problems: Problem[] = [];
  const length = [...text].length;
  if (length > LIMITS.description) {
    problems.push({
      file,
      message: `built description is ${length} characters, limit is ${LIMITS.description} (chapters and footer count too)`,
    });
  }
  for (const line of text.split('\n')) {
    if (hasAngleBrackets(line)) {
      problems.push({ file, message: `built description cannot contain < or >, found in: ${line.trim()}` });
    }
  }
  return problems;
}

// The last chapter's length needs the video's duration, which isn't in the repo, so it isn't checked.
export function checkChapters(chapters: Chapter[], file: string): Problem[] {
  const problems: Problem[] = [];
  if (chapters.length < LIMITS.minChapters) {
    problems.push({ file, field: 'chapters', message: `has ${chapters.length}, YouTube needs at least ${LIMITS.minChapters}` });
  }
  if (chapters[0] && toSeconds(chapters[0].time) !== 0) {
    problems.push({ file, field: 'chapters[0].time', message: `must be 00:00, got ${chapters[0].time}` });
  }
  chapters.slice(1).forEach((chapter, index) => {
    const gap = toSeconds(chapter.time) - toSeconds(chapters[index].time);
    const field = `chapters[${index + 1}].time`;
    if (gap <= 0) {
      problems.push({ file, field, message: `${chapter.time} must come after ${chapters[index].time}` });
    } else if (gap < LIMITS.minChapterSeconds) {
      problems.push({
        file,
        field: `chapters[${index}]`,
        message: `"${chapters[index].title}" is ${gap}s long, minimum is ${LIMITS.minChapterSeconds}s`,
      });
    }
  });
  return problems;
}

export function formatKeywords(keywords: string[]) {
  return keywords.map((keyword) => (keyword.includes(' ') ? `"${keyword}"` : keyword)).join(' ');
}

export function checkChannel(channel: Channel, file: string): Problem[] {
  const problems: Problem[] = [];
  if ([...channel.description].length > LIMITS.channelDescription) {
    problems.push({ file, field: 'description', message: `limit is ${LIMITS.channelDescription} characters` });
  }
  if (hasAngleBrackets(channel.description)) {
    problems.push({ file, field: 'description', message: 'cannot contain < or >' });
  }
  if ([...formatKeywords(channel.keywords)].length > LIMITS.channelKeywords) {
    problems.push({ file, field: 'keywords', message: `limit is ${LIMITS.channelKeywords} characters in total` });
  }
  return problems;
}
