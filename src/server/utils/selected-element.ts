import { parseFragment, serialize } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import type { SelectedElement } from '@shared/types';
import { redactSensitiveText } from '@shared/privacy';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
type ParentNode = DefaultTreeAdapterMap['parentNode'];

const REMOVED_ELEMENTS = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'iframe',
  'object',
  'embed',
  'input',
  'textarea',
  'select',
  'option',
]);
const ALLOWED_ATTRIBUTES = new Set(['id', 'class', 'role']);

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function attr(element: Element, name: string): string | undefined {
  return element.attrs.find((item) => item.name.toLowerCase() === name)?.value;
}

function isHidden(element: Element): boolean {
  if (element.attrs.some((item) => item.name.toLowerCase() === 'hidden')) return true;
  if (attr(element, 'aria-hidden')?.toLowerCase() === 'true') return true;
  if (attr(element, 'contenteditable')?.toLowerCase() !== undefined) return true;
  if (attr(element, 'data-bugpin-private') !== undefined) return true;
  if (attr(element, 'data-bugpin-exclude') !== undefined) return true;
  const style = attr(element, 'style')?.toLowerCase() ?? '';
  return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:;|$)/.test(style);
}

function sanitizeChildren(parent: ParentNode): void {
  parent.childNodes = parent.childNodes.filter((node) => {
    if (!isElement(node)) {
      if (node.nodeName === '#text') node.value = redactSensitiveText(node.value);
      return node.nodeName !== '#comment';
    }
    if (REMOVED_ELEMENTS.has(node.tagName.toLowerCase()) || isHidden(node)) return false;

    node.attrs = node.attrs
      .filter((item) => ALLOWED_ATTRIBUTES.has(item.name.toLowerCase()))
      .map((item) => ({ ...item, value: redactSensitiveText(item.value) }));
    sanitizeChildren(node);
    return true;
  });
}

export function sanitizeSelectedElementHtml(html: string): string {
  const fragment = parseFragment(html);
  sanitizeChildren(fragment);
  return serialize(fragment);
}

export function sanitizeSelectedElement(element: SelectedElement): SelectedElement {
  return {
    ...element,
    selector: redactSensitiveText(element.selector),
    tagName: redactSensitiveText(element.tagName),
    id: element.id ? redactSensitiveText(element.id) : undefined,
    classes: element.classes.map(redactSensitiveText),
    text: redactSensitiveText(element.text),
    html: sanitizeSelectedElementHtml(element.html),
    componentHint: element.componentHint ? redactSensitiveText(element.componentHint) : undefined,
    area: element.area ? redactSensitiveText(element.area) : undefined,
    owner: element.owner ? redactSensitiveText(element.owner) : undefined,
    screen: element.screen ? redactSensitiveText(element.screen) : undefined,
    activeTab: element.activeTab ? redactSensitiveText(element.activeTab) : undefined,
  };
}
