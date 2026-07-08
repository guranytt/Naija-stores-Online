export interface ImageOptimizationOptions {
  width?: number;
  quality?: string; // e.g. "auto", "good", "best", "eco"
}

export const getOptimizedImageUrl = (
  url: string | null | undefined, 
  options: ImageOptimizationOptions = { width: 500, quality: "auto" }
): string => {
  if (!url) {
    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80"; // fallback mock
  }
  
  // 1. Supabase Storage URLs 
  if (url.includes("/object/public/")) {
    return url;
  }
  
  // 2. Cloudinary URLs
  // Intercept raw Cloudinary uploads and inject auto-format and auto-quality flags
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    // If it already has transformations, we can just return it or replace them.
    // For simplicity, we only inject if there are no transformations, or we replace the /upload/ node.
    // Actually, Cloudinary URLs are structured like /upload/[transformations]/v1234/public_id
    // If there is an existing transformation like v1234, we shouldn't break it.
    // Replace "/upload/v" with "/upload/f_auto,q_${options.quality},w_${options.width}/v"
    // If it doesn't have v (version), just replace /upload/ if it doesn't already have f_auto
    if (!url.includes("/upload/q_") && !url.includes("/upload/f_auto")) {
      const width = options.width || 500;
      const quality = options.quality || "auto";
      return url.replace("/upload/", `/upload/f_auto,q_${quality},w_${width},c_limit/`);
    }
  }
  
  return url;
};
