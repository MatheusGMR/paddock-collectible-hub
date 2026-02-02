import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

/**
 * Visual mockup of the Price Index feature for onboarding
 * Shows a sample score with breakdown to demonstrate the feature
 */
export const IndexPreviewMockup = () => {
  const sampleScore = 78;
  const tier = "rare";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 15,
        delay: 0.2 
      }}
      className="w-full max-w-sm mx-auto px-4"
    >
      {/* Main Score Card */}
      <div className="bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-purple-500/20 rounded-2xl p-6 border border-blue-500/30 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">
            Índice de Raridade
          </span>
        </div>

        {/* Big Score */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="text-center mb-4"
        >
          <span className="text-6xl font-black bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
            {sampleScore}
          </span>
          <div className="text-blue-400 text-sm font-bold uppercase tracking-widest mt-1">
            Raro
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-6">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${sampleScore}%` }}
            transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
          />
        </div>

        {/* Breakdown Preview */}
        <div className="space-y-3">
          {[
            { label: "Raridade", value: 28, max: 35, color: "from-purple-500 to-purple-400" },
            { label: "Condição", value: 20, max: 25, color: "from-green-500 to-green-400" },
            { label: "Fabricante", value: 12, max: 15, color: "from-amber-500 to-amber-400" },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="space-y-1"
            >
              <div className="flex justify-between text-xs">
                <span className="text-foreground/70">{item.label}</span>
                <span className="text-foreground/50">{item.value}/{item.max}</span>
              </div>
              <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / item.max) * 100}%` }}
                  transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sample Item Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mt-5 pt-4 border-t border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xs font-bold">
              🏎️
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Ferrari F40</p>
              <p className="text-xs text-foreground/50">Hot Wheels • 1:64 • 1989</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
