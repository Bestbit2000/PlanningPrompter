// Running inside a frame on another site, such as consumerduty.org (PO-91). See docs/EMBEDDING.md.
//
// Opened on its own, this does nothing. Inside a frame it drops the full-window minimum
// height and tells the page around it how tall the tool is, every time that changes.
// Once that page answers that it sizes the frame to fit, the frame stops scrolling on
// its own, so there is one scroll bar: the page's. Without an answer the tool keeps
// scrolling inside the frame, as before.
//
// Messages, all with a "type" starting "rit-prompt:":
//   to the page:   height {height}, to-top
//   from the page: fit, view {frameTop, viewportHeight}
(function () {
  let framed;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!framed) return;

  const NS = 'rit-prompt:';
  const root = document.documentElement;
  root.classList.add('embedded');
  let fitted = false;
  let lastHeight = 0;
  let view = null;

  const post = (msg) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} };

  // The tool's own height, not the frame's: the wrapper holds everything that takes up room.
  const contentHeight = () => {
    const shell = document.querySelector('.app-shell') || document.body;
    return shell ? Math.ceil(shell.getBoundingClientRect().height) : 0;
  };

  const sendHeight = (force) => {
    const height = contentHeight();
    if (!height || (!force && height === lastHeight)) return;
    lastHeight = height;
    post({ type: NS + 'height', height });
  };

  // A frame that fits its content is as tall as the tool, so "the window" for a dialog or
  // a toast is the part of the frame the page is showing. Work that out from where the
  // page says the frame is, and hand it to the CSS.
  const applyView = () => {
    if (!view) return;
    const frameHeight = window.innerHeight;
    let top = Math.max(0, -view.frameTop);
    let height = Math.min(frameHeight, view.viewportHeight - view.frameTop) - top;
    // Barely on screen: use a window-sized stretch of the frame instead
    if (height < 240) {
      height = Math.min(frameHeight, view.viewportHeight);
      top = Math.max(0, Math.min(top, frameHeight - height));
    }
    root.style.setProperty('--embed-view-top', top + 'px');
    root.style.setProperty('--embed-view-height', height + 'px');
  };

  window.addEventListener('message', (e) => {
    if (e.source !== window.parent || !e.data || typeof e.data.type !== 'string') return;
    if (e.data.type === NS + 'fit') {
      if (fitted) return;
      fitted = true;
      root.classList.add('embed-fit');
      sendHeight(true);
    } else if (e.data.type === NS + 'view') {
      const frameTop = Number(e.data.frameTop);
      const viewportHeight = Number(e.data.viewportHeight);
      if (!isFinite(frameTop) || !isFinite(viewportHeight) || viewportHeight <= 0) return;
      view = { frameTop, viewportHeight };
      applyView();
    }
  });

  window.addEventListener('resize', () => { sendHeight(); applyView(); });
  // Images and fonts arriving change the height too
  window.addEventListener('load', () => sendHeight());

  const start = () => {
    if (window.ResizeObserver) new ResizeObserver(() => sendHeight()).observe(document.body);
    sendHeight(true);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // A link to a place on this page, such as "Get started". The browser would scroll the
  // frame, which no longer scrolls, and it will not scroll the page around the frame when
  // that page is on another site (www.consumerduty.org around consumerduty.org). Scrolling
  // the place into view does both, so do that, and update the address as the link would (PO-99).
  document.addEventListener('click', (e) => {
    if (!fitted || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest && e.target.closest('a[href^="#"]');
    const id = link && decodeURIComponent(link.getAttribute('href').slice(1));
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ block: 'start' });
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  });

  window.embedFrame = {
    // The tool calls this after every update, in case the browser does not report the change
    measure: () => sendHeight(),
    // A new screen starts at the top. The frame no longer scrolls, so ask the page to.
    toTop: () => { if (fitted) post({ type: NS + 'to-top' }); }
  };
})();
