# Project decisions

- Keep each newly captured collection photo in `user_collection.original_image_url` and its chosen 4:3 presentation in `image_url`, so future adjustments can recover the full frame without changing other items.
- Reuse `CollectiblePhotoEditor` for scanner review, batch review, and owned collection details so framing behavior stays consistent.