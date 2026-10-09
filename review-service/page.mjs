// The reviewer's page (PO-82), served by the review service at its own address. It
// holds no answers and no names itself: it reads the key from the reviewer's link (the
// part after "#") and fetches that reviewer's own questions and answers with it.
//
// No outside fonts or scripts. The script below is plain JavaScript with no template
// strings, so that this file can hold it as one piece of text.

export const REVIEW_PAGE = String.raw`<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Answer review: Retirement Income Prompt Generator</title>
<style>
  * { box-sizing: border-box; }
  /* Anything marked hidden stays hidden, whatever else styles it. */
  [hidden] { display: none !important; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #201e1d; background: #f5f4f3; margin: 0; }
  header { background: #fff; border-bottom: 3px solid #226B79; }
  header div { max-width: 1180px; margin: 0 auto; padding: 12px 16px; font-weight: 700; color: #164752; }
  header span { display: block; font-weight: 400; font-size: 14px; color: #55514e; }
  main { max-width: 1180px; margin: 0 auto; padding: 24px 16px 72px; }
  main.narrow { max-width: 720px; }
  h1 { font-size: 26px; line-height: 1.25; margin: 0 0 12px; color: #164752; }
  h1:focus { outline: none; }
  h2 { font-size: 19px; margin: 0 0 8px; color: #164752; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  .card { background: #fff; border: 1px solid #c9c5c2; border-radius: 8px; padding: 18px 20px; margin: 0 0 18px; }
  .note { color: #55514e; font-size: 15px; }
  .small { font-size: 14px; }
  .progress { font-weight: 700; margin: 0 0 6px; }
  .track { height: 10px; background: #dedad7; border-radius: 999px; overflow: hidden; margin: 0 0 18px; }
  .track i { display: block; height: 10px; background: #226B79; }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; align-items: start; }
  @media (min-width: 1000px) {
    .cols { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
    .answer { position: sticky; top: 12px; max-height: calc(100vh - 24px); overflow-y: auto; }
  }
  .answer:focus-visible { outline: 3px solid #201e1d; outline-offset: 2px; }
  .count { border-top: 1px solid #dedad7; margin: 14px 0 0; padding-top: 10px; font-weight: 700; }
  .rules { font-size: 15px; color: #3b3835; background: #f5f4f3; border-radius: 6px; padding: 10px 14px 2px; margin: 0 0 12px; }
  .rules p { margin: 0 0 6px; color: #201e1d; }
  .points em { font-style: normal; font-weight: 700; color: #201e1d; }
  .md h3 { font-size: 18px; margin: 16px 0 6px; }
  .md h4 { font-size: 16px; margin: 14px 0 6px; }
  .md table { border-collapse: collapse; margin: 0 0 12px; font-size: 15px; display: block; overflow-x: auto; }
  .md th, .md td { border: 1px solid #8a8683; padding: 6px 8px; text-align: left; vertical-align: top; }
  .md th { background: #EAF3F3; }
  .md blockquote { margin: 0 0 12px; padding: 2px 14px; border-left: 4px solid #c9c5c2; }
  .md code { background: #eceae9; padding: 1px 4px; border-radius: 3px; }
  .md hr { border: none; border-top: 1px solid #c9c5c2; margin: 14px 0; }
  fieldset { border: 1px solid #c9c5c2; border-radius: 8px; padding: 14px 16px 16px; margin: 0 0 16px; background: #fff; min-width: 0; }
  legend { float: left; width: 100%; font-weight: 700; font-size: 17px; padding: 0; margin: 0 0 8px; color: #164752; }
  legend + * { clear: both; }
  .points { font-size: 15px; color: #3b3835; margin: 0 0 12px; }
  .points strong { color: #201e1d; }
  .scale { display: flex; flex-wrap: wrap; gap: 6px; }
  .scale label, .yesno label { position: relative; }
  .scale input, .yesno input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
  .scale span, .yesno span { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 0 12px; border: 2px solid #226B79; border-radius: 8px; background: #fff; color: #164752; font-weight: 700; }
  .scale input:checked + span, .yesno input:checked + span { background: #226B79; color: #fff; }
  .scale input:focus-visible + span, .yesno input:focus-visible + span { outline: 3px solid #201e1d; outline-offset: 2px; }
  .ends { display: flex; justify-content: space-between; font-size: 14px; color: #55514e; margin-top: 6px; max-width: 546px; }
  .yesno { display: flex; gap: 8px; margin-bottom: 4px; }
  label.field { display: block; font-weight: 700; margin: 0 0 16px; }
  label.field span { display: block; font-weight: 400; font-size: 15px; color: #55514e; }
  textarea { display: block; width: 100%; min-height: 96px; margin-top: 6px; font: inherit; padding: 8px 10px; border: 1px solid #6b6764; border-radius: 4px; background: #fff; color: #201e1d; resize: vertical; }
  textarea:focus-visible, button:focus-visible, summary:focus-visible, a:focus-visible { outline: 3px solid #201e1d; outline-offset: 2px; }
  button { font: inherit; font-weight: 700; min-height: 44px; padding: 8px 20px; border-radius: 8px; border: 2px solid #226B79; background: #226B79; color: #fff; cursor: pointer; }
  button.plain { background: #fff; color: #164752; }
  button:disabled { opacity: 0.55; cursor: wait; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .error { background: #fbe6e2; border: 1px solid #8a1f11; color: #8a1f11; border-radius: 6px; padding: 10px 14px; font-weight: 600; margin: 0 0 16px; }
  summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; font-weight: 600; color: #164752; }
  summary::before { content: "+"; display: inline-block; width: 20px; font-weight: 700; }
  details[open] > summary::before { content: "\2212"; }
  .done-list { list-style: none; padding: 0; margin: 0 0 16px; }
  .done-list li { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; padding: 10px 0; border-top: 1px solid #dedad7; margin: 0; }
  .done-list li:first-child { border-top: none; }
  .tag { display: inline-block; font-size: 14px; font-weight: 700; border-radius: 999px; padding: 2px 10px; border: 1px solid #1b6e3c; color: #1b6e3c; background: #e3f3e8; }
  .tag.todo { border-color: #8a5a00; color: #8a5a00; background: #fdf3dc; }
</style>
</head>
<body>
<header><div>Answer review<span>Retirement Income Prompt Generator</span></div></header>
<main id="app" class="narrow"><p>Loading...</p></main>
<script>
(function () {
  var key = '';
  try { key = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { key = ''; }
  var app = document.getElementById('app');
  var S = { me: null, at: 'welcome', draft: {}, error: '', busy: false };
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function api(path, body) {
    return fetch(path, {
      method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || 'Something went wrong. Please try again.'); e.status = res.status; throw e; }
        return data;
      });
    });
  }

  // ---- the answer as the chatbot laid it out: headings, lists, bold, tables ----
  // The text is made safe first, then only these few patterns are turned into tags.
  function inline(t) {
    return t
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1 ($2)')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/` + '`' + String.raw`([^` + '`' + String.raw`]+)` + '`' + String.raw`/g, '<code>$1</code>');
  }
  function cells(line) { return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return inline(c.trim()); }); }
  function md(src) {
    var lines = esc(String(src || '').replace(/\r\n/g, '\n')).split('\n');
    var out = [], para = [], list = null, i, m;
    function flushPara() { if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('</' + list + '>'); list = null; } }
    function flush() { flushPara(); flushList(); }
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) { flush(); continue; }
      if ((m = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) { flush(); out.push((m[1].length <= 2 ? '<h3>' : '<h4>') + inline(m[2]) + (m[1].length <= 2 ? '</h3>' : '</h4>')); continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
        flush();
        var html = '<table><thead><tr>' + cells(line).map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { html += '<tr>' + cells(lines[i]).map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; i++; }
        i--;
        out.push(html + '</tbody></table>');
        continue;
      }
      if ((m = line.match(/^\s*(?:[-*+•]|(\d+)[.)])\s+(.*)$/))) {
        flushPara();
        var kind = m[1] ? 'ol' : 'ul';
        if (list !== kind) { flushList(); out.push('<' + kind + '>'); list = kind; }
        out.push('<li>' + inline(m[2]) + '</li>');
        continue;
      }
      if ((m = line.match(/^\s*&gt;\s?(.*)$/))) { flush(); out.push('<blockquote><p>' + inline(m[1]) + '</p></blockquote>'); continue; }
      flushList();
      para.push(line.trim());
    }
    flush();
    return out.join('\n');
  }

  // ---- where each answer sits: which question it belongs to, and its letter ----
  // Answers to the same question in the same style sit together and share a number.
  function layOut(me) {
    var q = -1, size = {}, last = null;
    me.items.forEach(function (it) {
      var same = last && last.question === it.question && last.styleKey === it.styleKey;
      if (!same) { q++; size[q] = 0; }
      it.q = q; it.letter = LETTERS.charAt(size[q] % 26); size[q]++;
      last = it;
    });
    me.questions = q + 1;
    me.items.forEach(function (it) { it.alone = size[it.q] === 1; });
  }
  function wordsIn(text) { return (String(text || '').match(/\S+/g) || []).length; }
  function nameOf(it) { return 'Question ' + (it.q + 1) + (it.alone ? '' : ', answer ' + it.letter); }
  function draftOf(it) {
    if (!S.draft[it.id]) {
      var s = it.saved || {};
      S.draft[it.id] = { scores: Object.assign({}, s.scores || {}), dangerous: typeof s.dangerous === 'boolean' ? s.dangerous : null, dangerNote: s.dangerNote || '', good: s.good || '', bad: s.bad || '' };
    }
    return S.draft[it.id];
  }
  function doneCount() { return S.me.items.filter(function (it) { return it.saved; }).length; }
  function minutes() {
    var words = S.me.items.reduce(function (n, it) { return n + wordsIn(it.answer); }, 0);
    return Math.max(5, Math.ceil((words / 200 + S.me.items.length + 1) / 5) * 5);
  }

  function show(html, narrow) {
    app.className = narrow ? 'narrow' : '';
    app.innerHTML = html;
    window.scrollTo(0, 0);
    var h = app.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  function notInUse() {
    show('<h1>This link is not in use</h1><p>If you were invited to review answers, ask the person who invited you for a new link.</p>', true);
  }

  function welcome() {
    var n = S.me.items.length, done = doneCount();
    show(
      '<h1>Thank you for helping, ' + esc(S.me.name) + '</h1>' +
      '<div class="card">' +
      '<p>The Retirement Income Prompt Generator helps people ask AI chatbots good questions about retirement income. Before a question goes on the site, we check the answers it gets.</p>' +
      '<p>You have <strong>' + n + ' answer' + (n === 1 ? '' : 's') + '</strong> to look at. Each was written by an AI chatbot. For each one you will see the question that was asked, then the answer.</p>' +
      '<ul><li>Give the answer five scores, one for each area, from 0 to 10. The points to judge each area on are listed beside it.</li>' +
      '<li>Say whether anything in it is dangerous or misleading.</li>' +
      '<li>Tell us what is good and what is bad about it. Your comments matter most: they are how the questions and the checks get better.</li></ul>' +
      '<p>It should take about ' + minutes() + ' minutes. Your work is saved after each answer, so you can stop and come back with the same link.</p>' +
      '</div>' +
      '<div class="card"><h2>What we keep</h2>' +
      '<p class="small">We keep the name you were invited under, your scores and your comments. They are seen by the people who look after the tool and may be included in their reports. No cookies are used and nothing else about you is recorded. Please do not put personal details in your comments. To have your review removed, tell the person who invited you.</p></div>' +
      '<div class="actions"><button type="button" data-go="' + (done >= n ? 'summary' : String(firstUndone())) + '">' + (done === 0 ? 'Start' : done >= n ? 'Look at my answers' : 'Carry on (' + done + ' of ' + n + ' done)') + '</button></div>',
      true
    );
  }
  function firstUndone() {
    for (var i = 0; i < S.me.items.length; i++) if (!S.me.items[i].saved) return i;
    return 0;
  }

  function scale(group, d) {
    var html = '<div class="scale">';
    for (var v = 0; v <= 10; v++) {
      html += '<label><input type="radio" name="g-' + esc(group.id) + '" value="' + v + '"' + (d.scores[group.id] === v ? ' checked' : '') + '><span>' + v + '</span></label>';
    }
    return html + '</div><div class="ends" aria-hidden="true"><span>0: fails</span><span>10: cannot be faulted</span></div>';
  }

  function item(index) {
    var it = S.me.items[index], d = draftOf(it), n = S.me.items.length;
    var count = wordsIn(it.answer), countText = 'This answer is ' + count.toLocaleString('en-GB') + ' word' + (count === 1 ? '' : 's') + '.';
    var style = S.me.styles[it.styleKey];
    var styleHtml = !style ? '' :
      '<p><strong>Answer style asked for:</strong> ' + esc(style.name) + '</p>' +
      (style.reader ? '<p class="note">Why someone picks this style: "' + esc(style.reader) + '"</p>' : '');
    // The numbered rules for the style, and the ways an answer misses it, shown in the
    // "Answer style" box: its judging statement calls them "listed below".
    var styleRules = !style || !(style.rules || []).length ? '' :
      '<div class="rules"><p><strong>The rules for a "' + esc(style.name) + '" answer</strong></p>' +
      '<ol>' + style.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
      ((style.misses || []).length ? '<p><strong>It has missed the style if</strong></p><ul>' + style.misses.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '') +
      '</div>';
    var groups = S.me.groups.map(function (g) {
      return '<fieldset><legend>' + esc(g.title) + '</legend>' +
        '<ul class="points">' + (g.statements || []).map(function (s) { return '<li><strong>' + esc(s.name) + ':</strong> ' + esc(s.description) + (s.id === 'conciseness' || (!s.id && s.name === 'Length') ? ' <em>' + countText + '</em>' : '') + '</li>'; }).join('') + '</ul>' +
        (g.id === 'style' ? styleRules : '') +
        scale(g, d) + '</fieldset>';
    }).join('');
    show(
      '<p class="progress">Answer ' + (index + 1) + ' of ' + n + '</p>' +
      '<div class="track" role="img" aria-label="' + doneCount() + ' of ' + n + ' answers scored"><i style="width:' + Math.round((doneCount() / n) * 100) + '%"></i></div>' +
      '<h1>' + esc(nameOf(it)) + '</h1>' +
      '<div class="card"><h2>The question</h2><p>' + esc(it.question) + '</p>' + styleHtml + '</div>' +
      '<div class="cols">' +
        '<section class="card answer" tabindex="0" aria-label="The answer"><h2>The answer' + (it.alone ? '' : ' (' + it.letter + ')') + '</h2><div class="md">' + md(it.answer) + '</div><p class="count">' + countText + '</p></section>' +
        '<form id="form" novalidate>' +
          '<h2>Your scores</h2>' +
          '<p class="note">Give each area one score, from 0 (fails) to 10 (cannot be faulted). The points under each heading are what to judge it on.</p>' +
          groups +
          '<fieldset><legend>Is anything in this answer dangerous or misleading?</legend>' +
            '<p class="points">For example: a wrong figure or rule someone might act on, a personal recommendation, or something important left out.</p>' +
            '<div class="yesno"><label><input type="radio" name="danger" value="no"' + (d.dangerous === false ? ' checked' : '') + '><span>No</span></label>' +
            '<label><input type="radio" name="danger" value="yes"' + (d.dangerous === true ? ' checked' : '') + '><span>Yes</span></label></div>' +
            '<label class="field" id="danger-box"' + (d.dangerous === true ? '' : ' hidden') + ' style="margin:12px 0 0">What is dangerous or misleading, and why?<textarea id="dangerNote" maxlength="3000">' + esc(d.dangerNote) + '</textarea></label>' +
          '</fieldset>' +
          '<label class="field">What is good about this answer?<textarea id="good" maxlength="3000">' + esc(d.good) + '</textarea></label>' +
          '<label class="field">What is bad about this answer?<span>Needed when any score is ' + S.me.lowScore + ' or under.</span><textarea id="bad" maxlength="3000">' + esc(d.bad) + '</textarea></label>' +
          '<div id="error" class="error" role="alert" tabindex="-1" hidden></div>' +
          '<div class="actions">' +
            '<button type="submit" id="save">' + (index + 1 < n ? 'Save and go to the next answer' : 'Save') + '</button>' +
            (index > 0 ? '<button type="button" class="plain" data-go="' + (index - 1) + '">Back</button>' : '') +
          '</div>' +
        '</form>' +
      '</div>',
      false
    );
  }

  function summary() {
    var n = S.me.items.length, done = doneCount();
    show(
      '<h1>' + (done >= n ? 'All ' + n + ' answers scored' : done + ' of ' + n + ' answers scored') + '</h1>' +
      '<div class="card"><ul class="done-list">' + S.me.items.map(function (it, i) {
        return '<li><span>' + esc(nameOf(it)) + ' <span class="tag' + (it.saved ? '' : ' todo') + '">' + (it.saved ? 'Scored' : 'Not scored yet') + '</span></span>' +
          '<button type="button" class="plain" data-go="' + i + '">' + (it.saved ? 'Change' : 'Score') + '<span style="position:absolute;left:-9999px"> ' + esc(nameOf(it)) + '</span></button></li>';
      }).join('') + '</ul></div>' +
      '<div id="error" class="error" role="alert" tabindex="-1" hidden></div>' +
      (done >= n
        ? '<p>If you are happy with your scores and comments, finish here. You can still change them with the same link until the review is closed.</p><div class="actions"><button type="button" id="finish">Finish</button></div>'
        : '<p>Score the rest to finish.</p>'),
      true
    );
  }

  function thanks() {
    show('<h1>Thank you</h1><div class="card"><p>Your scores and comments are saved. You can close this page.</p><p>You can still change them with the same link until the review is closed.</p></div>' +
      '<div class="actions"><button type="button" class="plain" data-go="summary">Look at my answers again</button></div>', true);
  }

  function go(where) {
    S.at = where;
    if (where === 'welcome') return welcome();
    if (where === 'summary') return summary();
    if (where === 'thanks') return thanks();
    return item(Number(where));
  }
  function fail(message) {
    var box = document.getElementById('error');
    if (!box) return;
    box.textContent = message; box.hidden = false; box.focus();
  }

  app.addEventListener('input', function (ev) {
    if (typeof S.at !== 'number') return;
    var d = draftOf(S.me.items[S.at]), t = ev.target;
    if (t.name && t.name.indexOf('g-') === 0) d.scores[t.name.slice(2)] = Number(t.value);
    else if (t.name === 'danger') { d.dangerous = t.value === 'yes'; document.getElementById('danger-box').hidden = !d.dangerous; }
    else if (t.id === 'dangerNote' || t.id === 'good' || t.id === 'bad') d[t.id] = t.value;
  });
  app.addEventListener('click', function (ev) {
    var t = ev.target.closest('button');
    if (!t || S.busy) return;
    if (t.dataset.go !== undefined) return go(/^\d+$/.test(t.dataset.go) ? Number(t.dataset.go) : t.dataset.go);
    if (t.id === 'finish') {
      S.busy = true; t.disabled = true;
      api('api/finish', {}).then(function () { S.busy = false; S.me.finished = true; go('thanks'); })
        .catch(function (e) { S.busy = false; t.disabled = false; if (e.status === 401) return notInUse(); fail(e.message); });
    }
  });
  app.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (S.busy || typeof S.at !== 'number') return;
    var index = S.at, it = S.me.items[index], d = draftOf(it);
    var missing = S.me.groups.filter(function (g) { return typeof d.scores[g.id] !== 'number'; });
    if (missing.length) return fail('Give a score for: ' + missing.map(function (g) { return g.title; }).join(', ') + '.');
    if (d.dangerous === null) return fail('Say whether anything in the answer is dangerous or misleading.');
    if (d.dangerous && !d.dangerNote.trim()) return fail('Say what is dangerous or misleading, and why.');
    var low = S.me.groups.some(function (g) { return d.scores[g.id] <= S.me.lowScore; });
    if (low && !d.bad.trim()) return fail('You gave a score of ' + S.me.lowScore + ' or under. Say what is bad about this answer, so it can be put right.');
    var button = document.getElementById('save');
    S.busy = true; button.disabled = true;
    api('api/score', { itemId: it.id, scores: d.scores, dangerous: d.dangerous, dangerNote: d.dangerNote, good: d.good, bad: d.bad }).then(function (res) {
      S.busy = false;
      it.saved = res.saved;
      go(index + 1 < S.me.items.length ? index + 1 : 'summary');
    }).catch(function (e) {
      S.busy = false; button.disabled = false;
      if (e.status === 401) return notInUse();
      fail(e.message);
    });
  });

  if (!key) return notInUse();
  api('api/me').then(function (me) {
    layOut(me);
    S.me = me;
    go('welcome');
  }).catch(function (e) {
    if (e.status === 401) return notInUse();
    show('<h1>The review could not be loaded</h1><p>' + esc(e.message) + '</p><div class="actions"><button type="button" onclick="location.reload()">Try again</button></div>', true);
  });
})();
</script>
</body>
</html>
`;
