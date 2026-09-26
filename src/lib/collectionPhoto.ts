import { isBase64DataUri, uploadCollectionImage } from "@/lib/uploadImage";

export async function storeCollectionPhotos(userId: string, display: string | undefined, original: string | undefined) {
  const store = async (source: string | undefined) => {
    if (!source) return undefined;
    if (!isBase64DataUri(source)) return source;
    const url = await uploadCollectionImage(userId, source);
    if (!url) throw new Error("Não foi possível enviar a foto. Tente novamente.");
    return url;
  };
  const originalUrl = await store(original);
  const imageUrl = display === original ? originalUrl : await store(display);
  return { imageUrl, originalUrl };
}