// A plain-language walkthrough of the app, written for anyone landing on it cold —
// including whoever's grading this for my HTW Berlin coursework.
export default function ReadMe() {
  return (
    <div className="page">
      <h2 className="section-heading">Read me!</h2>
      <p style={{ fontSize: "1.05rem", marginBottom: "10px" }}>
        Hey 👋 I'm a student at <strong>HTW Berlin</strong>, and TTT ("Tool Task Tracker") is a side project I
        built to solve a very specific problem of mine: I use a dozen different tools for uni and freelance
        work — GitHub, Figma, Notion, Discord, Canva, my email — and I kept losing track of what I actually
        needed to <em>do</em> in each one. Sticky notes on my monitor didn't scale, and a generic to-do app
        didn't map to "which app do I need to open right now." So I built a whiteboard that's organized the
        way my week actually is: by day, and by tool.
      </p>

      <h3 className="board-subheading">Why a board organized by day, not a flat to-do list</h3>
      <p style={{ marginBottom: "24px" }}>
        The whole app hinges on one idea: what I need to do depends on <em>which day it is</em>. On a day
        with a deploy, GitHub and the CI dashboard matter. On a day I'm prepping a presentation, it's Canva
        and Notion. So instead of one big pile of tasks, every day gets its own board — you open the{" "}
        <strong>Board</strong> tab, land straight on today, and only the tools relevant to that day show up.
      </p>

      <h3 className="board-subheading">A day, walked through</h3>
      <p style={{ marginBottom: "14px" }}>
        Say it's a Tuesday. I've got a pull request waiting for review on GitHub, I still owe a teammate a
        Figma mockup, and there's a Discord message I keep forgetting to answer. This is what that looks
        like on the board:
      </p>
      <ol style={{ marginBottom: "20px", paddingLeft: "22px", lineHeight: 1.9 }}>
        <li>
          Open the <strong>Board</strong> tab — it always drops me straight onto today, no picking a date
          first.
        </li>
        <li>
          Under "Tools in use today" I click <strong>GitHub</strong>, <strong>Figma</strong> and{" "}
          <strong>Discord</strong> — they're only shown as options because I already added them once in{" "}
          <strong>Settings</strong>.
        </li>
        <li>Three columns appear side by side. I stick one post-it under each, describing exactly what's outstanding.</li>
        <li>
          When I'm actually ready to do the work, I don't go hunting for a bookmark — I hit the{" "}
          <strong>"Open GitHub ↗"</strong> button under that column's notes and I'm on github.com.
        </li>
      </ol>

      <div className="corkboard" style={{ marginBottom: "36px" }}>
        <div className="post-it" style={{ background: "#D7D2CB" }}>
          <p className="post-it-title">Review PR #42</p>
          <p className="post-it-body">Anna's auth refactor — check the JWT middleware change before EOD.</p>
        </div>
        <div className="post-it" style={{ background: "#F6C6E0", transform: "rotate(-2deg)" }}>
          <p className="post-it-title">Finish landing mockup</p>
          <p className="post-it-body">Just the hero section + mobile breakpoint left.</p>
        </div>
        <div className="post-it" style={{ background: "#C7CFFA", transform: "rotate(1.5deg)" }}>
          <p className="post-it-title">Reply to Jonas</p>
          <p className="post-it-body">He asked about the group project deadline on Sunday.</p>
        </div>
      </div>

      <h3 className="board-subheading">Feature tour</h3>

      <p style={{ marginBottom: "14px" }}>
        <strong>📅 The board, organized by day.</strong> Every note and every "tool in use" choice belongs to
        a specific date. Use the ← Prev / Next → buttons or the date picker to jump around; nothing you add
        on Tuesday clutters Wednesday's board.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>🗂️ Tool columns, post-its stacked underneath.</strong> Each tool you pull onto a day gets its
        own column, side by side with the others (like the example above). Post-its for that tool stack
        vertically underneath its icon — click "+ New post-it" to add one, with an optional description and
        photo.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>ⓘ Tool info, on hover.</strong> Next to every tool's name on the board sits a small "i" —
        hover (or tab to it) and a card pops up with the tool's URL, a live screenshot preview of the site,
        and its subscription cost (monthly or yearly), if you've set that in Settings.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>🔗 Open app.</strong> Every column ends with an "Open &lt;tool&gt; ↗" button that jumps
        straight to that tool's actual website in a new tab — the whole point of the board is closing the
        gap between "I wrote down what to do" and "I'm now doing it."
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>📝 General notes.</strong> Not everything belongs to one app — "buy groceries" or "call
        mom" isn't a GitHub task. Below the tool columns, every day also gets a general notes board for
        anything that doesn't fit under a specific tool.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>🐙 GitHub, live.</strong> GitHub isn't just an icon — connect a repo with a personal access
        token on the GitHub tab and it pulls in your real issues, refreshed automatically.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>📰 Daily News.</strong> "Daily News" is a tool like any other — add it in Settings, pull it
        onto a day, and its column shows one cached English-language headline for that date (from a free
        news API), so catching up on the world can live on the same board as everything else.
      </p>

      <p style={{ marginBottom: "30px" }}>
        <strong>⚙️ Settings.</strong> This is where you build your personal tool catalog — the pool that
        "Tools in use today" picks from. Click the ⚙ on any tool to open a small dialog and set its
        subscription cost and whether it's billed monthly or yearly (shows up in that tool's "i" popover on
        the board). Adding a tool that isn't already listed needs its{" "}
        <strong>full website address</strong> (e.g. <code>linear.app</code>), not just a name — that's what
        the icon lookup actually needs to find the right favicon.
      </p>

      <h3 className="board-subheading">The technical bit, for HTW</h3>
      <p style={{ marginBottom: "0" }}>
        Under the hood it's two independent Node/Express microservices (one for tools/notes, one for
        third-party integrations) each with their own Postgres database, a React/Vite frontend, images in
        Azure Blob Storage, two serverless functions (a blob-triggered thumbnail generator and a
        timer-triggered GitHub issue sync), Docker containers for every service, and Kubernetes manifests to
        orchestrate the lot — see the <code>README.md</code> in the repo for the full architecture and how
        to run it locally.
      </p>
    </div>
  );
}
