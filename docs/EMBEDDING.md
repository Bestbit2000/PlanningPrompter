# Putting the tool in a frame on another site

How to show the Retirement Income Prompt Generator inside another site's page, as
consumerduty.org does, with one scroll bar (PO-91).

## Why it needs a snippet

A page cannot tell how tall the tool is going to be. The tool changes screens without
reloading, and its screens run from under one window tall to several windows tall. So
unless the page is told, the frame stays one size and anything longer scrolls inside
it, next to the page's own scroll bar.

The tool tells the page its height whenever it changes ([embed.js](../embed.js)). The
snippet below is the page's half: it listens, and sets the frame to that height.

Without the snippet the tool still works inside a frame, scrolling inside it as before.
Opened on its own, nothing changes.

## For consumerduty.org

The page at
`/working-groups/retirement-income-taskforce/retirement-income-prompt-generator` shows the
tool in a Joomla "wrapper" frame with the class `iframepageCSS`. Two changes, both on
that page.

### 1. The custom CSS

Its custom CSS ends with `height: 100vh !important;`. That fixes the frame at one window
tall. Take that line out, so the block reads:

```css
/* Custom CSS */
.iframepageCSS {
  border-style: none;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: calc(50% - 50vw) !important;
  margin-right: calc(50% - 50vw) !important;
}
```

The script below sets the height anyway, and wins over that line if it stays, but
leaving it would make the frame one window tall for a moment while the tool loads.

### 2. The script

Add this to the same page, anywhere after the frame. If the editor strips `<script>`
tags from articles, it can go in a custom HTML module on that page instead.

```html
<script>
/* Retirement income prompt generator: size the frame to the screen inside it */
(function () {
  var NS = 'rit-prompt:';
  function setUp() {
    var frame = document.querySelector('iframe.iframepageCSS');
    if (!frame) return;
    var send = function (msg) { if (frame.contentWindow) frame.contentWindow.postMessage(msg, '*'); };
    // Where the frame is on screen, so the tool can put its dialogs where they will be seen
    var sendView = function () {
      send({ type: NS + 'view', frameTop: frame.getBoundingClientRect().top, viewportHeight: window.innerHeight });
    };
    window.addEventListener('message', function (e) {
      if (e.source !== frame.contentWindow || !e.data) return;
      if (e.data.type === NS + 'height') {
        var height = Number(e.data.height);
        if (!isFinite(height) || height < 100 || height > 100000) return;
        frame.style.setProperty('height', Math.ceil(height) + 'px', 'important');
        frame.setAttribute('scrolling', 'no');
        sendView();
      } else if (e.data.type === NS + 'to-top') {
        // A new screen: bring the top of the tool into view if the page is scrolled past it
        var top = frame.getBoundingClientRect().top;
        if (top < 0) window.scrollBy(0, top);
      }
    });
    window.addEventListener('scroll', sendView, { passive: true });
    window.addEventListener('resize', sendView);
    // Tell the tool this page sizes the frame: now, and again whenever the frame loads
    frame.addEventListener('load', function () { send({ type: NS + 'fit' }); sendView(); });
    send({ type: NS + 'fit' });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setUp);
  else setUp();
})();
</script>
```

### Optional: the width

`width: 100vw` includes the page's own scroll bar, so the frame is about 15px wider than
the space it sits in and its right edge is cut off. Nothing in the tool sits that close
to the edge, so this can stay. If it is ever a problem, `width: 100%` with the
negative margins removed fits the frame to the column instead.

## Messages

Everything goes by `postMessage`, and each `type` starts `rit-prompt:`. Each side only
listens to the other: the tool to the page that holds it, the page to its frame.

| From | Type | With | Meaning |
|---|---|---|---|
| Tool | `height` | `height` | The tool's height in pixels. Sent when it loads and whenever it changes. |
| Tool | `to-top` | | A new screen: scroll the page so the top of the tool is in view. |
| Page | `fit` | | This page sizes the frame to fit, so the tool stops scrolling inside it. |
| Page | `view` | `frameTop`, `viewportHeight` | Where the frame is in the window, so dialogs and messages appear in the part on screen. |

## Updating the copy on consumerduty.org

The tool on consumerduty.org is a copy at `/Planning_Prompter/`. `embed.js` is a new
file from PO-91, so it has to be copied there along with the changed `index.html` and
`styles.css`.
