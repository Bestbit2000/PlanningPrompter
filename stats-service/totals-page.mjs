// The totals page, served by the counter at its own address. It holds no figures
// itself: it asks for the key, then fetches the daily totals with it.

export const TOTALS_PAGE = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Usage totals: Retirement Income Prompt Generator</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 16px; line-height: 1.5; color: #201e1d; background: #f5f4f3; margin: 0; }
  main { max-width: 900px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 32px 0 4px; }
  p { margin: 0 0 12px; }
  .note { color: #555; font-size: 14px; }
  form { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin: 16px 0; }
  label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  input { font: inherit; padding: 8px 10px; min-height: 44px; box-sizing: border-box; border: 1px solid #767676; border-radius: 4px; }
  button { font: inherit; font-weight: 700; min-height: 44px; padding: 8px 20px; border-radius: 4px; border: 2px solid #226B79; background: #226B79; color: #fff; cursor: pointer; }
  button.plain { background: #fff; color: #226B79; }
  button:focus-visible, input:focus-visible, .scroll:focus-visible { outline: 3px solid #201e1d; outline-offset: 2px; }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; background: #fff; font-size: 15px; }
  caption { text-align: left; font-size: 14px; color: #555; padding-bottom: 6px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  thead th { background: #eef3f4; }
  #message { font-weight: 600; }
  #message.error { color: #a4262c; }
</style>
</head>
<body>
<main>
  <h1>Usage totals</h1>
  <p>Retirement Income Prompt Generator. Daily counts of how the tool is used. The counts are of visits and actions, not people, and hold nothing a user typed.</p>

  <form id="form">
    <div><label for="key">Key</label><input id="key" type="password" autocomplete="off" required></div>
    <div><label for="from">From</label><input id="from" type="date" required></div>
    <div><label for="to">To</label><input id="to" type="date" required></div>
    <button type="submit">Show totals</button>
    <button type="button" class="plain" id="csv" hidden>Download CSV</button>
  </form>
  <p id="message" role="status"></p>

  <div id="results" hidden>
    <h2>Where visits go</h2>
    <p class="note">Each step is counted once per visit. Divide a step by the one before it to see the share that carried on.</p>
    <div class="scroll" tabindex="0" role="region" aria-label="Where visits go table"><table id="funnel"></table></div>

    <h2>Questions</h2>
    <p class="note">How many visits built a prompt with each question, most used first.</p>
    <div class="scroll" tabindex="0" role="region" aria-label="Questions table"><table id="questions"></table></div>

    <h2>Chatbots</h2>
    <p class="note">Each press of "Copy and launch".</p>
    <div class="scroll" tabindex="0" role="region" aria-label="Chatbots table"><table id="chatbots"></table></div>

    <h2>By day</h2>
    <div class="scroll" tabindex="0" role="region" aria-label="By day table"><table id="days"></table></div>
  </div>
</main>
<script>
(function () {
  var TYPES = ['starter', 'list', 'personalised'];
  var TYPE_NAMES = { starter: 'Starter prompt', list: 'Prompt list', personalised: 'Personalised' };
  var BOT_NAMES = { chatgpt: 'ChatGPT', claude: 'Claude', copilot: 'Copilot', gemini: 'Gemini', perplexity: 'Perplexity' };
  var $ = function (id) { return document.getElementById(id); };
  var rows = [];

  var iso = function (d) { return d.toISOString().slice(0, 10); };
  var today = new Date();
  $('to').value = iso(today);
  $('from').value = iso(new Date(today.getTime() - 29 * 86400000));

  var say = function (text, isError) { $('message').textContent = text; $('message').className = isError ? 'error' : ''; };

  var table = function (id, caption, head, body) {
    var t = $(id);
    t.textContent = '';
    var cap = t.createCaption(); cap.textContent = caption;
    var tr = t.createTHead().insertRow();
    head.forEach(function (h) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = h; tr.appendChild(th); });
    var tb = t.createTBody();
    body.forEach(function (cells) {
      var r = tb.insertRow();
      cells.forEach(function (c, i) {
        var cell = i === 0 ? document.createElement('th') : document.createElement('td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = c;
        r.appendChild(cell);
      });
    });
    if (!body.length) { var r = tb.insertRow(); var c = r.insertCell(); c.colSpan = head.length; c.textContent = 'Nothing counted in these dates.'; c.style.textAlign = 'left'; }
  };

  var sum = function (event, test) {
    return rows.reduce(function (n, r) { return r.event === event && (!test || test(r.detail)) ? n + r.count : n; }, 0);
  };

  var show = function () {
    var byType = function (event) { return TYPES.map(function (t) { return sum(event, function (d) { return d === t; }); }); };
    var launches = TYPES.map(function (t) { return sum('chatbot_launched', function (d) { return d.split('|')[1] === t; }); });
    var total = function (list) { return list.reduce(function (a, b) { return a + b; }, 0); };
    var line = function (name, list) { return [name].concat(list, [total(list)]); };
    table('funnel', 'Visits that opened the tool: ' + sum('landing_view'),
      ['Step'].concat(TYPES.map(function (t) { return TYPE_NAMES[t]; }), ['All']),
      [line('Chose this route', byType('route_chosen')), line('Reached a finished prompt', byType('prompt_ready')),
       line('Pressed "Copy prompt only"', byType('prompt_copied')), line('Pressed "Copy and launch"', launches)]);

    var q = {};
    rows.forEach(function (r) {
      if (r.event !== 'question_used') return;
      var p = r.detail.split('|');
      q[p[0]] = q[p[0]] || { list: 0, personalised: 0 };
      q[p[0]][p[1]] += r.count;
    });
    var qRows = Object.keys(q).map(function (id) { return [id, q[id].list, q[id].personalised, q[id].list + q[id].personalised]; })
      .sort(function (a, b) { return b[3] - a[3] || (a[0] < b[0] ? -1 : 1); });
    table('questions', 'Question ids are the ones in prompts.js.', ['Question', 'Prompt list', 'Personalised', 'Total'], qRows);

    var bRows = Object.keys(BOT_NAMES).map(function (b) {
      var per = TYPES.map(function (t) { return sum('chatbot_launched', function (d) { return d === b + '|' + t; }); });
      return line(BOT_NAMES[b], per);
    }).sort(function (a, b) { return b[4] - a[4]; });
    table('chatbots', 'Launches by chatbot and by the kind of prompt.', ['Chatbot'].concat(TYPES.map(function (t) { return TYPE_NAMES[t]; }), ['All']), bRows);

    var days = {};
    rows.forEach(function (r) {
      var d = days[r.day] = days[r.day] || { landing_view: 0, route_chosen: 0, prompt_ready: 0, prompt_copied: 0, chatbot_launched: 0 };
      if (r.event in d) d[r.event] += r.count;
    });
    table('days', 'Dates are UK dates.', ['Day', 'Opened the tool', 'Chose a route', 'Finished prompt', 'Copied', 'Launched'],
      Object.keys(days).sort().map(function (day) { var d = days[day]; return [day, d.landing_view, d.route_chosen, d.prompt_ready, d.prompt_copied, d.chatbot_launched]; }));

    $('results').hidden = false;
    $('csv').hidden = false;
  };

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    say('Fetching the totals...');
    fetch('totals?from=' + encodeURIComponent($('from').value) + '&to=' + encodeURIComponent($('to').value), { headers: { authorization: 'Bearer ' + $('key').value } })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        if (!r.ok) { say(r.data.error || 'The totals could not be fetched.', true); return; }
        rows = r.data.rows;
        say('Showing ' + $('from').value + ' to ' + $('to').value + '.');
        show();
      })
      .catch(function () { say('The totals could not be fetched.', true); });
  });

  $('csv').addEventListener('click', function () {
    var text = 'day,event,detail,count\\n' + rows.map(function (r) { return [r.day, r.event, r.detail, r.count].join(','); }).join('\\n') + '\\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = 'usage-totals-' + $('from').value + '-to-' + $('to').value + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
})();
</script>
</body>
</html>`;
