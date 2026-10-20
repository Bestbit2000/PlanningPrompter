// A record of how a screen is laid out (PO-92): every element on the page, where it is
// and how big, and its computed style, including ::before and ::after. Two records match
// only if the screen looks the same, whatever the CSS or markup behind it.
//
// Elements are named by their id if they have one, otherwise by their place among their
// parent's elements, leaving out <script> and <style>, which take up no room. Styles are
// listed once and referred to by number, to keep the record small.
import type { Page } from '@playwright/test';

const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear',
  'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'outline-style', 'outline-width', 'outline-color', 'outline-offset',
  'color', 'background-color', 'background-image', 'box-shadow', 'opacity', 'visibility', 'filter',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration-line', 'text-transform', 'text-indent', 'white-space', 'word-break', 'overflow-wrap',
  'vertical-align', 'list-style-type', 'list-style-position',
  'overflow-x', 'overflow-y', 'cursor', 'pointer-events', 'user-select', 'resize', 'accent-color',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'justify-content', 'align-items', 'align-self', 'align-content', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column-start', 'grid-column-end',
  'transform', 'transition-property', 'transition-duration', 'animation-name', 'content'
];

export async function layoutRecord(page: Page): Promise<string> {
  return page.evaluate((props) => {
    const skip = (el: Element) => el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
    const styles = new Map<string, number>();
    const styleId = (cs: CSSStyleDeclaration) => {
      const s = props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';');
      if (!styles.has(s)) styles.set(s, styles.size);
      return styles.get(s);
    };
    const r = (v: number) => Math.round(v * 2) / 2;
    const lines: string[] = [];
    const walk = (el: Element, key: string) => {
      const box = el.getBoundingClientRect();
      const pos = [box.left + scrollX, box.top + scrollY, box.width, box.height].map(r).join(',');
      let line = key + ' ' + pos + ' s' + styleId(getComputedStyle(el));
      for (const pseudo of ['::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content !== 'none' && cs.content !== 'normal') line += ' ' + pseudo + '=s' + styleId(cs);
      }
      lines.push(line);
      // Toasts come and go on a timer, so their contents are not part of the record
      if (el.id === 'toast-container') return;
      let n = 0;
      for (const child of Array.from(el.children)) {
        if (skip(child)) continue;
        n++;
        walk(child, child.id ? '#' + child.id : key + '>' + child.tagName.toLowerCase() + n);
      }
    };
    walk(document.body, 'body');
    const table = Array.from(styles.keys()).map((s, i) => 's' + i + ' ' + s);
    return lines.join('\n') + '\n\n' + table.join('\n') + '\n';
  }, PROPS);
}
