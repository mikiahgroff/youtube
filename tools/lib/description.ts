import type { Channel, Chapter, Meta } from './schema.ts';
import { githubEditUrl, videoPageUrl } from './urls.ts';

export interface DescriptionInput {
  meta: Meta;
  body: string;
  chapters: Chapter[];
  channel: Channel;
}

export function buildDescription({ meta, body, chapters, channel }: DescriptionInput): string {
  const sections = [body.replace(/\r\n/g, '\n').trim()];

  if (chapters.length > 0) {
    sections.push(['Chapters:', ...chapters.map((c) => `${c.time} ${c.title}`)].join('\n'));
  }

  if (meta.corrections.length > 0) {
    const lines = meta.corrections.map((c) => `- ${c.timestamp ? `${c.timestamp} ` : ''}${c.text}`);
    sections.push(['Corrections:', ...lines].join('\n'));
  }

  const credits = [...new Set([...meta.corrections.flatMap((c) => c.credit ?? []), ...meta.contributors])];
  if (credits.length > 0) {
    sections.push(`Corrections by ${credits.map((user) => `@${user}`).join(', ')}`);
  }

  sections.push(
    [
      `Write-up: ${videoPageUrl(channel, meta.slug)}`,
      `Found a mistake? Edit on GitHub: ${githubEditUrl(channel, `videos/${meta.slug}/description.md`)}`,
      ...channel.links.map((link) => `${link.label}: ${link.url}`),
    ].join('\n'),
  );

  return sections.filter(Boolean).join('\n\n');
}
