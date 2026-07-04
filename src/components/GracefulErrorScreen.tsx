import React from "react";
import { Bug, RefreshCw } from "lucide-react";

export default function GracefulErrorScreen({ reset, message }: { reset?: () => void, message?: string }) {
  return (
    <div className="p-8 text-center bg-gray-50 text-gray-800 rounded-2xl mx-auto my-16 max-w-md shadow-xl border border-gray-200 w-full">
      <Bug className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-6">{message || "We encountered an unexpected error. Please try again later."}</p>
      <button 
        onClick={() => reset ? reset() : window.location.reload()} 
        className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2 mx-auto"
      >
        <RefreshCw className="w-4 h-4" />
        {reset ? "Try Again" : "Reload Page"}
      </button>
    </div>
  );
}
