
================================================================================
## FILE: index.html  (28 lines)
================================================================================

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Diary - Journal & Reflections</title>
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <style>
      /* Inline styles so the page background is correct before React mounts */
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #fffbeb;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

================================================================================
## FILE: vite.config.js  (16 lines)
================================================================================

```html
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});

```

================================================================================
## FILE: package.json  (44 lines)
================================================================================

```json
{
  "name": "sandbox-workspace",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "create-auth-user": "node scripts/create-auth-user.mjs"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@rolldown/pluginutils": "^1.0.1",
    "@supabase/supabase-js": "^2.117.3",
    "@tailwindcss/node": "^4.3.3",
    "@tailwindcss/oxide": "^4.3.3",
    "canvas-confetti": "^1.9.3",
    "date-fns": "^2.30.0",
    "fdir": "^6.5.0",
    "framer-motion": "^11.16.1",
    "html2canvas": "^1.4.1",
    "jspdf": "^4.2.1",
    "lucide-react": "^0.294.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "recharts": "^2.10.0",
    "tinyglobby": "^0.2.17",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@types/canvas-confetti": "^1.6.4",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.7",
    "@vitejs/plugin-react": "^4.7.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.9.3",
    "vite": "^6.3.5"
  }
}

```

================================================================================
## FILE: .gitignore  (2 lines)
================================================================================

```
node_modules/

```

================================================================================
## FILE: src/main.jsx  (6 lines)
================================================================================

```html
import { jsx } from "react/jsx-runtime";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx(App, {}));

```

================================================================================
## FILE: src/App.jsx  (1614 lines)
================================================================================

```html
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import {
  HEADING_CATEGORIES,
  defaultHeading,
  buildHeadingText,
  parseTemplateEntries,
  compareChronologically,
  dateRangeOf
} from "./lib/headings";
import { FIXED_USER_ID, ensureSupabaseSession } from "./lib/hardcodedAuth";
import { readLocalSession, clearLocalSession, writeLocalSessionItem, readLocalSessionItem } from "./lib/localSession";
import { exportDiaryToA4Pdf, renderSheetNode, CONTENT_W_CSS, CSS_PX_PER_MM, computeAvailableFlowHeightCss, resolveStickerPlacements } from "./lib/pdfExport";
import { resolveImageUrl, loadDataUrlCached, RobustImg } from "./lib/images";
import { LoveStoryHeader, LoveStoryFooter } from "./lib/loveStory";
const PX_PER_MM = CSS_PX_PER_MM;
function printClone(node) {
  const c = node.cloneNode(true);
  c.querySelectorAll("button").forEach((b) => b.remove());
  return c;
}
const STICKERS_KEY = "diary_stickers_v1";
// HARD-CODED sticker policy: stickers are disabled in the UI. The only way to
// add one is by editing HARDCODED_STICKERS below (links will be provided later).
// Set entries here and they will render on every page & appear in the PDF.
const HARDCODED_STICKER_LINKS = [];
const HARDCODED_STICKERS = HARDCODED_STICKER_LINKS.map((link, i) => ({
  id: `hardcoded-${i}`,
  url: resolveImageUrl(link),
  // page -2 = scatter across ALL pages at deterministic seeded positions
  page: -2,
  sizePct: 12,
  rotate: -4 + i * 7 % 9
}));
const SHEET_ASPECT_MM = 297 / 210;
const STICKER_MAX_Y_PCT = 86;
function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [heading, setHeading] = useState(defaultHeading());
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [reflection, setReflection] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sheetScale, setSheetScale] = useState(1);
  const sheetWrapRef = useRef(null);
  // Stickers are hard-coded only — any stickers previously saved from the (now
  // removed) UI are ignored on load.
  const [stickers, setStickers] = useState(HARDCODED_STICKERS);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerUrl, setStickerUrl] = useState("");
  const [stickerSize, setStickerSize] = useState(25);
  const [stickerRotate, setStickerRotate] = useState(-3);
  const [placingMode, setPlacingMode] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(null);
  const [flipDir, setFlipDir] = useState("next");
  // The single visible preview sheet (.a4-page). Print/Save flips this exact
  // node through every page index and snapshots it, so printed pages are
  // guaranteed identical to the HTML preview.
  const pageNodeRef = useRef(null);
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const session = await readLocalSession();
        if (!mounted) return;
        if (session) {
          const uid = await ensureSupabaseSession();
          if (!mounted) return;
          setUser({ id: uid, email: FIXED_USER_ID, name: FIXED_USER_ID });
          setSenderName("Deep");
          fetchEntries(uid);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initAuth();
    return () => {
      mounted = false;
    };
  }, []);
  const handleAuthSuccess = async () => {
    const uid = await ensureSupabaseSession();
    setUser({ id: uid, email: FIXED_USER_ID, name: FIXED_USER_ID });
    setSenderName("Deep");
    fetchEntries(uid);
  };
  const fetchEntries = async (_uid) => {
    try {
      const { data, error } = await supabase.from("diary_entries").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching entries:", error);
        setImportStatus({ type: "error", message: "Failed to load entries" });
      } else {
        setEntries(data.map(mapSupabaseEntry));
      }
    } catch (err) {
      console.error("Error fetching entries:", err);
      setImportStatus({ type: "error", message: "Failed to load entries" });
    }
  };
  const mapSupabaseEntry = (entry) => ({
    id: entry.id,
    heading: entry.heading || defaultHeading(),
    dateTime: entry.date_time,
    senderName: entry.sender_name,
    message: entry.message,
    reflection: entry.reflection
  });
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (importStatus) {
      const timer = setTimeout(() => setImportStatus(null), 4e3);
      return () => clearTimeout(timer);
    }
  }, [importStatus]);
  const getCurrentDateTime = () => {
    const now = /* @__PURE__ */ new Date();
    return now.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const handleLogout = async () => {
    clearLocalSession();
    try {
      await supabase.auth.signOut();
    } catch {
    }
    setUser(null);
    setEntries([]);
    await import("./lib/hardcodedAuth").then((m) => m.resetCachedUserId());
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !reflection.trim() || !user) return;
    const entryData = {
      user_id: user.id,
      heading: heading || defaultHeading(),
      date_time: getCurrentDateTime(),
      sender_name: (senderName === FIXED_USER_ID ? "Deep" : senderName) || "Deep",
      message: message.trim(),
      reflection: reflection.trim()
    };
    if (editingId) {
      const { error } = await supabase.from("diary_entries").update(entryData).eq("id", editingId);
      if (error) {
        setImportStatus({ type: "error", message: `Failed to update entry: ${error.message}` });
      } else {
        setImportStatus({ type: "success", message: "Entry updated successfully!" });
        fetchEntries();
      }
    } else {
      const { error } = await supabase.from("diary_entries").insert([entryData]);
      if (error) {
        setImportStatus({ type: "error", message: `Failed to save entry: ${error.message}` });
      } else {
        setImportStatus({ type: "success", message: "Entry saved successfully!" });
        fetchEntries();
      }
    }
    setMessage("");
    setReflection("");
    setShowForm(false);
    setEditingId(null);
  };
  const handleEdit = (entry) => {
    setHeading(entry.heading || defaultHeading());
    setSenderName(entry.senderName);
    setMessage(entry.message);
    setReflection(entry.reflection);
    setEditingId(entry.id);
    setShowForm(true);
  };
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      const { error } = await supabase.from("diary_entries").delete().eq("id", id);
      if (error) {
        setImportStatus({ type: "error", message: "Failed to delete entry" });
      } else {
        setImportStatus({ type: "success", message: "Entry deleted successfully!" });
        fetchEntries();
      }
    }
  };
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setHeading(defaultHeading());
    setMessage("");
    setReflection("");
  };
  const buildCompleteDiary = (list) => {
    const chrono = [...list].sort(compareChronologically);
    const canonical = new Set(HEADING_CATEGORIES.map((c) => buildHeadingText(c.emoji, c.title)));
    const withHeading = chrono.map((e) => ({
      ...e,
      assignedHeading: canonical.has(e.heading || "") ? e.heading : autoClassifyHeading(e)
    }));
    const groups = [];
    const indexByHeading = /* @__PURE__ */ new Map();
    for (const e of withHeading) {
      let idx = indexByHeading.get(e.assignedHeading);
      if (idx === void 0) {
        idx = groups.length;
        indexByHeading.set(e.assignedHeading, idx);
        groups.push({ heading: e.assignedHeading, number: idx + 1, items: [] });
      }
      groups[idx].items.push(e);
    }
    return groups;
  };
  const autoClassifyHeading = (e) => {
    const t = `${e.message} ${e.reflection}`.toLowerCase();
    const has = (...words) => words.some((w) => t.includes(w));
    const isHer = /chota don/i.test(e.senderName);
    if (has("kesha")) return "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466} About Kesha (Her Sister)";
    if (has("arya")) return "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466} About Arya (Her Brother)";
    if (has("good morning", "gm ", "morning \u2600", "sunrise", "good night", "goodnight", "gn ", "night \u{1F319}", "sleep tight", "fell asleep"))
      return "\u{1F305} Morning & Night Greetings";
    if (has("no reply", "hasn", "didn't reply", "not replied", "waiting for reply", "still waiting", "left on read", "seen but no reply"))
      return "\u{1F4AD} My Messages To Her (No Reply Yet)";
    if (has("marry", "future", "plan", "dream", "goal", "someday", "life together", "kids", "house"))
      return "\u{1F3AF} Dreams & Future Plans";
    if (has("intimate", "private - intimate", "passionate", "spicy", "kiss", "hold you", "miss your touch", "desire", "attraction", "beautiful body", "crave"))
      return "\u{1F319} Intimate & Passionate Talks";
    if (has("love you", "i love", "love of my life", "forever yours", "confess", "yours only", "heart belongs"))
      return "\u{1F495} Romantic Confessions";
    if (has("flirt", "tease", "joke", "lol", "lmao", "haha", "funny", "\u{1F602}", "\u{1F923}", "silly", "bakchodi"))
      return "\u{1F604} Fun Moments & Jokes";
    if (has("sad", "cry", "crying", "upset", "angry", "fight", "argument", "worried", "anxious", "stress", "tired", "support", "care about", "take care", "eat something", "health"))
      return "\u{1F917} Emotional Support & Care";
    if (has("compliment", "pretty", "cute", "gorgeous", "smart", "best girl", "proud of you", "adorable", "sweet"))
      return "\u{1F496} Sweet Compliments & Love";
    if (isHer && !e.reflection) return "\u{1F48C} Her Messages To Me";
    return "\u{1F4AC} Daily Life & Important Updates";
  };
  const buildSummaryLines = (list) => {
    const total = list.length;
    const hers = list.filter((e) => /chota don/i.test(e.senderName)).length;
    const mine = total - hers;
    const sorted = [...list].sort(compareChronologically);
    const firstDate = sorted[0]?.dateTime || "the beginning";
    const lastDate = sorted[sorted.length - 1]?.dateTime || "today";
    const range = dateRangeOf(list.map((e) => e.dateTime)) || "dates not specified";
    return [
      `This diary holds ${total} precious moments between me (Deep) and \u{1FAF0}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618}, spanning ${range}.`,
      `From ${firstDate} to ${lastDate}, every entry shows how our bond grows stronger day by day.`,
      `Our sweet morning and night greetings are the threads that tie each day together.`,
      `${mine} of my messages and ${hers} of her messages make up the daily rhythm of our connection.`,
      `The compliments, flirty banter, and romantic confessions keep the spark alive between us.`,
      `Even in the quiet moments when she hasn't replied, I choose patience because waiting for her feels worth it.`,
      `Her care \u2014 asking if I ate, wishing me good sleep \u2014 makes me feel truly loved and protected.`,
      `My dreams of a future with her give every single day a deeper meaning.`,
      `She makes me feel seen, cherished, and complete; this diary is proof of our beautiful journey.`,
      `I am grateful for every word we have shared, and for every one still to come.`
    ];
  };
  const handleExportJSON = () => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diary-entries-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
    setImportStatus({ type: "success", message: `Exported ${entries.length} entries successfully!` });
  };
  const handleExportText = () => {
    const groups = buildCompleteDiary(entries);
    const range = dateRangeOf(entries.map((e) => e.dateTime)) || "Dates not specified";
    const headingSections = groups.map((group) => {
      const lines = group.items.map(
        (entry) => `- Message: ${entry.dateTime} - ${entry.senderName}: "${entry.message}"
  What I felt: ${entry.reflection}`
      );
      return `#### HEADING ${group.number}: ${group.heading}

${lines.join("\n\n")}

---
`;
    }).join("\n");
    const total = entries.length;
    const hers = entries.filter((e) => /chota don/i.test(e.senderName)).length;
    const mine = total - hers;
    const sortedDates = [...entries].sort(compareChronologically);
    const firstDate = sortedDates[0]?.dateTime || "the beginning";
    const lastDate = sortedDates[sortedDates.length - 1]?.dateTime || "today";
    const summaryLines = [
      `This diary holds ${total} precious moments between me (Deep) and \u{1FAF0}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618}, spanning ${range}.`,
      `From ${firstDate} to ${lastDate}, every entry shows how our bond grows stronger day by day.`,
      `Our sweet morning and night greetings are the threads that tie each day together.`,
      `${mine} of my messages and ${hers} of her messages make up the daily rhythm of our connection.`,
      `The compliments, flirty banter, and romantic confessions keep the spark alive between us.`,
      `Even in the quiet moments when she hasn't replied, I choose patience because waiting for her feels worth it.`,
      `Her care \u2014 asking if I ate, wishing me good sleep \u2014 makes me feel truly loved and protected.`,
      `My dreams of a future with her give every single day a deeper meaning.`,
      `She makes me feel seen, cherished, and complete; this diary is proof of our beautiful journey.`,
      `I am grateful for every word we have shared, and for every one still to come.`
    ];
    const summary = [
      `### \u{1F4CC} FINAL SUMMARY - COMPLETE DIARY`,
      ``,
      ...summaryLines,
      ``,
      `========================================`
    ].join("\n");
    const text = [
      `========================================`,
      `\u{1F4D6} COMPLETE DIARY - DEEP & \u{1FAF0}\u{1FAF6}\u{1F3FB}CHOTA DON\u2763\uFE0F\u2764\uFE0F\u{1F618}`,
      `========================================`,
      ``,
      `### Date: ${range}`,
      ``,
      `---`,
      ``,
      headingSections,
      summary
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diary-entries-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
    setImportStatus({ type: "success", message: `Exported ${entries.length} entries as text!` });
  };
  const parseTextEntries = (text) => {
    const templated = parseTemplateEntries(text);
    if (templated.length > 0) {
      return templated.map((t) => ({
        heading: t.heading,
        dateTime: t.dateTime,
        senderName: t.senderName,
        message: t.message,
        reflection: t.reflection
      }));
    }
    const parsed = [];
    const blocks = text.split(/\n---\n|\n\n(?=Message:)/);
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      const messageRegex = /Message:\s*(.+?)\s*-\s*(.+?):\s*"(.+?)"/s;
      const messageMatch = trimmed.match(messageRegex);
      if (messageMatch) {
        const dateTime = messageMatch[1].trim();
        const senderName2 = messageMatch[2].trim();
        const messageContent = messageMatch[3].trim();
        const reflectionRegex = /What I felt:\s*(.+)/s;
        const reflectionMatch = trimmed.match(reflectionRegex);
        const reflectionContent = reflectionMatch ? reflectionMatch[1].trim() : "";
        if (messageContent) {
          parsed.push({
            heading: defaultHeading(),
            dateTime,
            senderName: senderName2,
            message: messageContent,
            reflection: reflectionContent
          });
        }
      }
    }
    return parsed;
  };
  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        let imported = [];
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            imported = data.map((item) => ({
              heading: item.heading || item.date_heading || defaultHeading(),
              dateTime: item.dateTime || item.date_time || "Unknown date",
              senderName: item.senderName || item.sender_name || "Anonymous",
              message: item.message || "",
              reflection: item.reflection || ""
            }));
          } else {
            throw new Error("Invalid JSON format. Expected an array of entries.");
          }
        } else if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          imported = parseTextEntries(content);
          if (imported.length === 0) {
            throw new Error("Could not parse any entries from this text file.");
          }
        } else {
          throw new Error("Unsupported file format. Please use .json or .txt files.");
        }
        if (imported.length === 0) {
          throw new Error("No valid entries found in the file.");
        }
        imported.sort(compareChronologically);
        const entriesToInsert = imported.map((entry) => ({
          user_id: user.id,
          heading: entry.heading || defaultHeading(),
          date_time: entry.dateTime,
          sender_name: entry.senderName,
          message: entry.message,
          reflection: entry.reflection
        }));
        const { error } = await supabase.from("diary_entries").insert(entriesToInsert);
        if (error) throw error;
        setShowImportModal(false);
        setImportStatus({ type: "success", message: `Successfully imported ${imported.length} ${imported.length === 1 ? "entry" : "entries"}!` });
        fetchEntries();
      } catch (err) {
        setImportStatus({ type: "error", message: err.message || "Failed to import file." });
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: "error", message: "Failed to read the file." });
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleImportClick = () => {
    setShowMenu(false);
    setShowImportModal(true);
  };
  const filteredEntries = entries.filter(
    (entry) => entry.message.toLowerCase().includes(searchQuery.toLowerCase()) || entry.reflection.toLowerCase().includes(searchQuery.toLowerCase()) || entry.senderName.toLowerCase().includes(searchQuery.toLowerCase()) || (entry.heading || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const completeDiaryGroups = buildCompleteDiary(filteredEntries);
  const diaryDateRange = dateRangeOf(entries.map((e) => e.dateTime));
  const flowHostRef = useRef(null);
  const [flowPages, setFlowPages] = useState([]);
  const [flowTick, setFlowTick] = useState(0);
  const esc = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const buildBlocksHtml = () => {
    const out = [];
    out.push({
      key: "cover",
      html: `
        <div class="pg-cover">
          <div class="pg-cover-emoji">\u{1F4D6}\u{1F495}</div>
          <h1 class="pg-cover-title">OUR LOVE STORY \u2014 COMPLETE DIARY</h1>
          <h2 class="pg-cover-sub">Deep &amp; Shinu (\u{1FAF0}\u{1FAF6}\u{1F3FB} Chota Don \u2763\uFE0F\u2764\uFE0F\u{1F618})</h2>
          <div class="pg-cover-rule">============================================================</div>
          <p class="pg-cover-date"><strong>Date:</strong> ${esc(diaryDateRange || "Date not specified \u2014 arranged by context")}</p>
          <p class="pg-cover-note">Oldest \u2192 newest \xB7 grouped under headings \xB7 nothing added, nothing removed</p>
        </div>`
    });
    for (const group of completeDiaryGroups) {
      out.push({
        key: `h-${group.number}-${out.length}`,
        html: `<h2 class="pg-heading"><span class="pg-hnum">${group.number}</span>${esc(group.heading)}<span class="pg-hcount">(${group.items.length})</span></h2>`
      });
      for (const entry of group.items) {
        out.push({
          key: `e-${entry.id}`,
          html: `
            <div class="pg-entry">
              <div class="pg-meta">\u{1F550} ${esc(entry.dateTime)}</div>
              <div class="pg-msg"><strong class="pg-sender-label">Message:</strong> <strong>${esc(entry.dateTime)}</strong> - <strong class="pg-sender">${esc(entry.senderName)}</strong>: <em>"${esc(entry.message)}"</em></div>
              <div class="pg-feel"><strong class="pg-feel-label">\u{1F4AD} What I felt:</strong> ${esc(entry.reflection)}</div>
            </div>`
        });
      }
    }
    if (filteredEntries.length > 0 && !searchQuery) {
      const summaryLines = buildSummaryLines(entries);
      out.push({ key: "summary-title", html: `<h2 class="pg-heading pg-summary-title">\u{1F4CC} FINAL SUMMARY \u2014 COMPLETE DIARY</h2>` });
      out.push({
        key: "summary-list",
        html: `<ul class="pg-summary-list">${summaryLines.map((l) => `<li><span class="pg-bullet">\u2022</span> ${esc(l)}</li>`).join("")}</ul>`
      });
      out.push({ key: "sum-end", html: `<p class="pg-sum-end">========================================</p>` });
    }
    return out;
  };
  useEffect(() => {
    if (!user || entries.length === 0) {
      setFlowPages([]);
      return;
    }
    const host = flowHostRef.current;
    if (!host) return;
    const raf = requestAnimationFrame(async () => {
      const blocks = buildBlocksHtml();
      host.innerHTML = blocks.map((b) => `<div data-k="${b.key}" style="width:${CONTENT_W_CSS}px;box-sizing:border-box;">${b.html}</div>`).join("");
      const imgs = Array.from(host.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) => new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        )
      );
      const measured = Array.from(host.children).map((el, i) => ({
        key: blocks[i].key,
        html: blocks[i].html,
        // scrollHeight is the TRUE content height even when a child is
        // constrained, so oversized blocks are detected reliably.
        height: Math.max(el.scrollHeight, el.offsetHeight)
      }));
      const headerEl = document.getElementById("ls-header-measure");
      const footerEl = document.getElementById("ls-footer-measure");
      if (headerEl) await Promise.all(
        Array.from(headerEl.querySelectorAll("img")).map(
          (img) => new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        )
      );
      if (footerEl) await Promise.all(
        Array.from(footerEl.querySelectorAll("img")).map(
          (img) => new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        )
      );
      const headerH = headerEl ? Math.max(headerEl.offsetHeight, headerEl.scrollHeight) : Math.round(34 * PX_PER_MM);
      const footerH = footerEl ? Math.max(footerEl.offsetHeight, footerEl.scrollHeight) : Math.round(22 * PX_PER_MM);
      const available = computeAvailableFlowHeightCss(headerH, footerH);
      const pages = [];
      let cur = [];
      let used = 0;
      const pushPage = () => {
        if (cur.length) {
          pages.push(cur);
          cur = [];
          used = 0;
        }
      };
      for (const m of measured) {
        if (m.height > available) {
          pushPage();
          let offset = 0;
          while (offset < m.height) {
            const sliceH = Math.min(available, m.height - offset);
            cur.push({ ...m, height: sliceH, sliceTop: offset });
            used += sliceH;
            if (used >= available) pushPage();
            offset += sliceH;
          }
          continue;
        }
        if (used + m.height > available) pushPage();
        cur.push(m);
        used += m.height;
      }
      pushPage();
      if (pages.length === 0) pages.push([]);
      setFlowPages(pages);
    });
    return () => cancelAnimationFrame(raf);
  }, [entries, searchQuery, flowTick, user]);
  useEffect(() => {
    let cancelled = false;
    let timer;
    const check = () => {
      if (cancelled) return;
      const imgs = [
        ...document.getElementById("ls-header-measure")?.querySelectorAll("img") ?? [],
        ...document.getElementById("ls-footer-measure")?.querySelectorAll("img") ?? []
      ];
      if (!imgs.length) return;
      const allSettled = imgs.every((im) => im.complete);
      if (allSettled) {
        setFlowTick((x) => x + 1);
      } else {
        timer = setTimeout(check, 500);
      }
    };
    timer = setTimeout(check, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);
  const imgRepacksRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const seen = /* @__PURE__ */ new Set();
    const onImgDone = (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (cancelled || imgRepacksRef.current >= 6 || seen.has(img)) return;
      seen.add(img);
      imgRepacksRef.current += 1;
      setFlowTick((x) => x + 1);
    };
    document.addEventListener("load", onImgDone, true);
    document.addEventListener("error", onImgDone, true);
    return () => {
      cancelled = true;
      document.removeEventListener("load", onImgDone, true);
      document.removeEventListener("error", onImgDone, true);
    };
  }, []);
  const totalPages = Math.max(flowPages.length, 1);
  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(Math.max(0, totalPages - 1));
  }, [totalPages, currentPage]);
  // Stickers are hard-coded only — nothing is persisted from the UI any more.
  useEffect(() => {
    try {
      localStorage.removeItem(STICKERS_KEY);
    } catch {
    }
  }, []);
  useEffect(() => {
    const el = sheetWrapRef.current;
    if (!el) return;
    const update = () => {
      const availW = el.clientWidth;
      const availH = window.innerHeight - 230;
      const s = Math.min(availW / (210 * PX_PER_MM), Math.max(150, availH) / (297 * PX_PER_MM), 1);
      setSheetScale(s > 0 ? s : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (showForm || showImportModal || showStickerModal) return;
      if (e.key === "ArrowRight") flipTo(currentPage + 1);
      if (e.key === "ArrowLeft") flipTo(currentPage - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function flipTo(target) {
    const t = Math.max(0, Math.min(totalPages - 1, target));
    if (t === currentPage) return;
    setFlipDir(t > currentPage ? "next" : "prev");
    setCurrentPage(t);
  }
  const stickerToPdf = (s, _totalPages) => {
    const page = s.page === -2 ? void 0 : s.page;
    return { id: s.id, url: s.url, page, xPct: s.xPct, yPct: s.yPct, sizePct: s.sizePct, rotate: s.rotate };
  };
  // Wait until every diary image (header photo, footer signatures, stickers)
  // has actually loaded and fonts are ready — guarantees the snapshot shows the
  // real images instead of blank gaps.
  const waitDiaryImagesSettled = async (timeoutMs = 3e4) => {
    const start = Date.now();
    const pending = () => Array.from(document.querySelectorAll("#ls-header-measure img, #ls-footer-measure img, .a4-page img, #pdf-blocks img")).filter((im) => !(im.complete && im.naturalWidth > 0));
    while (pending().length && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 250));
    }
    try {
      await document.fonts?.ready;
    } catch {
    }
  };
  // Render pipeline used by "Print All Pages" / "Save as PDF": every preview
  // page is snapshotted exactly as shown (same layout, same header/footer image
  // sizes), so the printed/saved output is pixel-identical to the preview.
  // The preview renders ONE .a4-page at a time (with its page number, stickers
  // and scale transform), so here we temporarily flip that same node to each
  // page index and snapshot it — guaranteeing identical pages.
  const buildAllPagesCanvases = async () => {
    const liveNode = pageNodeRef.current;
    if (!liveNode) {
      throw new Error("Nothing to print yet \u2014 add some entries first.");
    }
    const T = Math.max(flowPages.length, 1);
    const placementsByPage = Array.from({ length: T }, () => []);
    for (const s of stickers) {
      for (const pl of resolveStickerPlacements(stickerToPdf(s, T), T)) {
        if (pl.page >= 0 && pl.page < T) placementsByPage[pl.page].push(pl);
      }
    }
    const prevPage = currentPage;
    const canvases = [];
    let lastDone = 0;
    try {
      for (let p = 0; p < T; p++) {
        // Flip the visible preview sheet to page p and let React commit + paint.
        setCurrentPage(p);
        await new Promise((r) => requestAnimationFrame(() => r()));
        await new Promise((r) => requestAnimationFrame(() => r()));
        await waitDiaryImagesSettled();
        const canvas = await renderSheetNode(liveNode, {
          prepare: printClone,
          pageIndex: p,
          flowPages,
          stickerPlacements: placementsByPage[p] ?? []
        });
        canvases.push(canvas);
        if (p + 1 === T || p + 1 - lastDone >= 3) {
          lastDone = p + 1;
          setPdfProgress({ done: lastDone, total: T });
          // Yield so the progress UI repaints and the main thread stays responsive.
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } finally {
      setCurrentPage(prevPage);
    }
    if (canvases.length === 0) {
      throw new Error("Nothing to export yet \u2014 add some entries first.");
    }
    return canvases;
  };
  // Build a PDF Blob directly from the rendered canvases (print fallback).
  const buildPdfBlobFromCanvases = async (canvases) => {
    if (!canvases || canvases.length === 0) {
      throw new Error("Nothing to export yet \u2014 add some entries first.");
    }
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    for (let i = 0; i < canvases.length; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(canvases[i].toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      setPdfProgress({ done: i + 1, total: canvases.length });
      await new Promise((r) => setTimeout(r, 0));
    }
    return pdf.output("blob");
  };
  const handlePrint = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    setShowMenu(false);
    setPlacingMode(false);
    setPdfProgress(null);
    try {
      await Promise.allSettled(stickers.map((s) => loadDataUrlCached(s.url)));
      const node = pageNodeRef.current;
      if (!node || flowPages.length === 0) {
        throw new Error("Nothing to print yet \u2014 add some entries first.");
      }
      const canvases = await buildAllPagesCanvases();
      // Get a real PDF Blob: prefer the exporter's blob mode, fall back to our
      // own jsPDF assembly so printing never fails.
      let blob = null;
      try {
        const res = await exportDiaryToA4Pdf({
          pages: canvases.map((canvas) => ({ canvas })),
          fileName: `our-love-story-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`,
          onPageProgress: (done, total) => setPdfProgress({ done, total }),
          returnBlob: true
        });
        if (res && typeof res.catch === "function") {
          blob = res.catch(() => null);
        } else if (res && res.blob) {
          blob = res.blob;
        } else if (res && typeof res.save === "function") {
          blob = res.output ? res.output("blob") : null;
        }
      } catch (e) {
        console.warn("[print] exporter blob mode failed, assembling directly:", e);
      }
      if (!blob) blob = await buildPdfBlobFromCanvases(canvases);
      const url = URL.createObjectURL(blob);
      // Hidden iframe → print dialog with the exact same PDF bytes as the
      // on-screen preview (no browser re-layout differences).
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.setAttribute("aria-hidden", "true");
      frame.src = url;
      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch (e) {
          console.error("Print failed:", e);
          setImportStatus({ type: "error", message: "Could not open the print dialog." });
        }
        setTimeout(() => {
          frame.remove();
          URL.revokeObjectURL(url);
        }, 6e4);
      };
      document.body.appendChild(frame);
      setImportStatus({ type: "success", message: `Opening print preview for ${canvases.length} A4 page${canvases.length === 1 ? "" : "s"}\u2026 \u{1F5A8}\uFE0F` });
    } catch (err) {
      console.error(err);
      setImportStatus({ type: "error", message: err?.message || "Failed to print." });
    } finally {
      setExportingPdf(false);
      setPdfProgress(null);
    }
  };
  // "Save PDF" uses the EXACT same render pipeline as Print: every preview page
  // is snapshotted at true A4 size (210×297mm, 8mm narrow margins, same header/
  // footer/stickers/page numbers) — only the final step differs: instead of
  // opening the print dialog we download the identical PDF bytes.
  const handleSavePdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    setShowMenu(false);
    setPlacingMode(false);
    setPdfProgress(null);
    try {
      await Promise.allSettled(stickers.map((s) => loadDataUrlCached(s.url)));
      const node = pageNodeRef.current;
      if (!node || flowPages.length === 0) {
        throw new Error("Nothing to save yet \u2014 add some entries first.");
      }
      const canvases = await buildAllPagesCanvases();
      const fileName = `our-love-story-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`;
      let saved = false;
      try {
        const res = await exportDiaryToA4Pdf({
          pages: canvases.map((canvas) => ({ canvas })),
          fileName,
          onPageProgress: (done, total) => setPdfProgress({ done, total })
        });
        // If the exporter returned something without saving (e.g. a promise of
        // a blob), fall through to the direct download below.
        saved = typeof res === "number";
      } catch (e) {
        console.warn("[save-pdf] exporter save mode failed, downloading directly:", e);
      }
      if (!saved) {
        const blob = await buildPdfBlobFromCanvases(canvases);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 6e4);
      }
      setImportStatus({ type: "success", message: `Saved ${canvases.length} A4 page${canvases.length === 1 ? "" : "s"} as PDF \u2014 identical to the preview \u2B07\uFE0F` });
    } catch (err) {
      console.error(err);
      setImportStatus({ type: "error", message: err?.message || "Failed to save PDF." });
    } finally {
      setExportingPdf(false);
      setPdfProgress(null);
    }
  };
  const stickersForCurrentPage = (() => {
    const T = Math.max(flowPages.length, 1);
    return stickers.filter((s) => {
      if (s.page >= 0) return s.page === currentPage;
      return resolveStickerPlacements(stickerToPdf(s, T), T).some((pl) => pl.page === currentPage);
    });
  })();
  const stickerStyle = (s) => {
    const T = Math.max(flowPages.length, 1);
    if (s.page >= 0) {
      return { left: `${s.xPct}%`, top: `${s.yPct}%`, width: `${s.sizePct}%`, transform: `rotate(${s.rotate}deg)` };
    }
    const placements = resolveStickerPlacements(stickerToPdf(s, T), T);
    const pl = placements.find((p) => p.page === currentPage) ?? placements[0];
    return { left: `${pl.xPct}%`, top: `${pl.yPct}%`, width: `${pl.sizePct}%`, transform: `rotate(${pl.rotate}deg)` };
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-5xl mb-4 animate-pulse", children: "\u{1F4D6}" }),
      /* @__PURE__ */ jsx("p", { className: "text-amber-700", children: "Loading your diary..." })
    ] }) });
  }
  if (!user) {
    return /* @__PURE__ */ jsx(Auth, { onAuthSuccess: handleAuthSuccess });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50", children: [
    importStatus && /* @__PURE__ */ jsxs("div", { className: `fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium flex items-center gap-2 animate-fade-in ${importStatus.type === "success" ? "bg-green-500" : "bg-red-500"}`, children: [
      /* @__PURE__ */ jsx("span", { children: importStatus.type === "success" ? "\u2705" : "\u274C" }),
      /* @__PURE__ */ jsx("span", { children: importStatus.message }),
      /* @__PURE__ */ jsx("button", { onClick: () => setImportStatus(null), className: "ml-2 opacity-70 hover:opacity-100", children: "\u2715" })
    ] }),
    /* Export progress overlay — visible while the PDF/print pages are rendered. */
    exportingPdf && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("span", { className: "animate-pulse", children: "\u23F3" }),
      /* @__PURE__ */ jsxs("span", { className: "font-medium", children: [
        pdfProgress ? `Preparing PDF \u2014 page ${pdfProgress.done} of ${pdfProgress.total}\u2026` : "Preparing export\u2026"
      ] })
    ] }),
    /* @__PURE__ */ jsx("header", { className: "bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-4 py-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("span", { className: "text-3xl", children: "\u{1F4D6}" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-amber-900 font-serif", children: "My Diary" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-amber-700", children: "Cloud-synced journal" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", ref: menuRef, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setShowMenu(!showMenu),
              className: "bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 p-2.5 rounded-full transition-all shadow-sm hover:shadow-md",
              title: "More options",
              children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) })
            }
          ),
          showMenu && /* @__PURE__ */ jsxs("div", { className: "absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-amber-100 overflow-hidden animate-fade-in z-20", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleImportClick,
                className: "w-full px-4 py-3 text-left hover:bg-amber-50 flex items-center gap-3 transition-colors",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F4E5}" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-gray-800", children: "Import Entries" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: "From JSON or text file" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "border-t border-amber-100" }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleExportJSON,
                disabled: entries.length === 0,
                className: "w-full px-4 py-3 text-left hover:bg-amber-50 flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F4E4}" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-gray-800", children: "Export as JSON" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: "Full backup with all data" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleExportText,
                disabled: entries.length === 0,
                className: "w-full px-4 py-3 text-left hover:bg-amber-50 flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F4C4}" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-gray-800", children: "Export as Text" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: "Readable diary format" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "border-t border-amber-100" }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handlePrint,
                disabled: exportingPdf || entries.length === 0,
                className: "w-full px-4 py-3 text-left hover:bg-amber-50 flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F5A8}\uFE0F" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-gray-800", children: "Print All Pages" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: "Every A4 page, identical to the preview" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleSavePdf,
                disabled: exportingPdf || entries.length === 0,
                className: "w-full px-4 py-3 text-left hover:bg-amber-50 flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u2B07\uFE0F" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-gray-800", children: "Save as PDF" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: "Download all pages \u2014 same size & layout" })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "border-t border-amber-100" }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleLogout,
                className: "w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 transition-colors text-red-600",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F6AA}" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Log Out" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: user.email })
                  ] })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              setShowForm(!showForm);
              setEditingId(null);
              setMessage("");
              setReflection("");
            },
            className: "bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-lg", children: showForm ? "\u2715" : "+" }),
              /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: showForm ? "Close" : "New Entry" })
            ]
          }
        )
      ] })
    ] }) }),
    showImportModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-white font-semibold text-lg flex items-center gap-2", children: "\u{1F4E5} Import Diary Entries" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowImportModal(false),
            className: "text-white/80 hover:text-white text-xl transition",
            children: "\u2715"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-5", children: [
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-sm", children: "Import your diary entries from a previously exported file. Supported formats:" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u{1F4CB}" }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium text-amber-900", children: "JSON Format" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-amber-700", children: "Full backup files with all entry data including heading, IDs and timestamps." }),
              /* @__PURE__ */ jsx(
                "a",
                {
                  href: "/templates/diary-template.json",
                  download: "diary-template.json",
                  className: "inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors",
                  children: "\u2B07\uFE0F Download JSON Template"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u{1F4DD}" }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium text-orange-900", children: "Text / Markdown Format (.txt / .md)" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-orange-700 mb-1", children: "Group entries under headings, one bullet per message:" }),
              /* @__PURE__ */ jsx("code", { className: "text-xs bg-orange-100 px-2 py-1 rounded block text-orange-800 whitespace-pre", children: `#### HEADING 1: [Topic Name]

- Message: [Date & Time] - [Sender]: "[Message]"
  What I felt: [Reflection]` }),
              /* @__PURE__ */ jsxs("div", { className: "mt-2 text-xs text-orange-800 bg-white/60 rounded-lg border border-orange-100 p-2 max-h-40 overflow-y-auto", children: [
                /* @__PURE__ */ jsx("p", { className: "font-semibold mb-1", children: "Allowed headings:" }),
                /* @__PURE__ */ jsx("ul", { className: "space-y-0.5", children: HEADING_CATEGORIES.map((c) => /* @__PURE__ */ jsxs("li", { children: [
                  buildHeadingText(c.emoji, c.title),
                  /* @__PURE__ */ jsxs("span", { className: "text-orange-500", children: [
                    " \u2014 ",
                    c.whenToUse
                  ] })
                ] }, c.title)) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 mt-2", children: [
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "/templates/diary-template.txt",
                    download: "diary-template.txt",
                    className: "inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors",
                    children: "\u2B07\uFE0F Download Text Template"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "/templates/diary-template.md",
                    download: "diary-template.md",
                    className: "inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors",
                    children: "\u2B07\uFE0F Download Markdown Template"
                  }
                )
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-xl p-3", children: /* @__PURE__ */ jsxs("p", { className: "text-sm text-yellow-800", children: [
          "\u26A0\uFE0F ",
          /* @__PURE__ */ jsx("strong", { children: "Note:" }),
          " Imported entries will be added to your existing entries (not replace them)."
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-3 pt-2", children: [
          /* @__PURE__ */ jsxs("label", { className: "flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg text-center cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                ref: fileInputRef,
                type: "file",
                accept: ".json,.txt,.md",
                onChange: handleFileImport,
                className: "hidden"
              }
            ),
            "\u{1F4C2} Choose File to Import"
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setShowImportModal(false),
              className: "px-6 py-3 border border-amber-300 text-amber-700 rounded-xl font-medium hover:bg-amber-50 transition-all",
              children: "Cancel"
            }
          )
        ] })
      ] })
    ] }) }),
    showStickerModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-white font-semibold text-lg flex items-center gap-2", children: [
          "\u{1F338} Add Image Sticker (Page ",
          currentPage + 1,
          ")"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setShowStickerModal(false);
              setPlacingMode(false);
            },
            className: "text-white/80 hover:text-white text-xl transition",
            children: "\u2715"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-5", children: [
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-sm", children: "Paste a direct image link (ends with .jpg / .png / .gif / .webp\u2026). The sticker is added to the current A4 page and appears in the exported PDF too." }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "url",
            value: stickerUrl,
            onChange: (e) => setStickerUrl(e.target.value),
            placeholder: "https://example.com/my-photo.jpg",
            className: "w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none"
          }
        ),
        stickerUrl && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 bg-pink-50 border border-pink-100 rounded-xl p-3", children: [
          /* @__PURE__ */ jsx(RobustImg, { src: resolveImageUrl(stickerUrl), alt: "preview", className: "w-16 h-16 object-cover rounded-lg border border-pink-200" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-pink-700", children: "Preview \u2014 if it doesn't load here it won't load in the PDF either." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: [
              "Size: ",
              stickerSize,
              "% of page width"
            ] }),
            /* @__PURE__ */ jsx("input", { type: "range", min: 10, max: 60, value: stickerSize, onChange: (e) => setStickerSize(Number(e.target.value)), className: "w-full accent-pink-500" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: [
              "Tilt: ",
              stickerRotate,
              "\xB0"
            ] }),
            /* @__PURE__ */ jsx("input", { type: "range", min: -20, max: 20, value: stickerRotate, onChange: (e) => setStickerRotate(Number(e.target.value)), className: "w-full accent-pink-500" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-3 pt-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => addStickerAt({}),
              disabled: !stickerUrl.trim(),
              className: "flex-1 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-all shadow-md",
              children: "\u{1F338} Add to ALL pages (random)"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                if (!stickerUrl.trim()) return;
                setShowStickerModal(false);
                setPlacingMode(true);
              },
              disabled: !stickerUrl.trim(),
              className: "flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-all shadow-md",
              children: "\u{1F3AF} Choose spot on page\u2026"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setShowStickerModal(false);
                setPlacingMode(false);
              },
              className: "px-5 py-3 border border-pink-300 text-pink-700 rounded-xl font-medium hover:bg-pink-50 transition-all",
              children: "Cancel"
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "max-w-4xl mx-auto px-4 py-8", children: [
      showForm && /* @__PURE__ */ jsxs("div", { className: "mb-8 bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden animate-fade-in", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4", children: [
          /* @__PURE__ */ jsxs("h2", { className: "text-white font-semibold text-lg flex items-center gap-2", children: [
            "\u270D\uFE0F ",
            editingId ? "Edit Entry" : "Write a New Entry"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-amber-100 text-sm mt-1", children: getCurrentDateTime() })
        ] }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-5", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-amber-800 mb-1.5", children: "Heading (Topic)" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: heading,
                onChange: (e) => setHeading(e.target.value),
                className: "w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition bg-amber-50/50",
                children: HEADING_CATEGORIES.map((c) => /* @__PURE__ */ jsxs("option", { value: buildHeadingText(c.emoji, c.title), children: [
                  buildHeadingText(c.emoji, c.title),
                  " \u2014 ",
                  c.whenToUse
                ] }, c.title))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-amber-800 mb-1.5", children: "Who is this message from?" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: senderName,
                onChange: (e) => setSenderName(e.target.value),
                className: "w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition bg-amber-50/50",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "Deep", children: "Deep (me)" }),
                  /* @__PURE__ */ jsx("option", { value: "\u{1FAF0}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618}", children: "\u{1FAF0}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618} (her)" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-amber-800 mb-1.5", children: "Message / What happened" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: message,
                onChange: (e) => setMessage(e.target.value),
                placeholder: "Write about what happened, what was said, or what you experienced...",
                rows: 4,
                className: "w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition resize-none bg-amber-50/50",
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-amber-800 mb-1.5", children: "What I Felt (Reflection)" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: reflection,
                onChange: (e) => setReflection(e.target.value),
                placeholder: "How did this make you feel? What are your thoughts about it?",
                rows: 3,
                className: "w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition resize-none bg-amber-50/50",
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-3 pt-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                className: "flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg",
                children: editingId ? "\u{1F4BE} Update Entry" : "\u{1F4DD} Save Entry"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: handleCancel,
                className: "px-6 py-3 border border-amber-300 text-amber-700 rounded-xl font-medium hover:bg-amber-50 transition-all",
                children: "Cancel"
              }
            )
          ] })
        ] })
      ] }),
      entries.length > 0 && /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-amber-400", children: "\u{1F50D}" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Search your diary entries...",
            className: "w-full pl-12 pr-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition bg-white/80 backdrop-blur-sm"
          }
        )
      ] }) }),
      entries.length > 0 && /* @__PURE__ */ jsxs("p", { className: "text-amber-700 text-sm mb-4", children: [
        filteredEntries.length,
        " ",
        filteredEntries.length === 1 ? "entry" : "entries",
        searchQuery && ` matching "${searchQuery}"`
      ] }),
      entries.length === 0 && !showForm && /* @__PURE__ */ jsxs("div", { className: "text-center py-20", children: [
        /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4", children: "\u{1F4D4}" }),
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-amber-800 mb-2", children: "Your diary is empty" }),
        /* @__PURE__ */ jsx("p", { className: "text-amber-600 mb-6", children: "Start writing your first entry or import existing ones." }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 justify-center", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setShowForm(true),
              className: "bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-full font-medium transition-all shadow-md hover:shadow-lg",
              children: "\u270D\uFE0F Write Your First Entry"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleImportClick,
              className: "border-2 border-amber-400 text-amber-700 hover:bg-amber-50 px-8 py-3 rounded-full font-medium transition-all",
              children: "\u{1F4E5} Import Entries"
            }
          )
        ] })
      ] }),
      entries.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setShowStickerModal(true);
                setPlacingMode(false);
              },
              className: "bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2",
              title: "Add an image sticker from a link anywhere on the page",
              children: "\u{1F338} Add Image Sticker"
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handlePrint,
              disabled: exportingPdf,
              className: "bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2",
              title: "Print every A4 page — same size, margins & layout as this preview",
              children: [
                /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F5A8}\uFE0F" }),
                /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "Print All Pages" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleSavePdf,
              disabled: exportingPdf,
              className: "bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2",
              title: "Download all pages as a PDF — identical to the preview (same A4 size & margins)",
              children: [
                /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u2B07\uFE0F" }),
                /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "Save as PDF" })
              ]
            }
          ),
          stickers.length > 0 && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                if (window.confirm("Remove all stickers from every page?")) setStickers([]);
              },
              className: "border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-full text-sm font-medium transition",
              children: [
                "\u{1F9F9} Clear stickers (",
                stickers.length,
                ")"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { ref: sheetWrapRef, className: "w-full flex justify-center", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: "a4-sheet",
            style: { height: `${297 * sheetScale}mm` },
            onClick: (e) => {
              if (!placingMode) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const xPct = (e.clientX - rect.left) / rect.width * 100;
              const yPct = (e.clientY - rect.top) / rect.height * 100;
              addStickerAt({ page: currentPage, xPct, yPct });
            },
            children: /* @__PURE__ */ jsxs(
              "div",
              {
                ref: pageNodeRef,
                className: `a4-page page-flip-enter ${placingMode ? "cursor-crosshair ring-4 ring-pink-400" : ""}`,
                style: {
                  transform: `scale(${sheetScale})`,
                  ["--flip-from"]: flipDir === "next" ? "45%" : "-45%"
                },
                children: [
                  /* @__PURE__ */ jsx(LoveStoryHeader, {}),
                  /* @__PURE__ */ jsx("div", { className: "a4-print-area", children: (flowPages[currentPage] ?? []).map(
                    (b) => b.sliceTop !== void 0 ? (
                      // Oversized block sliced across pages: clip one window of it
                      /* @__PURE__ */ jsx(
                        "div",
                        {
                          style: { height: `${b.height}px`, overflow: "hidden" },
                          children: /* @__PURE__ */ jsx(
                            "div",
                            {
                              style: { position: "relative", top: `-${b.sliceTop}px` },
                              dangerouslySetInnerHTML: { __html: b.html }
                            }
                          )
                        },
                        `${b.key}-${b.sliceTop}`
                      )
                    ) : /* @__PURE__ */ jsx("div", { dangerouslySetInnerHTML: { __html: b.html } }, b.key)
                  ) }),
                  /* @__PURE__ */ jsx(LoveStoryFooter, {}),
                  stickersForCurrentPage.map((s) => /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "diary-sticker",
                      style: stickerStyle(s),
                      onClick: (e) => e.stopPropagation(),
                      children: [
                        /* @__PURE__ */ jsx(RobustImg, { src: s.url, alt: "sticker", draggable: false }),
                        /* @__PURE__ */ jsx("button", { className: "sticker-remove", title: "Remove sticker", onClick: (e) => {
                          e.stopPropagation();
                          removeSticker(s.id);
                        }, children: "\u2715" }),
                        /* @__PURE__ */ jsxs("div", { className: "sticker-nudges", children: [
                          /* @__PURE__ */ jsx("button", { title: "Move left", onClick: (e) => {
                            e.stopPropagation();
                            moveSticker(s.id, -3, 0);
                          }, children: "\u25C0" }),
                          /* @__PURE__ */ jsx("button", { title: "Move up", onClick: (e) => {
                            e.stopPropagation();
                            moveSticker(s.id, 0, -3);
                          }, children: "\u25B2" }),
                          /* @__PURE__ */ jsx("button", { title: "Move down", onClick: (e) => {
                            e.stopPropagation();
                            moveSticker(s.id, 0, 3);
                          }, children: "\u25BC" }),
                          /* @__PURE__ */ jsx("button", { title: "Move right", onClick: (e) => {
                            e.stopPropagation();
                            moveSticker(s.id, 3, 0);
                          }, children: "\u25B6" }),
                          /* @__PURE__ */ jsx("button", { title: "Bigger", onClick: (e) => {
                            e.stopPropagation();
                            setStickers((prev) => prev.map((x) => x.id === s.id ? { ...x, sizePct: Math.min(60, x.sizePct + 4) } : x));
                          }, children: "\uFF0B" }),
                          /* @__PURE__ */ jsx("button", { title: "Smaller", onClick: (e) => {
                            e.stopPropagation();
                            setStickers((prev) => prev.map((x) => x.id === s.id ? { ...x, sizePct: Math.max(8, x.sizePct - 4) } : x));
                          }, children: "\uFF0D" })
                        ] })
                      ]
                    },
                    s.id
                  )),
                  /* @__PURE__ */ jsxs("div", { className: "a4-page-number", children: [
                    "Page ",
                    currentPage + 1,
                    " of ",
                    totalPages
                  ] })
                ]
              },
              currentPage
            )
          }
        ) }),
        placingMode && /* @__PURE__ */ jsx("p", { className: "text-center text-pink-600 font-medium mt-3 animate-pulse", children: "\u{1F3AF} Click anywhere on the A4 page to place your sticker!" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-4 mt-5 mb-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => flipTo(currentPage - 1),
              disabled: currentPage === 0,
              className: "bg-amber-600 hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md flex items-center gap-2",
              children: "\u2B05\uFE0F Prev"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "text-amber-800 font-serif font-semibold", children: [
            "Page ",
            currentPage + 1,
            " / ",
            totalPages
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => flipTo(currentPage + 1),
              disabled: currentPage >= totalPages - 1,
              className: "bg-amber-600 hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md flex items-center gap-2",
              children: "Next \u27A1\uFE0F"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-amber-600 mb-4", children: "Tip: use \u2190 / \u2192 arrow keys to flip pages \xB7 A4 size \xB7 narrow margins" })
      ] }),
      entries.length > 0 && filteredEntries.length === 0 && searchQuery && /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ jsx("div", { className: "text-4xl mb-3", children: "\u{1F50D}" }),
        /* @__PURE__ */ jsxs("p", { className: "text-amber-700", children: [
          'No entries found matching "',
          searchQuery,
          '"'
        ] })
      ] })
    ] }),
    entries.length > 0 && /* @__PURE__ */ jsxs("div", { style: { position: "absolute", left: -99999, top: 0, width: `${CONTENT_W_CSS}px` }, "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("div", { id: "ls-header-measure", style: { width: `${CONTENT_W_CSS}px` }, children: /* @__PURE__ */ jsx(LoveStoryHeader, {}) }),
      /* @__PURE__ */ jsx("div", { id: "ls-footer-measure", style: { width: `${CONTENT_W_CSS}px` }, children: /* @__PURE__ */ jsx(LoveStoryFooter, {}) }),
      /* @__PURE__ */ jsx("div", { id: "ls-header-print", style: { width: `${CONTENT_W_CSS}px`, background: "#ffffff" }, children: /* @__PURE__ */ jsx(LoveStoryHeader, {}) }),
      /* @__PURE__ */ jsx("div", { id: "ls-footer-print", style: { width: `${CONTENT_W_CSS}px`, background: "#ffffff" }, children: /* @__PURE__ */ jsx(LoveStoryFooter, {}) }),
      /* @__PURE__ */ jsx("div", { id: "pdf-blocks", style: { width: `${CONTENT_W_CSS}px`, fontSize: "10pt", lineHeight: 1.45, color: "#3f2a12" }, children: flowPages.map((pageBlocks, pi) => /* @__PURE__ */ jsxs("div", { "data-page": pi, children: [
        pageBlocks.map(
          (b) => b.sliceTop !== void 0 ? /* @__PURE__ */ jsx(
            "div",
            {
              style: { width: `${CONTENT_W_CSS}px`, height: `${b.height}px`, overflow: "hidden", boxSizing: "border-box" },
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  style: { position: "relative", top: `-${b.sliceTop}px`, width: `${CONTENT_W_CSS}px`, boxSizing: "border-box" },
                  dangerouslySetInnerHTML: { __html: b.html }
                }
              )
            },
            `p-${b.key}-${b.sliceTop}`
          ) : /* @__PURE__ */ jsx("div", { style: { width: `${CONTENT_W_CSS}px`, boxSizing: "border-box" }, dangerouslySetInnerHTML: { __html: b.html } }, `p-${b.key}`)
        ),
        stickers.filter((s) => s.page === pi).map((s) => /* @__PURE__ */ jsx(
          "div",
          {
            style: { width: `${s.sizePct / 100 * CONTENT_W_CSS}px`, margin: "4px auto", transform: `rotate(${s.rotate}deg)` },
            children: /* @__PURE__ */ jsx(RobustImg, { src: s.url, alt: "sticker", draggable: false, style: { width: "100%", display: "block", border: "3px solid #fff", borderRadius: "8px" } })
          },
          `p-sticker-${s.id}`
        ))
      ] }, `pp-${pi}`)) }),
      /* @__PURE__ */ jsx(
        "div",
        {
          ref: flowHostRef,
          style: { width: `${CONTENT_W_CSS}px`, fontSize: "10pt", lineHeight: 1.45, color: "#3f2a12", background: "#ffffff" }
        }
      )
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "text-center py-6 text-amber-600 text-sm", children: /* @__PURE__ */ jsx("p", { children: "Your diary entries are synced to the cloud \u2601\uFE0F \u{1F512} \xB7 A4 pages \xB7 narrow margins" }) })
  ] });
}
var App_default = App;
export {
  App_default as default
};

```

================================================================================
## FILE: src/index.css  (314 lines)
================================================================================

```css
@import "tailwindcss";

/* ============ A4 page (site + PDF) ============ */
/* Exact ISO A4: 210mm x 297mm. Narrow margins (8mm). The sheet is laid out at
   true CSS size and scaled with transform — so what you see is what prints. */
.a4-sheet {
  width: min(210mm, 96vw);
  height: min(297mm, calc(96vw * 297 / 210));
  position: relative;
  background: #ffffff;
  box-shadow: 0 10px 40px rgba(120, 53, 15, 0.25);
  border-radius: 4px;
  overflow: hidden;
}

.a4-page {
  width: 210mm;
  height: 297mm;
  padding: 8mm;                 /* narrow margin — identical in the exported PDF */
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  background: #fffdf8;
  display: flex;
  flex-direction: column;
  transform-origin: top left;
  overflow: hidden;
}

.a4-print-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  font-size: 10pt;
  line-height: 1.45;
  color: #3f2a12;
}

.a4-page-number {
  position: absolute;
  bottom: 3mm;
  right: 6mm;
  font-size: 9pt;
  color: #92400e;
  font-family: Georgia, 'Times New Roman', serif;
}

/* Page-flip transition between A4 pages */
.page-flip-enter {
  animation: page-flip-in 0.45s ease both;
}
@keyframes page-flip-in {
  from { opacity: 0; transform: translateX(var(--flip-from, 40%)) rotateY(12deg); }
  to   { opacity: 1; transform: translateX(0) rotateY(0deg); }
}

/* ============ 💕 OUR LOVE STORY — header band on every A4 page ============ */
.ls-header {
  display: flex;
  align-items: stretch;
  gap: 3mm;
  border-bottom: 2.5px solid #f43f5e;
  padding-bottom: 2mm;
  margin-bottom: 2mm;
  break-after: avoid;
}
.ls-header-photo {
  flex: 0 0 auto;
  width: 26mm;
  height: 26mm;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #fb7185;
  box-shadow: 0 2px 6px rgba(190, 24, 93, 0.25);
  background: #fff1f2;
}
.ls-header-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ls-header-text { flex: 1 1 auto; min-width: 0; text-align: center; }
.ls-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15pt;
  font-weight: 800;
  margin: 0 0 1mm;
  color: #be123c;
  letter-spacing: 0.5px;
}
.ls-sub {
  font-size: 9.5pt;
  font-weight: 700;
  color: #9d174d;
  margin: 0 0 0.8mm;
  line-height: 1.3;
}
.ls-meta {
  font-size: 8.5pt;
  color: #b45309;
  margin: 0 0 0.8mm;
  line-height: 1.3;
}
.ls-quote {
  font-size: 8.5pt;
  font-style: italic;
  color: #6d28d9;
  margin: 0;
  line-height: 1.3;
}
.ls-dash { color: #f59e0b; font-weight: 800; }

/* ============ Footer band — both signatures on every A4 page ============ */
.ls-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 6mm;
  border-top: 1.5px dashed #fda4af;
  padding-top: 1.5mm;
  margin-top: 2mm;
  break-before: avoid;
}
.ls-sign {
  flex: 0 1 auto;
  max-width: 62mm;
  text-align: center;
}
.ls-sign img {
  max-height: 17mm;
  max-width: 100%;
  width: auto;
  display: block;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
}

/* Sticker-style images placed anywhere on the page */
.diary-sticker {
  position: absolute;
  max-width: 70mm;
  cursor: default;
  user-select: none;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
  transition: transform 0.15s ease;
  z-index: 3;
}
.diary-sticker:hover { transform: scale(1.05) rotate(0deg) !important; }
.diary-sticker img {
  display: block;
  width: 100%;
  height: auto;
  border: 3px solid #fff;
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(180, 83, 9, 0.35);
  pointer-events: none;
}
.sticker-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: #dc2626;
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  border: none;
  cursor: pointer;
  display: none;
  z-index: 5;
}
.diary-sticker:hover .sticker-remove { display: block; }

.sticker-nudges {
  display: none;
  justify-content: center;
  gap: 3px;
  margin-top: 3px;
}
.sticker-nudges button {
  width: 18px;
  height: 18px;
  font-size: 9px;
  line-height: 1;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border: none;
  cursor: pointer;
}
.sticker-nudges button:hover { background: rgba(0, 0, 0, 0.85); }
.diary-sticker:hover .sticker-nudges { display: flex; }

/* Cover page block (first A4 page) */
.pg-cover {
  text-align: center;
  padding: 10mm 4mm 6mm;
  border: 2px solid #fcd34d;
  border-radius: 10px;
  background: linear-gradient(to bottom, #fffbeb, #ffffff);
  margin-bottom: 4mm;
}
.pg-cover-emoji { font-size: 26pt; margin-bottom: 2mm; }
.pg-cover-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18pt;
  font-weight: 800;
  color: #be123c;
  margin: 0 0 2mm;
}
.pg-cover-sub {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12pt;
  font-weight: 700;
  color: #9d174d;
  margin: 0 0 2mm;
}
.pg-cover-rule {
  color: #f59e0b;
  font-weight: 800;
  font-size: 8pt;
  overflow-wrap: anywhere;
  margin-bottom: 3mm;
}
.pg-cover-date { font-size: 11pt; color: #78350f; margin: 0 0 1.5mm; }
.pg-cover-note { font-size: 9pt; font-style: italic; color: #b45309; margin: 0; }

/* Entry blocks inside a page */
.pg-heading {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: 13pt;
  color: #78350f;
  border-bottom: 2px solid #fcd34d;
  padding-bottom: 2px;
  margin: 6px 0 6px;
  break-after: avoid;
}
.pg-hnum {
  display: inline-block;
  background: #f59e0b;
  color: #ffffff;
  border-radius: 9999px;
  min-width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  font-size: 10pt;
  margin-right: 6px;
}
.pg-hcount {
  color: #b45309;
  font-size: 10pt;
  font-weight: 600;
  margin-left: 4px;
}
.pg-summary-title { border-bottom-color: #f43f5e; color: #be123c; }
.pg-summary-list { list-style: none; margin: 4px 0 8px; padding: 0; }
.pg-summary-list li {
  position: relative;
  padding-left: 16px;
  margin-bottom: 4px;
  font-size: 10pt;
  color: #451a03;
  line-height: 1.45;
}
.pg-bullet { position: absolute; left: 2px; color: #f43f5e; font-weight: 800; }
.pg-sum-end { text-align: center; color: #f59e0b; font-weight: 800; font-size: 8pt; overflow-wrap: anywhere; }
.pg-entry {
  border: 1px solid #f3d9a4;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 6px;
  background: #ffffff;
  break-inside: avoid;
}
.pg-entry .pg-meta {
  font-size: 8.5pt;
  color: #b45309;
  margin-bottom: 2px;
}
.pg-entry .pg-msg { font-size: 10pt; color: #451a03; }
.pg-entry .pg-feel {
  font-size: 9pt;
  font-style: italic;
  color: #9a3412;
  background: linear-gradient(to right, #fff7ed, #fffbEB);
  border-left: 3px solid #fdba74;
  padding: 3px 6px;
  margin-top: 4px;
  border-radius: 3px;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.3s ease-out; }

/* Custom scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #fef3c7; }
::-webkit-scrollbar-thumb { background: #d97706; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #b45309; }

* { scroll-behavior: smooth; }

textarea:focus,
input:focus { box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.2); }

```

================================================================================
## FILE: src/components/Auth.jsx  (106 lines)
================================================================================

```html
import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { FIXED_USER_ID, verifyHardcodedPassword } from "../lib/hardcodedAuth";
import { createLocalSession } from "../lib/localSession";
function Auth({ onAuthSuccess }) {
  const userId = FIXED_USER_ID;
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (userId !== FIXED_USER_ID) {
      setError("Invalid user ID.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      if (!verifyHardcodedPassword(password)) {
        setError("Incorrect password. Please try again.");
        setLoading(false);
        return;
      }
      await createLocalSession();
      await onAuthSuccess();
    } catch (err) {
      setError(err?.message || "Login failed");
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-5xl mb-3", children: "\u{1F4D6}" }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white font-serif", children: "My Diary" }),
      /* @__PURE__ */ jsx("p", { className: "text-amber-100 text-sm mt-1", children: "Your private cloud journal" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleLogin, className: "p-8 space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold text-amber-900", children: "Welcome Back" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-amber-700 mt-1", children: "Log in to access your diary" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-amber-800 mb-1.5", children: "User ID" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: userId,
            readOnly: true,
            disabled: true,
            "aria-readonly": "true",
            className: "w-full px-4 py-2.5 border border-amber-200 rounded-xl outline-none bg-amber-100/70 text-amber-900 font-medium cursor-not-allowed select-none"
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-amber-500 mt-1", children: "\u{1F512} Fixed account \u2014 cannot be changed" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-amber-800 mb-1.5", children: "Password" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: showPassword ? "text" : "password",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              placeholder: "Enter your password...",
              autoFocus: true,
              autoComplete: "off",
              className: "w-full px-4 py-2.5 pr-11 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition bg-amber-50/50",
              required: true
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setShowPassword((s) => !s),
              className: "absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700 text-lg",
              title: showPassword ? "Hide password" : "Show password",
              children: showPassword ? "\u{1F648}" : "\u{1F441}\uFE0F"
            }
          )
        ] })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm", children: [
        "\u274C ",
        error
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: loading || !password,
          className: "w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
          children: loading ? "\u23F3 Please wait..." : "\u{1F513} Log In"
        }
      )
    ] })
  ] }) });
}
export {
  Auth as default
};

```

================================================================================
## FILE: src/lib/images.jsx  (146 lines)
================================================================================

```html
import { jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
const PROXIES = [
  (u) => `https://images.weserv.nl/?url=${encodeURIComponent(u)}&nf=true&max=1&scaleup=true`,
  (u) => `https://wsrv.nl/?url=${encodeURIComponent(u)}`
];
function driveIdFromLink(link) {
  const s = (link || "").trim();
  if (!s) return null;
  const patterns = [
    /\/file\/d\/([\w-]{10,})/i,
    /[?&]id=([\w-]{10,})/i,
    /\/d\/([\w-]{10,})/i
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{20,}$/.test(s)) return s;
  return null;
}
function resolveImageUrl(link, width = 1400) {
  const id = driveIdFromLink(link);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  return (link || "").trim();
}
function candidateUrlsForLink(link, width = 1400) {
  const s = (link || "").trim();
  const id = driveIdFromLink(s);
  if (!id) {
    return Array.from(/* @__PURE__ */ new Set([s, ...PROXIES.map((p) => p(s))]));
  }
  const thumb = `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  const lh3 = `https://lh3.googleusercontent.com/d/${id}=w${width}`;
  const uc = `https://drive.usercontent.google.com/download?id=${id}&export=view`;
  const ucFull = `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0`;
  const originals = [thumb, lh3, uc, ucFull];
  const viaProxy = originals.flatMap((u) => PROXIES.map((p) => p(u)));
  return Array.from(/* @__PURE__ */ new Set([...originals, ...viaProxy]));
}
function proxiedImageUrl(url) {
  return PROXIES[0](url);
}
async function loadImageAsDataUrl(url, timeoutMs = 2e4) {
  const baseCandidates = driveIdFromLink(url) ? candidateUrlsForLink(url) : [url, ...PROXIES.map((p) => p(url))];
  const unique = Array.from(new Set(baseCandidates));
  let lastErr = null;
  for (const candidate of unique) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(candidate, { mode: "cors", credentials: "omit", signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("Not an image");
      const mime = blob.type === "image/svg+xml" ? "image/svg+xml" : blob.type || "image/png";
      return await blobToDataUrl(blob.slice(0, Math.min(blob.size, 30 * 1024 * 1024), mime));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Could not load image (${lastErr instanceof Error ? lastErr.message : "unknown error"}): ${url.slice(0, 90)}`);
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Failed to read image data"));
    fr.readAsDataURL(blob);
  });
}
const inflight = /* @__PURE__ */ new Map();
// Keep resolved data URLs around for the whole session: repeated print/export
// / "Print" runs then need ZERO network fetches, which makes exports much faster.
const resolvedCache = /* @__PURE__ */ new Map();
function loadDataUrlCached(url) {
  const key = url;
  const done = resolvedCache.get(key);
  if (done) return Promise.resolve(done);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = loadImageAsDataUrl(url).then((d) => {
    resolvedCache.set(key, d);
    return d;
  }).finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
function RobustImg({
  src,
  widthHint = 1400,
  alt = "",
  className,
  style,
  draggable = false
}) {
  const candidates = useMemo(() => candidateUrlsForLink(src, widthHint), [src, widthHint]);
  const [idx, setIdx] = useState(0);
  const [finalSrc, setFinalSrc] = useState(null);
  const triedRef = useRef(0);
  useEffect(() => {
    setIdx(0);
    setFinalSrc(null);
    triedRef.current = 0;
    // If a previous fetch already resolved this image (e.g. the PDF export or
    // the print flow ran before), show it instantly instead of re-trying every
    // remote candidate — this is what makes header/footer/sticker photos appear
    // in the preview reliably and quickly.
    loadDataUrlCached(src).then((d) => setFinalSrc((prev) => prev ?? d)).catch(() => {
    });
  }, [src]);
  const current = finalSrc ?? candidates[Math.min(idx, candidates.length - 1)];
  const handleError = useCallback(() => {
    if (triedRef.current + 1 < candidates.length) {
      triedRef.current += 1;
      setIdx(triedRef.current);
    } else if (!finalSrc) {
      loadDataUrlCached(src).then((d) => setFinalSrc(d)).catch(() => {
      });
    }
  }, [candidates, finalSrc, src]);
  return /* @__PURE__ */ jsx(
    "img",
    {
      src: current,
      alt,
      draggable,
      className,
      style,
      onError: handleError
    }
  );
}
export {
  RobustImg,
  candidateUrlsForLink,
  driveIdFromLink,
  loadDataUrlCached,
  loadImageAsDataUrl,
  proxiedImageUrl,
  resolveImageUrl
};

```

================================================================================
## FILE: src/lib/hardcodedAuth.js  (147 lines)
================================================================================

```html
import { supabase } from "./supabase";
const FIXED_USER_ID = "DeepNectar";
const OBFUSCATED_PASSWORD = "RGVlcHVIQDI4MDU=";
function verifyHardcodedPassword(input) {
  try {
    const expected = atob(OBFUSCATED_PASSWORD);
    return input === expected;
  } catch {
    return false;
  }
}
const SUPABASE_ACCOUNT_EMAIL = "depu_h2805@student.uml.edu";
const SUPABASE_ACCOUNT_PASSWORD = "DeepuH@2805";
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
let cachedUserId = null;
async function getFixedSupabaseUserId() {
  if (cachedUserId) return cachedUserId;
  const hex = await sha256Hex(`hardcoded-auth:${FIXED_USER_ID}`);
  cachedUserId = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    (parseInt(hex.slice(16, 18), 16) & 63 | 128).toString(16) + hex.slice(18, 20),
    hex.slice(20, 32)
  ].join("-");
  return cachedUserId;
}
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1e3)}s`)),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}
const REQUEST_TIMEOUT_MS = 8e3;
let sessionPromise = null;
async function signInFresh() {
  try {
    await withTimeout(supabase.auth.signOut(), 3e3, "Sign out");
  } catch {
  }
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: SUPABASE_ACCOUNT_EMAIL,
          password: SUPABASE_ACCOUNT_PASSWORD
        }),
        REQUEST_TIMEOUT_MS,
        "Supabase login"
      );
      if (!error && data.session?.user) {
        cachedUserId = data.session.user.id;
        return cachedUserId;
      }
      const msg = error?.message || "no session returned";
      if (/invalid login credentials|email or password|not confirmed|user not found/i.test(msg)) {
        throw new Error(
          'Cloud account "' + SUPABASE_ACCOUNT_EMAIL + '" not found in Supabase. Fix: Dashboard \u2192 Authentication \u2192 Users \u2192 "Add user" (email above, password DeepuH@2805, auto-confirm ON), or run: npm run create-auth-user (see supabase/schema.sql section 6).'
        );
      }
      if (/database error querying schema|unexpected_failure|schema.*auth|relation .*auth.*does not exist/i.test(msg)) {
        throw new Error(
          'Supabase Auth is broken on the server ("Database error querying schema"). This is NOT an internet problem. Fix in Supabase Dashboard: (1) Settings \u2192 General \u2192 make sure the project is UNPAUSED; (2) SQL Editor \u2192 run: CREATE SCHEMA IF NOT EXISTS auth; then re-run ONLY section 6 of supabase/schema.sql; (3) Authentication \u2192 Users \u2192 delete any half-created user, then "Add user" again (depu_h2805@student.uml.edu / DeepuH@2805, auto-confirm ON). If it still fails, contact Supabase support with this error id shown in Network tab.'
        );
      }
      if (/rate limit|too many requests|temporarily|over_|fetch failed|Failed to fetch/i.test(msg)) {
        lastError = new Error(msg === "no session returned" ? "Supabase is rate-limiting requests" : msg);
      } else {
        lastError = new Error(msg);
      }
    } catch (err) {
      if (err?.message && /not found in Supabase|Supabase Auth is broken|Supabase login rejected/.test(err.message)) throw err;
      lastError = err;
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    "Cloud sync could not connect to Supabase: " + (lastError?.message || "unknown error") + ". Check your internet connection and that VITE_SUPABASE_URL is correct."
  );
}
async function ensureSupabaseSession() {
  if (cachedUserId) return cachedUserId;
  try {
    const { data: existing } = await withTimeout(
      supabase.auth.getSession(),
      REQUEST_TIMEOUT_MS,
      "Session check"
    );
    if (existing.session?.user) {
      const testResult = await withTimeout(
        Promise.resolve(
          supabase.from("diary_entries").select("id", { count: "exact", head: true }).limit(1)
        ),
        REQUEST_TIMEOUT_MS,
        "Session verify"
      );
      if (!testResult.error) {
        cachedUserId = existing.session.user.id;
        return cachedUserId;
      }
      try {
        await withTimeout(supabase.auth.signOut(), 3e3, "Sign out");
      } catch {
      }
    }
  } catch {
    try {
      await supabase.auth.signOut();
    } catch {
    }
  }
  if (!sessionPromise) {
    sessionPromise = signInFresh().finally(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}
function resetCachedUserId() {
  cachedUserId = null;
}
export {
  FIXED_USER_ID,
  SUPABASE_ACCOUNT_EMAIL,
  ensureSupabaseSession,
  getFixedSupabaseUserId,
  resetCachedUserId,
  verifyHardcodedPassword
};

```

================================================================================
## FILE: src/lib/pdfExport.js  (641 lines)
================================================================================

```html
import { jsPDF } from "jspdf";
import { loadDataUrlCached } from "./images";
const A4_MM = { width: 210, height: 297 };
const NARROW_MARGIN_MM = 8;
const CSS_PX_PER_MM = 96 / 25.4;
const PRINT_SCALE = 300 / 96;
const SHEET_W_CSS = Math.round(A4_MM.width * CSS_PX_PER_MM);
const SHEET_H_CSS = Math.round(A4_MM.height * CSS_PX_PER_MM);
const MARGIN_CSS = Math.round(NARROW_MARGIN_MM * CSS_PX_PER_MM);
const CANVAS_W = Math.round(SHEET_W_CSS * PRINT_SCALE);
const CANVAS_H = Math.round(SHEET_H_CSS * PRINT_SCALE);
const CONTENT_W_CSS = SHEET_W_CSS - MARGIN_CSS * 2;
const PAGE_NUMBER_RESERVE_CSS = Math.round(10 * CSS_PX_PER_MM);
const PAGE_NUMBER_RESERVE_W_CSS = Math.round(45 * CSS_PX_PER_MM);
const BAND_GAP_CSS = Math.round(2 * CSS_PX_PER_MM);
const FLOW_SAFETY_CSS = 6;
function computeAvailableFlowHeightCss(headerH, footerH) {
  return SHEET_H_CSS - MARGIN_CSS * 2 - (headerH + BAND_GAP_CSS) - (footerH + BAND_GAP_CSS) - PAGE_NUMBER_RESERVE_CSS - FLOW_SAFETY_CSS;
}
function seededRandomFrom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h << 13;
  h = h >>> 0;
  h ^= h >> 17;
  h ^= h << 5;
  h = h >>> 0;
  return (h >>> 0) / 4294967296;
}
function resolveStickerPlacements(s, totalPages) {
  const T = Math.max(1, totalPages);
  const size = s.sizePct ?? 11;
  const baseRotate = s.rotate ?? -4;
  const mk = (page, q) => ({
    page,
    // keep stickers fully inside the sheet, clear of the 8mm margins & corner number
    xPct: s.xPct ?? 6 + q * (86 - size),
    // 6% … 92%-size
    yPct: s.yPct ?? 14 + q * 7919 % 1e3 / 1e3 * (70 - size * 0.5),
    // 14% … ~84%
    sizePct: size,
    rotate: s.rotate ?? Math.round((baseRotate + q * 104729 % 13 - 6) * 10) / 10
  });
  if (typeof s.page === "number") {
    if (s.page === -1) return [mk(Math.floor(seededRandomFrom(`${s.id}:page`) * T), seededRandomFrom(`${s.id}:pos`))];
    return [mk(Math.max(0, Math.min(T - 1, s.page)), seededRandomFrom(`${s.id}:pos`))];
  }
  return Array.from({ length: T }, (_, p) => mk(p, seededRandomFrom(`${s.id}:${p}`)));
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function nextFrame() {
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  await wait(0);
}
// Per-export resolved cache: one URL is fetched ONCE per export run instead of
// once per page — the header photo & both footer signatures used to be re-fetched
// for every single A4 page, which made saving the PDF extremely slow.
let runCache = null;
function beginImageRun() {
  runCache = /* @__PURE__ */ new Map();
}
async function toDataUrlAnyForm(ref) {
  const cache = runCache ?? loadDataUrlCached(ref);
  if (!(cache instanceof Promise)) {
    if (cache.has(ref)) return cache.get(ref);
    const p = loadDataUrlCached(ref).catch((err) => {
      cache.delete(ref);
      throw err;
    });
    cache.set(ref, p);
    return p;
  }
  return cache;
}
async function hydrateStickerImg(img, url) {
  const dataUrl = await toDataUrlAnyForm(url);
  await new Promise((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.removeAttribute("crossorigin");
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.src = dataUrl;
  });
}
async function inlineImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      try {
        await hydrateStickerImg(img, src);
      } catch {
        // Keep the original src as a last resort: if it already loaded in the
        // browser cache, html2canvas-style SVG rasterisation can still use it.
      }
    })
  );
}
function pinImageSizes(node, clone) {
  const origImgs = Array.from(node.querySelectorAll("img"));
  const cloneImgs = Array.from(clone.querySelectorAll("img"));
  const n = Math.min(origImgs.length, cloneImgs.length);
  for (let i = 0; i < n; i++) {
    const o = origImgs[i];
    const c = cloneImgs[i];
    const w = o.offsetWidth || o.clientWidth || Number(o.getAttribute("width")) || 0;
    const h = o.offsetHeight || o.clientHeight || Number(o.getAttribute("height")) || 0;
    if (w > 0) {
      c.style.width = `${Math.round(w)}px`;
      c.style.maxWidth = `${Math.round(w)}px`;
    }
    if (h > 0) {
      c.style.height = `${Math.round(h)}px`;
      c.style.maxHeight = `${Math.round(h)}px`;
    }
    const fit = getComputedStyle(o).objectFit;
    if (fit) c.style.objectFit = fit;
  }
}
function measureBlocks(container) {
  const out = [];
  for (const child of Array.from(container.children)) {
    const h = child.offsetHeight || child.scrollHeight;
    if (h > 0) out.push({ el: child, height: h });
  }
  return out;
}
function sliceOversized(block, maxH) {
  const out = [];
  const overlap = Math.round(6 * CSS_PX_PER_MM);
  const step = Math.max(1, maxH - overlap);
  let offset = 0;
  while (offset < block.height) {
    const sliceH = Math.min(maxH, block.height - offset);
    const clone = block.el.cloneNode(true);
    clone.style.position = "relative";
    clone.style.top = `-${offset}px`;
    const wrapper = document.createElement("div");
    wrapper.style.width = `${CONTENT_W_CSS}px`;
    wrapper.style.height = `${sliceH}px`;
    wrapper.style.overflow = "hidden";
    wrapper.appendChild(clone);
    out.push({ el: wrapper, height: sliceH });
    offset += step;
  }
  return out.length ? out : [block];
}
function fitSlicedBlock(el, targetH, maxExtra) {
  if (!el.style || el.style.top === "") return;
  let currentTop = parseFloat(el.style.top) || 0;
  const origTop = currentTop;
  let guard = 0;
  while (guard++ < 60 && el.scrollHeight > targetH + 1 && -currentTop < maxExtra) {
    currentTop -= Math.ceil(el.scrollHeight - targetH);
    el.style.top = `${currentTop}px`;
  }
  if (el.firstElementChild instanceof HTMLElement && el.firstElementChild.offsetHeight < targetH) {
    currentTop = origTop;
    el.style.top = `${currentTop}px`;
  }
}
function flowIntoPages(blocks, availableHeightCss) {
  const maxH = availableHeightCss;
  const pages = [];
  let current = [];
  let used = 0;
  const pushPage = () => {
    if (current.length) {
      pages.push(current);
      current = [];
      used = 0;
    }
  };
  for (const b of blocks) {
    if (b.height > maxH) {
      pushPage();
      for (const part of sliceOversized(b, maxH)) {
        current.push(part);
        used += part.height;
        if (used >= maxH) pushPage();
      }
      continue;
    }
    if (used + b.height > maxH) pushPage();
    current.push(b);
    used += b.height;
  }
  pushPage();
  if (pages.length === 0) pages.push([]);
  return pages;
}
const XML_ATTR_ESC = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };
const escapeAttr = (s) => s.replace(/[&"<>]/g, (c) => XML_ATTR_ESC[c]);
const escapeText = (s) => s.replace(/[&<>]/g, (c) => XML_ATTR_ESC[c] ?? c);
const VOID_TAGS = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
function toXhtml(el) {
  const ser = (n) => {
    if (n.nodeType === 3) return escapeText(n.textContent || "");
    if (n.nodeType !== 1) return "";
    const e = n;
    const tag = e.tagName.toLowerCase();
    let open = `<${tag}`;
    for (const attr of Array.from(e.attributes)) {
      open += ` ${attr.name}="${escapeAttr(attr.value)}"`;
    }
    if (VOID_TAGS.has(tag)) return `${open}/>`;
    open += ">";
    let inner = "";
    for (const c of Array.from(e.childNodes)) inner += ser(c);
    return `${open}${inner}</${tag}>`;
  };
  return ser(el);
}
function inlineComputedStyles(root) {
  const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const n of nodes) {
    const cs = getComputedStyle(n);
    let style = "";
    for (let i = 0; i < cs.length; i++) {
      const prop = cs[i];
      const val = cs.getPropertyValue(prop);
      if (!val) continue;
      if (prop.startsWith("-webkit-text-") || prop === "d" || prop.startsWith("--")) continue;
      style += `${prop}:${val};`;
    }
    n.setAttribute("style", style);
  }
  return toXhtml(root);
}
async function rasterizeNode(el, widthCss, opts) {
  const isSlice = typeof opts?.heightOverride === "number";
  const heightCss = isSlice ? opts.heightOverride : el.offsetHeight || el.scrollHeight;
  const rawClone = opts?.prepare ? opts.prepare(el) : el.cloneNode(true);
  const clone = rawClone;
  // Make sure every <img> inside the clone carries an inlined data: URL — SVG
  // foreignObject rasterisation cannot load remote/CORS images, so without this
  // step header photos, footer signatures and sticker pictures silently vanish
  // from the exported PDF.
  await inlineImages(clone);
  pinImageSizes(el, clone);
  clone.style.width = `${widthCss}px`;
  if (isSlice) {
    clone.style.height = `${heightCss}px`;
    clone.style.maxHeight = `${heightCss}px`;
    clone.style.overflow = "hidden";
    clone.style.boxSizing = "border-box";
    clone.style.position = "relative";
    clone.style.transform = "none";
    clone.style.margin = "0";
    fitSlicedBlock(clone, heightCss, Math.round(15 * CSS_PX_PER_MM));
  } else {
    clone.style.height = "auto";
    clone.style.maxHeight = "none";
    clone.style.position = "static";
    clone.style.transform = "none";
    clone.style.margin = "0";
    clone.style.overflow = "visible";
  }
  const inner = inlineComputedStyles(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthCss}" height="${heightCss}" viewBox="0 0 ${widthCss} ${heightCss}"><foreignObject width="${widthCss}" height="${heightCss}"><div xmlns="http://www.w3.org/1999/xhtml">${inner}</div></foreignObject></svg>`;
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG snapshot failed to decode."));
      img.src = url;
    });
  } catch (err) {
    console.error("[pdf] rasterization failed for node:", el.id || el.className, err);
    throw err;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthCss * PRINT_SCALE);
  canvas.height = Math.max(1, Math.round(heightCss * PRINT_SCALE));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, heightCss };
}
async function rasterizeBlock(b, prepare) {
  const isSlice = b.el.style.height !== "" && parseFloat(b.el.style.top || "") < 0;
  const { canvas } = await rasterizeNode(
    b.el,
    CONTENT_W_CSS,
    isSlice ? { heightOverride: b.height, prepare } : { prepare }
  );
  return canvas;
}
function measureTrueHeight(el) {
  const prevFlex = el.style.flex;
  const prevMinH = el.style.minHeight;
  const prevOverflow = el.style.overflow;
  el.style.flex = "0 0 auto";
  el.style.minHeight = "0";
  el.style.overflow = "visible";
  const h = Math.max(el.scrollHeight, el.offsetHeight);
  el.style.flex = prevFlex;
  el.style.minHeight = prevMinH;
  el.style.overflow = prevOverflow;
  return h;
}
function drawStickerOnSheet(ctx, img, p) {
  const S = PRINT_SCALE;
  const wPx = p.sizePct / 100 * SHEET_W_CSS * S;
  if (!img.naturalWidth || !img.naturalHeight || wPx < 4) return;
  const hPx = wPx * (img.naturalHeight / img.naturalWidth);
  const cx = p.xPct / 100 * SHEET_W_CSS * S + wPx / 2;
  const cy = p.yPct / 100 * SHEET_H_CSS * S + hPx / 2;
  const pad = Math.max(3, wPx * 0.05);
  const bottomPad = pad * 2.2;
  const rad = p.rotate * Math.PI / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  ctx.shadowColor = "rgba(60, 30, 10, 0.35)";
  ctx.shadowBlur = pad * 2.2;
  ctx.shadowOffsetX = pad * 0.7;
  ctx.shadowOffsetY = pad * 1.1;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, -wPx / 2 - pad, -hPx / 2 - pad, wPx + pad * 2, hPx + pad + bottomPad, pad * 0.8);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "rgba(180, 83, 9, 0.35)";
  ctx.lineWidth = Math.max(1, pad * 0.25);
  roundRectPath(ctx, -wPx / 2 - pad, -hPx / 2 - pad, wPx + pad * 2, hPx + pad + bottomPad, pad * 0.8);
  ctx.stroke();
  ctx.drawImage(img, -wPx / 2, -hPx / 2, wPx, hPx);
  ctx.restore();
}
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
async function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) => new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })
    )
  );
}
const SHEET_PX_W = Math.round(210 * CSS_PX_PER_MM);
const SHEET_PX_H = Math.round(297 * CSS_PX_PER_MM);
// Replace every <img> in `root` with its inlined data: URL and WAIT until the
// browser has actually decoded it. Without the decode step, an image that is
// still loading when we snapshot (typical for the header photo / footer
// signatures) silently renders as a blank rectangle in the exported PDF.
async function inlineImagesAwaited(root) {
  await inlineImages(root);
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (img.decode && !(img.complete && img.naturalWidth > 0)) await img.decode();
      } catch {
      }
    })
  );
}
async function renderSheetNode(node, opts) {
  beginImageRun();
  // Inline on a throwaway clone only — never mutate the live preview DOM (the
  // previous code stripped srcset/crossorigin from the real page images).
  const preClone = opts?.prepare ? opts.prepare(node) : node.cloneNode(true);
  await inlineImagesAwaited(preClone);
  pinImageSizes(node, preClone);
  await waitForImages(preClone);
  const prevTransform = node.style.transform;
  const prevAnimation = node.style.animation;
  node.style.transform = "none";
  node.style.animation = "none";
  try {
    const rawClone = opts?.prepare ? opts.prepare(node) : node.cloneNode(true);
    const clone = rawClone;
    // Copy the already-inlined + already-decoded images straight from the
    // pre-clone: instant, and guarantees they are painted before the snapshot.
    const preImgs = Array.from(preClone.querySelectorAll("img"));
    const cloneImgs = Array.from(clone.querySelectorAll("img"));
    for (let i = 0; i < Math.min(preImgs.length, cloneImgs.length); i++) {
      if (preImgs[i].src) cloneImgs[i].src = preImgs[i].src;
    }
    await inlineImagesAwaited(clone);
    pinImageSizes(preClone, clone);
    // Render the requested page's content directly from the flow data instead of
    // forcing a React re-render + waiting for it to paint (huge speed-up and no
    // chance of capturing the wrong/previous page).
    if (typeof opts?.pageIndex === "number" && Array.isArray(opts.flowPages)) {
      const area = clone.querySelector(".a4-print-area");
      if (area) {
        area.innerHTML = "";
        for (const b of opts.flowPages[opts.pageIndex] ?? []) {
          if (b.sliceTop !== void 0) {
            const outer = document.createElement("div");
            outer.style.height = `${b.height}px`;
            outer.style.overflow = "hidden";
            const innerDiv = document.createElement("div");
            innerDiv.style.position = "relative";
            innerDiv.style.top = `-${b.sliceTop}px`;
            innerDiv.innerHTML = b.html;
            outer.appendChild(innerDiv);
            area.appendChild(outer);
          } else {
            const d = document.createElement("div");
            d.innerHTML = b.html;
            area.appendChild(d);
          }
        }
      }
      const pn = clone.querySelector(".a4-page-number");
      if (pn) {
        pn.textContent = `Page ${opts.pageIndex + 1} of ${Math.max(opts.flowPages.length, 1)}`;
      }
    }
    // Hard-coded stickers: draw them on the cloned sheet at their resolved
    // positions so the exported PDF matches the on-screen preview exactly.
    if (Array.isArray(opts?.stickerPlacements) && opts.stickerPlacements.length) {
      const host = document.createElement("div");
      host.style.position = "absolute";
      host.style.inset = "0";
      host.style.pointerEvents = "none";
      host.style.zIndex = "3";
      for (const pl of opts.stickerPlacements) {
        let dataUrl = null;
        try {
          dataUrl = await toDataUrlAnyForm(pl.url);
        } catch {
          console.warn("[pdf] sticker could not be inlined:", String(pl.url).slice(0, 80));
        }
        if (!dataUrl) continue;
        const wrap = document.createElement("div");
        wrap.style.position = "absolute";
        wrap.style.left = `${pl.xPct}%`;
        wrap.style.top = `${pl.yPct}%`;
        wrap.style.width = `${pl.sizePct}%`;
        wrap.style.transform = `rotate(${pl.rotate}deg)`;
        const im = document.createElement("img");
        im.src = dataUrl;
        im.style.display = "block";
        im.style.width = "100%";
        im.style.height = "auto";
        im.style.border = "3px solid #fff";
        im.style.borderRadius = "8px";
        im.style.boxShadow = "0 0 0 1px rgba(180, 83, 9, 0.35), 0 3px 6px rgba(0,0,0,0.3)";
        wrap.appendChild(im);
        host.appendChild(wrap);
      }
      clone.appendChild(host);
    }
    clone.style.width = `${SHEET_PX_W}px`;
    clone.style.height = `${SHEET_PX_H}px`;
    clone.style.boxSizing = "border-box";
    clone.style.position = "relative";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.transform = "none";
    clone.style.animation = "none";
    clone.style.margin = "0";
    const inner = inlineComputedStyles(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_PX_W}" height="${SHEET_PX_H}" viewBox="0 0 ${SHEET_PX_W} ${SHEET_PX_H}"><foreignObject width="${SHEET_PX_W}" height="${SHEET_PX_H}"><div xmlns="http://www.w3.org/1999/xhtml">${inner}</div></foreignObject></svg>`;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Sheet snapshot failed to decode."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    node.style.transform = prevTransform;
    node.style.animation = prevAnimation;
  }
}
// Collect all page canvases into an A4 PDF as fast as possible: no per-page
// requestAnimationFrame waits, and canvasToBlob (async JPEG encoding) is much
// quicker than jsPDF's internal data-URL conversion for big 300-dpi canvases.
async function assemblePdfFromCanvases(pages, fileName, onPageProgress, returnBlob) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < pages.length; i++) {
    const canvas = pages[i].canvas ?? pages[i];
    if (i > 0) pdf.addPage();
    let objUrl = null;
    try {
      objUrl = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(URL.createObjectURL(b)) : reject(new Error("toBlob failed")), "image/jpeg", 0.92);
      });
    } catch {
      objUrl = null;
    }
    if (objUrl) {
      pdf.addImage(objUrl, "JPEG", 0, 0, A4_MM.width, A4_MM.height, void 0, "FAST");
      URL.revokeObjectURL(objUrl);
    } else {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_MM.width, A4_MM.height, void 0, "FAST");
    }
    onPageProgress?.(i + 1, pages.length);
    // Yield so the progress UI can repaint between pages.
    await wait(0);
  }
  if (returnBlob) {
    return { blob: pdf.output("blob"), count: pages.length };
  }
  pdf.save(fileName);
  return pages.length;
}
// Legacy DOM-based path: measure the #pdf-blocks container (or explicit page
// nodes), flow the blocks into A4 sheets and rasterise them one by one. Used
// as a fallback when no pre-rendered page canvases are supplied, so exporting
// never fails with "requires pre-rendered page canvases".
async function collectBlocks(container) {
  const pageNodes = Array.from(container.querySelectorAll("[data-page]"));
  const sources = pageNodes.length ? pageNodes : [container];
  const blocks = [];
  for (const src of sources) {
    for (const el of Array.from(src.children)) {
      const h = el.offsetHeight || el.scrollHeight;
      if (h > 0) blocks.push({ el, height: h });
    }
  }
  return blocks;
}
async function exportDomBased(opts) {
  beginImageRun();
  const container = document.querySelector(opts.blocksSelector);
  if (!container) throw new Error("Nothing to export yet \u2014 add some entries first.");
  await inlineImagesAwaited(container);
  for (const band of opts.bands ?? []) {
    const node = document.getElementById(band.nodeId);
    if (node) await inlineImagesAwaited(node);
  }
  let topBand = null;
  let bottomBand = null;
  for (const band of opts.bands ?? []) {
    const node = document.getElementById(band.nodeId);
    if (!node) continue;
    const r = await rasterizeNode(node, CONTENT_W_CSS);
    if (band.position === "top") topBand = r;
    else bottomBand = r;
  }
  const topUsed = topBand ? topBand.heightCss + BAND_GAP_CSS : 0;
  const bottomUsed = (bottomBand ? bottomBand.heightCss + BAND_GAP_CSS : 0) + PAGE_NUMBER_RESERVE_CSS;
  const availableCss = SHEET_H_CSS - MARGIN_CSS * 2 - topUsed - bottomUsed;
  const blocks = await collectBlocks(container);
  if (blocks.length === 0) throw new Error("No content found to export.");
  const pages = flowIntoPages(blocks, Math.max(availableCss, 100));
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < pages.length; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const S = PRINT_SCALE;
    let y = MARGIN_CSS * S;
    if (topBand) {
      ctx.drawImage(topBand.canvas, MARGIN_CSS * S, y, CONTENT_W_CSS * S, topBand.heightCss * S);
      y += (topBand.heightCss + BAND_GAP_CSS) * S;
    }
    for (const b of pages[i]) {
      const bc = await rasterizeBlock(b);
      ctx.drawImage(bc, MARGIN_CSS * S, y, CONTENT_W_CSS * S, b.height * S);
      y += b.height * S;
      await wait(0);
    }
    if (bottomBand) {
      const by = (SHEET_H_CSS - MARGIN_CSS - bottomBand.heightCss) * S;
      ctx.drawImage(bottomBand.canvas, MARGIN_CSS * S, by, CONTENT_W_CSS * S, bottomBand.heightCss * S);
    }
    ctx.font = `${Math.round(9 * PRINT_SCALE * (96 / 72))}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "#92400e";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`Page ${i + 1} of ${pages.length}`, (SHEET_W_CSS - MARGIN_CSS) * S, (SHEET_H_CSS - MARGIN_CSS * 0.4) * S);
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, A4_MM.width, A4_MM.height, void 0, "FAST");
    opts.onPageProgress?.(i + 1, pages.length);
    await nextFrame();
  }
  if (opts.returnBlob) {
    return { blob: pdf.output("blob"), count: pages.length };
  }
  pdf.save(opts.fileName);
  return pages.length;
}
async function exportDiaryToA4Pdf(opts) {
  if (opts.pages && opts.pages.length > 0) {
    return assemblePdfFromCanvases(opts.pages, opts.fileName, opts.onPageProgress, opts.returnBlob);
  }
  // No pre-rendered canvases supplied: fall back to the legacy DOM pipeline
  // instead of throwing, so printing always works.
  if (opts.blocksSelector) {
    return exportDomBased(opts);
  }
  throw new Error("Nothing to export yet \u2014 add some diary entries first.");
}
export {
  A4_MM,
  BAND_GAP_CSS,
  CONTENT_W_CSS,
  CSS_PX_PER_MM,
  FLOW_SAFETY_CSS,
  MARGIN_CSS,
  NARROW_MARGIN_MM,
  PAGE_NUMBER_RESERVE_CSS,
  PAGE_NUMBER_RESERVE_W_CSS,
  SHEET_H_CSS,
  SHEET_W_CSS,
  computeAvailableFlowHeightCss,
  exportDiaryToA4Pdf,
  renderSheetNode,
  resolveStickerPlacements,
  seededRandomFrom
};

```

================================================================================
## FILE: src/lib/localSession.js  (61 lines)
================================================================================

```html
import { FIXED_USER_ID } from "./hardcodedAuth";
const SESSION_KEY = "diary-hardcoded-session";
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const SECRET_SALT = "diary-app-hardcoded-session-v1";
async function createLocalSession() {
  const createdAt = Date.now();
  const payload = `${FIXED_USER_ID}:${createdAt}:${SECRET_SALT}`;
  const signature = await sha256Hex(payload);
  const session = { userId: FIXED_USER_ID, createdAt, signature };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
  }
  return session;
}
async function readLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.userId !== FIXED_USER_ID) return null;
    const expected = await sha256Hex(`${session.userId}:${session.createdAt}:${SECRET_SALT}`);
    if (expected !== session.signature) return null;
    return session;
  } catch {
    return null;
  }
}
function clearLocalSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
  }
}
function writeLocalSessionItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function readLocalSessionItem(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
export {
  clearLocalSession,
  createLocalSession,
  readLocalSession,
  readLocalSessionItem,
  writeLocalSessionItem
};

```

================================================================================
## FILE: src/lib/headings.js  (108 lines)
================================================================================

```html
const HEADING_CATEGORIES = [
  { emoji: "\u{1F305}", title: "Morning & Night Greetings", whenToUse: "For good mornings/nights" },
  { emoji: "\u{1F4AC}", title: "Daily Life & Important Updates", whenToUse: "For daily conversations" },
  { emoji: "\u{1F496}", title: "Sweet Compliments & Love", whenToUse: "For loving words" },
  { emoji: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}", title: "About Kesha (Her Sister)", whenToUse: "ONLY if mentioned", onlyIfMentioned: true },
  { emoji: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}", title: "About Arya (Her Brother)", whenToUse: "ONLY if mentioned", onlyIfMentioned: true },
  { emoji: "\u{1F3AF}", title: "Dreams & Future Plans", whenToUse: "For future goals" },
  { emoji: "\u{1F917}", title: "Emotional Support & Care", whenToUse: "For emotional talks" },
  { emoji: "\u{1F604}", title: "Fun Moments & Jokes", whenToUse: "For funny moments" },
  { emoji: "\u{1F525}", title: "Flirty Banter & Teasing", whenToUse: "For flirty exchanges" },
  { emoji: "\u{1F495}", title: "Romantic Confessions", whenToUse: "For romantic declarations" },
  { emoji: "\u{1F498}", title: "Attraction & Desire", whenToUse: "For attraction talks" },
  { emoji: "\u{1F319}", title: "Intimate & Passionate Talks", whenToUse: "For intimate moments" },
  { emoji: "\u{1F49D}", title: "Deep Chemistry & Connection", whenToUse: "For deep connection" },
  { emoji: "\u{1F4AD}", title: "My Messages To Her (No Reply Yet)", whenToUse: "For Deep's messages without reply" },
  { emoji: "\u{1F48C}", title: "Her Messages To Me", whenToUse: "For her messages without Deep's reply" }
];
const DEFAULT_HEADING_EMOJI = "\u{1F4AC}";
const DEFAULT_HEADING_TITLE = "Daily Life & Important Updates";
function buildHeadingText(emoji, title) {
  return `${emoji} ${title}`.trim();
}
function defaultHeading() {
  return buildHeadingText(DEFAULT_HEADING_EMOJI, DEFAULT_HEADING_TITLE);
}
function findCategory(heading) {
  if (!heading) return void 0;
  const normalized = heading.trim();
  return HEADING_CATEGORIES.find(
    (c) => normalized === buildHeadingText(c.emoji, c.title) || normalized === c.title || normalized.endsWith(c.title)
  );
}
function parseTemplateEntries(text) {
  const parsed = [];
  const parts = text.split(/(?=^#{2,6}\s*HEADING\s*\d+\s*:)|(?=^\s*-\s*Message:)/im);
  let currentHeading = defaultHeading();
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^#{2,6}\s*HEADING\s*\d+\s*:\s*(.+?)(?:\r?\n[\s\S]*)?$/im);
    if (/^#{2,6}\s*HEADING/i.test(trimmed) && headingMatch) {
      currentHeading = normalizeHeadingFromTemplate(headingMatch[1].trim());
    }
    if (!/^-?\s*Message:/i.test(trimmed)) continue;
    const body = trimmed.replace(/^-\s*/, "");
    const messageRegex = /Message:\s*(.+?)\s*-\s*(.+?):\s*"([\s\S]+?)"\s*(?:\r?\n)\s*What I felt:\s*([\s\S]*?)(?=\r?\n\s*-\s*Message:|\r?\n---|$)/i;
    const m = body.match(messageRegex);
    if (m) {
      parsed.push({
        heading: currentHeading,
        dateTime: m[1].trim(),
        senderName: m[2].trim(),
        message: m[3].trim(),
        reflection: m[4].trim().replace(/\n---\s*$/, "").trim()
      });
    }
  }
  return parsed;
}
function normalizeHeadingFromTemplate(raw) {
  const known = HEADING_CATEGORIES.find((c) => raw.includes(c.title));
  if (known) return buildHeadingText(known.emoji, known.title);
  return raw.replace(/^\[[^\]]*\]$/, defaultHeading());
}
function parseDateTimeToMillis(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) return direct;
  const normalized = s.replace(/\//g, "-");
  const retry = Date.parse(normalized);
  if (!Retry_isNaN(retry)) return retry;
  return null;
}
function Retry_isNaN(n) {
  return Number.isNaN(n);
}
function compareChronologically(a, b) {
  const ma = parseDateTimeToMillis(a.dateTime);
  const mb = parseDateTimeToMillis(b.dateTime);
  if (ma === null && mb === null) return 0;
  if (ma === null) return 1;
  if (mb === null) return -1;
  return ma - mb;
}
function dateRangeOf(dateTimes) {
  const millis = dateTimes.map((d) => parseDateTimeToMillis(d ?? void 0)).filter((m) => m !== null).sort((a, b) => a - b);
  if (millis.length === 0) return null;
  const fmt = (ms) => new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const first = fmt(millis[0]);
  const last = fmt(millis[millis.length - 1]);
  return first === last ? first : `${first} \u2192 ${last}`;
}
export {
  DEFAULT_HEADING_EMOJI,
  DEFAULT_HEADING_TITLE,
  HEADING_CATEGORIES,
  buildHeadingText,
  compareChronologically,
  dateRangeOf,
  defaultHeading,
  findCategory,
  normalizeHeadingFromTemplate,
  parseDateTimeToMillis,
  parseTemplateEntries
};

```

================================================================================
## FILE: src/lib/paginate.jsx  (36 lines)
================================================================================

```html
function paginateBlocks(blocks, fillLimit = 0.97) {
  const pages = [];
  let current = [];
  let used = 0;
  for (const b of blocks) {
    if (used + b.heightUnits > fillLimit && current.length > 0) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(b);
    used += b.heightUnits;
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  return pages;
}
function estimateTextHeightUnits(text, charsPerLine, linesPerPageUnit) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  let lines = 1;
  let len = 0;
  for (const w of words) {
    if (len + w.length + 1 > charsPerLine) {
      lines++;
      len = w.length;
    } else {
      len += w.length + 1;
    }
  }
  return Math.max(0.02, lines / linesPerPageUnit);
}
export {
  estimateTextHeightUnits,
  paginateBlocks
};

```

================================================================================
## FILE: src/lib/loveStory.jsx  (45 lines)
================================================================================

```html
import { jsx, jsxs } from "react/jsx-runtime";
import { resolveImageUrl, RobustImg } from "./images";
const HEADER_PHOTO_LINK = "https://drive.google.com/file/d/17_Wt5nHtKbuDc7DiynDexI-l-GY8RpgS/view?usp=sharing";
const SIGNATURE_LINKS = [
  "https://drive.google.com/file/d/1KnoE8uWAwugB0PRMiPmq32eCW-ZxMasj/view?usp=drive_link",
  "https://drive.google.com/file/d/1XSSbL_JtTqYNwxJ_xquwQj5c5daeMm1V/view?usp=drive_link"
];
const headerPhotoSrc = resolveImageUrl(HEADER_PHOTO_LINK, 900);
const signatureSrcs = SIGNATURE_LINKS.map((l) => resolveImageUrl(l, 700));
function LoveStoryHeader() {
  return /* @__PURE__ */ jsxs("div", { className: "ls-header", children: [
    /* @__PURE__ */ jsx("div", { className: "ls-header-photo", children: /* @__PURE__ */ jsx(RobustImg, { src: HEADER_PHOTO_LINK, widthHint: 900, alt: "us", draggable: false }) }),
    /* @__PURE__ */ jsxs("div", { className: "ls-header-text", children: [
      /* @__PURE__ */ jsx("h1", { className: "ls-title", children: "\u{1F495} OUR LOVE STORY \u{1F495}" }),
      /* @__PURE__ */ jsxs("p", { className: "ls-sub", children: [
        "\u{1F36F}\u{1FAF0}\u{1FAF6}\u{1F3FB} Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618} & Shinu \u{1F48F}\u{1F444}\u{1FAE6}",
        " ",
        /* @__PURE__ */ jsx("span", { className: "ls-dash", children: "----" }),
        " \u2728Two Bodies, One Soul\u2728"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "ls-meta", children: [
        "Started: 16th December 2025\u23F010:19 AM (UAE)",
        " ",
        /* @__PURE__ */ jsx("span", { className: "ls-dash", children: "----" }),
        " \u{1F319}Dubai\u2708\uFE0F \u{1F54C} Nadiad \u{1F33A}"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "ls-quote", children: "This distance is painful\u2026 but it's also proof\u2014that what we have is real." })
    ] })
  ] });
}
function LoveStoryFooter() {
  return /* @__PURE__ */ jsxs("div", { className: "ls-footer", children: [
    /* @__PURE__ */ jsx("div", { className: "ls-sign", children: /* @__PURE__ */ jsx(RobustImg, { src: SIGNATURE_LINKS[0], widthHint: 700, alt: "signature", draggable: false }) }),
    /* @__PURE__ */ jsx("div", { className: "ls-sign", children: /* @__PURE__ */ jsx(RobustImg, { src: SIGNATURE_LINKS[1], widthHint: 700, alt: "signature", draggable: false }) })
  ] });
}
export {
  HEADER_PHOTO_LINK,
  LoveStoryFooter,
  LoveStoryHeader,
  SIGNATURE_LINKS,
  headerPhotoSrc,
  signatureSrcs
};

```

================================================================================
## FILE: src/lib/supabase.js  (18 lines)
================================================================================

```html
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://unvomzolyjwcdavitdmr.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudm9tem9seWp3Y2Rhdml0ZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ3NjEsImV4cCI6MjEwNzQ1MDc2MX0.SaukqHzJlXRXfx2R4yvbIEeWFEj7hm9xnkj6Oqw_4wY";
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Gracefully handle environments where localStorage is unavailable (sandboxed iframes)
    storageKey: "diary-auth"
  }
});
export {
  supabase
};

```

================================================================================
## FILE: public/templates/diary-template.json  (43 lines)
================================================================================

```json
[
  {
    "id": "template-001",
    "heading": "💬 Daily Life & Important Updates",
    "dateTime": "January 15, 2026, 10:30 AM",
    "senderName": "Deep",
    "message": "Today I had a wonderful conversation with an old friend. We talked about our dreams and the paths we've taken in life.",
    "reflection": "I felt grateful for the connection. It reminded me how important it is to nurture friendships and stay in touch with people who matter."
  },
  {
    "id": "template-002",
    "heading": "💬 Daily Life & Important Updates",
    "dateTime": "January 15, 2026, 11:02 AM",
    "senderName": "🫰🫶🏻Chota Don❣️❤️😘",
    "message": "Did you eat something? Don't skip meals.",
    "reflection": "I felt cared for. Even small check-ins feel like big love."
  },
  {
    "id": "template-003",
    "heading": "🌅 Morning & Night Greetings",
    "dateTime": "January 16, 2026, 08:05 AM",
    "senderName": "🫰🫶🏻Chota Don❣️❤️😘",
    "message": "Good morning sunshine ☀️",
    "reflection": "My whole day started right because of that one message."
  },
  {
    "id": "template-004",
    "heading": "💭 My Messages To Her (No Reply Yet)",
    "dateTime": "January 16, 2026, 09:40 PM",
    "senderName": "Deep",
    "message": "I keep thinking about our last talk, call me when you're free?",
    "reflection": "I felt a little anxious waiting, but I know she's busy."
  },
  {
    "id": "template-005",
    "heading": "💌 Her Messages To Me",
    "dateTime": "January 17, 2026, 07:15 AM",
    "senderName": "🫰🫶🏻Chota Don❣️❤️😘",
    "message": "Sorry I fell asleep last night, dreamt of you 🥺",
    "reflection": "My heart melted. No reply needed, that message was enough."
  }
]

```

================================================================================
## FILE: public/templates/diary-template.txt  (31 lines)
================================================================================

```
#### HEADING 1: 💬 Daily Life & Important Updates

- Message: January 15, 2026, 10:30 AM - Deep: "Today I had a wonderful conversation with an old friend. We talked about our dreams and the paths we've taken in life."
  What I felt: I felt grateful for the connection. It reminded me how important it is to nurture friendships and stay in touch with people who matter.

- Message: January 15, 2026, 11:02 AM - 🫰🫶🏻Chota Don❣️❤️😘: "Did you eat something? Don't skip meals."
  What I felt: I felt cared for. Even small check-ins feel like big love.

---

#### HEADING 2: 🌅 Morning & Night Greetings

- Message: January 16, 2026, 08:05 AM - 🫰🫶🏻Chota Don❣️❤️😘: "Good morning sunshine ☀️"
  What I felt: My whole day started right because of that one message.

---

#### HEADING 3: 💭 My Messages To Her (No Reply Yet)

- Message: January 16, 2026, 09:40 PM - Deep: "I keep thinking about our last talk, call me when you're free?"
  What I felt: I felt a little anxious waiting, but I know she's busy.

---

#### HEADING 4: 💌 Her Messages To Me

- Message: January 17, 2026, 07:15 AM - 🫰🫶🏻Chota Don❣️❤️😘: "Sorry I fell asleep last night, dreamt of you 🥺"
  What I felt: My heart melted. No reply needed, that message was enough.

---

```

================================================================================
## FILE: public/templates/diary-template.md  (56 lines)
================================================================================

```
# 📖 Diary Import Template

Use one `#### HEADING N: [Topic Name]` section per topic. Under each heading, add entries as bullet points in this exact format:

- Message: January 15, 2026, 10:30 AM - [Sender Name]: "[Message content]"
  What I felt: [Your reflection]

Copy the heading names EXACTLY from the table below (including emojis).

## ✅ Allowed Headings & When To Use

| Heading | When to Use |
|---------|-------------|
| 🌅 Morning & Night Greetings | For good mornings/nights |
| 💬 Daily Life & Important Updates | For daily conversations |
| 💖 Sweet Compliments & Love | For loving words |
| 👨‍👩‍👧‍👦 About Kesha (Her Sister) | ONLY if mentioned |
| 👨‍👩‍👧‍👦 About Arya (Her Brother) | ONLY if mentioned |
| 🎯 Dreams & Future Plans | For future goals |
| 🤗 Emotional Support & Care | For emotional talks |
| 😄 Fun Moments & Jokes | For funny moments |
| 🔥 Flirty Banter & Teasing | For flirty exchanges |
| 💕 Romantic Confessions | For romantic declarations |
| 💘 Attraction & Desire | For attraction talks |
| 🌙 Intimate & Passionate Talks | For intimate moments |
| 💝 Deep Chemistry & Connection | For deep connection |
| 💭 My Messages To Her (No Reply Yet) | For Deep's messages without reply |
| 💌 Her Messages To Me | For her messages without Deep's reply |

---

## Example (delete this and write your own)

#### HEADING 1: 💬 Daily Life & Important Updates

- Message: January 15, 2026, 10:30 AM - Deep: "Today I had a wonderful conversation with an old friend."
  What I felt: I felt grateful for the connection and reminded of the importance of friendships.

- Message: January 15, 2026, 11:02 AM - 🫰🫶🏻Chota Don❣️❤️😘: "Did you eat something? Don't skip meals."
  What I felt: I felt cared for. Even small check-ins feel like big love.

#### HEADING 2: 🌅 Morning & Night Greetings

- Message: January 16, 2026, 08:05 AM - 🫰🫶🏻Chota Don❣️❤️😘: "Good morning sunshine ☀️"
  What I felt: My whole day started right because of that one message.

#### HEADING 3: 💭 My Messages To Her (No Reply Yet)

- Message: January 16, 2026, 09:40 PM - Deep: "I keep thinking about our last talk, call me when you're free?"
  What I felt: I felt a little anxious waiting, but I know she's busy.

#### HEADING 4: 💌 Her Messages To Me

- Message: January 17, 2026, 07:15 AM - 🫰🫶🏻Chota Don❣️❤️😘: "Sorry I fell asleep last night, dreamt of you 🥺"
  What I felt: My heart melted. No reply needed, that message was enough.

```

================================================================================
## FILE: scripts/create-auth-user.mjs  (128 lines)
================================================================================

```html
#!/usr/bin/env node
// Creates the fixed diary account in Supabase Auth so the app's hidden login
// gets a real JWT and RLS policies accept inserts.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-auth-user.mjs
// or
//   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=xxxx \
//     node scripts/create-auth-user.mjs        (uses Supabase Management API)
//
// Get the service_role key: Dashboard → Project Settings → API →
// "service_role secret". Keep it private — it bypasses RLS.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if present (simple parser, no dependency).
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.VITE_SUPABASE_URL || 'https://unvomzolyjwcdavitdmr.supabase.co';
const email = 'depu_h2805@student.uml.edu';
const password = 'DeepuH@2805';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudm9tem9seWp3Y2Rhdml0ZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ3NjEsImV4cCI6MjEwNzQ1MDc2MX0.SaukqHzJlXRXfx2R4yvbIEeWFEj7hm9xnkj6Oqw_4wY';

async function createUserWithServiceRole() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true, // auto-confirm so password login works immediately
    }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`✅ Created auth user ${email} (id: ${JSON.parse(text)?.id})`);
    return true;
  }
  if (/already exists|user already/i.test(text)) {
    console.log(`ℹ️ User ${email} already exists.`);
    return true;
  }
  console.error(`❌ Admin API create failed (${res.status}): ${text}`);
  return false;
}

async function createUserWithManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF ||
    (url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/) || [])[1];
  if (!token || !ref) return false;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/auth/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`✅ Created auth user ${email} via Management API`);
    return true;
  }
  console.error(`❌ Management API create failed (${res.status}): ${text}`);
  return false;
}

async function verifyLogin() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log('✅ Password login verified — the app can now sign in.');
    return true;
  }
  console.error(`❌ Login verification failed (${res.status}): ${text}`);
  return false;
}

let done =
  (await createUserWithServiceRole()) ||
  (await createUserWithManagementApi());

if (!done) {
  console.log(`
No credentials supplied. Do ONE of these:

1) Easiest — Supabase Dashboard:
   Authentication → Users → "Add user"
   Email:    ${email}
   Password: ${password}
   Check "Auto Confirm User" ✅

2) SQL Editor (paste section 6 block from supabase/schema.sql, uncommented).

3) With the service role key (Dashboard → Project Settings → API):
   SUPABASE_SERVICE_ROLE_KEY=ey... npm run create-auth-user

Then re-run this script to verify login.
`);
  // Still try to verify in case the user was created manually.
  done = await verifyLogin();
  process.exit(done ? 0 : 1);
}

process.exit((await verifyLogin()) ? 0 : 1);

```

================================================================================
## FILE: supabase/schema.sql  (231 lines)
================================================================================

```
-- ============================================================
-- 📖 My Diary — Supabase SQL (run in SQL Editor to go live)
-- Format:  #### HEADING N: [Topic Name]
--          - Message: [Date & Time] - [Sender]: "[Message]"
--            What I felt: [Reflection]
-- ============================================================

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Heading categories reference table (the 15 allowed headings)
CREATE TABLE IF NOT EXISTS heading_categories (
  id SERIAL PRIMARY KEY,
  emoji TEXT NOT NULL,
  title TEXT NOT NULL UNIQUE,
  when_to_use TEXT NOT NULL,
  only_if_mentioned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Full heading text = emoji || ' ' || title  e.g. '🌅 Morning & Night Greetings'
INSERT INTO heading_categories (emoji, title, when_to_use, only_if_mentioned, sort_order) VALUES
  ('🌅', 'Morning & Night Greetings',        'For good mornings/nights',               FALSE, 1),
  ('💬', 'Daily Life & Important Updates',   'For daily conversations',                FALSE, 2),
  ('💖', 'Sweet Compliments & Love',         'For loving words',                       FALSE, 3),
  ('👨‍👩‍👧‍👦', 'About Kesha (Her Sister)',       'ONLY if mentioned',                      TRUE,  4),
  ('👨‍👩‍👧‍👦', 'About Arya (Her Brother)',       'ONLY if mentioned',                      TRUE,  5),
  ('🎯', 'Dreams & Future Plans',            'For future goals',                       FALSE, 6),
  ('🤗', 'Emotional Support & Care',         'For emotional talks',                    FALSE, 7),
  ('😄', 'Fun Moments & Jokes',              'For funny moments',                      FALSE, 8),
  ('🔥', 'Flirty Banter & Teasing',          'For flirty exchanges',                   FALSE, 9),
  ('💕', 'Romantic Confessions',             'For romantic declarations',              FALSE, 10),
  ('💘', 'Attraction & Desire',              'For attraction talks',                   FALSE, 11),
  ('🌙', 'Intimate & Passionate Talks',      'For intimate moments',                   FALSE, 12),
  ('💝', 'Deep Chemistry & Connection',      'For deep connection',                    FALSE, 13),
  ('💭', 'My Messages To Her (No Reply Yet)','For Deep''s messages without reply',     FALSE, 14),
  ('💌', 'Her Messages To Me',               'For her messages without Deep''s reply', FALSE, 15)
ON CONFLICT (title) DO UPDATE SET
  emoji = EXCLUDED.emoji,
  when_to_use = EXCLUDED.when_to_use,
  only_if_mentioned = EXCLUDED.only_if_mentioned,
  sort_order = EXCLUDED.sort_order;

-- Everyone (signed-in users) can read the heading list; only service role can modify it
ALTER TABLE heading_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Headings are readable by authenticated users" ON heading_categories;
CREATE POLICY "Headings are readable by authenticated users"
  ON heading_categories FOR SELECT
  TO authenticated
  USING (TRUE);

-- 3) Diary entries table (adds the heading column)
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  heading TEXT NOT NULL DEFAULT '💬 Daily Life & Important Updates',
  date_time TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  reflection TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If you already have the OLD diary_entries table (without heading), run this instead:
-- ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS heading TEXT NOT NULL DEFAULT '💬 Daily Life & Important Updates';

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON diary_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_heading ON diary_entries(user_id, heading);

-- 4) Row Level Security on diary_entries
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entries" ON diary_entries;
CREATE POLICY "Users can view own entries"
  ON diary_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own entries" ON diary_entries;
CREATE POLICY "Users can insert own entries"
  ON diary_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON diary_entries;
CREATE POLICY "Users can update own entries"
  ON diary_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON diary_entries;
CREATE POLICY "Users can delete own entries"
  ON diary_entries FOR DELETE
  USING (auth.uid() = user_id);

-- 5) Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_diary_entries_updated_at ON diary_entries;
CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Done ✅ — the app's dropdown/export/import templates use exactly these 15 headings.

-- ============================================================
-- 6) REQUIRED: Create the fixed login account in Supabase Auth
-- ------------------------------------------------------------
-- The app logs in to Supabase behind the scenes with this exact
-- email + password so every request carries a real JWT and passes
-- the RLS policies above. Without this step you will get:
--   "new row violates row-level security policy for table diary_entries"
--
-- Option A (recommended): Supabase Dashboard → Authentication → Users →
--   "Add user" → Email: depu_h2805@student.uml.edu, Password: DeepuH@2805
--   Check "Auto Confirm User". Also turn OFF email confirmation under
--   Authentication → Sign In / Up → Email ("Confirm email"), otherwise
--   password login is rejected until the (undeliverable) confirmation link
--   is clicked.
--
-- Option B: run this SQL block as-is in the SQL Editor (creates the auth user):
-- ------------------------------------------------------------
-- ⚠️ WARNING: NEVER run "DROP SCHEMA auth CASCADE" or re-run sections 1-5
-- after section 6 — dropping/recreating the `auth` schema breaks Supabase's
-- own login system and causes: "Database error querying schema" (HTTP 500)
-- on every sign-in. If you see that error, follow section 7 below first.
DO $$
DECLARE v_uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'depu_h2805@student.uml.edu') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'depu_h2805@student.uml.edu',
      crypt('DeepuH@2805', gen_salt('bf')),
      NOW(), NULL, NULL,
      '{"provider":"email","providers":["email"]}',
      '{}', NOW(), NOW(), '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, v_uid::text,
            jsonb_build_object('sub', v_uid::text, 'email', 'depu_h2805@student.uml.edu', 'email_verified', true),
            'email', NOW(), NOW(), NOW());
  END IF;
END $$;
--
-- If you use a different email/password, set them in .env:
--   VITE_DIARY_ACCOUNT_EMAIL=...
--   VITE_DIARY_ACCOUNT_PASSWORD=...
-- ============================================================

-- ============================================================
-- 7) REPAIR: "Database error querying schema" on login (HTTP 500)
-- ------------------------------------------------------------
-- Cause: the `auth` schema / auth.users table was dropped or altered
-- (usually by running DROP SCHEMA auth CASCADE, or an old version of
-- section 6 failed halfway). GoTrue (Supabase Auth) can no longer query
-- its own tables, so EVERY login fails with this error.
--
-- Fix: run this block ONCE in the SQL Editor, then re-run section 6 above,
-- then verify with: npm run create-auth-user
--
-- NOTE: if auth.users exists but is corrupted, prefer Dashboard →
-- Authentication → Users → delete broken users first.

CREATE SCHEMA IF NOT EXISTS auth;

-- Restore the core auth tables Supabase expects (safe: IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS auth.users (
  instance_id uuid,
  id uuid PRIMARY KEY,
  aud varchar(255),
  role varchar(255),
  email varchar(255) UNIQUE,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  phone varchar(15) UNIQUE,
  phone_confirmed_at timestamptz,
  confirmation_token varchar(255),
  recovery_token varchar(255),
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_token_current varchar(255),
  email_change_confirm_status smallint DEFAULT 0,
  banned_until timestamptz,
  reauthentication_token varchar(255),
  reauthentication_sent_at timestamptz,
  is_sso_user boolean NOT NULL DEFAULT false,
  password_recovered boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  last_sign_in_at timestamptz,
  app_metadata jsonb DEFAULT '{}'::jsonb,
  user_metadata jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  provider_id text,
  security_stamp text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text GENERATED ALWAYS AS (lower(identity_data->>'email')) STORED,
  UNIQUE (provider_id, provider)
);

GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO postgres, service_role;
-- ============================================================

```

================================================================================
## FILE: supabase/FIX_NOW.sql  (163 lines)
================================================================================

```
-- ============================================================
-- FIX_NOW.sql  (v6 — matches the credentials HARDCODED in src/lib/hardcodedAuth.ts)
-- v5 fix: auth.users.id is now NOT NULL with NO database default, so the old
--         INSERT failed with error 23502. The id is now generated explicitly
--         with gen_random_uuid().
-- v6 fix: robust to partial runs — if a previous attempt inserted the user but
--         failed before creating the identity row (or vice-versa), this script
--         repairs the missing pieces instead of failing on unique-violations.
-- Paste this ENTIRE file into Supabase Dashboard → SQL Editor → Run.
--
-- Cloud account used by the app (hardcoded in code, no .env needed):
--   Email:    depu_h2805@student.uml.edu
--   Password: DeepuH@2805
--
-- What it does (all idempotent, never drops anything):
--   1. Creates the diary_entries table with the EXACT columns the app uses.
--   2. Enables RLS and creates SELECT/INSERT/UPDATE/DELETE policies so the
--      logged-in user can only touch their own rows.
--   3. Creates/repairs/resets the cloud auth user above (same path the
--      dashboard "Add user" button uses). If this step fails with 42501, add
--      the user via the dashboard instead (instructions at the bottom).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 1. diary_entries (app schema) ----------
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  heading     text NOT NULL DEFAULT '',
  date_time   text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  message     text NOT NULL DEFAULT '',
  reflection  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- If an older diary_entries table exists, make sure every column is present.
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS heading     text NOT NULL DEFAULT '';
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS date_time   text NOT NULL DEFAULT '';
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS sender_name text NOT NULL DEFAULT '';
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS message     text NOT NULL DEFAULT '';
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS reflection  text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id    ON public.diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON public.diary_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_heading    ON public.diary_entries(user_id, heading);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diary_entries_updated_at ON public.diary_entries;
CREATE TRIGGER trg_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- 2. Row Level Security ----------
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own entries" ON public.diary_entries;
CREATE POLICY "Users can insert own entries" ON public.diary_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own entries" ON public.diary_entries;
CREATE POLICY "Users can view own entries" ON public.diary_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON public.diary_entries;
CREATE POLICY "Users can update own entries" ON public.diary_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON public.diary_entries;
CREATE POLICY "Users can delete own entries" ON public.diary_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- 3. Create / reset the hardcoded cloud account ----------
DO $$
DECLARE
  v_uid uuid;
  v_email text := 'depu_h2805@student.uml.edu';
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;

  IF v_uid IS NULL THEN
    -- NOTE: id must be supplied explicitly (auth.users.id has no default).
    INSERT INTO auth.users (
      id,
      instance_id, aud, role, email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new,
      recovery_token, is_sso_user
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      crypt('DeepuH@2805', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(), now(),
      '', '', '', '', false
    )
    RETURNING id INTO v_uid;
  ELSE
    -- Already exists: reset password + ensure email is confirmed.
    UPDATE auth.users
       SET encrypted_password = crypt('DeepuH@2805', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_uid;
  END IF;

  -- Ensure the identity row exists (repair for partial runs / broken schema).
  -- ON CONFLICT avoids unique-violation if it already exists.
  BEGIN
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      status, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid, 'email', 'email',
      format('{"sub":"%s","email":"%s","email_verified":true}', v_uid::text, v_email)::jsonb,
      'verified', now(), now(), now()
    )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- ignore if identities table shape differs; dashboard Add-user will fix it
  END;
END $$;

-- ---------- 4. Verification ----------
-- You should see ONE row with confirmed = true and has_identity = true.
SELECT
  u.id                                             AS user_id,
  u.email,
  (u.email_confirmed_at IS NOT NULL)               AS confirmed,
  EXISTS (SELECT 1 FROM auth.identities i
          WHERE i.user_id = u.id)                  AS has_identity
FROM auth.users u
WHERE u.email = 'depu_h2805@student.uml.edu';

-- ============================================================
-- IF STEP 3 FAILED WITH "permission denied for schema auth" (42501)
-- OR THE VERIFICATION ROW SHOWS confirmed=false / has_identity=false:
-- do it in the dashboard instead (takes 30 seconds):
--   1. Authentication -> Users -> "Add user"
--      Email:    depu_h2805@student.uml.edu
--      Password: DeepuH@2805
--      Check "Auto Confirm User"
--   2. Authentication -> Sign In / Up -> Email
--      Turn OFF "Confirm email"
-- Steps 1-2 above (table + RLS) will already have succeeded, so after
-- adding the user, login works and the import RLS error is gone.
-- ============================================================

```
