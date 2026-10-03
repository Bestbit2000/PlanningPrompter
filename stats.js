// Usage counts (PO-19). See docs/STATS-PLAN.md.
//
// Sends the name of an event and one or two fixed labels to a counter, which keeps
// daily totals only. It never sends anything the user typed, the text of a prompt,
// or anything that identifies a visitor, and it writes nothing to the device.
//
// The one setting: the address of the counter. Leave it empty and nothing is sent,
// so the tool works unchanged on a host with no counter.
window.STATS_ENDPOINT = 'https://br-raspy-shadow-b1uel7je-usagecounter.compute.c-5.eu-central-1.aws.neon.tech/';

(function () {
  const TYPES = ['starter', 'list', 'personalised'];
  const CHATBOTS = ['chatgpt', 'claude', 'copilot', 'gemini', 'perplexity'];
  const QUESTION_ID = /^[A-Za-z]{1,30}_\d{1,3}$/;

  // What each event may carry. Anything else is dropped here, and again by the counter.
  const DETAIL_OK = {
    landing_view: (d) => d === '',
    route_chosen: (d) => TYPES.includes(d),
    prompt_ready: (d) => TYPES.includes(d),
    prompt_copied: (d) => TYPES.includes(d),
    question_used: (d) => {
      const [id, type, extra] = d.split('|');
      return extra === undefined && QUESTION_ID.test(id || '') && (type === 'list' || type === 'personalised');
    },
    chatbot_launched: (d) => {
      const [bot, type, extra] = d.split('|');
      return extra === undefined && CHATBOTS.includes(bot) && TYPES.includes(type);
    }
  };

  // Counted once per page load, so going back and forth in one visit does not count twice.
  // Held in memory only: it is gone when the page is closed or reloaded.
  const ONCE = ['landing_view', 'route_chosen', 'prompt_ready', 'question_used'];
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

  window.track('landing_view');
})();
