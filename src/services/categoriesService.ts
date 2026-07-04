import { supabase } from "../supabase";
import { Category } from "../types";

// Curated high-quality image URLs for specific categories
export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  "phones": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
  "laptops": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  "electronics": "https://images.unsplash.com/photo-1496181130204-755241544e3f?auto=format&fit=crop&w=800&q=80",
  "fashion": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  "home-and-kitchen": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
  "beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  "sports": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80",
  "grocery": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
  "gaming": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80",
  "cars": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  "phone-accessories": "https://images.unsplash.com/photo-1584006682522-dc17d6c0d9ac?auto=format&fit=crop&w=800&q=80",
  "pets": "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?auto=format&fit=crop&w=800&q=80",
  "software": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
  "health-and-wellness": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
  "toys-and-games": "https://images.unsplash.com/photo-1558060370-d64111d52c14?auto=format&fit=crop&w=800&q=80",
  "general": "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80"
};

/**
 * Service function that fetches the latest categories from Supabase,
 * maps them to curated high-quality images, and returns them to update state.
 */
export async function fetchAndEnrichCategories(): Promise<Category[]> {
  try {
    // Fetch directly from the Supabase 'categories' table with explicit column selection to minimize egress
    const { data, error } = await supabase.from('categories').select('id, name, slug, image_url, description, icon_name, item_count, subcategories, status, sort_order, default_commission_percentage');
    
    if (error) {
      console.error("Error fetching categories directly from Supabase:", error);
      return [];
    }

    // Map the retrieved names and IDs to curated image URLs
    const enrichedCategories: Category[] = (data || []).map((item: any) => {
      let meta: any = {};
      if (item.image_url && typeof item.image_url === "string" && item.image_url.trim().startsWith("{")) {
        try {
          meta = JSON.parse(item.image_url);
        } catch (e) {
          // ignore parse error
        }
      }

      const name = item.name || "General";
      const slug = item.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Select the curated image based on slug, fallback to 'general'
      const curatedImage = CATEGORY_IMAGE_MAP[slug] || CATEGORY_IMAGE_MAP['general'];
      
      const description = meta.description || item.description || `${name} items and products`;
      const iconName = meta.icon_name || meta.iconName || item.icon_name || item.iconName || "Package";
      const itemCount = Number(meta.item_count || meta.itemCount || item.item_count || item.itemCount || 0);
      
      const subcategoriesRaw = meta.subcategories || item.subcategories;
      const subcategories = typeof subcategoriesRaw === "string" 
        ? (subcategoriesRaw ? subcategoriesRaw.split(",") : []) 
        : (Array.isArray(subcategoriesRaw) ? subcategoriesRaw : []);

      return {
        id: item.id || "",
        categoryId: item.id || "",
        name,
        slug,
        image: curatedImage, // Use the curated high-quality image URL
        description,
        iconName,
        itemCount,
        subcategories,
        status: meta.status || item.status || "active",
        sortOrder: meta.sort_order || meta.sortOrder || item.sort_order || item.sortOrder || 0,
        defaultCommissionPercentage: meta.default_commission_percentage || meta.defaultCommissionPercentage || item.default_commission_percentage || item.defaultCommissionPercentage || 5.0
      };
    });

    // Sort by sortOrder if available
    enrichedCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return enrichedCategories;
  } catch (err) {
    console.error("Exception in fetchAndEnrichCategories:", err);
    return [];
  }
}
