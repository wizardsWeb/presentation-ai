import { PresentationControls } from "../dashboard/PresentationControls";

export function Header() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Create Presentation</h1>
        <PresentationControls shouldShowLabel={false} />
      </div>
    </div>
  );
}
