import React, { useState, useEffect } from "react";
import { Vendor, Product } from "../../types";
import { Plus, Search, Edit, Trash2, Box, RefreshCw } from "lucide-react";
import { supabase } from "../../supabase";
import { formatNaira } from "../../utils";

interface Props {
  vendor: Vendor;
}

export default function ProductManagement({ vendor }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchProducts();
  }, [vendor.id, page]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, stock, category, condition, image")
        .eq("vendorId", vendor.id)
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      setProducts(data as Product[] || []);
    } catch (err) {
      console.error("Error fetching vendor products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Product Inventory</h2>
          <p className="text-sm text-neutral-500 font-medium">Manage your storefront listings efficiently.</p>
        </div>
        <button
          className="px-5 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-xl text-sm font-bold tracking-wide shadow-md flex items-center justify-center space-x-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Product</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-ambient border border-neutral-100 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
            />
          </div>
          <button onClick={fetchProducts} className="p-2 text-neutral-400 hover:text-primary-dark transition-colors">
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    <Box className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-5 h-5 m-2.5 text-neutral-400" />
                          )}
                        </div>
                        <span className="font-medium text-neutral-900">{product.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{formatNaira(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{product.category}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-2 text-neutral-400 hover:text-primary-dark hover:bg-primary-dark/10 rounded-lg transition-all">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
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
        
        <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-sm text-neutral-500">
          <span>Showing page {page + 1}</span>
          <div className="flex space-x-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-3 py-1 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              disabled={products.length < pageSize}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
