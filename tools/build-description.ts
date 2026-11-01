import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { abs, descriptionFor, formatProblem, listSlugs, loadChannel, loadVideo, ROOT } from './lib/load.ts';
import type { Problem } from './lib/rules.ts';
import type { Channel } from './lib/schema.ts';

function build(slug: string, channel: Channel): string {
  const problems: Problem[] = [];
  const video = loadVideo(slug, problems);
  if (!video || video.body === undefined || problems.length > 0) {
    if (video && video.body === undefined) problems.push({ file: `videos/${slug}/description.md`, message: 'is missing' });
    throw new Error(problems.map(formatProblem).join('\n'));
  }
  return descriptionFor(video, channel);
}

function changedSlugs(base: string): string[] {
  const output = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', 'videos/'], { cwd: ROOT, encoding: 'utf8' });
  const changed = new Set(output.split('\n').flatMap((line) => line.match(/^videos\/([^/]+)\//)?.[1] ?? []));
  return listSlugs().filter((slug) => changed.has(slug));
}

function fenced(text: string) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
}

// Markdown for the PR comment: one section per changed video, errors shown in place.
function pullRequestPreview(slugs: string[], channel: Channel) {
  const sections = slugs.map((slug) => {
    try {
      const text = build(slug, channel);
      return `<details open><summary><code>${slug}</code> (${[...text].length} characters)</summary>\n\n${fenced(text)}\n\n</details>`;
    } catch (error) {
      return `<code>${slug}</code> could not be built:\n\n${fenced((error as Error).message)}`;
    }
  });
  return ['### Description preview', ...sections].join('\n\n');
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { changed: { type: 'string' }, out: { type: 'string' } },
});

const problems: Problem[] = [];
const channel = loadChannel(problems);
if (!channel) {
  console.error(problems.map(formatProblem).join('\n'));
  process.exit(1);
}

if (values.changed) {
  const slugs = changedSlugs(values.changed);
  if (slugs.length === 0) {
    console.log('No videos changed.');
  } else {
    const markdown = pullRequestPreview(slugs, channel);
    if (values.out) {
      mkdirSync(dirname(abs(values.out)), { recursive: true });
      writeFileSync(abs(values.out), markdown);
    } else {
      console.log(markdown);
    }
  }
} else if (positionals.length === 1) {
  try {
    console.log(build(positionals[0], channel));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
} else {
  console.error('Usage: npm run preview -- <slug>');
  console.error(`Slugs: ${listSlugs().join(', ')}`);
  process.exit(1);
}
