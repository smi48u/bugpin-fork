import type { SelectedElement } from '@shared/types';
import { redactSensitiveText as redactSharedSensitiveText } from '@shared/privacy';
export type { SelectedElement } from '@shared/types';

const MAX_HTML_BYTES = 10_240;
const MAX_TEXT_LENGTH = 500;
const UNSAFE_ELEMENT =
  'script,style,noscript,template,input,textarea,select,option,iframe,object,embed,[contenteditable]';
const SENSITIVE_NAME =
  /(?:password|passwd|secret|token|auth|session|cookie|credential|api[-_]?key)/i;
const SENSITIVE_TEXT =
  /\b(password|passwd|secret|token|authorization|session|cookie|credential|api[-_ ]?key)\s*[:=]\s*\S+/gi;

function redactSensitiveText(value: string): string {
  return redactSharedSensitiveText(value).replace(SENSITIVE_TEXT, '$1: [redacted]');
}

function safeId(value: string): string {
  return value && value.length <= 200 && !SENSITIVE_NAME.test(value)
    ? redactSensitiveText(value)
    : '';
}

function safeClasses(element: Element): string[] {
  return Array.from(element.classList)
    .filter((name) => name.length <= 50 && !SENSITIVE_NAME.test(name))
    .slice(0, 20)
    .map(redactSensitiveText);
}

function escapeIdentifier(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return value.replace(/(^-?\d)|[^a-zA-Z0-9_-]/g, (match, digit) =>
    digit ? `\\3${digit} ` : `\\${match}`
  );
}

function isHidden(element: Element): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return true;
  const style = element.getAttribute('style') ?? '';
  if (/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style)) return true;
  try {
    const computed = getComputedStyle(element);
    return computed.display === 'none' || computed.visibility === 'hidden';
  } catch {
    return false;
  }
}

export function canSelectElement(element: Element): boolean {
  // Development mode deliberately permits choosing every host element. The
  // widget itself remains excluded so its UI cannot become report context.
  return !element.closest('#bugpin-widget');
}

function sanitizeClone(source: Element): Element {
  const clone = source.cloneNode(true) as Element;
  const sourceNodes = [source, ...Array.from(source.querySelectorAll('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll('*'))];
  for (let i = cloneNodes.length - 1; i >= 0; i--) {
    const node = cloneNodes[i];
    const original = sourceNodes[i];
    if (
      !original ||
      node.matches(UNSAFE_ELEMENT) ||
      (node.hasAttribute('contenteditable') &&
        node.getAttribute('contenteditable')?.toLowerCase() !== 'false') ||
      original.hasAttribute('data-bugpin-private') ||
      original.hasAttribute('data-bugpin-exclude') ||
      isHidden(original)
    ) {
      if (node === clone) {
        // Keep the selected root identifiable, but never retain a form value,
        // executable markup, or the contents of a private/hidden root.
        for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name);
        node.textContent = '';
        continue;
      }
      node.remove();
      continue;
    }
    for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name);
    const id = safeId(original.id);
    const classes = safeClasses(original);
    if (id) node.setAttribute('id', id);
    if (classes.length) node.setAttribute('class', classes.join(' '));
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent)
        child.textContent = redactSensitiveText(child.textContent);
    }
  }
  const walker = document.createTreeWalker(clone, window.NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.forEach((comment) => comment.remove());
  return clone;
}

export function getStableSelector(element: Element): string {
  if (safeId(element.id)) {
    const byId = `#${escapeIdentifier(element.id)}`;
    try {
      if (document.querySelectorAll(byId).length === 1) return byId;
    } catch {
      /* fall through */
    }
  }

  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();
    const classes = safeClasses(current).slice(0, 3);
    if (classes.length) part += classes.map((name) => `.${escapeIdentifier(name)}`).join('');
    const parent: Element | null = current.parentElement;
    if (parent) {
      const peers: Element[] = Array.from(parent.children);
      const sameTag = peers.filter((child: Element) => child.tagName === current!.tagName);
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    const candidate = parts.join(' > ');
    try {
      if (candidate.length <= 1024 && document.querySelectorAll(candidate).length === 1)
        return candidate;
    } catch {
      /* keep adding ancestors */
    }
    current = parent;
  }
  const structural: string[] = [];
  current = element;
  while (current && current !== document.documentElement) {
    const parent: Element | null = current.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current) + 1 : 1;
    structural.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;
  }
  const result = structural.join(' > ');
  return result.length <= 1024 ? result : element.tagName.toLowerCase();
}

export function captureSelectedElement(element: Element): SelectedElement | null {
  if (!canSelectElement(element)) return null;
  const sanitized = sanitizeClone(element);
  const rect = element.getBoundingClientRect();
  const text = redactSensitiveText(sanitized.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
  while (
    new TextEncoder().encode(sanitized.outerHTML).byteLength > MAX_HTML_BYTES &&
    sanitized.lastChild
  ) {
    sanitized.lastChild.remove();
  }
  // A leaf can itself contain a large text node. Shrink text in the cloned DOM
  // rather than slicing serialized markup into invalid HTML.
  while (new TextEncoder().encode(sanitized.outerHTML).byteLength > MAX_HTML_BYTES) {
    const value = sanitized.textContent ?? '';
    if (!value) return null;
    sanitized.textContent = value.slice(0, Math.max(0, value.length - 256));
  }
  const context = element.closest<HTMLElement>('[data-feedback-component]');
  const screen = document.body.dataset.feedbackScreen;
  const activeTab = window.location.hash.replace(/^#/, '').slice(0, 128);
  return {
    selector: getStableSelector(element),
    tagName: element.tagName.toLowerCase(),
    id: safeId(element.id) || undefined,
    classes: safeClasses(element),
    text,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    html: sanitized.outerHTML,
    componentHint: context?.dataset.feedbackComponent?.slice(0, 128) || undefined,
    area: context?.dataset.feedbackArea?.slice(0, 128) || undefined,
    owner: context?.dataset.feedbackOwner?.slice(0, 128) || undefined,
    screen: screen?.slice(0, 128) || undefined,
    activeTab: activeTab || undefined,
  };
}
