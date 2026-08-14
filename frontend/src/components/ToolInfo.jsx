import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const POPOVER_WIDTH = 480;

// The little "i" icon next to a tool on the board. Hovering (or focusing, for keyboard
// users) reveals its URL, a live screenshot preview of the site, and its subscription
// cost -- all set once in Settings.
//
// The popover is rendered through a portal into document.body, positioned with
// `position: fixed` computed from the icon's on-screen location. It can't just be an
// absolutely-positioned child of the icon: `.board-row` (the horizontally-scrolling strip
// of tool columns) sets `overflow-x: auto`, and per the CSS overflow spec that silently
// forces `overflow-y` to `auto` too -- so a plain absolute popover gets its bottom sheared
// off by the row's own clipping the moment it's taller than the row. Escaping to the body
// via a portal sidesteps that entirely, and lets us clamp the horizontal position so a
// wide popover doesn't run off the left/right edge of the viewport for tools near the
// edge of the screen.
export default function ToolInfo({ tool }) {
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [style, setStyle] = useState(null);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);

  const open = hovering || focused;

  function place() {
    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
    setStyle({ position: "fixed", top: rect.bottom + 8, left, width });
  }

  // Focus can move from the icon straight into the link inside the portaled popover (they
  // aren't DOM siblings, so :focus-within can't track that for us) -- only actually close
  // when focus lands somewhere outside both.
  function handleBlur(e) {
    const next = e.relatedTarget;
    if (next && (anchorRef.current?.contains(next) || popoverRef.current?.contains(next))) return;
    setFocused(false);
  }

  const url = tool.domain ? `https://${tool.domain}` : null;
  // A free, keyless screenshot service (WordPress's "mshots") -- same "no API key needed"
  // approach as the Daily News headline. It wants the trailing slash on the target URL
  // (without it, it 403s instead of rendering). The first request for a URL it hasn't seen
  // yet can also come back as a small generic "still loading" placeholder while the real
  // screenshot renders in the background -- the fixed box size + object-fit below keeps
  // that placeholder from looking broken either way; opening the popover again shortly
  // after shows the actual page.
  const previewSrc = url
    ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(`${url}/`)}?w=800&h=500`
    : null;

  return (
    <span
      className="tool-info"
      ref={anchorRef}
      tabIndex={0}
      onMouseEnter={() => {
        place();
        setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => {
        place();
        setFocused(true);
      }}
      onBlur={handleBlur}
    >
      <span className="tool-info-icon" aria-label={`About ${tool.name}`}>
        i
      </span>
      {open &&
        style &&
        createPortal(
          <div
            className="tool-info-popover"
            style={style}
            ref={popoverRef}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <p className="tool-info-name">{tool.name}</p>
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="tool-info-url">
                {tool.domain}
              </a>
            )}
            {previewSrc && !previewFailed && (
              <img
                className="tool-info-preview"
                src={previewSrc}
                alt={`Preview of ${tool.name}`}
                onError={() => setPreviewFailed(true)}
              />
            )}
            {previewSrc && previewFailed && (
              <p className="tool-info-preview-fallback">Preview unavailable right now.</p>
            )}
            <p className="tool-info-cost">
              {tool.cost != null
                ? `€${Number(tool.cost).toFixed(2)} / ${tool.billing_period === "yearly" ? "year" : "month"}`
                : "No subscription cost set"}
            </p>
          </div>,
          document.body
        )}
    </span>
  );
}
