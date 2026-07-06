const products = [
  {
    id: "prod-1",
    categoryId: "d3e0b2e8-9669-455b-80a5-f865f12e84d4",
    category: "Phones",
    categorySlug: "phones",
    title: "iPhone 15"
  }
];

const categories = [
  {
    id: "d3e0b2e8-9669-455b-80a5-f865f12e84d4",
    slug: "phones",
    name: "Phones"
  }
];

const activeCategoryTab = "phones";

const filteredProducts = products.filter((product) => {
    const activeCatLower = activeCategoryTab.toLowerCase();
    const searchFilter = "";
    const searchLower = searchFilter.toLowerCase();
    
    let matchesCategory = false;
    if (activeCatLower === "all") {
      matchesCategory = true;
    } else {
      const pCatLower = (product.category || "").toLowerCase();
      const pCatId = product.categoryId || "";
      const pCatSlug = (product.categorySlug || "").toLowerCase();
      
      const activeCategoryObj = categories?.find(c => c.id === activeCategoryTab || (c.slug || "").toLowerCase() === activeCatLower || c.name.toLowerCase() === activeCatLower);
      const targetCatId = activeCategoryObj ? activeCategoryObj.id : activeCategoryTab;
      const activeCatNameLower = (activeCategoryObj?.name || activeCategoryTab).toLowerCase();
      const activeCatSlugLower = (activeCategoryObj?.slug || "").toLowerCase();

      const isTextMatch = (a, b) => {
        if (!a || !b) return false;
        const normA = a.replace(/[^a-z0-9]/g, "");
        const normB = b.replace(/[^a-z0-9]/g, "");
        if (!normA || !normB) return false;
        return normA.includes(normB) || normB.includes(normA);
      };

      const semanticMap = {
        "beauty": ["beauty", "health", "cosmetics", "makeup", "skincare", "fragrance", "hair"],
        "phone": ["phone", "mobile", "smartphone", "gadget", "tablet", "accessories"],
        "electronic": ["electronic", "audio", "camera", "computer", "laptop", "tv", "appliance", "gadgets", "video", "tech"],
        "men": ["men", "male", "boy", "guy"],
        "women": ["women", "female", "girl", "lady"],
        "kid": ["kid", "child", "baby", "toy", "toddler"],
        "grocer": ["grocery", "food", "drink", "beverage", "snack"],
      };

      const hasSemanticMatch = () => {
        if (!pCatLower) return false;
        for (const [key, aliases] of Object.entries(semanticMap)) {
          if (activeCatNameLower.includes(key) || activeCategoryTab.includes(key) || activeCatSlugLower.includes(key)) {
            if (aliases.some(alias => pCatLower.includes(alias))) {
              return true;
            }
          }
        }
        return false;
      };

      matchesCategory = 
        (pCatId && targetCatId && pCatId === targetCatId) || 
        isTextMatch(activeCatNameLower, pCatLower) || 
        isTextMatch(activeCategoryTab, pCatLower) ||
        isTextMatch(activeCatSlugLower, pCatSlug) ||
        hasSemanticMatch();
        
      console.log({
        pCatId, targetCatId, activeCatNameLower, pCatLower, activeCategoryTab, pCatSlug, activeCatSlugLower, matchesCategory
      });
    }
    
    let matchesSearch = true;
    return matchesCategory && matchesSearch;
  });

console.log("Result:", filteredProducts.length);
