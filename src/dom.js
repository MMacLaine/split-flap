// A tiny DOM helper, shared by the app, the editor and the composer.
// h('button', { class: 'x', onclick: fn, 'aria-pressed': 'true' }, 'Label', child, [more])
const PROPS = new Set(['value', 'checked', 'disabled', 'readOnly', 'type', 'min', 'max', 'step', 'tabIndex']);
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false && !k.startsWith('aria-')) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const clone = o => JSON.parse(JSON.stringify(o));
