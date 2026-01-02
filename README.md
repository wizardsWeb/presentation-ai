# 🎯 Presentation AI,

> **AI-powered presentation builder that creates stunning, professional slides in seconds.**

Transform your ideas into polished presentations with intelligent content generation, real-time streaming, and beautiful themes.

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma)
![LangChain](https://img.shields.io/badge/LangChain-0.3-green?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css)

</div>

---

## ✨ Features

### 🚀 Two Generation Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **⚡ Quick Mode** | Parallel generation with real-time streaming | Fast drafts, simple topics |
| **🔍 Research Mode** | AI agent with web research using Tavily API | Data-rich, factual presentations |

### 🎨 Rich Component Library

Generate slides with **8 visualization types** that automatically adapt to your content:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   BULLETS   │    ICONS    │    CYCLE    │   ARROWS    │
│  • Point 1  │  🚀 Feature │  ┌─►─┐      │  A ──► B    │
│  • Point 2  │  💡 Benefit │  └─◄─┘      │             │
├─────────────┼─────────────┼─────────────┼─────────────┤
│  TIMELINE   │   COLUMNS   │   PYRAMID   │  STAIRCASE  │
│  ──●──●──●  │  A  │  B    │     △      │     ┌──     │
│  2020 2023  │     │       │    ╱ ╲     │   ┌─┘       │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 🎭 Beautiful Themes

9 built-in themes with light/dark mode support:
- **Daktilo** - Modern and clean
- **Cornflower** - Professional and bold
- **Orbit** - Futuristic and sleek
- **Piano** - Classic elegance
- **Mystique** - Dark and sophisticated
- **Gamma Dark** - High contrast
- **Crimson** - Warm and inviting
- **Sunset** - Gradient warmth
- **Forest** - Natural and calm

Plus **custom theme creation** with full color, font, and logo customization.

### 🖊️ Powerful Editor

Built on **Plate.js** (based on Slate), featuring:
- Rich text editing with floating toolbar
- Drag-and-drop slide reordering
- Image generation with AI (Together AI)
- Icon picker with 1000+ FontAwesome icons
- Real-time auto-save
- Presenter notes

### 📊 Presentation Mode

Full-screen presentation with:
- Keyboard navigation (arrow keys, space, escape)
- Smooth slide transitions
- Theme-aware styling
- Responsive design

---

## 🏗️ Architecture

### Agent-Based Generation System

```
┌────────────────────────────────────────────────────────────────────┐
│                      GENERATION MODES                               │
├──────────────────────────────┬─────────────────────────────────────┤
│         QUICK MODE           │          RESEARCH MODE              │
│  (Parallel + Streaming)      │     (Agent + Web Research)          │
├──────────────────────────────┼─────────────────────────────────────┤
│                              │                                      │
│   ┌─────────────────────┐    │    ┌─────────────────────────────┐  │
│   │   Outline Parser    │    │    │      Slide Agent            │  │
│   └──────────┬──────────┘    │    └──────────────┬──────────────┘  │
│              │               │                   │                  │
│              ▼               │                   ▼                  │
│   ┌─────────────────────┐    │    ┌─────────────────────────────┐  │
│   │ Parallel Generation │    │    │   Batch Web Research        │  │
│   │   (All slides at    │    │    │   (Tavily API - parallel)   │  │
│   │    once via SSE)    │    │    └──────────────┬──────────────┘  │
│   └──────────┬──────────┘    │                   │                  │
│              │               │                   ▼                  │
│              ▼               │    ┌─────────────────────────────┐  │
│   ┌─────────────────────┐    │    │   LLM Generation            │  │
│   │  Real-time Token    │    │    │   (with research context)   │  │
│   │     Streaming       │    │    └──────────────┬──────────────┘  │
│   └──────────┬──────────┘    │                   │                  │
│              │               │                   ▼                  │
│              ▼               │    ┌─────────────────────────────┐  │
│   ┌─────────────────────┐    │    │   Token Streaming           │  │
│   │    XML Parser       │    │    │   (real-time feedback)      │  │
│   │  (streaming parse)  │    │    └──────────────┬──────────────┘  │
│   └──────────┬──────────┘    │                   │                  │
│              │               │                   ▼                  │
│              ▼               │    ┌─────────────────────────────┐  │
│   ┌─────────────────────┐    │    │   Layout Optimizer          │  │
│   │   Plate.js Editor   │    │    │   (alternating layouts)     │  │
│   │    (live update)    │    │    └─────────────────────────────┘  │
│   └─────────────────────┘    │                                      │
│                              │                                      │
└──────────────────────────────┴─────────────────────────────────────┘
```

### Slide Agent Pipeline (Research Mode)

```typescript
interface AgentEvent {
  type: 
    | "agent_start"      // Agent initialized
    | "slide_start"      // Starting slide N
    | "researching"      // Web search in progress
    | "research_complete"// Facts gathered
    | "generating"       // LLM generating content
    | "token"            // Streaming token received
    | "slide_complete"   // Slide finished
    | "agent_done";      // All slides complete
  slideIndex?: number;
  chunk?: string;        // Token for streaming
  content?: string;      // Final slide content
}
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth.js (Google OAuth) |
| **AI/LLM** | OpenAI GPT-4o-mini via LangChain |
| **Web Search** | Tavily API |
| **Image Gen** | Together AI |
| **Editor** | Plate.js (Slate-based) |
| **State** | Zustand |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Queries** | TanStack Query |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── _actions/           # Server actions
│   │   ├── presentation/   # CRUD, fetch, save
│   │   └── image/          # AI image generation
│   ├── api/
│   │   └── presentation/
│   │       ├── generate/           # Legacy generation
│   │       ├── generate-realtime/  # Quick mode (SSE streaming)
│   │       ├── generate-agent/     # Research mode endpoint
│   │       ├── outline/            # Outline generation
│   │       └── presenter-notes/    # Notes generation
│   └── presentation/
│       ├── [id]/           # View/present mode
│       └── generate/[id]/  # Editor mode
│
├── components/
│   └── presentation/
│       ├── dashboard/      # Home page components
│       ├── editor/         # Plate.js editor
│       │   ├── custom-elements/  # Bullets, Icons, Timeline, etc.
│       │   └── native-elements/  # Headings, Paragraphs, Images
│       ├── presentation-page/    # Presentation viewer
│       └── theme/          # Theme customization
│
├── lib/
│   ├── agents/
│   │   ├── slide-agent.ts  # Main agent logic
│   │   └── tools/
│   │       ├── web-search.ts    # Tavily integration
│   │       └── validate-slide.ts # Content validation
│   └── presentation/
│       └── themes.ts       # Theme definitions
│
├── states/
│   └── presentation-state.ts  # Zustand store
│
└── server/
    ├── auth.ts             # NextAuth config
    └── db.ts               # Prisma client
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (or use Neon/Supabase)

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI
OPENAI_API_KEY="sk-..."

# Web Search (for Research mode)
TAVILY_API_KEY="tvly-..."

# Image Generation
TOGETHER_AI_API_KEY="..."

# File Uploads
UPLOADTHING_SECRET="..."
UPLOADTHING_APP_ID="..."
```

### Installation

```bash
# Clone the repository
git clone https://github.com/VirusHacks/presentation-ai.git
cd presentation-ai

# Install dependencies
pnpm install

# Setup database
pnpm db:push

# Start development server
pnpm dev
```

### Build for Production

```bash
# Build (includes Prisma generate)
pnpm build

# Start production server
pnpm start
```

---

## 🔌 API Endpoints

### Outline Generation
```
POST /api/presentation/outline
Body: { topic, language, numberOfSlides, tone }
Returns: Streaming outline points
```

### Quick Mode Generation
```
POST /api/presentation/generate-realtime
Body: { title, outline, language, tone }
Returns: SSE stream with token chunks
```

### Research Mode Generation
```
POST /api/presentation/generate-agent
Body: { title, outline, language, tone }
Returns: SSE stream with agent events + tokens
```

---

## 🎨 Custom Slide Components

The AI can generate these visualization components:

### BULLETS
```xml
<BULLETS>
  <DIV><H3>Key Point</H3><P>Supporting detail with stats.</P></DIV>
  <DIV><H3>Another Point</H3><P>More information here.</P></DIV>
</BULLETS>
```

### ICONS
```xml
<ICONS>
  <DIV><ICON query="rocket"/><H3>Launch</H3><P>Description.</P></DIV>
  <DIV><ICON query="chart"/><H3>Growth</H3><P>Description.</P></DIV>
</ICONS>
```

### TIMELINE
```xml
<TIMELINE>
  <DIV><H3>2020: Founding</H3><P>Company started.</P></DIV>
  <DIV><H3>2023: Scale</H3><P>Reached 1M users.</P></DIV>
</TIMELINE>
```

### CYCLE / ARROWS / PYRAMID / STAIRCASE / COLUMNS
Similar structure with semantic containers.

---

## 📊 State Management

Using **Zustand** for global state:

```typescript
interface PresentationState {
  // Generation
  generationMode: "quick" | "research";
  isGeneratingPresentation: boolean;
  outline: string[];
  slides: PlateSlide[];
  
  // Agent tracking
  isAgentActive: boolean;
  agentSteps: AgentStep[];
  
  // Theme
  theme: ThemeName | string;
  customThemeData: ThemeProperties | null;
  
  // Presentation
  isPresenting: boolean;
  currentSlideIndex: number;
}
```

---

## 🛣️ Roadmap

See [TODO.md](./TODO.md) for the full roadmap. Key upcoming features:

- [ ] 📄 **Custom Content Upload** - Upload PDFs/docs as source material
- [ ] 🎓 **Explainability Agent** - AI-generated presenter notes
- [ ] 🎬 **Animation System** - Slide transitions and element animations
- [ ] 📊 **Charts & Graphs** - AI-generated data visualizations
- [ ] 👥 **Collaboration** - Real-time multi-user editing
- [ ] 📱 **Mobile App** - Present from your phone

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [VirusHacks](https://github.com/VirusHacks)**

[⬆ Back to Top](#-presentation-ai)

</div>
