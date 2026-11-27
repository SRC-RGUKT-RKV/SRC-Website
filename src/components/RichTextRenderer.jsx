import React from 'react';

const DIVIDER_RE = /^(?:[-*_]{3,}|[━─═—–]{3,})$/;
const HEADING_RE = /^(#{1,4})\s+(.+)$/;
const BULLET_RE = /^(?:[-*+•◦▪])\s+(.+)$/;
const ORDERED_RE = /^(\d+)[.)]\s+(.+)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;

/**
 * Strips common Markdown syntax into clean plain text for compact card previews.
 */
export function stripMarkdown(text = '') {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !DIVIDER_RE.test(line.trim()))
    .join(' ')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi, '$1')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^\w])\*([^*\n]+)\*(?=[^\w]|$)/g, '$1$2')
    .replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely renders inline Markdown (**bold**, __bold__, *italic*, _italic_, `code`,
 * and safe https/http/mailto links) purely as React elements — zero dangerouslySetInnerHTML.
 */
export function renderInlineMarkdown(text = '', tone = 'dark') {
  if (!text) return null;

  const strongClass =
    tone === 'light' ? 'font-semibold text-navy' : 'font-semibold text-paper';
  const codeClass =
    tone === 'light'
      ? 'rounded bg-cream px-1.5 py-0.5 font-mono text-[0.9em] text-maroon'
      : 'rounded bg-navy-dark/80 px-1.5 py-0.5 font-mono text-[0.9em] text-gold-light';
  const linkClass =
    tone === 'light'
      ? 'text-maroon underline decoration-maroon/40 underline-offset-4 hover:text-navy'
      : 'text-gold-light underline decoration-gold/50 underline-offset-4 hover:text-paper';

  // Tokenize links, bold, inline code, and word-boundary italic in one safe left-to-right pass
  const tokenRe =
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|`([^`\n]+?)`|(?<![A-Za-z0-9])\*([^*\n]+?)\*(?![A-Za-z0-9])|(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g;

  const nodes = [];
  let lastIdx = 0;
  let match;
  let keyIdx = 0;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const label = match[1];
      const href = match[2];
      const isExternal = /^https?:\/\//i.test(href);
      nodes.push(
        <a
          key={`lnk-${keyIdx++}`}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
          className={linkClass}
        >
          {label}
        </a>
      );
    } else if (match[3] !== undefined || match[4] !== undefined) {
      nodes.push(
        <strong key={`b-${keyIdx++}`} className={strongClass}>
          {match[3] ?? match[4]}
        </strong>
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        <code key={`c-${keyIdx++}`} className={codeClass}>
          {match[5]}
        </code>
      );
    } else if (match[6] !== undefined || match[7] !== undefined) {
      nodes.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {match[6] ?? match[7]}
        </em>
      );
    }

    lastIdx = tokenRe.lastIndex;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return nodes.length > 0 ? nodes : text;
}

/**
 * Helper to peek the next non-blank trimmed line index from `start`.
 */
function nextNonEmptyIndex(lines, start) {
  let idx = start;
  while (idx < lines.length && lines[idx].trim() === '') {
    idx += 1;
  }
  return idx;
}

/**
 * Parses a Markdown / structured plain-text description into safe AST blocks.
 */
function parseBlocks(source) {
  const lines = String(source || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');

  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // 1. Divider line (---, ***, ━━━) — also detects banner headings wrapped in dividers
    if (DIVIDER_RE.test(trimmed)) {
      const nextIdx = nextNonEmptyIndex(lines, i + 1);
      if (nextIdx < lines.length) {
        const candidate = lines[nextIdx].trim();
        const afterIdx = nextNonEmptyIndex(lines, nextIdx + 1);
        if (
          candidate &&
          !DIVIDER_RE.test(candidate) &&
          !BULLET_RE.test(candidate) &&
          !ORDERED_RE.test(candidate) &&
          afterIdx < lines.length &&
          DIVIDER_RE.test(lines[afterIdx].trim())
        ) {
          blocks.push({ type: 'banner-heading', text: candidate });
          i = afterIdx + 1;
          continue;
        }
      }
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // 2. ATX Markdown headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // 3. Blockquote (> ...)
    if (BLOCKQUOTE_RE.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i].trim())) {
        const m = lines[i].trim().match(BLOCKQUOTE_RE);
        if (m) quoteLines.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // 4. Bulleted list (-, *, +, •)
    if (BULLET_RE.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const lineTrim = lines[i].trim();
        if (!lineTrim) {
          const peek = nextNonEmptyIndex(lines, i + 1);
          if (peek < lines.length && BULLET_RE.test(lines[peek].trim())) {
            i = peek;
            continue;
          }
          break;
        }
        const m = lineTrim.match(BULLET_RE);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 5. Numbered item (1. ... or **1. ...**) — either a numbered section heading with sub-bullets or an ordered list
    const orderedCandidate =
      trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4
        ? trimmed.slice(2, -2).trim()
        : trimmed;
    const orderedMatch = orderedCandidate.match(ORDERED_RE);
    if (orderedMatch) {
      const nextIdx = nextNonEmptyIndex(lines, i + 1);
      if (nextIdx < lines.length && BULLET_RE.test(lines[nextIdx].trim())) {
        // Numbered subheading followed by its bulleted sub-items (e.g. competition + winners)
        const num = orderedMatch[1];
        const title = orderedMatch[2].trim();
        const subItems = [];
        let j = nextIdx;
        while (j < lines.length) {
          const subTrim = lines[j].trim();
          if (!subTrim) break;
          const bm = subTrim.match(BULLET_RE);
          if (!bm) break;
          subItems.push(bm[1].trim());
          j += 1;
        }
        blocks.push({
          type: 'numbered-section',
          number: num,
          title,
          items: subItems,
        });
        i = j;
        continue;
      }

      // Standard ordered list
      const items = [];
      const startNum = Number(orderedMatch[1]) || 1;
      while (i < lines.length) {
        const lineTrim = lines[i].trim();
        if (!lineTrim) {
          const peek = nextNonEmptyIndex(lines, i + 1);
          if (peek < lines.length && ORDERED_RE.test(lines[peek].trim())) {
            // Stop before a numbered line that starts a bulleted section
            const afterPeek = nextNonEmptyIndex(lines, peek + 1);
            if (
              afterPeek < lines.length &&
              BULLET_RE.test(lines[afterPeek].trim())
            ) {
              break;
            }
            i = peek;
            continue;
          }
          break;
        }
        const m = lineTrim.match(ORDERED_RE);
        if (!m) break;
        const afterCur = nextNonEmptyIndex(lines, i + 1);
        if (
          items.length > 0 &&
          afterCur < lines.length &&
          BULLET_RE.test(lines[afterCur].trim())
        ) {
          break;
        }
        items.push(m[2].trim());
        i += 1;
      }
      blocks.push({ type: 'ol', start: startNum, items });
      continue;
    }

    // 6. Regular paragraph (preserves intentional single line breaks inside the paragraph)
    const paraLines = [];
    while (i < lines.length) {
      const lineTrim = lines[i].trim();
      if (
        !lineTrim ||
        DIVIDER_RE.test(lineTrim) ||
        HEADING_RE.test(lineTrim) ||
        BULLET_RE.test(lineTrim) ||
        ORDERED_RE.test(lineTrim) ||
        BLOCKQUOTE_RE.test(lineTrim)
      ) {
        break;
      }
      paraLines.push(lineTrim);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paraLines });
    }
  }

  return blocks;
}

/**
 * Safe, zero-HTML-injection Markdown & structured text renderer styled to the
 * official SRC design system (Navy, Maroon, Gold, Light Gold, Paper, Cream).
 */
export default function RichTextRenderer({
  content = '',
  tone = 'dark',
  className = '',
}) {
  if (!content || !String(content).trim()) return null;

  const blocks = parseBlocks(content);
  const isLight = tone === 'light';

  const bodyText = isLight ? 'text-ink/85' : 'text-paper/85';
  const headingText = isLight ? 'text-navy' : 'text-paper';
  const accentText = isLight ? 'text-maroon' : 'text-gold-light';
  const borderColor = isLight ? 'border-line' : 'border-line/20';

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'hr') {
          return (
            <hr
              key={`hr-${idx}`}
              className={`my-6 border-t ${borderColor}`}
            />
          );
        }

        if (block.type === 'banner-heading') {
          return (
            <div
              key={`bh-${idx}`}
              className={`mt-7 mb-4 flex items-center gap-3 border-y ${
                isLight ? 'border-gold/50 bg-cream/60' : 'border-gold/30 bg-navy-deep/70'
              } px-4 py-3`}
            >
              <span
                className="h-4 w-1 shrink-0 rounded-full bg-maroon"
                aria-hidden="true"
              />
              <h3
                className={`font-display text-sm font-bold uppercase tracking-[0.18em] sm:text-base ${accentText}`}
              >
                {renderInlineMarkdown(block.text, tone)}
              </h3>
            </div>
          );
        }

        if (block.type === 'heading') {
          const levelClasses = {
            1: `mt-6 font-serif text-2xl font-bold tracking-tight sm:text-3xl ${headingText}`,
            2: `mt-6 font-display text-xl font-bold tracking-tight sm:text-2xl ${headingText}`,
            3: `mt-5 font-display text-lg font-bold tracking-tight ${accentText}`,
            4: `mt-4 font-display text-sm font-bold uppercase tracking-[0.16em] ${accentText}`,
          };
          const Tag = block.level <= 2 ? 'h2' : block.level === 3 ? 'h3' : 'h4';
          return (
            <Tag key={`h-${idx}`} className={levelClasses[block.level] || levelClasses[3]}>
              {renderInlineMarkdown(block.text, tone)}
            </Tag>
          );
        }

        if (block.type === 'numbered-section') {
          return (
            <div
              key={`ns-${idx}`}
              className={`rounded-xl border p-4 sm:p-5 ${
                isLight
                  ? 'border-line bg-cream/60'
                  : 'border-line/15 bg-navy-deep/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-sm bg-maroon px-2 font-display text-xs font-bold text-paper">
                  {String(block.number).padStart(2, '0')}
                </span>
                <h4
                  className={`font-display text-sm font-bold uppercase tracking-[0.12em] sm:text-base ${headingText}`}
                >
                  {renderInlineMarkdown(block.title, tone)}
                </h4>
              </div>

              {block.items.length > 0 && (
                <ul className={`mt-3 space-y-1.5 pl-10 text-sm leading-relaxed sm:text-base ${bodyText}`}>
                  {block.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="relative pl-4">
                      <span
                        className="absolute top-2.5 left-0 h-1.5 w-1.5 rounded-full bg-gold"
                        aria-hidden="true"
                      />
                      <span>{renderInlineMarkdown(item, tone)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${idx}`}
              className={`space-y-2 pl-1 text-base leading-relaxed sm:text-[17px] ${bodyText}`}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="relative pl-5">
                  <span
                    className="absolute top-2.5 left-0 h-1.5 w-1.5 rounded-full bg-gold"
                    aria-hidden="true"
                  />
                  <span>{renderInlineMarkdown(item, tone)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol
              key={`ol-${idx}`}
              start={block.start}
              className={`list-decimal space-y-2 pl-6 text-base leading-relaxed marker:font-display marker:font-bold marker:text-gold sm:text-[17px] ${bodyText}`}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-1">
                  {renderInlineMarkdown(item, tone)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={`bq-${idx}`}
              className={`border-l-2 border-gold py-1 pl-4 text-base italic leading-relaxed ${
                isLight ? 'text-ink/80' : 'text-paper/80'
              }`}
            >
              {block.lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {lIdx > 0 && <br />}
                  {renderInlineMarkdown(line, tone)}
                </React.Fragment>
              ))}
            </blockquote>
          );
        }

        // Paragraph with preserved single line breaks
        return (
          <p
            key={`p-${idx}`}
            className={`text-base leading-relaxed sm:text-[17px] ${bodyText}`}
          >
            {block.lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInlineMarkdown(line, tone)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
