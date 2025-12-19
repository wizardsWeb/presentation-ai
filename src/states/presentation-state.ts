import { create } from "zustand";
import { type Themes, type ThemeProperties } from "@/lib/presentation/themes";
import { type ImageModelList } from "@/app/_actions/image/generate";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { type SlideTransitionType } from "@/lib/presentation/animations";

export type GenerationMode = "quick" | "research";

// ============================================================================
// PEDAGOGY TYPES - Teaching style and audience personalization
// ============================================================================

/**
 * Teaching Style - Fundamentally changes how content is structured on each slide
 */
export type TeachingStyle = 
  | "concept-first"    // Theory → Explanation → Examples (traditional academic)
  | "example-first"    // Case Study → Pattern → Concept (inductive learning)
  | "storytelling"     // Hook → Problem → Journey → Resolution (narrative)
  | "data-driven";     // Statistics → Analysis → Insights (evidence-based)

/**
 * Audience Type - Changes examples, tone, and complexity
 */
export type AudienceType = 
  | "school"           // K-12 students: simple language, fun analogies, colorful
  | "college"          // University: academic depth, research references, critical thinking
  | "training"         // Corporate training: skill-focused, hands-on, step-by-step
  | "professional";    // Business: ROI focus, data-driven, executive summaries

// ============================================================================
// QUIZ TYPES - Interactive quiz generation from presentation content
// ============================================================================

/**
 * A single quiz question with multiple choice options
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];          // Array of 4 options (A, B, C, D)
  correctAnswer: number;      // Index of correct option (0-3)
  explanation: string;        // Why this answer is correct
  slideIndex?: number;        // Optional: which slide this question relates to
  difficulty: "easy" | "medium" | "hard";
}

/**
 * Quiz state and user responses
 */
export interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  userAnswers: (number | null)[]; // User's selected answers (null = not answered)
  isComplete: boolean;
  score: number;                   // Number of correct answers
  showResults: boolean;
}

/**
 * Supported languages for content generation
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "bn", name: "Bengali" },
] as const;

// Agent step type for tracking agentic generation progress
export interface AgentStep {
  type: string;
  slideIndex?: number;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface PresentationState {
  currentPresentationId: string | null;
  currentPresentationTitle: string | null;
  isGridView: boolean;
  isSheetOpen: boolean;
  numSlides: number;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  theme: Themes | string;
  customThemeData: ThemeProperties | null;
  language: string;
  pageStyle: string;
  showTemplates: boolean;
  presentationInput: string;
  imageModel: ImageModelList;
  presentationStyle: string;
  teachingStyle: TeachingStyle;
  audienceType: AudienceType;
  savingStatus: "idle" | "saving" | "saved";
  isPresenting: boolean;
  currentSlideIndex: number;
  slideTransition: SlideTransitionType;
  isThemeCreatorOpen: boolean;
  imageGenerationModelOpen: boolean;

  // Generation states
  shouldStartOutlineGeneration: boolean;
  shouldStartPresentationGeneration: boolean;
  isGeneratingOutline: boolean;
  isGeneratingPresentation: boolean;
  outline: string[];
  slides: PlateSlide[]; // This now holds the new object structure
  expectedSlideCount: number; // For skeleton loading
  generationMode: GenerationMode; // Quick (parallel) vs Research (agent)

  // Agent mode state
  isAgentActive: boolean;
  agentSteps: AgentStep[];

  // YouTube video state
  youtubeVideo: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
  } | null;
  isSearchingYouTube: boolean;

  // Quiz state
  quiz: QuizState | null;
  isGeneratingQuiz: boolean;
  isQuizModalOpen: boolean;

  setSlides: (slides: PlateSlide[]) => void;
  setExpectedSlideCount: (count: number) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setIsAgentActive: (isActive: boolean) => void;
  setAgentSteps: (steps: AgentStep[]) => void;
  addAgentStep: (step: AgentStep) => void;
  clearAgentSteps: () => void;
  setYoutubeVideo: (video: { videoId: string; title: string; channelTitle: string; thumbnail: string; } | null) => void;
  setIsSearchingYouTube: (isSearching: boolean) => void;
  
  // Quiz actions
  setQuiz: (quiz: QuizState | null) => void;
  setIsGeneratingQuiz: (isGenerating: boolean) => void;
  setIsQuizModalOpen: (isOpen: boolean) => void;
  answerQuizQuestion: (questionIndex: number, answerIndex: number) => void;
  nextQuizQuestion: () => void;
  previousQuizQuestion: () => void;
  submitQuiz: () => void;
  resetQuiz: () => void;
  setCurrentPresentation: (id: string | null, title: string | null) => void;
  setIsGridView: (isGrid: boolean) => void;
  setIsSheetOpen: (isOpen: boolean) => void;
  setNumSlides: (num: number) => void;
  setTheme: (
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    theme: Themes | string,
    customData?: ThemeProperties | null
  ) => void;
  shouldShowExitHeader: boolean;
  setShouldShowExitHeader: (udpdate: boolean) => void;
  setLanguage: (lang: string) => void;
  setPageStyle: (style: string) => void;
  setShowTemplates: (show: boolean) => void;
  setPresentationInput: (input: string) => void;
  setOutline: (topics: string[]) => void;
  setImageModel: (model: ImageModelList) => void;
  setPresentationStyle: (style: string) => void;
  setTeachingStyle: (style: TeachingStyle) => void;
  setAudienceType: (audience: AudienceType) => void;
  setSavingStatus: (status: "idle" | "saving" | "saved") => void;
  setIsPresenting: (isPresenting: boolean) => void;
  setCurrentSlideIndex: (index: number) => void;
  setSlideTransition: (transition: SlideTransitionType) => void;
  nextSlide: () => void;
  previousSlide: () => void;

  setIsThemeCreatorOpen: (update: boolean) => void;
  setImageGenerationModelOpen: (update: boolean) => void;
  // Generation actions
  setShouldStartOutlineGeneration: (shouldStart: boolean) => void;
  setShouldStartPresentationGeneration: (shouldStart: boolean) => void;
  setIsGeneratingOutline: (isGenerating: boolean) => void;
  setIsGeneratingPresentation: (isGenerating: boolean) => void;
  startOutlineGeneration: () => void;
  startPresentationGeneration: () => void;
  resetGeneration: () => void;

  // Selection state
  isSelecting: boolean;
  selectedPresentations: string[];
  toggleSelecting: () => void;
  selectAllPresentations: (ids: string[]) => void;
  deselectAllPresentations: () => void;
  togglePresentationSelection: (id: string) => void;
}

export const usePresentationState = create<PresentationState>((set) => ({
  currentPresentationId: null,
  currentPresentationTitle: null,
  isGridView: true,
  isSheetOpen: false,
  shouldShowExitHeader: false,
  setShouldShowExitHeader: (update) => set({ shouldShowExitHeader: update }),
  numSlides: 10,
  language: "en-US",
  pageStyle: "default",
  showTemplates: false,
  presentationInput: "",
  outline: [],
  theme: "mystique",
  customThemeData: null,
  imageModel: "unsplash", // Fast stock photos by default
  presentationStyle: "professional",
  teachingStyle: "concept-first", // Default teaching approach
  audienceType: "professional", // Default audience
  slides: [], // Now holds the new slide object structure
  savingStatus: "idle",
  isPresenting: false,
  currentSlideIndex: 0,
  slideTransition: "luxury",
  isThemeCreatorOpen: false,
  imageGenerationModelOpen: false,

  // Generation states
  shouldStartOutlineGeneration: false,
  shouldStartPresentationGeneration: false,
  isGeneratingOutline: false,
  isGeneratingPresentation: false,
  expectedSlideCount: 0,
  generationMode: "quick", // Default to quick mode

  // Agent mode state
  isAgentActive: false,
  agentSteps: [],

  // YouTube video state
  youtubeVideo: null,
  isSearchingYouTube: false,

  // Quiz state
  quiz: null,
  isGeneratingQuiz: false,
  isQuizModalOpen: false,

  setSlides: (slides) => {
    set({ slides });
  },
  setExpectedSlideCount: (count) => set({ expectedSlideCount: count }),
  setGenerationMode: (mode) => set({ generationMode: mode }),
  setIsAgentActive: (isActive) => set({ isAgentActive: isActive }),
  setAgentSteps: (steps) => set({ agentSteps: steps }),
  addAgentStep: (step) => set((state) => ({ agentSteps: [...state.agentSteps, step] })),
  clearAgentSteps: () => set({ agentSteps: [] }),
  setYoutubeVideo: (video) => set({ youtubeVideo: video }),
  setIsSearchingYouTube: (isSearching) => set({ isSearchingYouTube: isSearching }),
  
  // Quiz actions
  setQuiz: (quiz) => set({ quiz }),
  setIsGeneratingQuiz: (isGenerating) => set({ isGeneratingQuiz: isGenerating }),
  setIsQuizModalOpen: (isOpen) => set({ isQuizModalOpen: isOpen }),
  answerQuizQuestion: (questionIndex, answerIndex) => set((state) => {
    if (!state.quiz) return state;
    const newAnswers = [...state.quiz.userAnswers];
    newAnswers[questionIndex] = answerIndex;
    return { quiz: { ...state.quiz, userAnswers: newAnswers } };
  }),
  nextQuizQuestion: () => set((state) => {
    if (!state.quiz) return state;
    const nextIndex = Math.min(state.quiz.currentQuestionIndex + 1, state.quiz.questions.length - 1);
    return { quiz: { ...state.quiz, currentQuestionIndex: nextIndex } };
  }),
  previousQuizQuestion: () => set((state) => {
    if (!state.quiz) return state;
    const prevIndex = Math.max(state.quiz.currentQuestionIndex - 1, 0);
    return { quiz: { ...state.quiz, currentQuestionIndex: prevIndex } };
  }),
  submitQuiz: () => set((state) => {
    if (!state.quiz) return state;
    const score = state.quiz.questions.reduce((acc, q, idx) => {
      return acc + (state.quiz!.userAnswers[idx] === q.correctAnswer ? 1 : 0);
    }, 0);
    return { quiz: { ...state.quiz, isComplete: true, showResults: true, score } };
  }),
  resetQuiz: () => set((state) => {
    if (!state.quiz) return state;
    return {
      quiz: {
        ...state.quiz,
        currentQuestionIndex: 0,
        userAnswers: state.quiz.questions.map(() => null),
        isComplete: false,
        showResults: false,
        score: 0,
      },
    };
  }),
  setCurrentPresentation: (id, title) =>
    set({ currentPresentationId: id, currentPresentationTitle: title }),
  setIsGridView: (isGrid) => set({ isGridView: isGrid }),
  setIsSheetOpen: (isOpen) => set({ isSheetOpen: isOpen }),
  setNumSlides: (num) => set({ numSlides: num }),
  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme, customData = null) =>
    set({
      theme: theme,
      customThemeData: customData,
    }),
  setPageStyle: (style) => set({ pageStyle: style }),
  setShowTemplates: (show) => set({ showTemplates: show }),
  setPresentationInput: (input) => set({ presentationInput: input }),
  setOutline: (topics) => set({ outline: topics }),
  setImageModel: (model) => set({ imageModel: model }),
  setPresentationStyle: (style) => set({ presentationStyle: style }),
  setTeachingStyle: (style) => set({ teachingStyle: style }),
  setAudienceType: (audience) => set({ audienceType: audience }),
  setSavingStatus: (status) => set({ savingStatus: status }),
  setIsPresenting: (isPresenting) => set({ isPresenting }),
  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),
  setSlideTransition: (transition) => set({ slideTransition: transition }),
  nextSlide: () =>
    set((state) => ({
      currentSlideIndex: Math.min(
        state.currentSlideIndex + 1,
        state.slides.length - 1
      ),
    })),
  previousSlide: () =>
    set((state) => ({
      currentSlideIndex: Math.max(state.currentSlideIndex - 1, 0),
    })),

  // Generation actions
  setShouldStartOutlineGeneration: (shouldStart) =>
    set({ shouldStartOutlineGeneration: shouldStart }),
  setShouldStartPresentationGeneration: (shouldStart) =>
    set({ shouldStartPresentationGeneration: shouldStart }),
  setIsGeneratingOutline: (isGenerating) =>
    set({ isGeneratingOutline: isGenerating }),
  setIsGeneratingPresentation: (isGenerating) =>
    set({ isGeneratingPresentation: isGenerating }),
  startOutlineGeneration: () =>
    set({
      shouldStartOutlineGeneration: true,
      isGeneratingOutline: true,
      shouldStartPresentationGeneration: false,
      isGeneratingPresentation: false,
      outline: [],
    }),
  startPresentationGeneration: () =>
    set({
      shouldStartPresentationGeneration: true,
      isGeneratingPresentation: true,
    }),
  resetGeneration: () =>
    set({
      shouldStartOutlineGeneration: false,
      shouldStartPresentationGeneration: false,
      isGeneratingOutline: false,
      isGeneratingPresentation: false,
      isAgentActive: false,
      agentSteps: [],
      youtubeVideo: null,
      isSearchingYouTube: false,
    }),

  setIsThemeCreatorOpen: (update) => set({ isThemeCreatorOpen: update }),
  setImageGenerationModelOpen: (update) => set({ imageGenerationModelOpen: update }),
  // Selection state
  isSelecting: false,
  selectedPresentations: [],
  toggleSelecting: () =>
    set((state) => ({
      isSelecting: !state.isSelecting,
      selectedPresentations: [],
    })),
  selectAllPresentations: (ids) => set({ selectedPresentations: ids }),
  deselectAllPresentations: () => set({ selectedPresentations: [] }),
  togglePresentationSelection: (id) =>
    set((state) => ({
      selectedPresentations: state.selectedPresentations.includes(id)
        ? state.selectedPresentations.filter((p) => p !== id)
        : [...state.selectedPresentations, id],
    })),
}));
