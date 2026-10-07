import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, CalendarDays, Search, Truck, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCode, setNewCode] = useState('');
  const [providerNamePreview, setProviderNamePreview] = useState('');
  const [dayOut, setDayOut] = useState('Lunes');
  const [dayIn, setDayIn] = useState('Lunes');

  const fetchSchedule = async () => {
    setIsLoading(true);
    const snapshot = await getDocs(collection(db, 'schedule'));
    setSchedule(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleProviderCodeChange = async (code) => {
    setNewCode(code);
    if (!code.trim()) {
      setProviderNamePreview('');
      return;
    }
    const docRef = doc(db, 'suppliers', code.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProviderNamePreview(docSnap.data().nombre);
    } else {
      setProviderNamePreview('No encontrado');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    await addDoc(collection(db, 'schedule'), {
      codigo_proveedor: newCode,
      nombre_proveedor: providerNamePreview !== 'No encontrado' ? providerNamePreview : '',
      dia_pedido: dayOut,
      dia_entrega: dayIn
    });
    setNewCode('');
    setProviderNamePreview('');
    fetchSchedule();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'schedule', id));
    fetchSchedule();
  };

  const term = searchFilter.toLowerCase();
  const filteredSchedule = schedule.filter(s => 
    (s.codigo_proveedor || '').toLowerCase().includes(term) ||
    (s.nombre_proveedor || '').toLowerCase().includes(term)
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      
      {/* Header & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <CalendarDays size={24} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Agenda Operativa</h2>
          </div>
          <p className="text-slate-500">Coordina la salida de pedidos y recepción de mercadería semanal.</p>
        </div>
        
        <div className="w-full md:w-96 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Filtrar agenda..." 
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:bg-white outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Form Formulario Modal/Card */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col md:flex-row gap-5 items-end">
        <div className="w-full md:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Proveedor (Cód)</label>
          <div className="relative">
            <input type="text" value={newCode} onChange={e => handleProviderCodeChange(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm" required placeholder="Ej: 12018" />
            {providerNamePreview && (
              <div className="absolute -bottom-7 left-0 text-xs font-medium text-slate-500 truncate w-full">
                {providerNamePreview === 'No encontrado' ? <span className="text-red-500">⚠ No existe</span> : `✓ ${providerNamePreview}`}
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowUpRight size={14} className="text-orange-500"/> Día de Salida</label>
          <select value={dayOut} onChange={e => setDayOut(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer">
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="w-full md:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowDownRight size={14} className="text-emerald-500"/> Día de Entrega</label>
          <select value={dayIn} onChange={e => setDayIn(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer">
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="w-full md:w-1/4">
          <button type="submit" disabled={!newCode.trim()} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm disabled:opacity-50 disabled:hover:scale-100">
            <Plus size={20} /> Agendar
          </button>
        </div>
      </form>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {DAYS.map(day => {
            const outItems = filteredSchedule.filter(s => s.dia_pedido === day);
            const inItems = filteredSchedule.filter(s => s.dia_entrega === day);
            const isToday = new Date().toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase() === day.toLowerCase();
            
            return (
              <div key={day} className={`bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md ${isToday ? 'border-indigo-400 ring-1 ring-indigo-400/30' : 'border-slate-200/60'}`}>
                <div className={`p-4 text-center border-b ${isToday ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                  <h3 className="font-bold text-sm uppercase tracking-wider">{day}</h3>
                  {isToday && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full absolute -mt-7 ml-10">HOY</span>}
                </div>
                
                <div className="flex-1 p-3 flex flex-col gap-3 min-h-[300px]">
                  
                  {/* Salen Pedidos */}
                  <div className="flex-1 bg-orange-50/50 rounded-xl border border-orange-100/50 p-3 relative group/section overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-3">
                      <ArrowUpRight size={16} className="text-orange-500" />
                      <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider">Salen Pedidos</h4>
                      <span className="ml-auto bg-orange-200/50 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{outItems.length}</span>
                    </div>
                    
                    <ul className="space-y-2 relative z-10">
                      {outItems.map(s => (
                        <li key={`out-${s.id}`} className="text-sm bg-white border border-orange-100 p-2.5 rounded-lg shadow-sm flex items-center justify-between group transition-colors hover:border-orange-300">
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-800 font-medium block truncate leading-tight">{s.nombre_proveedor || 'Sin nombre'}</span>
                            <span className="font-mono text-[11px] text-slate-500">{s.codigo_proveedor}</span>
                          </div>
                          <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"><Trash2 size={14}/></button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Entregas */}
                  <div className="flex-1 bg-emerald-50/50 rounded-xl border border-emerald-100/50 p-3 relative group/section overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Truck size={16} className="text-emerald-500" />
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Entregas</h4>
                      <span className="ml-auto bg-emerald-200/50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{inItems.length}</span>
                    </div>
                    
                    <ul className="space-y-2 relative z-10">
                      {inItems.map(s => (
                        <li key={`in-${s.id}`} className="text-sm bg-white border border-emerald-100 p-2.5 rounded-lg shadow-sm flex items-center justify-between group transition-colors hover:border-emerald-300">
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-800 font-medium block truncate leading-tight">{s.nombre_proveedor || 'Sin nombre'}</span>
                            <span className="font-mono text-[11px] text-slate-500">{s.codigo_proveedor}</span>
                          </div>
                          <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"><Trash2 size={14}/></button>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
