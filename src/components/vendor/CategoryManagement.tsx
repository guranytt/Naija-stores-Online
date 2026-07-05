import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Box, RefreshCw, Save, Camera } from "lucide-react";
import { Category } from "../../types";
import { convertFileToBase64, uploadToCloudinary } from "../../cloudinaryService";

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatImage, setNewCatImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.data) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategories = async (catsToSave: Category[]) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catsToSave)
      });
      if (res.ok) {
        alert("Categories saved and synced successfully to backend!");
        fetchCategories();
      } else {
        alert("Failed to save categories.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving categories.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await convertFileToBase64(file);
      const res = await uploadToCloudinary(base64);
      if (res.success && res.url) {
        setNewCatImage(res.url);
      } else {
        alert("Image upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: newCatDesc.trim(),
      image: newCatImage,
      iconName: "Box",
      itemCount: 0,
      subcategories: [],
      status: "active",
      defaultCommissionPercentage: 5,
      sortOrder: categories.length
    };
    
    const updated = [...categories, newCat];
    setCategories(updated);
    setNewCatName("");
    setNewCatDesc("");
    setNewCatImage("");
    handleSaveCategories(updated);
  };

  const handleDelete = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    handleSaveCategories(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Category Management</h2>
          <p className="text-sm text-neutral-500 font-medium">Add, edit, and remove product categories sitewide.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-ambient border border-neutral-100 overflow-hidden p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-16 h-16 rounded-xl bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden relative group cursor-pointer flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
            {isUploading ? (
               <RefreshCw className="w-4 h-4 text-neutral-400 animate-spin" />
            ) : newCatImage ? (
              <img src={newCatImage} alt="Category" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-neutral-400" />
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
          
          <div className="flex-1 space-y-2 w-full">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New Category Name (e.g. Electronics)"
              className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 outline-none"
            />
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Short Description"
              className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 outline-none"
            />
          </div>

          <button
            onClick={handleAddCategory}
            disabled={isSaving || isUploading}
            className="px-5 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-xl text-sm font-bold tracking-wide shadow-md flex items-center disabled:opacity-50 mt-4 sm:mt-0 whitespace-nowrap"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
            Add Category
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4">Image</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-400">
                    <Box className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {cat.image ? (
                        <img src={cat.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Box className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{cat.name}</td>
                    <td className="px-6 py-4 text-neutral-600">{cat.slug}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
