import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

interface AuthStepEmailProps {
  email: string;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
  loading: boolean;
}

export const AuthStepEmail = ({ email, onEmailChange, onContinue, loading }: AuthStepEmailProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) onContinue();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* Invisible spacer to match "Voltar" button height in other steps */}
      <div className="h-5" aria-hidden="true" />

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Qual é o seu email?</h2>
        <p className="text-sm text-muted-foreground">
          Vamos verificar se você já tem uma conta
        </p>
      </div>

      <Input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        className="h-14 bg-muted border-0 text-foreground text-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
        required
        autoFocus
      />

      <Button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base gap-2"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Continuar
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </Button>
    </form>
  );
};
