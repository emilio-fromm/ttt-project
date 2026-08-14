import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { entriesApi, integrationsApi } from "../api/client";
import PostIt from "../components/PostIt";
import NewEntryForm from "../components/NewEntryForm";
import ToolInfo from "../components/ToolInfo";
import { formatDisplayDate, shiftDate, todayISO } from "../utils/date";

// Well-known domains for the two "live" tools, used to decide what special content
// (besides plain post-its) a column should render.
const GITHUB_DOMAIN = "github.com";
const NEWS_DOMAIN = "news.google.com";

// The whole app lives on this one page: pick a day, pick which tools are in use that
// day, then work the board — tools sit in columns side by side, and each column's
// post-its stack vertically underneath its icon. General notes get their own board
// at the bottom for anything that isn't tied to a particular tool.
export default function DayView() {
  const { date } = useParams();
  const navigate = useNavigate();

  const [myTools, setMyTools] = useState([]);
  const [dayTools, setDayTools] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(null); // a tool id, "general", or null
  const [news, setNews] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(false);

  useEffect(() => {
    setOpenForm(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (!dayTools.some((t) => t.domain === NEWS_DOMAIN)) {
      setNews(null);
      return;
    }
    setNewsLoading(true);
    setNewsError(false);
    integrationsApi
      .get("/news/today", { params: { date } })
      .then((res) => setNews(res.data.news))
      .catch(() => setNewsError(true))
      .finally(() => setNewsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayTools, date]);

  async function load() {
    setLoading(true);
    const [mine, dt, es] = await Promise.all([
      entriesApi.get("/tools/mine").then((r) => r.data.tools),
      entriesApi.get("/tools/day", { params: { date } }).then((r) => r.data.tools),
      entriesApi.get("/entries", { params: { date } }).then((r) => r.data.entries),
    ]);
    setMyTools(mine);
    setDayTools(dt);
    setEntries(es);
    setLoading(false);
  }

  function goTo(newDate) {
    navigate(`/day/${newDate}`);
  }

  async function addDayTool(toolId) {
    await entriesApi.post("/tools/day", { toolId, date });
    load();
  }

  async function removeDayTool(toolId) {
    setDayTools((prev) => prev.filter((t) => t.id !== toolId));
    await entriesApi.delete(`/tools/day/${toolId}`, { params: { date } });
  }

  async function handleDelete(entryId) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    await entriesApi.delete(`/entries/${entryId}`);
  }

  function handleCreated(entry) {
    setEntries((prev) => [entry, ...prev]);
    setOpenForm(null);
  }

  if (loading) return <div className="page">Loading...</div>;

  const entriesByTool = {};
  const generalEntries = [];
  for (const entry of entries) {
    if (entry.tool_id) {
      (entriesByTool[entry.tool_id] ||= []).push(entry);
    } else {
      generalEntries.push(entry);
    }
  }
  const dayToolIds = new Set(dayTools.map((t) => t.id));

  return (
    <div className="page">
      <div className="day-header">
        <button className="marker-btn small" onClick={() => goTo(shiftDate(date, -1))}>
          ← Prev
        </button>
        <div className="day-header-center">
          <h2 className="section-heading" style={{ margin: 0 }}>
            {formatDisplayDate(date)}
          </h2>
          <div className="day-picker">
            <input
              className="marker-input"
              type="date"
              value={date}
              onChange={(e) => e.target.value && goTo(e.target.value)}
            />
            {date !== todayISO() && (
              <button className="marker-btn small ghost" onClick={() => goTo(todayISO())}>
                Today
              </button>
            )}
          </div>
        </div>
        <button className="marker-btn small" onClick={() => goTo(shiftDate(date, 1))}>
          Next →
        </button>
      </div>

      <h3 className="board-subheading">Tools in use today</h3>
      {myTools.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: "28px" }}>
          You haven't picked any tools yet. <Link to="/settings">Add some in Settings</Link> first.
        </div>
      ) : (
        <div className="tool-picker-grid" style={{ marginBottom: "28px" }}>
          {myTools.map((tool) => {
            const active = dayToolIds.has(tool.id);
            return (
              <div
                key={tool.id}
                className={`tool-picker-item ${active ? "selected" : ""}`}
                onClick={() => (active ? removeDayTool(tool.id) : addDayTool(tool.id))}
                title={active ? "Remove from today's board" : "Add to today's board"}
              >
                <img src={tool.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
                {tool.name}
                {active ? " ✕" : ""}
              </div>
            );
          })}
        </div>
      )}

      {dayTools.length > 0 && (
        <div className="board-row">
          {dayTools.map((tool) => {
            const isNews = tool.domain === NEWS_DOMAIN;
            const isGithub = tool.domain === GITHUB_DOMAIN;
            return (
              <div key={tool.id} className="board-column">
                <div className="board-column-heading">
                  <img src={tool.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
                  <h3>{tool.name}</h3>
                  <ToolInfo tool={tool} />
                </div>
                {isGithub && (
                  <p className="tool-badge" style={{ marginBottom: "10px" }}>
                    live integration — see <Link to="/github">GitHub</Link> for issues
                  </p>
                )}

                {isNews && (
                  <div className="news-card">
                    {newsLoading ? (
                      <p style={{ margin: 0 }}>Fetching today's headline…</p>
                    ) : newsError ? (
                      <p style={{ margin: 0 }}>Couldn't load today's news, try again later.</p>
                    ) : news ? (
                      <>
                        {news.source && <span className="news-source">{news.source}</span>}
                        <p className="news-title">{news.title}</p>
                        {news.description && <p className="news-description">{news.description}</p>}
                        <a
                          className="marker-btn small"
                          href={news.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ alignSelf: "flex-start" }}
                        >
                          Read more
                        </a>
                      </>
                    ) : (
                      <p style={{ margin: 0 }}>No headline available today.</p>
                    )}
                  </div>
                )}

                <div className="corkboard-stack">
                  {(entriesByTool[tool.id] || []).map((entry) => (
                    <PostIt key={entry.id} entry={entry} onDelete={handleDelete} />
                  ))}
                  {tool.domain && (
                    <a
                      className="marker-btn small ghost open-app-btn"
                      href={`https://${tool.domain}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {tool.name} ↗
                    </a>
                  )}
                  {openForm === tool.id ? (
                    <NewEntryForm
                      toolId={tool.id}
                      date={date}
                      onCreated={handleCreated}
                      onCancel={() => setOpenForm(null)}
                    />
                  ) : (
                    <button className="new-post-it" onClick={() => setOpenForm(tool.id)}>
                      + New post-it
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="board-section">
        <div className="board-section-heading">
          <h3>General notes</h3>
        </div>
        <p style={{ marginTop: 0, marginBottom: "12px", color: "var(--ink-soft)" }}>
          Anything that isn't tied to a particular tool goes here.
        </p>
        <div className="corkboard">
          {generalEntries.map((entry) => (
            <PostIt key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
          {openForm === "general" ? (
            <NewEntryForm toolId={null} date={date} onCreated={handleCreated} onCancel={() => setOpenForm(null)} />
          ) : (
            <button className="new-post-it" onClick={() => setOpenForm("general")}>
              + New post-it
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
