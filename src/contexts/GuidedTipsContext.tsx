import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { GuidedTip, getTipsForScreen } from "@/data/guidedTips";

const TIPS_STORAGE_KEY = "paddock_guided_tips_completed";
const TIPS_FULLY_COMPLETED_KEY = "paddock_tips_all_completed";

interface GuidedTipsContextType {
  // Current tip being shown
  currentTip: GuidedTip | null;
  // All tips for current screen
  screenTips: GuidedTip[];
  // Current tip index in screen
  currentTipIndex: number;
  // Total tips in current screen
  totalTipsInScreen: number;
  // Whether tips have been fully completed (for showing Help option)
  hasCompletedAllTips: boolean;
  // Whether tips are currently active (showing)
  isTipsActive: boolean;
  // Start tips for a specific screen
  startScreenTips: (screen: string) => void;
  // Go to next tip
  nextTip: () => void;
  // Skip all remaining tips
  skipAllTips: () => void;
  // Dismiss current tip
  dismissTip: () => void;
  // Check if a screen has unseen tips
  hasUnseenTips: (screen: string) => boolean;
  // Reset all tips (for Help section)
  resetAllTips: () => void;
  // Mark screen as seen
  markScreenAsSeen: (screen: string) => void;
}

const GuidedTipsContext = createContext<GuidedTipsContextType | undefined>(undefined);

export const GuidedTipsProvider = ({ children }: { children: ReactNode }) => {
  const [completedScreens, setCompletedScreens] = useState<Set<string>>(new Set());
  const [currentTip, setCurrentTip] = useState<GuidedTip | null>(null);
  const [screenTips, setScreenTips] = useState<GuidedTip[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [hasCompletedAllTips, setHasCompletedAllTips] = useState(false);
  const [isTipsActive, setIsTipsActive] = useState(false);

  // Load completed screens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TIPS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCompletedScreens(new Set(parsed));
      } catch (e) {
        console.error("Error parsing tips storage:", e);
      }
    }

    const fullyCompleted = localStorage.getItem(TIPS_FULLY_COMPLETED_KEY);
    if (fullyCompleted === "true") {
      setHasCompletedAllTips(true);
    }
  }, []);

  // Save completed screens to localStorage
  const saveCompletedScreens = useCallback((screens: Set<string>) => {
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify([...screens]));
  }, []);

  // Check if a screen has unseen tips
  const hasUnseenTips = useCallback((screen: string): boolean => {
    return !completedScreens.has(screen) && getTipsForScreen(screen).length > 0;
  }, [completedScreens]);

  // Start tips for a screen
  const startScreenTips = useCallback((screen: string) => {
    const tips = getTipsForScreen(screen);
    
    // Only show if screen hasn't been completed
    if (tips.length > 0 && !completedScreens.has(screen)) {
      setScreenTips(tips);
      setCurrentTipIndex(0);
      setCurrentTip(tips[0]);
      setIsTipsActive(true);
    }
  }, [completedScreens]);

  // Go to next tip
  const nextTip = useCallback(() => {
    if (currentTipIndex < screenTips.length - 1) {
      const nextIndex = currentTipIndex + 1;
      setCurrentTipIndex(nextIndex);
      setCurrentTip(screenTips[nextIndex]);
    } else {
      // Finished screen tips
      dismissTip();
    }
  }, [currentTipIndex, screenTips]);

  // Dismiss current tip and mark screen as seen
  const dismissTip = useCallback(() => {
    if (screenTips.length > 0 && screenTips[0]) {
      const screen = screenTips[0].screen;
      const newCompleted = new Set(completedScreens);
      newCompleted.add(screen);
      setCompletedScreens(newCompleted);
      saveCompletedScreens(newCompleted);
    }
    
    setCurrentTip(null);
    setScreenTips([]);
    setCurrentTipIndex(0);
    setIsTipsActive(false);
  }, [screenTips, completedScreens, saveCompletedScreens]);

  // Skip all tips
  const skipAllTips = useCallback(() => {
    // Mark all screens as completed
    const allScreens = ["feed", "scanner", "mercado", "profile", "notifications", "item-detail"];
    const newCompleted = new Set(allScreens);
    setCompletedScreens(newCompleted);
    saveCompletedScreens(newCompleted);
    setHasCompletedAllTips(true);
    localStorage.setItem(TIPS_FULLY_COMPLETED_KEY, "true");
    
    setCurrentTip(null);
    setScreenTips([]);
    setCurrentTipIndex(0);
    setIsTipsActive(false);
  }, [saveCompletedScreens]);

  // Mark screen as seen without showing tips
  const markScreenAsSeen = useCallback((screen: string) => {
    const newCompleted = new Set(completedScreens);
    newCompleted.add(screen);
    setCompletedScreens(newCompleted);
    saveCompletedScreens(newCompleted);
  }, [completedScreens, saveCompletedScreens]);

  // Reset all tips for Help section
  const resetAllTips = useCallback(() => {
    setCompletedScreens(new Set());
    localStorage.removeItem(TIPS_STORAGE_KEY);
    setHasCompletedAllTips(false);
    localStorage.removeItem(TIPS_FULLY_COMPLETED_KEY);
  }, []);

  return (
    <GuidedTipsContext.Provider
      value={{
        currentTip,
        screenTips,
        currentTipIndex,
        totalTipsInScreen: screenTips.length,
        hasCompletedAllTips,
        isTipsActive,
        startScreenTips,
        nextTip,
        skipAllTips,
        dismissTip,
        hasUnseenTips,
        resetAllTips,
        markScreenAsSeen,
      }}
    >
      {children}
    </GuidedTipsContext.Provider>
  );
};

export const useGuidedTips = () => {
  const context = useContext(GuidedTipsContext);
  if (context === undefined) {
    throw new Error("useGuidedTips must be used within a GuidedTipsProvider");
  }
  return context;
};
