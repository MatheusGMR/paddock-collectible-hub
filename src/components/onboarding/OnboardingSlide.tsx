import { motion } from "framer-motion";
import paddockBanner from "@/assets/paddock-collection-banner.jpeg";

interface OnboardingSlideProps {
  title: string;
  description: string;
}

export const OnboardingSlide = ({ title, description }: OnboardingSlideProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      {/* Animated Image Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          delay: 0.2 
        }}
        className="w-full max-w-xs mb-8"
      >
        <img
          src={paddockBanner}
          alt="Paddock Collection"
          className="w-full aspect-[4/3] object-cover rounded-2xl shadow-2xl"
        />
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
