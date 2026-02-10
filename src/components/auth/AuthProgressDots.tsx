interface AuthProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

export const AuthProgressDots = ({ currentStep, totalSteps }: AuthProgressDotsProps) => {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === currentStep
              ? "w-6 bg-primary"
              : i < currentStep
              ? "w-2 bg-primary/50"
              : "w-2 bg-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
};
