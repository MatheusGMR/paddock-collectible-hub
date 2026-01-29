import { AlertTriangle, Camera, Sun, Move, Focus, Eye, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ImageQualityIssue {
  type: "too_many_cars" | "poor_lighting" | "too_far" | "too_close" | "blurry" | "obstructed";
  severity: "error" | "warning";
  message: string;
  detectedCount?: number;
}

interface ImageQualityErrorProps {
  issues: ImageQualityIssue[];
  suggestion: string;
  capturedImage: string;
  onRetry: () => void;
}

const issueIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  too_many_cars: Camera,
  poor_lighting: Sun,
  too_far: Move,
  too_close: Move,
  blurry: Focus,
  obstructed: Eye,
};

export const ImageQualityError = ({
  issues,
  suggestion,
  capturedImage,
  onRetry,
}: ImageQualityErrorProps) => {
  const { t } = useLanguage();
  
  // Get the primary issue (first error, or first warning if no errors)
  const primaryIssue = issues.find(i => i.severity === "error") || issues[0];
  
  if (!primaryIssue) return null;
  
  const IssueIcon = issueIcons[primaryIssue.type] || AlertTriangle;
  
  // Get translated content for the issue type
  const getIssueTitle = (type: string): string => {
    const titles: Record<string, string> = {
      too_many_cars: t.scanner.issueTypes?.too_many_cars || "Too many cars!",
      poor_lighting: t.scanner.issueTypes?.poor_lighting || "Poor lighting",
      too_far: t.scanner.issueTypes?.too_far || "Too far away",
      too_close: t.scanner.issueTypes?.too_close || "Too close",
      blurry: t.scanner.issueTypes?.blurry || "Blurry photo",
      obstructed: t.scanner.issueTypes?.obstructed || "View obstructed",
    };
    return titles[type] || t.common.error;
  };
  
  const getIssueDescription = (issue: ImageQualityIssue): string => {
    if (issue.type === "too_many_cars" && issue.detectedCount) {
      const template = t.scanner.issueTypes?.too_many_cars_desc || "We detected {{count}} cars, but the limit is 5.";
      return template.replace("{{count}}", String(issue.detectedCount));
    }
    
    const descriptions: Record<string, string> = {
      too_many_cars: t.scanner.issueTypes?.too_many_cars_desc || "Too many cars detected.",
      poor_lighting: t.scanner.issueTypes?.poor_lighting_desc || "The photo is too dark or too bright.",
      too_far: t.scanner.issueTypes?.too_far_desc || "The cars appear too small in the photo.",
      too_close: t.scanner.issueTypes?.too_close_desc || "The cars are cut off in the photo.",
      blurry: t.scanner.issueTypes?.blurry_desc || "The image is out of focus.",
      obstructed: t.scanner.issueTypes?.obstructed_desc || "Something is blocking the view.",
    };
    return descriptions[issue.type] || issue.message;
  };
  
  const getIssueTip = (type: string): string => {
    const tips: Record<string, string> = {
      too_many_cars: t.scanner.issueTypes?.too_many_cars_tip || "Photograph smaller groups for better accuracy.",
      poor_lighting: t.scanner.issueTypes?.poor_lighting_tip || "Try in an area with natural or even lighting.",
      too_far: t.scanner.issueTypes?.too_far_tip || "Move the camera closer to the cars.",
      too_close: t.scanner.issueTypes?.too_close_tip || "Move back a bit to capture them fully.",
      blurry: t.scanner.issueTypes?.blurry_tip || "Hold steady and wait for focus before capturing.",
      obstructed: t.scanner.issueTypes?.obstructed_tip || "Remove objects that are in the way.",
    };
    return tips[type] || suggestion;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Background image with dark overlay */}
      <div className="relative flex-1 overflow-hidden">
        <img
          src={capturedImage}
          alt="Captured"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        
        {/* Error content centered */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            {/* Header with icon */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <IssueIcon className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                {t.scanner.imageQualityError || "Oops! There's a problem"}
              </h2>
            </div>
            
            {/* Issue details */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {getIssueTitle(primaryIssue.type)}
              </h3>
              <p className="text-sm text-foreground-secondary mb-4">
                {getIssueDescription(primaryIssue)}
              </p>
              
              {/* Tip */}
              <div className="flex items-start gap-2 pt-3 border-t border-border">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">
                  <span className="font-medium">{t.scanner.tip || "Tip"}:</span>{" "}
                  {getIssueTip(primaryIssue.type)}
                </p>
              </div>
            </div>
            
            {/* Retry button */}
            <Button
              onClick={onRetry}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              {t.scanner.retryCapture || "Try Again"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
