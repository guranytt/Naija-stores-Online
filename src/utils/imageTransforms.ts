export const getTransformedImageUrl = (url: string | null | undefined, width = 500, quality = 80): string => {
  if (!url) {
    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80"; // fallback mock
  }
  
  // 1. Supabase Storage URLs
  if (url.includes("/object/public/")) {
    return url.replace("/object/public/", "/render/image/public/") + `?width=${width}&resize=contain&quality=${quality}&format=webp`;
  }
  
  // 2. Cloudinary URLs
  // Intercept raw Cloudinary uploads and inject auto-format and auto-quality flags
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    // If it doesn't already have transformation flags, inject them
    if (!url.includes("/upload/q_auto") && !url.includes("/upload/f_auto")) {
      return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
  }
  
  return url;
};
