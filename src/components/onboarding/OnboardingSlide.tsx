import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface OnboardingSlideProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

export const OnboardingSlide = ({ icon: Icon, title, description, gradient }: OnboardingSlideProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          delay: 0.2 
        }}
        className={`w-32 h-32 rounded-3xl ${gradient} flex items-center justify-center mb-8 shadow-2xl`}
      >
        <motion.div
          animate={{ 
            y: [0, -8, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          <Icon className="w-16 h-16 text-white" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-foreground mb-4"
      >
        {title}
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-lg text-muted-foreground max-w-sm leading-relaxed"
      >
        {description}
      </motion.p>
    </div>
  );
};
