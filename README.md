# 🎯 Presentation AI,

> **AI-powered presentation builder with agentic architecture, offline models, and multilingual support for Indian languages.**

Transform your ideas into polished presentations with intelligent content generation, real-time streaming, offline AI models, and advanced personalization for teachers.

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

| Mode | Description | Best For | Speed |
|------|-------------|----------|-------|
| **⚡ Quick Mode** | Parallel generation with real-time streaming | Fast drafts, simple topics | 362ms-2.4s first response, 25-35s total (10 slides) |
| **🔍 Research Mode** | AI agent with web research using Tavily API | Data-rich, factual presentations | 2.4s-3.6s first response, 30-76s total (10 slides) |

### 🤖 Offline AI Model (RAG Architecture)

Our offline model uses a **Retrieval-Augmented Generation (RAG)** architecture that ensures syllabus alignment and prevents hallucination by locking knowledge to NCERT (National Council of Educational Research and Training) content.

#### Step 1: Knowledge Is Locked to NCERT (RAG Layer)

- **All facts come from NCERT content**: The system only uses official NCERT textbook material
- **Stored locally as a vector database**: NCERT content is indexed and stored locally
- **Indexed chapter-wise, concept-wise**: Organized for efficient retrieval
- **No internet, no external sources**: Completely offline operation

This ensures:
- ✅ **Syllabus alignment**: Content matches official curriculum
- ✅ **Zero hallucination**: No made-up facts or external information
- ✅ **Exam-safe content**: Students can trust the information

The AI is essentially told: *"You are not allowed to know anything outside NCERT."* This is what gives you trust.

#### Step 2: Retrieval Before Generation (The Guardrail)

When a teacher enters a query like *"Explain photosynthesis for Class 10"*, the system:

1. **Searches the local NCERT vector store**
2. **Retrieves only relevant textbook chunks**
3. **Filters by**:
   - Class level
   - Subject
   - Chapter

The model never sees:
- ❌ Wikipedia
- ❌ Blogs
- ❌ Advanced explanations
- ✅ Only textbook-grade material

#### Step 3: Fine-Tuned Small Model (Explanation Engine)

The model is:
- **Small**: Efficient and fast
- **Offline**: No API dependencies
- **Fine-tuned using LoRA/QLoRA**: Optimized for educational content
- **Not trained to learn facts**: Instead, trained to:
  - Explain clearly
  - Use teacher-like tone
  - Write slide-friendly bullet points
  - Adapt to class level

**Key Distinction**:
- **Textbook** = What to say (source of facts)
- **Model** = How to say it (explanation style)

#### Step 4: Strict Prompting (Discipline Layer)

The retrieved NCERT content is passed with hard constraint prompts:

```text
"Use only the provided content.
Do not add external information.
Explain in simple language suitable for the given class."
```

This makes hallucination **structurally impossible**, not just unlikely.

#### Step 5: Offline Output (Final Result)

The model outputs:
- ✅ 4–6 clean bullet points
- ✅ Slide-ready explanations
- ✅ Teacher-appropriate language
- ✅ Zero internet dependency

Everything runs:
- 🏠 **Locally**
- 📴 **Offline**
- 🔒 **Privacy-safe**

#### Technical Implementation

- **Fine-tuned Phi-2 Model**: Trained on NCERT curriculum data
- **Runs Locally**: No API costs, works completely offline
- **4-bit Quantization**: Efficient memory usage (QLoRA)
- **Flask Backend**: Python service for offline inference
- **Vector Database**: Local embedding storage for NCERT content

### 🌐 Multilingual Support

- **25+ Languages**: English, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, Russian, and more
- **20+ Indian Languages**: Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Sanskrit, and more
- **Bhashini Integration**: 
  - **ASR (Speech-to-Text)**: Voice input in Indian languages
  - **TTS (Text-to-Speech)**: Audio output in Indian languages
  - **Translation**: Seamless translation between Indian languages

### 👨‍🏫 Teacher Personalization

- **4 Teaching Styles**:
  - **Concept-First**: Theory → Explanation → Examples (traditional academic)
  - **Example-First**: Case Study → Pattern → Concept (inductive learning)
  - **Storytelling**: Hook → Problem → Journey → Resolution (narrative)
  - **Data-Driven**: Statistics → Analysis → Insights (evidence-based)
- **4 Audience Types**:
  - **School**: Simple language, fun examples, colorful visuals
  - **College**: Academic depth, research references, critical thinking
  - **Training**: Skill-focused, hands-on, step-by-step
  - **Professional**: ROI focus, data-driven, executive summaries
- **Adaptive Content**: Slides automatically adapt structure based on teaching style and audience

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

### 🖼️ Advanced Image Generation

- **7 Provider Fallback Chain**: Unsplash, Pexels, Pollinations, FLUX-schnell, FLUX-pro, FLUX-dev, nano-banana
- **Smart Provider Selection**: Category-based selection (photo/abstract/diagram/scene/icon)
- **Gemini Prompt Enhancement**: AI-powered prompt improvement for better image quality
- **Intelligent Caching**: Image and prompt caching for instant retrieval (<100ms cache hits)
- **Full Slide Generation**: Nano-banana service for complete slide image generation
- **Performance**: 424ms-1.4s (Quick Mode), 2.3s-7.1s (with enhancement)

### 📊 AI-Powered Chart Generation

- **Automatic Data Extraction**: Gemini AI extracts numerical data from text
- **Smart Chart Type Selection**: Automatically chooses optimal chart type (bar/line/pie/area/horizontal-bar)
- **Zero Manual Input**: Completely automated chart creation
- **5 Chart Types**: Vertical bar, horizontal bar, line, pie, area charts

### 🎬 YouTube Video Integration

- **Automatic Video Search**: Finds relevant educational videos automatically
- **Relevance Scoring**: Filters out clickbait, prioritizes educational content
- **Smart Placement**: Automatically inserts at optimal slide position (slide 2)
- **Multilingual**: Language-aware search queries
- **Educational Focus**: Optimized for tutorial and explanatory content

### 🖊️ Powerful Editor

Built on **Plate.js** (based on Slate), featuring:
- Rich text editing with floating toolbar
- Drag-and-drop slide reordering
- Multi-provider AI image generation with fallback chain
- Icon picker with 1000+ FontAwesome icons
- Real-time auto-save
- AI-generated presenter notes
- Interactive quiz generation from presentation content

### 📊 Presentation Mode

Full-screen presentation with:
- Keyboard navigation (arrow keys, space, escape)
- Smooth slide transitions
- Theme-aware styling
- Responsive design
- Interactive quiz mode
- Presenter notes display

### 🎯 Interactive Features

- **Quiz Generation**: AI-generated interactive quizzes from presentation content
- **Presenter Notes**: AI-generated detailed notes for each slide
- **Export Options**: PDF, PPTX, HTML export formats
- **Voice Input**: Speech-to-text support via Bhashini (Indian languages)

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
| **Offline AI** | Fine-tuned Phi-2 (Microsoft) - Flask backend |
| **Web Search** | Tavily API |
| **Image Gen** | Together AI (FLUX models), Unsplash, Pexels, Pollinations, nano-banana |
| **Image Enhancement** | Google Gemini 2.0 Flash |
| **Chart Generation** | Google Gemini 2.0 Flash |
| **Multilingual** | Bhashini API (ASR, TTS, Translation) |
| **Video Search** | YouTube Data API v3 |
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
│   ├── image/
│   │   ├── image-service.ts      # Multi-provider image generation
│   │   └── nano-banana-service.ts # Full slide image generation
│   ├── charts/
│   │   └── gemini-chart-service.ts # AI chart generation
│   ├── youtube/
│   │   └── search.ts              # YouTube video search
│   ├── bhashini/
│   │   └── client.ts              # Indian language support
│   └── presentation/
│       └── themes.ts       # Theme definitions
├── backend/                # Python Flask backend
│   ├── app.py             # Phi-2 model inference
│   └── mainapp.py         # Alternative model loader
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
- Python 3.8+ (for offline Phi-2 model)
- pnpm (recommended) or npm
- PostgreSQL database (or use Neon/Supabase)
- GPU (optional, for faster offline inference) or CPU support

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

# Google AI (for image enhancement and chart generation)
GOOGLE_API_KEY="..."

# Web Search (for Research mode)
TAVILY_API_KEY="tvly-..."

# Image Generation
TOGETHER_AI_API_KEY="..."
UNSPLASH_ACCESS_KEY="..."  # Optional, falls back to Unsplash Source
PEXELS_API_KEY="..."       # Optional

# YouTube Integration
YOUTUBE_API_KEY="..."

# Bhashini (for Indian language support)
BHASHINI_USER_ID="..."
BHASHINI_API_KEY="..."
BHASHINI_PIPELINE_ID="..."  # Optional, has default

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

# Setup Python backend (for offline model)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py  # Runs on port 5000

# In another terminal, start Next.js dev server
cd ..
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
Body: { 
  prompt: string,
  numberOfCards: number,
  language: string,
  teachingStyle: "concept-first" | "example-first" | "storytelling" | "data-driven",
  audienceType: "school" | "college" | "training" | "professional"
}
Returns: Streaming outline points
```

### Quick Mode Generation
```
POST /api/presentation/generate-realtime
Body: { 
  title: string,
  outline: string[],
  language: string,
  tone: string,
  teachingStyle?: string,
  audienceType?: string
}
Returns: SSE stream with token chunks
```

### Research Mode Generation
```
POST /api/presentation/generate-agent
Body: { 
  title: string,
  outline: string[],
  language: string,
  tone: string,
  teachingStyle?: string,
  audienceType?: string,
  config?: { enableYouTubeSearch: boolean }
}
Returns: SSE stream with agent events + tokens
```

### Presenter Notes Generation
```
POST /api/presentation/presenter-notes
Body: { 
  presentationId: string,
  slides: Slide[],
  language: string
}
Returns: AI-generated presenter notes
```

### Quiz Generation
```
POST /api/presentation/quiz
Body: { 
  presentationId: string,
  slides: Slide[],
  language: string
}
Returns: Interactive quiz questions
```

### Export Presentation
```
POST /api/presentation/export
Body: { 
  presentationId: string,
  format: "pdf" | "pptx" | "html"
}
Returns: Exported file
```

### YouTube Video Search
```
POST /api/youtube/search
Body: { 
  topic: string,
  language: string
}
Returns: Relevant educational video
```

---



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

## 🎯 Key Differentiators

### vs Prezi, Gamma, PowerPoint AI

- ✅ **Offline AI Model**: Fine-tuned Phi-2 runs locally (no API costs)
- ✅ **Agentic Architecture**: Autonomous research and content refinement
- ✅ **Indian Language Excellence**: Best-in-class support for 20+ Indian languages with voice
- ✅ **Teacher Personalization**: 4 teaching styles × 4 audience types = 16 combinations
- ✅ **Advanced Image Generation**: 7-provider fallback chain with AI enhancement
- ✅ **Intelligent Chart Generation**: Automatic data extraction and visualization
- ✅ **YouTube Integration**: Automatic educational video discovery
- ✅ **Real-time Streaming**: Token-by-token generation for instant feedback
- ✅ **Parallel Processing**: All slides generated simultaneously (2-5x faster)
- ✅ **Open Source**: Fully customizable and extensible


---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [VirusHacks](https://github.com/VirusHacks)**

[⬆ Back to Top](#-presentation-ai)

</div>
