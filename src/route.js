// Where the editor is, as an address after # (0.7). Every level has one, so the browser's
// back button, the phone's back gesture and a reload all land where they should. Board
// links (#b=) and #log sit outside these paths and are left alone.
//
//   #/storyboards                          the list
//   #/storyboards/<id>/<week|boards|display>
//   #/storyboards/<id>/boards/<boardId>    one board of a storyboard
//   #/my-boards, #/my-boards/<id>            My boards and one blueprint (0.7.1)
//   #/explore, #/explore/<templateId>
//   #/account, #/account/help, #/account/log
//
// Ids are the stored ones: a storyboard is a stored board, a board is one of its pages.

const VIEWS = ['week', 'boards', 'display'];
const clean = s => /^[\w-]{1,64}$/.test(s || '') ? s : null;

export function parseRoute(hash) {
  const m = /^#\/(.*)$/.exec(hash || ''); if (!m) return null;
  const [sec, a, b, c] = m[1].split('/').map(decodeURIComponent);
  if (sec === 'storyboards') {
    if (!a) return { sec: 'sb', lv: 'list' };
    const sb = clean(a); if (!sb) return { sec: 'sb', lv: 'list' };
    if (b === 'boards' && clean(c)) return { sec: 'sb', lv: 'board', sb, bd: c, view: 'boards' };
    return { sec: 'sb', lv: 'sb', sb, view: VIEWS.includes(b) ? b : 'week' };
  }
  if (sec === 'my-boards') return a && clean(a) ? { sec: 'my', lv: 'bp', bp: a } : { sec: 'my', lv: 'list' };
  if (sec === 'explore') return a && clean(a) ? { sec: 'ex', lv: 'tpl', tpl: a } : { sec: 'ex', lv: 'list' };
  if (sec === 'account') return a === 'help' || a === 'log' ? { sec: 'acc', lv: a } : { sec: 'acc', lv: 'main' };
  return null;
}

export function routeHash(r) {
  if (!r) return '';
  const e = encodeURIComponent;
  if (r.sec === 'sb') {
    if (r.lv === 'board') return `#/storyboards/${e(r.sb)}/boards/${e(r.bd)}`;
    if (r.lv === 'sb') return `#/storyboards/${e(r.sb)}/${VIEWS.includes(r.view) ? r.view : 'week'}`;
    return '#/storyboards';
  }
  if (r.sec === 'my') return r.lv === 'bp' ? `#/my-boards/${e(r.bp)}` : '#/my-boards';
  if (r.sec === 'ex') return r.lv === 'tpl' ? `#/explore/${e(r.tpl)}` : '#/explore';
  if (r.sec === 'acc') return r.lv === 'help' || r.lv === 'log' ? `#/account/${r.lv}` : '#/account';
  return '';
}

// One level up. A section's top has none, so Back is hidden there.
export function parentRoute(r) {
  if (!r) return null;
  if (r.sec === 'sb') return r.lv === 'board' ? { sec: 'sb', lv: 'sb', sb: r.sb, view: r.from || 'boards' } : r.lv === 'sb' ? { sec: 'sb', lv: 'list' } : null;
  if (r.sec === 'my') return r.lv === 'bp' ? { sec: 'my', lv: 'list' } : null;
  if (r.sec === 'ex') return r.lv === 'tpl' ? { sec: 'ex', lv: 'list' } : null;
  if (r.sec === 'acc') return r.lv === 'help' || r.lv === 'log' ? { sec: 'acc', lv: 'main' } : null;
  return null;
}

export const sameRoute = (a, b) => routeHash(a) === routeHash(b);
