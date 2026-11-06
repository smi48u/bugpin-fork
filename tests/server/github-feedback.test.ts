import { afterEach, expect, test } from 'bun:test';
import {
  feedbackSections,
  feedbackTitle,
} from '../../src/server/services/integrations/github-feedback';
import {
  createGitHubIssue,
  updateGitHubIssue,
} from '../../src/server/services/integrations/github.service';
import { settingsRepo } from '../../src/server/database/repositories/settings.repo';
import type { Report, ReportType } from '../../src/shared/types';

const report = {
  id: 'rpt_feedback',
  projectId: 'project',
  title: 'Chart height',
  status: 'open',
  priority: 'medium',
  description: 'Original description',
  metadata: {
    url: 'https://mymarg.in/app',
    consoleErrors: [{ type: 'error', message: 'example', timestamp: 'now' }],
  },
  createdAt: '2026-09-07',
  updatedAt: '2026-09-07',
} as Report;
const config = { owner: 'owner', repo: 'repo', accessToken: 'test', labels: ['bugpin'] };
const originalFetch = globalThis.fetch;
const originalSettings = settingsRepo.getAll;
afterEach(() => {
  globalThis.fetch = originalFetch;
  settingsRepo.getAll = originalSettings;
});

test('title prefixes cover every type and old reports without duplication', () => {
  expect(feedbackTitle(report)).toBe('[BUG] Chart height');
  for (const type of ['bug', 'ui', 'improvement', 'feature'] as ReportType[]) {
    expect(feedbackTitle({ ...report, type, title: '[UI] Chart height' })).toBe(
      `[${type.toUpperCase()}] Chart height`
    );
  }
  expect(feedbackSections(report)).toContain('### Verification');
});

test('selected element cannot break out of its Markdown fence', () => {
  const result = feedbackSections({
    ...report,
    selectedElement: {
      selector: '#chart',
      tagName: 'DIV',
      id: 'chart',
      classes: ['chart'],
      text: 'Chart',
      rect: { x: 1, y: 2, width: 3, height: 4 },
      html: '<div>```\n# fake heading</div>',
    },
  });
  expect(result).toContain('````html\n<div>```\n# fake heading</div>\n````');
  expect(result).toContain('width=3, height=4');
});

for (const labelStatus of [200, 404, 403, 500]) {
  test(`forward preserves full context when label lookup returns ${labelStatus}`, async () => {
    settingsRepo.getAll = async () => ({ appUrl: 'https://bugpin.home' }) as never;
    const requests: Array<{ title: string; body: string; labels: string[] }> = [];
    globalThis.fetch = (async (url, init) => {
      if (String(url).includes('/labels/'))
        return new Response(JSON.stringify({ name: 'ui' }), { status: labelStatus });
      requests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({ number: 1, html_url: 'https://github.com/owner/repo/issues/1' }),
        { status: 201 }
      );
    }) as typeof fetch;
    const result = await createGitHubIssue(
      {
        ...report,
        type: 'ui',
        requestedChange: 'Reduce height',
        expectedResult: 'Readable chart',
        acceptanceCriteria: '- responsive',
      },
      config
    );
    expect(result.success).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0].title).toBe('[UI] Chart height');
    expect(requests[0].labels).toEqual(labelStatus === 200 ? ['bugpin', 'ui'] : ['bugpin']);
    for (const value of [
      'Reduce height',
      'Readable chart',
      '- responsive',
      'Original description',
      'example',
      'https://bugpin.home/admin/reports/rpt_feedback',
    ])
      expect(requests[0].body).toContain(value);
  });
}

test('label network failure does not block issue creation', async () => {
  settingsRepo.getAll = async () => ({}) as never;
  let posts = 0;
  globalThis.fetch = (async (url) => {
    if (String(url).includes('/labels/')) throw new Error('lookup unavailable');
    posts++;
    return new Response(JSON.stringify({ number: 1, html_url: 'issue' }), { status: 201 });
  }) as typeof fetch;
  expect((await createGitHubIssue({ ...report, type: 'feature' }, config)).success).toBe(true);
  expect(posts).toBe(1);
});

test('updating an issue uses the same feedback formatter', async () => {
  settingsRepo.getAll = async () => ({}) as never;
  let payload = { title: '', body: '' };
  globalThis.fetch = (async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ number: 1 }), { status: 200 });
  }) as typeof fetch;
  await updateGitHubIssue(1, { ...report, type: 'feature', requestedChange: 'Add export' }, config);
  expect(payload.title).toBe('[FEATURE] Chart height');
  expect(payload.body).toContain('Add export');
});
