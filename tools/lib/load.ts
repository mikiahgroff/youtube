import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { z } from 'zod';
import { buildDescription } from './description.ts';
import type { Problem } from './rules.ts';
import { channelSchema, chaptersSchema, metaSchema } from './schema.ts';
import type { Channel, Chapter, Meta } from './schema.ts';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const CHANNEL_FILE = 'channel/channel.yaml';

export const abs = (file: string) => join(ROOT, file);

export function loadYaml<S extends z.ZodType>(file: string, schema: S, problems: Problem[]): z.output<S> | undefined {
  let data: unknown;
  try {
    data = parse(readFileSync(abs(file), 'utf8'));
  } catch (error) {
    problems.push({ file, message: `could not parse: ${(error as Error).message}` });
    return undefined;
  }
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    problems.push({ file, field: issue.path.join('.') || undefined, message: issue.message });
  }
  return undefined;
}

export const loadChannel = (problems: Problem[]): Channel | undefined =>
  loadYaml(CHANNEL_FILE, channelSchema, problems);

export function listSlugs(): string[] {
  return readdirSync(abs('videos'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export interface Video {
  slug: string;
  meta: Meta;
  chapters?: Chapter[];
  body?: string;
}

export function loadVideo(slug: string, problems: Problem[]): Video | undefined {
  const dir = `videos/${slug}`;
  const metaFile = `${dir}/meta.yaml`;
  if (!existsSync(abs(metaFile))) {
    problems.push({ file: metaFile, message: 'is missing' });
    return undefined;
  }
  const meta = loadYaml(metaFile, metaSchema, problems);
  if (!meta) return undefined;
  if (meta.slug !== slug) {
    problems.push({ file: metaFile, field: 'slug', message: `"${meta.slug}" must match the folder name "${slug}"` });
  }

  const chaptersFile = `${dir}/chapters.yaml`;
  const chapters = existsSync(abs(chaptersFile))
    ? loadYaml(chaptersFile, chaptersSchema, problems)?.chapters
    : undefined;

  const descriptionFile = abs(`${dir}/description.md`);
  const body = existsSync(descriptionFile) ? readFileSync(descriptionFile, 'utf8') : undefined;

  return { slug, meta, chapters, body };
}

export const descriptionFor = (video: Video, channel: Channel) =>
  buildDescription({ meta: video.meta, body: video.body ?? '', chapters: video.chapters ?? [], channel });

export function formatProblem({ file, field, message }: Problem) {
  return `${file}${field ? ` > ${field}` : ''}: ${message}`;
}
