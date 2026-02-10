import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

interface AuthStepPasswordProps {
  onSubmit: (password: string) => void;
  onBack: () => void;
  loading: boolean;
  isLogin?: boolean;
}

export const AuthStepPassword = ({ onSubmit, onBack, loading, isLogin = false }: AuthStepPasswordProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) return;
    onSubmit(password);
  };

  const isValid = isLogin
    ? password.length >= 6
    : password.length >= 6 && password === confirmPassword;

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
        <h2 className="text-2xl font-semibold text-foreground">
          {isLogin ? "Digite sua senha" : "Crie uma senha"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isLogin ? "Use a senha da sua conta" : "Mínimo de 6 caracteres"}
        </p>
      </div>

      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 bg-muted border-0 text-foreground text-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary pr-12"
          required
          minLength={6}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {!isLogin && (
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Confirmar senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-14 bg-muted border-0 text-foreground text-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
          required
          minLength={6}
        />
      )}

      {!isLogin && password && confirmPassword && password !== confirmPassword && (
        <p className="text-sm text-destructive">As senhas não coincidem</p>
      )}

      <Button
        type="submit"
        disabled={loading || !isValid}
        className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isLogin ? (
          "Entrar"
        ) : (
          "Criar conta"
        )}
      </Button>
    </form>
  );
};
