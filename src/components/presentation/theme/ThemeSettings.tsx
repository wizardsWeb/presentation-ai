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

export const IMAGE_MODELS: { value: ImageModelList; label: string }[] = [
  { value: "pollinations", label: "Pollinations (Free)" },
  { value: "black-forest-labs/FLUX.1-schnell-Free", label: "FLUX.1 [schnell] Free" },
  { value: "black-forest-labs/FLUX1.1-pro", label: "FLUX 1.1 [pro]" },
  { value: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 [schnell]" },
  { value: "black-forest-labs/FLUX.1-pro", label: "FLUX.1 [pro]" },
  { value: "black-forest-labs/FLUX.1-dev", label: "FLUX.1 [dev]" },
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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Theme & Layout</Label>
          <ThemeModal>
            <Button variant={"link"}>More Themes</Button>
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

      <div className="space-y-4">
        <Label className="text-sm font-medium">Image Generation Model</Label>
        <Select
          value={imageModel || "black-forest-labs/FLUX.1-schnell-Free"}
          onValueChange={(value) => setImageModel(value as ImageModelList)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select image model" />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium">Presentation Style</Label>
        <Select defaultValue="professional">
          <SelectTrigger>
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {PRESENTATION_STYLES.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pedagogy Settings */}
      <div className="space-y-4 border-t pt-6">
        <Label className="text-sm font-medium">Teaching Style</Label>
        <RadioGroup
          value={teachingStyle}
          onValueChange={(value) => setTeachingStyle(value as TeachingStyle)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {TEACHING_STYLES.map((style) => (
            <label
              key={style.value}
              className={cn(
                "flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors",
                teachingStyle === style.value
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={style.value} className="mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium">{style.label}</div>
                <div className="text-xs text-muted-foreground">
                  {style.description}
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium">Target Audience</Label>
        <Select
          value={audienceType}
          onValueChange={(value) => setAudienceType(value as AudienceType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_TYPES.map((audience) => (
              <SelectItem key={audience.value} value={audience.value}>
                <div className="flex flex-col">
                  <span>{audience.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {audience.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium">Content Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
