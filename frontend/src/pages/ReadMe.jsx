import ToolMention, { toolIconUrl } from "../components/ToolMention";

const SHOWCASE_TOOLS = ["GitHub", "Figma", "Notion", "Discord", "Canva"];

// A plain-language walkthrough of the app: what it's for, how to use it, and how it's deployed.
export default function ReadMe() {
  return (
    <div className="page">
      <h2 className="section-heading">Read me!</h2>
      <p style={{ fontSize: "1.05rem", marginBottom: "14px" }}>
        TTT ("Tool Task Tracker") grew out of a problem I kept running into this semester: juggling a dozen
        different tools for coursework and freelance work, and losing track of what I actually needed to{" "}
        <em>do</em> in each one. Sticky notes on my monitor didn't scale, and a generic to-do app didn't map
        to "which app do I need to open right now." So I built a whiteboard organized the way my week
        actually works: by day, and by tool.
      </p>

      <div className="tool-showcase">
        {SHOWCASE_TOOLS.map((name) => (
          <span key={name} className="tool-showcase-item">
            <img src={toolIconUrl(name)} alt="" />
            {name}
          </span>
        ))}
      </div>

      <h3 className="board-subheading">Why a board organized by day, not a flat to-do list</h3>
      <p style={{ marginBottom: "24px" }}>
        What needs to get done depends on which day it is. On a day with a deploy, GitHub and the CI
        dashboard matter. On a day I'm prepping a presentation, it's Canva and Notion. Instead of one flat
        list of tasks, every day gets its own board — the <strong>Board</strong> tab opens directly on today,
        and only the tools relevant to that day are shown.
      </p>

      <h3 className="board-subheading">A day, walked through</h3>
      <p style={{ marginBottom: "14px" }}>
        Example: it's a Tuesday. There's a pull request waiting for review on GitHub, a Figma mockup still
        owed to a teammate, and a Discord message that hasn't been answered yet. On the board, that looks
        like this:
      </p>
      <ol style={{ marginBottom: "20px", paddingLeft: "22px", lineHeight: 1.9 }}>
        <li>
          Open the <strong>Board</strong> tab — it opens on today's date by default.
        </li>
        <li>
          Under "Tools in use today", select <ToolMention name="GitHub" />, <ToolMention name="Figma" /> and{" "}
          <ToolMention name="Discord" /> — these only appear as options once they've been added in{" "}
          <strong>Settings</strong>.
        </li>
        <li>Three columns appear side by side. A post-it goes under each one, describing what's outstanding.</li>
        <li>
          The <strong>"Open GitHub"</strong> button under that column's notes opens github.com directly,
          without navigating there manually.
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
        <strong>Board, organized by day.</strong> Every note and every "tool in use" selection belongs to a
        specific date. The Prev / Next buttons and the date picker switch between days; notes added on
        Tuesday don't appear on Wednesday's board.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>Tool columns.</strong> Each tool added to a day gets its own column, side by side with the
        others. Post-its for that tool stack vertically underneath its icon. "+ New post-it" adds one, with
        an optional description and photo.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>Tool info, on hover.</strong> A small "i" next to each tool's name on the board opens a card
        with the tool's URL, a screenshot preview of the site, and its subscription cost (monthly or
        yearly), if one has been set in Settings.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>Open app.</strong> Every column has an "Open" button that opens that tool's website directly
        in a new tab.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <strong>General notes.</strong> A separate notes board below the tool columns, for notes that aren't
        tied to a specific tool.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <ToolMention name="GitHub" />. Live integration and connection to a personal GitHub repository via a
        Personal Access Token — issues sync automatically on the GitHub tab.
      </p>

      <p style={{ marginBottom: "14px" }}>
        <ToolMention name="Daily News" />. Selectable like any other tool. When added to a day's board, its
        column shows one cached, English-language news headline for that date.
      </p>

      <p style={{ marginBottom: "30px" }}>
        <strong>Settings.</strong> Where the personal tool catalog is built — the pool that "Tools in use
        today" selects from. The gear icon on any tool opens subscription cost and billing period settings
        (shown in that tool's "i" popover on the board). Adding a tool that isn't already listed requires its{" "}
        <strong>full website address</strong> (e.g. <code>linear.app</code>), not just a name — that's what
        the icon lookup uses to find the correct favicon.
      </p>

      <h3 className="board-subheading">Deployment</h3>
      <p style={{ marginBottom: "10px" }}>
        The hosted version linked for this submission — frontend, both backend services, the databases,
        image storage — runs on Netlify, Render, and Azure:
      </p>
      <ul style={{ marginBottom: "18px", paddingLeft: "22px", lineHeight: 1.9 }}>
        <li>
          <strong>Netlify</strong> — frontend
        </li>
        <li>
          <strong>Render</strong> — both backend microservices and their Postgres databases
        </li>
        <li>
          <strong>Azure</strong> — Blob Storage for post-it images, and the two serverless Functions
          (thumbnail generation, GitHub issue sync)
        </li>
      </ul>
      <p style={{ marginBottom: "24px" }}>
        Container orchestration is demonstrated separately, via Minikube run locally rather than hosted
        continuously. Azure Kubernetes Service was the first option; the VM SKUs an AKS node pool needs are
        blocked on the student subscription's quota, so Minikube runs the same Deployment/Service/Ingress
        setup instead. The manifests are in <code>k8s/</code> in the repository.
      </p>

      <p style={{ marginBottom: "10px" }}>
        Baseline: two replicas each of <code>entries-service</code>, <code>integrations-service</code> and{" "}
        <code>ttt-frontend</code>, plus <code>postgres</code> — seven pods, all <code>Running</code>:
      </p>
      <img
        src="/k8s-screenshots/1.png"
        alt="kubectl get pods showing seven running pods"
        className="k8s-screenshot"
      />

      <p style={{ marginTop: "20px", marginBottom: "10px" }}>
        Self-healing: one <code>entries-service</code> pod deleted on purpose.
      </p>
      <img src="/k8s-screenshots/kubectl-delete.png" alt="kubectl delete pod command" className="k8s-screenshot" />
      <p style={{ marginTop: "14px", marginBottom: "10px" }}>
        Immediately after: the deleted pod is still <code>Terminating</code>, and a replacement is already{" "}
        <code>Running</code> — the Deployment's replica count triggered that without manual intervention.
      </p>
      <img
        src="/k8s-screenshots/2.png"
        alt="kubectl get pods showing a pod terminating and its replacement already running"
        className="k8s-screenshot"
      />

      <p style={{ marginTop: "20px", marginBottom: "10px" }}>
        Scaling: <code>entries-service</code> scaled up on purpose.
      </p>
      <img
        src="/k8s-screenshots/kubectl-scale.png"
        alt="kubectl scale deployment command"
        className="k8s-screenshot"
      />
      <p style={{ marginTop: "14px", marginBottom: "10px" }}>
        Immediately after: four <code>entries-service</code> pods running instead of two (nine pods total).
      </p>
      <img
        src="/k8s-screenshots/3.png"
        alt="kubectl get pods showing four entries-service pods running"
        className="k8s-screenshot"
      />
    </div>
  );
}
