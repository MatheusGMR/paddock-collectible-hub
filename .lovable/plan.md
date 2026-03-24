

## Problem Analysis

The "Imprimir Etiqueta" button is hidden because of two sequential gates in `OrderDetails.tsx`:

1. **Status gate (line 273)**: The entire "Pack & Go" card only renders when `sale.status === "completed"`. If the sale has any other status, the card is invisible.
2. **Photo gate (line 280)**: Even when the card shows, the print button is hidden behind a mandatory photo step — only the "Abrir Câmera" button is visible until a photo is uploaded.

This makes it very hard to discover the print button.

## Plan

### 1. Remove the photo requirement as a blocker for label generation
Show both the photo upload option AND the "Imprimir Etiqueta" button side by side, instead of making the photo a prerequisite. The photo becomes optional (nice-to-have for record keeping).

### 2. Always show the Pack & Go section for completed orders
Keep the `sale.status === "completed"` check but also show it for any order that the seller can access (since SellerOrders already filters to completed sales only).

### 3. Reorganize the Pack & Go card layout
- Show the listing image prominently at the top of the order detail
- Show "Imprimir Etiqueta" button always visible, not gated by photo
- Move the optional photo capture to a secondary action below the label button

### Files to modify
- **`src/components/seller/OrderDetails.tsx`**: Restructure the Pack & Go section to show the print button without requiring a photo first. Keep photo upload as an optional secondary action.

