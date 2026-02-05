 import { useEffect, useState, useCallback } from "react";
 import { WifiOff, RefreshCw } from "lucide-react";
 import { Button } from "@/components/ui/button";
 
 interface NetworkStatusProps {
   onRetry?: () => void;
 }
 
 export const NetworkStatus = ({ onRetry }: NetworkStatusProps) => {
   const [isOnline, setIsOnline] = useState(navigator.onLine);
   const [isRetrying, setIsRetrying] = useState(false);
 
   useEffect(() => {
     const handleOnline = () => setIsOnline(true);
     const handleOffline = () => setIsOnline(false);
 
     window.addEventListener("online", handleOnline);
     window.addEventListener("offline", handleOffline);
 
     return () => {
       window.removeEventListener("online", handleOnline);
       window.removeEventListener("offline", handleOffline);
     };
   }, []);
 
   const handleRetry = useCallback(async () => {
     if (!onRetry) return;
     setIsRetrying(true);
     try {
       await onRetry();
     } finally {
       setIsRetrying(false);
     }
   }, [onRetry]);
 
   if (isOnline) return null;
 
   return (
     <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/95 text-destructive-foreground px-4 py-3 flex items-center justify-between safe-area-inset-top">
       <div className="flex items-center gap-2">
         <WifiOff className="h-4 w-4" />
         <span className="text-sm font-medium">Sem conexão com a internet</span>
       </div>
       {onRetry && (
         <Button 
           size="sm" 
           variant="ghost" 
           onClick={handleRetry}
           disabled={isRetrying}
           className="text-destructive-foreground hover:bg-destructive-foreground/10"
         >
           <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
         </Button>
       )}
     </div>
   );
 };