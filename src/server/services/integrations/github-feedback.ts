import type { Report, ReportType } from '@shared/types';

const headings: Record<ReportType, string> = {
  bug: 'Bug Report',
  ui: 'UI Change',
  improvement: 'Improvement',
  feature: 'Feature Request',
};

export function feedbackHeading(report: Report): string {
  return headings[report.type ?? 'bug'];
}

export function feedbackTitle(report: Report): string {
  const title = report.title.replace(/^\[(BUG|UI|IMPROVEMENT|FEATURE)\]\s*/i, '');
  return `[${(report.type ?? 'bug').toUpperCase()}] ${title}`.slice(0, 256);
}

// A captured string may itself contain Markdown fences. Use a longer fence so
// neither DOM nor selectors can escape their code block in a forwarded issue.
function codeBlock(value: string, language = ''): string {
  const runs = value.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
  return `${fence}${language}\n${value}\n${fence}`;
}

export function feedbackSections(report: Report): string {
  const sections: string[] = [];
  const element = report.selectedElement;
  sections.push(
    `## Developer Brief\n\n${[
      `**Goal:** ${report.requestedChange || report.description || report.title}`,
      `**Report type:** ${feedbackHeading(report)}`,
      element?.componentHint ? `**Component:** \`${element.componentHint}\`` : null,
      element?.area ? `**Area:** \`${element.area}\`` : null,
      element?.screen ? `**Screen:** \`${element.screen}\`` : null,
      element?.activeTab ? `**Active tab:** \`${element.activeTab}\`` : null,
      element?.selector ? `**Selected element:** \`${element.selector}\`` : null,
      '**Implementation approach:** inspect the report evidence, make the smallest coherent change, then complete the verification checklist.',
    ]
      .filter(Boolean)
      .join('\n\n')}`
  );
  for (const [heading, value] of [
    ['Requested Change', report.requestedChange],
    ['Expected Result', report.expectedResult],
    ['Acceptance Criteria', report.acceptanceCriteria],
  ]) {
    if (value) sections.push(`### ${heading}\n\n${value}`);
  }
  if (element) {
    const { x, y, width, height } = element.rect;
    sections.push(
      `### Selected Element\n\n${codeBlock(
        [
          `Selector: ${element.selector}`,
          `Component: ${element.componentHint || '(not supplied)'}`,
          `Area: ${element.area || '(not supplied)'}`,
          `Owner: ${element.owner || '(not supplied)'}`,
          `Screen: ${element.screen || '(not supplied)'}`,
          `Active tab: ${element.activeTab || '(not supplied)'}`,
          `Tag: ${element.tagName}`,
          `ID: ${element.id || '(none)'}`,
          `Classes: ${element.classes.join(' ') || '(none)'}`,
          `Visible text: ${element.text}`,
          `Position: x=${x}, y=${y}, width=${width}, height=${height}`,
        ].join('\n')
      )}\n\nDOM:\n\n${codeBlock(element.html, 'html')}`
    );
  }
  const verification = [
    '- [ ] Verify the selected interaction on desktop',
    '- [ ] Verify mobile or narrow viewport behavior',
  ];
  if (report.type === 'ui' || report.type === 'improvement')
    verification.push('- [ ] Confirm the existing data and related interactions still work');
  sections.push(`### Verification\n\n${verification.join('\n')}`);
  return sections.length ? `\n${sections.join('\n\n')}\n` : '';
}
