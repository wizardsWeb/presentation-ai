import { Layout } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  usePresentationState, 
  SUPPORTED_LANGUAGES,
  type TeachingStyle,
  type AudienceType,
} from "@/states/presentation-state";

const TEACHING_STYLES: { value: TeachingStyle; label: string }[] = [
  { value: "concept-first", label: "Concept First" },
  { value: "example-first", label: "Example First" },
  { value: "storytelling", label: "Storytelling" },
  { value: "data-driven", label: "Data Driven" },
];

const AUDIENCE_TYPES: { value: AudienceType; label: string }[] = [
  { value: "school", label: "School (K-12)" },
  { value: "college", label: "College" },
  { value: "training", label: "Corporate Training" },
  { value: "professional", label: "Professional" },
];

export function PresentationControls({
  shouldShowLabel = true,
}: {
  shouldShowLabel?: boolean;
}) {
  const {
    numSlides,
    setNumSlides,
    language,
    setLanguage,
    pageStyle,
    setPageStyle,
    teachingStyle,
    setTeachingStyle,
    audienceType,
    setAudienceType,
  } = usePresentationState();

  return (
    <div className="space-y-4">
      {/* First row: Number of Slides, Language, Page Style */}
      <div className="grid grid-cols-3 gap-4">
        {/* Number of Slides */}
        <div>
          {shouldShowLabel && (
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of slides
            </label>
          )}
          <Select
            value={String(numSlides)}
            onValueChange={(v) => setNumSlides(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select number of slides" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num} slides
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language */}
        <div>
          {shouldShowLabel && (
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Language
            </label>
          )}
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

        {/* Page Style */}
        <div>
          {shouldShowLabel && (
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Page style
            </label>
          )}
          <Select value={pageStyle} onValueChange={setPageStyle}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                <SelectValue placeholder="Select page style" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                <div className="flex items-center gap-3">
                  <span>Default</span>
                </div>
              </SelectItem>
              <SelectItem value="traditional">
                <div className="flex items-center gap-3">
                  <span>Traditional</span>
                </div>
              </SelectItem>
              <SelectItem value="tall">
                <div className="flex items-center gap-3">
                  <span>Tall</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Second row: Teaching Style and Audience Type */}
      <div className="grid grid-cols-2 gap-4">
        {/* Teaching Style */}
        <div>
          {shouldShowLabel && (
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Teaching Style
            </label>
          )}
          <Select 
            value={teachingStyle} 
            onValueChange={(v) => setTeachingStyle(v as TeachingStyle)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select teaching style" />
            </SelectTrigger>
            <SelectContent>
              {TEACHING_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audience Type */}
        <div>
          {shouldShowLabel && (
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Audience
            </label>
          )}
          <Select 
            value={audienceType} 
            onValueChange={(v) => setAudienceType(v as AudienceType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select audience" />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_TYPES.map((audience) => (
                <SelectItem key={audience.value} value={audience.value}>
                  {audience.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
