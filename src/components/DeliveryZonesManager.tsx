import React, { useState } from "react";
import { MapPin, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { formatNaira } from "./CustomerViews";

export default function DeliveryZonesManager({ deliveryZones, onUpdateDeliveryZones }: { deliveryZones: any[], onUpdateDeliveryZones: (zones: any[]) => void }) {
  const [zones, setZones] = useState<any[]>(deliveryZones || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editFee, setEditFee] = useState<number>(0);

  const handleAdd = () => {
    const newZone = { id: Date.now().toString(), state: "New State", city: "*", fee: 1000 };
    const updated = [...zones, newZone];
    setZones(updated);
    if (onUpdateDeliveryZones) onUpdateDeliveryZones(updated);
  };

  const handleRemove = (id: string) => {
    const updated = zones.filter(z => z.id !== id);
    setZones(updated);
    if (onUpdateDeliveryZones) onUpdateDeliveryZones(updated);
  };

  const startEdit = (z: any) => {
    setEditingId(z.id);
    setEditState(z.state);
    setEditCity(z.city);
    setEditFee(z.fee);
  };

  const saveEdit = (id: string) => {
    const updated = zones.map(z => z.id === id ? { ...z, state: editState, city: editCity, fee: editFee } : z);
    setZones(updated);
    if (onUpdateDeliveryZones) onUpdateDeliveryZones(updated);
    setEditingId(null);
  };

  return (
    <div className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs mt-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Configurable Delivery Zones</span>
          </h3>
          <p className="text-[10px] text-neutral-450 mt-0.5">Manage delivery fees based on location. Use "*" for all cities in a state.</p>
        </div>
        <button onClick={handleAdd} className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 text-white text-[10px] font-bold rounded hover:bg-neutral-800 transition">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Zone</span>
        </button>
      </div>

      <div className="space-y-3">
        {zones.length === 0 ? (
          <div className="text-center py-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
            <p className="text-xs text-neutral-400 font-semibold">No delivery zones configured.</p>
          </div>
        ) : (
          zones.map(z => (
            <div key={z.id} className="flex items-center justify-between p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition">
              {editingId === z.id ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input type="text" value={editState} onChange={e => setEditState(e.target.value)} className="w-1/3 p-1.5 text-xs border rounded" placeholder="State" />
                  <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} className="w-1/3 p-1.5 text-xs border rounded" placeholder="City (* for all)" />
                  <div className="w-1/3 flex items-center space-x-1 relative">
                    <span className="absolute left-2 text-xs font-bold text-neutral-400">₦</span>
                    <input type="number" value={editFee} onChange={e => setEditFee(Number(e.target.value))} className="w-full pl-5 p-1.5 text-xs border rounded" placeholder="Fee" />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center space-x-6">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{z.state}</p>
                    <p className="text-[10px] text-neutral-500">City: {z.city}</p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black text-xs rounded border border-emerald-100">
                    {formatNaira(z.fee)}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 ml-4">
                {editingId === z.id ? (
                  <>
                    <button onClick={() => saveEdit(z.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(z)} className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleRemove(z.id)} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
