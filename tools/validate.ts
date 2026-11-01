import { existsSync } from 'node:fs';
import { abs, CHANNEL_FILE, descriptionFor, formatProblem, listSlugs, loadChannel, loadVideo } from './lib/load.ts';
import { checkChannel, checkChapters, checkDescription, checkTags, checkTitle } from './lib/rules.ts';
import type { Problem } from './lib/rules.ts';
import type { Meta } from './lib/schema.ts';

const REQUIRED_FILES: Record<Meta['status'], string[]> = {
  idea: [],
  draft: ['script.md'],
  scripted: ['script.md'],
  recorded: ['script.md', 'description.md', 'chapters.yaml'],
  published: ['script.md', 'description.md', 'chapters.yaml', 'writeup.md'],
};

const problems: Problem[] = [];

const channel = loadChannel(problems);
if (channel) problems.push(...checkChannel(channel, CHANNEL_FILE));

const slugs = listSlugs();
for (const slug of slugs) {
  const dir = `videos/${slug}`;
  const video = loadVideo(slug, problems);
  if (!video) continue;

  const metaFile = `${dir}/meta.yaml`;
  problems.push(...checkTitle(video.meta.title, metaFile), ...checkTags(video.meta, metaFile));

  for (const name of REQUIRED_FILES[video.meta.status]) {
    if (!existsSync(abs(`${dir}/${name}`))) {
      problems.push({ file: `${dir}/${name}`, message: `is required when status is ${video.meta.status}` });
    }
  }
  if (video.chapters) problems.push(...checkChapters(video.chapters, `${dir}/chapters.yaml`));
  if (channel && video.body !== undefined) {
    problems.push(...checkDescription(descriptionFor(video, channel), `${dir}/description.md`));
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'} found:\n`);
  for (const problem of problems) console.error(`  ${formatProblem(problem)}`);
  process.exit(1);
}
console.log(`OK: channel and ${slugs.length} video${slugs.length === 1 ? '' : 's'} are valid.`);
