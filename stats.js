// Usage counts (PO-19). See docs/STATS-PLAN.md.
//
// Sends the name of an event and up to three fixed labels to a counter, which keeps
// daily totals only. It never sends anything the user typed, the text of a prompt,
// or anything that identifies a visitor, and it writes nothing to the device.
// It does say which boxes were filled in and which fixed answers were picked (PO-77).
//
// The one setting: the address of the counter. Leave it empty and nothing is sent,
// so the tool works unchanged on a host with no counter.
window.STATS_ENDPOINT = 'https://br-raspy-shadow-b1uel7je-usagecounter.compute.c-5.eu-central-1.aws.neon.tech/';

(function () {
  const TYPES = ['starter', 'list', 'personalised'];
  const BUILT = ['list', 'personalised'];   // the two routes that build a prompt from questions
  const CHATBOTS = ['chatgpt', 'claude', 'copilot', 'gemini', 'perplexity'];
  const QUESTION_ID = /^[A-Za-z]{1,30}_\d{1,3}$/;
  // Where a route was chosen: on the first screen, or from inside another route (PO-77).
  const SOURCES = ['landing', 'switch'];
  // The answers to the three shortlisting questions, by their ids in prompts.js.
  const STAGES = ['building', 'soon', 'taking'];
  const TOPIC_ID = /^(building|soon|taking)_[a-z]{1,20}$/;
  const STYLES = ['caseStudy', 'factual', 'simple'];
  const HELP_LINKS = ['moneyhelper', 'fca_register', 'report_problem', 'privacy_policy', 'living_standards', 'important_info'];
  // The boxes of the personalised route, by the ids they have on the page. Only the id is
  // ever sent, to say the box was filled in: never what was put in it.
  const FIELD_ID = /^(age|partnerAge|retireAge|country|employment|health|dependants|risk|pension|savings|property|income|pensionAccess|partnerPensionAccess|financeNotes|lifestyle|target|partTime|estate|plans|srcNotes|srcOtherText|concernOtherText|question|c_[a-z]{1,12}|src_[a-z]{1,12}(_amt|_from)?)$/;
  const parts = (d, n) => { const p = d.split('|'); return p.length === n ? p : null; };

  // What each event may carry. Anything else is dropped here, and again by the counter.
  const DETAIL_OK = {
    landing_view: (d) => d === '',
    // 'list' alone is how a route was counted before PO-77; it is still accepted.
    route_chosen: (d) => { const p = parts(d, 2); return TYPES.includes(d) || (!!p && TYPES.includes(p[0]) && SOURCES.includes(p[1])); },
    prompt_ready: (d) => TYPES.includes(d),
    prompt_copied: (d) => TYPES.includes(d),
    question_used: (d) => { const p = parts(d, 2); return !!p && QUESTION_ID.test(p[0]) && BUILT.includes(p[1]); },
    chatbot_launched: (d) => { const p = parts(d, 2); return !!p && CHATBOTS.includes(p[0]) && TYPES.includes(p[1]); },
    // Which answer was picked to a shortlisting question: 'stage|soon|list'
    shortlist_answer: (d) => {
      const p = parts(d, 3);
      if (!p || !BUILT.includes(p[2])) return false;
      return p[0] === 'stage' ? STAGES.includes(p[1]) : p[0] === 'topic' ? TOPIC_ID.test(p[1]) : p[0] === 'style' ? STYLES.includes(p[1]) : false;
    },
    // A step of the personalised route was reached: '1' to '6'. Step 7 is prompt_ready.
    wizard_step: (d) => /^[1-6]$/.test(d),
    launch_dialog_opened: (d) => TYPES.includes(d),
    help_link: (d) => HELP_LINKS.includes(d),
    // A box had something in it when a personalised prompt was built
    field_used: (d) => FIELD_ID.test(d)
  };

  // Counted once per page load, so going back and forth in one visit does not count twice.
  // Held in memory only: it is gone when the page is closed or reloaded.
  const ONCE = ['landing_view', 'route_chosen', 'prompt_ready', 'question_used', 'shortlist_answer', 'wizard_step', 'launch_dialog_opened', 'help_link', 'field_used'];
  const sent = {};
  let queue = [];
  let timer = null;

  // Respect a browser's "do not track" signals
  const optedOut = () =>
    navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';

  const flush = () => {
    timer = null;
    const endpoint = window.STATS_ENDPOINT;
    const events = queue;
    queue = [];
    if (!endpoint || !events.length) return;
    const body = JSON.stringify({ events });
    // Sent as plain text with no cookies. "keepalive" lets it finish when the visitor
    // is leaving for a chatbot's tab. Failures are ignored: counting must never get in
    // the way of the tool.
    try {
      fetch(endpoint, { method: 'POST', body, keepalive: true, credentials: 'omit', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    } catch (e) {
      try { navigator.sendBeacon(endpoint, body); } catch (e2) {}
    }
  };

  window.track = function (event, detail) {
    try {
      detail = detail || '';
      if (!window.STATS_ENDPOINT || optedOut()) return;
      if (!DETAIL_OK[event] || !DETAIL_OK[event](detail)) return;
      if (ONCE.includes(event)) {
        const key = event + ' ' + detail;
        if (sent[key]) return;
        sent[key] = true;
      }
      queue.push({ event, detail });
      // Events raised together, such as one per selected question, go in one message
      if (!timer) timer = setTimeout(flush, 0);
    } catch (e) {}
  };

  // Clicks on the links to outside help (PO-77). Only which link, from the fixed list
  // above. Caught on the way down, because the dialogs stop clicks from bubbling up.
  const HELP_HOSTS = { 'www.moneyhelper.org.uk': 'moneyhelper', 'register.fca.org.uk': 'fca_register', 'www.retirementlivingstandards.org.uk': 'living_standards' };
  document.addEventListener('click', (e) => {
    try {
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const url = new URL(a.href);
      let name = HELP_HOSTS[url.hostname];
      if (url.hostname === 'consumerduty.org') name = url.pathname.includes('privacy') ? 'privacy_policy' : url.pathname.includes('keep-in-touch') ? 'report_problem' : undefined;
      if (name) window.track('help_link', name);
    } catch (err) {}
  }, true);

  window.track('landing_view');
})();
