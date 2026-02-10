import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface AuthStepFieldProps {
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  type?: string;
  minLength?: number;
  required?: boolean;
  autoCapitalize?: string;
}

export const AuthStepField = ({
  title,
  subtitle,
  placeholder,
  value,
  onChange,
  onNext,
  onBack,
  type = "text",
  minLength,
  required = true,
}: AuthStepFieldProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 bg-muted border-0 text-foreground text-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
        required={required}
        minLength={minLength}
        autoFocus
      />

      <Button
        type="submit"
        disabled={!value.trim()}
        className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base gap-2"
      >
        Continuar
        <ArrowRight className="h-5 w-5" />
      </Button>
    </form>
  );
};
