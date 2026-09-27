export interface RarityContext {
  special_edition?: boolean;
  numbered?: boolean;
  unique?: boolean;
  imported_from?: string;
  notes?: string;
}

export const hasRarityContext = (context?: RarityContext): boolean => Boolean(
  context && (context.special_edition || context.numbered || context.unique || context.imported_from?.trim() || context.notes?.trim())
);