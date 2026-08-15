// Small inline icon + name for a tool mentioned in running text, using the same favicon
// lookup the rest of the app uses for real tool icons (see services/entries-service's
// FAVICON_LOOKUP_BASE) -- just hardcoded here since this is illustrative copy, not tied to
// a user's actual catalog entries.
const TOOL_DOMAINS = {
  GitHub: "github.com",
  Figma: "figma.com",
  Notion: "notion.so",
  Discord: "discord.com",
  Canva: "canva.com",
  "Daily News": "news.google.com",
};

export function toolIconUrl(name) {
  const domain = TOOL_DOMAINS[name];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
}

export default function ToolMention({ name }) {
  const iconUrl = toolIconUrl(name);
  return (
    <span className="tool-mention">
      {iconUrl && <img src={iconUrl} alt="" className="tool-mention-icon" />}
      <strong>{name}</strong>
    </span>
  );
}
