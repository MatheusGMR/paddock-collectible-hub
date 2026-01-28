import { useState } from "react";
import { Camera, X, Zap, RotateCcw, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScannedItem {
  brand: string;
  model: string;
  year: string;
  scale: string;
  origin: string;
  historicalFact: string;
}

export const ScannerView = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [isInCollection, setIsInCollection] = useState(false);

  const simulateScan = () => {
    setIsScanning(true);
    
    // Simulate AI scanning delay
    setTimeout(() => {
      const items: ScannedItem[] = [
        {
          brand: "Hot Wheels",
          model: "Ferrari 250 GTO",
          year: "1962",
          scale: "1:64",
          origin: "Malaysia",
          historicalFact: "Only 36 Ferrari 250 GTOs were ever made, making it one of the most valuable cars in the world."
        },
        {
          brand: "Matchbox",
          model: "Porsche 911 Turbo",
          year: "1976",
          scale: "1:64",
          origin: "Thailand",
          historicalFact: "The 911 Turbo was the first production car to use an exhaust-driven turbocharger."
        },
        {
          brand: "Tomica",
          model: "Toyota 2000GT",
          year: "1967",
          scale: "1:64",
          origin: "Japan",
          historicalFact: "The Toyota 2000GT is Japan's first supercar and was featured in a James Bond film."
        }
      ];
      
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const randomInCollection = Math.random() > 0.5;
      
      setScannedItem(randomItem);
      setIsInCollection(randomInCollection);
      setIsScanning(false);
    }, 2000);
  };

  const resetScan = () => {
    setScannedItem(null);
    setIsInCollection(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Camera View */}
      <div className="relative flex-1 bg-black">
        {/* Simulated Camera Feed */}
        <div className="absolute inset-0 bg-gradient-to-b from-background-secondary to-background opacity-50" />
        
        {/* Scanner Frame */}
        <div className="absolute inset-8 border-2 border-primary/50 rounded-2xl">
          {/* Corner Accents */}
          <div className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-2xl" />
          <div className="absolute -top-px -right-px w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-2xl" />
          <div className="absolute -bottom-px -left-px w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-2xl" />
          <div className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-2xl" />
          
          {/* Scanning Line Animation */}
          {isScanning && (
            <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner-line" />
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-sm rounded-full"
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        {/* Scanning Status */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-primary animate-pulse-glow">
                Analyzing item...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results Panel */}
      {scannedItem ? (
        <div className="bg-card border-t border-border p-6 animate-slide-up safe-bottom">
          {isInCollection ? (
            <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 rounded-lg">
              <Check className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Already in your collection</span>
            </div>
          ) : null}
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {scannedItem.brand} {scannedItem.model}
              </h3>
              <p className="text-sm text-foreground-secondary">
                {scannedItem.year} • {scannedItem.scale}
              </p>
            </div>
            
            <p className="text-sm text-foreground/80 leading-relaxed">
              {scannedItem.historicalFact}
            </p>
            
            <div className="flex gap-3">
              {!isInCollection && (
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Collection
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-1 border-border text-foreground hover:bg-muted"
                onClick={resetScan}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Scan Again
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border-t border-border p-6 safe-bottom">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-foreground-secondary text-center">
              Point your camera at a collectible item
            </p>
            <Button 
              onClick={simulateScan}
              disabled={isScanning}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
            >
              <Zap className="h-5 w-5 mr-2" />
              {isScanning ? "Scanning..." : "Scan Item"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
