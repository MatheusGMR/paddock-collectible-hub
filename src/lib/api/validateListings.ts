import { supabase } from "@/integrations/supabase/client";

interface ListingInput {
  id: string;
  title: string;
  image_url: string;
  external_url?: string;
}

interface CarData {
  brand: string;
  model: string;
  year?: string;
  variant?: string;
  bodyStyle?: string;
}

export interface ValidationResult {
  id: string;
  isRelevant: boolean;
  confidence: number;
  matchReason?: string;
}

interface ValidateListingsResponse {
  success: boolean;
  validatedListings: ValidationResult[];
  error?: string;
}

/**
 * Validates listings against a target vehicle using AI to ensure relevance
 */
export const validateListings = async <T extends ListingInput>(
  listings: T[],
  car: CarData
): Promise<T[]> => {
  if (!listings || listings.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke<ValidateListingsResponse>(
      "validate-listings",
      {
        body: {
          listings: listings.map(l => ({
            id: l.id,
            title: l.title,
            image_url: l.image_url
          })),
          car: {
            brand: car.brand,
            model: car.model,
            year: car.year,
            variant: car.variant,
            bodyStyle: car.bodyStyle
          }
        }
      }
    );

    if (error) {
      console.error("Error validating listings:", error);
      // Return all listings on error (don't block the user)
      return listings;
    }

    if (!data?.success || !data.validatedListings) {
      console.warn("Validation returned no results");
      return listings;
    }

    // Create a map of validation results
    const validationMap = new Map<string, ValidationResult>();
    for (const result of data.validatedListings) {
      validationMap.set(result.id, result);
    }

    // Filter and sort listings by relevance
    const validatedListings = listings
      .map(listing => {
        const validation = validationMap.get(listing.id);
        return {
          listing,
          isRelevant: validation?.isRelevant ?? true,
          confidence: validation?.confidence ?? 0.5,
          matchReason: validation?.matchReason
        };
      })
      .filter(item => item.isRelevant)
      .sort((a, b) => b.confidence - a.confidence)
      .map(item => item.listing);

    console.log(`[validateListings] ${validatedListings.length}/${listings.length} listings validated as relevant`);
    
    return validatedListings;
  } catch (error) {
    console.error("Error in validateListings:", error);
    // Return all listings on error
    return listings;
  }
};

/**
 * Quick pre-filter using basic text matching (for initial filtering before AI validation)
 */
export const preFilterListings = <T extends ListingInput>(
  listings: T[],
  car: CarData
): T[] => {
  const brandLower = car.brand.toLowerCase();
  const modelLower = car.model.toLowerCase();
  
  // Brand name variations
  const brandVariations = getBrandVariations(brandLower);
  const modelVariations = getModelVariations(modelLower);
  
  return listings.filter(listing => {
    const titleLower = listing.title.toLowerCase();
    
    // Check if title contains brand or model
    const hasBrand = brandVariations.some(v => titleLower.includes(v));
    const hasModel = modelVariations.some(v => titleLower.includes(v));
    
    // Must have at least brand OR model match
    return hasBrand || hasModel;
  });
};

function getBrandVariations(brand: string): string[] {
  const aliases: Record<string, string[]> = {
    volkswagen: ["vw", "volkswagen"],
    chevrolet: ["chevy", "chevrolet"],
    "mercedes-benz": ["mercedes", "mb"],
    bmw: ["bmw"],
  };
  
  for (const [key, variations] of Object.entries(aliases)) {
    if (brand.includes(key) || variations.some(v => brand.includes(v))) {
      return variations;
    }
  }
  
  return [brand];
}

function getModelVariations(model: string): string[] {
  const aliases: Record<string, string[]> = {
    fusca: ["fusca", "beetle", "bug"],
    gol: ["gol"],
    "911": ["911", "carrera"],
    mustang: ["mustang"],
    camaro: ["camaro"],
    civic: ["civic"],
    corolla: ["corolla"],
  };
  
  for (const [key, variations] of Object.entries(aliases)) {
    if (model.includes(key) || variations.some(v => model.includes(v))) {
      return variations;
    }
  }
  
  return [model];
}
