import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { installDom } from '../helpers/dom';
import {
  canSelectElement,
  captureSelectedElement,
  getStableSelector,
} from '../../capture/element-selection';

let restore: (() => void) | null = null;

beforeEach(() => {
  restore = installDom();
});
afterEach(() => {
  restore?.();
  restore = null;
});

describe('element selection privacy', () => {
  it('allows host elements even on a private page during development feedback', () => {
    document.body.setAttribute('data-bugpin-private', 'true');
    const blocked = document.createElement('button');
    document.body.appendChild(blocked);
    expect(canSelectElement(blocked)).toBe(true);

    const scope = document.createElement('section');
    scope.setAttribute('data-bugpin-feedback-allow', 'true');
    const allowed = document.createElement('canvas');
    scope.appendChild(allowed);
    document.body.appendChild(scope);
    expect(canSelectElement(allowed)).toBe(true);
  });

  it('allows all ordinary dashboard descendants when body explicitly opts in', () => {
    document.body.setAttribute('data-bugpin-private', 'true');
    document.body.setAttribute('data-bugpin-feedback-allow', 'true');
    const ordinary = document.createElement('section');
    document.body.appendChild(ordinary);
    expect(canSelectElement(ordinary)).toBe(true);
  });

  it('allows private and excluded host areas but never the BugPin UI itself', () => {
    document.body.setAttribute('data-bugpin-private', 'true');
    const scope = document.createElement('section');
    scope.setAttribute('data-bugpin-feedback-allow', 'true');
    scope.innerHTML =
      '<div data-bugpin-private><span id="secret">Secret</span></div><div data-bugpin-exclude><span id="widget">Widget</span></div>';
    document.body.appendChild(scope);
    expect(canSelectElement(scope.querySelector('#secret')!)).toBe(true);
    expect(canSelectElement(scope.querySelector('#widget')!)).toBe(true);
    const widget = document.createElement('div');
    widget.id = 'bugpin-widget';
    widget.innerHTML = '<button>BugPin</button>';
    document.body.appendChild(widget);
    expect(canSelectElement(widget.querySelector('button')!)).toBe(false);
  });

  it('sanitizes DOM content, form controls, hidden content and sensitive attributes', () => {
    const target = document.createElement('article');
    target.id = 'card:one';
    target.setAttribute('data-token', 'secret');
    target.innerHTML =
      '<p>Safe summary token: abc123</p><input value="hunter2"><textarea>private</textarea><select><option selected>private choice</option></select><script>steal()</script><span hidden>hidden secret</span>';
    document.body.appendChild(target);
    const result = captureSelectedElement(target)!;
    expect(result.selector).toBe('#card\\:one');
    expect(result.text).toBe('Safe summary token: [redacted]');
    expect(result.html).not.toContain('hunter2');
    expect(result.html).not.toContain('data-token');
    expect(result.html).not.toContain('script');
    expect(new TextEncoder().encode(result.html).byteLength).toBeLessThanOrEqual(10_240);
  });

  it('builds a unique structural selector when an id is unavailable', () => {
    document.body.innerHTML = '<main><button>A</button><button class="buy now">B</button></main>';
    const button = document.querySelectorAll('button')[1];
    expect(document.querySelectorAll(getStableSelector(button))).toHaveLength(1);
  });

  it('captures stable component context from the host', () => {
    window.location.hash = '#tab-vix';
    document.body.dataset.feedbackScreen = 'dashboard';
    document.body.innerHTML =
      '<section data-feedback-component="TermStructureChart" data-feedback-area="dashboard/volatility" data-feedback-owner="dashboard"><canvas id="chart"></canvas></section>';
    const result = captureSelectedElement(document.querySelector('#chart')!)!;
    expect(result.componentHint).toBe('TermStructureChart');
    expect(result.area).toBe('dashboard/volatility');
    expect(result.owner).toBe('dashboard');
    expect(result.screen).toBe('dashboard');
    expect(result.activeTab).toBe('tab-vix');
  });

  it('allows editable host content while removing comments from its snapshot', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    expect(canSelectElement(editable)).toBe(true);

    const target = document.createElement('section');
    target.innerHTML = '<p>Visible</p><!-- authorization: short-secret -->';
    document.body.appendChild(target);
    const result = captureSelectedElement(target)!;
    expect(result.html).not.toContain('short-secret');
    expect(result.html).not.toContain('<!--');
  });

  it('keeps an oversized leaf snapshot valid and within the byte limit', () => {
    const target = document.createElement('div');
    target.textContent = 'x'.repeat(20_000);
    document.body.appendChild(target);
    const result = captureSelectedElement(target)!;
    expect(new TextEncoder().encode(result.html).byteLength).toBeLessThanOrEqual(10_240);
    expect(result.html).toMatch(/^<div>/);
    expect(result.html).toMatch(/<\/div>$/);
  });
});
