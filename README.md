# TaskFlow — Office Project & Task Tracker

A production-ready, full-stack task and project tracker built with Next.js 15, TypeScript, and Tailwind CSS. All data is stored in `localStorage` — no backend or database required.

---

## ✨ Features

- **Project management** — create, edit, delete projects with priority, status, deadline, client/dept, and notes
- **Task management** — add tasks to projects with status, priority, due dates, and progress notes
- **Dashboard** — stats cards, filterable project grid, and recent activity feed
- **Filters & search** — search by name/client, filter by status/priority/deadline, sort by multiple fields
- **Data persistence** — auto-saves to `localStorage`; export/import JSON backups
- **Responsive** — desktop sidebar + mobile bottom nav
- **Toast notifications** — feedback on every action
- **Confirm dialogs** — protects against accidental deletes

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17 or later
- npm 9+

### Installation

```bash
# 1. Clone or unzip the project
cd taskflow

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

---

## 📦 Package Installation Commands

If starting fresh:

```bash
npx create-next-app@latest taskflow \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint

cd taskflow
npm install lucide-react date-fns
```

---

## ☁️ Vercel Deployment

### Option A — Deploy from GitHub (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Vercel auto-detects Next.js — click **Deploy**
5. Done! Vercel gives you a live URL instantly

### Option B — Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# From the project root
vercel

# Follow prompts — choose your team/account, confirm settings
# For production deploy:
vercel --prod
```

### Environment Variables
None required — the app uses only `localStorage` (client-side).

### Vercel Settings (auto-detected)
| Setting | Value |
|---|---|
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Entry point → AppShell
│   └── globals.css         # Tailwind + keyframe animations
├── types/
│   └── index.ts            # All TypeScript interfaces
├── lib/
│   ├── utils.ts            # Helpers, formatters, badge colors
│   └── storage.ts          # localStorage read/write, import/export
├── context/
│   ├── AppContext.tsx       # Global state (reducer + context)
│   └── ToastContext.tsx     # Toast notifications context
├── hooks/
│   └── useToast.ts         # Toast state hook
└── components/
    ├── layout/
    │   ├── AppShell.tsx     # Main layout (sidebar + main area)
    │   └── Sidebar.tsx      # Desktop sidebar + mobile bottom nav
    ├── dashboard/
    │   └── Dashboard.tsx    # Stats, project grid, activity feed
    ├── projects/
    │   ├── ProjectCard.tsx  # Card (full & compact/sidebar variants)
    │   ├── ProjectDetail.tsx # Full project view with tasks
    │   └── ProjectForm.tsx  # Add/edit project modal
    ├── tasks/
    │   ├── TaskCard.tsx     # Task row with expand/collapse
    │   ├── TaskList.tsx     # Filtered task list for a project
    │   └── TaskForm.tsx     # Add/edit task modal
    └── ui/
        ├── Badge.tsx        # Priority & status badges
        ├── ConfirmDialog.tsx # Delete confirmation modal
        ├── EmptyState.tsx   # Zero-state placeholder
        ├── ProgressBar.tsx  # Animated progress bar
        └── ToastContainer.tsx # Toast notification display
```

---

## 🔧 Customization

### Adding new priority levels
Edit `src/types/index.ts` — add to the `Priority` union type, then update `PRIORITY_LABELS`, `PRIORITY_COLORS`, and `PRIORITY_DOT` in `src/lib/utils.ts`.

### Changing colors
All colors use Tailwind classes. The accent color is `indigo-600` — find/replace to any Tailwind color (e.g. `violet-600`, `blue-600`).

### Adding more fields to projects/tasks
1. Add the field to the interface in `src/types/index.ts`
2. Add the input to the form component (`ProjectForm.tsx` or `TaskForm.tsx`)
3. Display it where needed (detail views, cards)

### Switching to a real database
Replace `src/lib/storage.ts` with API calls. The context in `src/context/AppContext.tsx` dispatches the same actions — just swap `loadState`/`saveState` for `fetch` calls.

---

## 📤 Data Backup

- **Export**: Click the download icon on the dashboard — saves a `.json` file
- **Import**: Click the upload icon and select a previously exported `.json` file
- All data replaces the current state on import

---

## 🧱 Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 15 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| lucide-react | latest | Icons |
| date-fns | latest | Date formatting & comparisons |

