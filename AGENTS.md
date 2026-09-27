# Project decisions

- Keep each newly captured collection photo in `user_collection.original_image_url` and its chosen 4:3 presentation in `image_url`, so future adjustments can recover the full frame without changing other items.
- Reuse `CollectiblePhotoEditor` for scanner review, batch review, and owned collection details so framing behavior stays consistent.
- Share the `RarityContext` shape between scanner review and collection details so special-edition facts persist consistently.
- Open feed collectibles using their `collection_item_id` and the shared collection detail drawer so one tap shows the same item information as the profile.
- Keep route modules warm in browser memory after authentication and use user-scoped, non-persistent query caches for personal data so navigation is fast without exposing previous accounts.