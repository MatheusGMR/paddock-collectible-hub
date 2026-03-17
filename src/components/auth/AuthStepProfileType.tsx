import { Car, Store } from "lucide-react";
import { motion } from "framer-motion";

type ProfileType = "collector" | "seller";

interface AuthStepProfileTypeProps {
  selected: ProfileType | null;
  onSelect: (type: ProfileType) => void;
  onNext: () => void;
  onBack: () => void;
}

const options: { type: ProfileType; icon: typeof Car; title: string; description: string }[] = [
  {
    type: "collector",
    icon: Car,
    title: "Colecionador",
    description: "Escaneie, colecione e descubra miniaturas raras",
  },
  {
    type: "seller",
    icon: Store,
    title: "Loja",
    description: "Venda miniaturas e gerencie seu estoque",
  },
];

export const AuthStepProfileType = ({ selected, onSelect, onNext, onBack }: AuthStepProfileTypeProps) => {
  return (
    <div className="flex flex-col items-center gap-6 w-full pt-2">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Como você quer usar o Paddock?</h2>
        <p className="text-sm text-muted-foreground">Escolha seu perfil para personalizar sua experiência</p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {options.map(({ type, icon: Icon, title, description }) => {
          const isSelected = selected === type;
          return (
            <motion.button
              key={type}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(type)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors text-left ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
            >
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className={`font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-3 w-full mt-2">
        <button
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted/50 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 transition-opacity"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};
