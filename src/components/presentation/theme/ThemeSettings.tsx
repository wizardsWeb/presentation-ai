import { 
  usePresentationState, 
  SUPPORTED_LANGUAGES,
  type TeachingStyle,
  type AudienceType,
} from "@/states/presentation-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type Themes, themes } from "@/lib/presentation/themes";
import { useTheme } from "next-themes";
import { type ImageModelList } from "@/app/_actions/image/generate";
import { ThemeModal } from "./ThemeModal";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const IMAGE_MODELS: { value: ImageModelList; label: string; description?: string }[] = [
  { value: "unsplash", label: "Unsplash (Fast Stock Photos)", description: "Quick stock photos" },
  { value: "pollinations", label: "Pollinations (Free AI)", description: "Free AI image generation" },
  { value: "black-forest-labs/FLUX.1-schnell-Free", label: "FLUX.1 [schnell] Free", description: "Fast AI generation" },
  { value: "black-forest-labs/FLUX1.1-pro", label: "FLUX 1.1 [pro]", description: "High quality AI" },
  { value: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 [schnell]", description: "Turbo AI generation" },
  { value: "black-forest-labs/FLUX.1-pro", label: "FLUX.1 [pro]", description: "Professional AI" },
  { value: "black-forest-labs/FLUX.1-dev", label: "FLUX.1 [dev]", description: "Experimental AI" },
  { value: "nano-banana", label: "Nano Banana (Full Slide)", description: "Generate entire slide as image - perfect, detailed slides" },
];

const PRESENTATION_STYLES = [
  { value: "professional", label: "Professional" },
  { value: "creative", label: "Creative" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "elegant", label: "Elegant" },
];

const TEACHING_STYLES: { value: TeachingStyle; label: string; description: string }[] = [
  { value: "concept-first", label: "Concept First", description: "Theory → Explanation → Examples" },
  { value: "example-first", label: "Example First", description: "Case Study → Pattern → Concept" },
  { value: "storytelling", label: "Storytelling", description: "Hook → Problem → Journey → Resolution" },
  { value: "data-driven", label: "Data Driven", description: "Statistics → Analysis → Insights" },
];

const AUDIENCE_TYPES: { value: AudienceType; label: string; description: string }[] = [
  { value: "school", label: "School (K-12)", description: "Simple language, fun examples" },
  { value: "college", label: "College/University", description: "Academic depth, citations" },
  { value: "training", label: "Corporate Training", description: "Practical skills, exercises" },
  { value: "professional", label: "Business/Professional", description: "Executive-friendly, concise" },
];

export function ThemeSettings() {
  const { 
    theme, 
    setTheme, 
    imageModel, 
    setImageModel,
    teachingStyle,
    setTeachingStyle,
    audienceType,
    setAudienceType,
    language,
    setLanguage,
  } = usePresentationState();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-white">Theme & Layout</Label>
          <ThemeModal>
            <Button variant={"link"} className="text-white hover:text-white/80">More Themes</Button>
          </ThemeModal>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(themes).map(([key, themeOption]) => {
            const modeColors = isDark
              ? themeOption.colors.dark
              : themeOption.colors.light;
            const modeShadows = isDark
              ? themeOption.shadows.dark
              : themeOption.shadows.light;

            return (
              <button
                key={key}
                onClick={() => setTheme(key as Themes)}
                className={cn(
                  "group relative space-y-2 rounded-lg border p-4 text-left transition-all",
                  theme === key
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50 hover:bg-muted/50"
                )}
                style={{
                  borderRadius: themeOption.borderRadius,
                  boxShadow: modeShadows.card,
                  transition: themeOption.transitions.default,
                  backgroundColor:
                    theme === key
                      ? `${modeColors.primary}${isDark ? "15" : "08"}`
                      : isDark
                      ? "rgba(0,0,0,0.3)"
                      : "rgba(255,255,255,0.9)",
                }}
              >
                <div
                  className="font-medium"
                  style={{
                    color: modeColors.heading,
                    fontFamily: themeOption.fonts.heading,
                  }}
                >
                  {themeOption.name}
                </div>
                <div
                  className="text-sm"
                  style={{
                    color: modeColors.text,
                    fontFamily: themeOption.fonts.body,
                  }}
                >
                  {themeOption.description}
                </div>
                <div className="flex gap-2">
                  {[
                    modeColors.primary,
                    modeColors.secondary,
                    modeColors.accent,
                  ].map((color, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full ring-1 ring-inset ring-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div
                  className="mt-2 text-xs"
                  style={{ color: modeColors.muted }}
                >
                  <span className="block">
                    Heading: {themeOption.fonts.heading}
                  </span>
                  <span className="block">Body: {themeOption.fonts.body}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold text-white">Image Generation Model</Label>
        <Select
          value={imageModel || "black-forest-labs/FLUX.1-schnell-Free"}
          onValueChange={(value) => setImageModel(value as ImageModelList)}
        >
          <SelectTrigger className="bg-white/5 border-white/20 text-white">
            <SelectValue placeholder="Select image model" />
          </SelectTrigger>
          <SelectContent className="bg-[#1f1f1f] border-white/20 text-white">
            {IMAGE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-white focus:bg-white/10">
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold text-white">Presentation Style</Label>
        <Select defaultValue="professional">
          <SelectTrigger className="bg-white/5 border-white/20 text-white">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent className="bg-[#1f1f1f] border-white/20 text-white">
            {PRESENTATION_STYLES.map((style) => (
              <SelectItem key={style.value} value={style.value} className="text-white focus:bg-white/10">
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pedagogy Settings */}
      <div className="space-y-4 border-t border-white/10 pt-6">
        <Label className="text-sm font-semibold text-white">Teaching Style</Label>
        <RadioGroup
          value={teachingStyle}
          onValueChange={(value) => setTeachingStyle(value as TeachingStyle)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {TEACHING_STYLES.map((style) => (
            <label
              key={style.value}
              className={cn(
                "flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all",
                teachingStyle === style.value
                  ? "border-white/40 bg-white/10"
                  : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
              )}
            >
              <RadioGroupItem value={style.value} className="mt-0.5 text-white" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-white">{style.label}</div>
                <div className="text-xs text-gray-400">
                  {style.description}
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold text-white">Target Audience</Label>
        <Select
          value={audienceType}
          onValueChange={(value) => setAudienceType(value as AudienceType)}
        >
          <SelectTrigger className="bg-white/5 border-white/20 text-white">
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent className="bg-[#1f1f1f] border-white/20 text-white">
            {AUDIENCE_TYPES.map((audience) => (
              <SelectItem 
                key={audience.value} 
                value={audience.value} 
                className="text-white focus:bg-white/10"
              >
                {audience.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold text-white">Content Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="bg-white/5 border-white/20 text-white">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent className="bg-[#1f1f1f] border-white/20 text-white">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code} className="text-white focus:bg-white/10">
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
