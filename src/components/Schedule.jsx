import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, CalendarDays, Search, Truck, ArrowUpRight, ArrowDownRight, Plus, Columns, LayoutGrid } from 'lucide-react';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); // 'board' (7 col) o 'cards' (grilla amplia)
  
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6 md:space-y-8">
      
      {/* Header, View Switcher & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center md:items-start text-center md:text-left">
        <div>
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl mb-2 md:mb-0">
              <CalendarDays size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Agenda Operativa</h2>
          </div>
          <p className="text-sm md:text-base text-slate-500">Coordina la salida de pedidos y recepción semanal.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Switch de Vistas (PC) */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Ver los 7 días de Lunes a Domingo"
            >
              <Columns size={15} /> Tablero Semanal
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Ver en tarjetas grandes con máximo espacio"
            >
              <LayoutGrid size={15} /> Vista Amplia
            </button>
          </div>

          {/* Buscador */}
          <div className="w-full sm:w-80 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Filtrar por proveedor o código..." 
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:bg-white outline-none transition-all duration-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Form Modal/Card */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 md:p-6 flex flex-col lg:flex-row gap-5 lg:items-end">
        <div className="w-full lg:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Proveedor (Cód)</label>
          <div className="relative">
            <input 
              type="text" 
              value={newCode} 
              onChange={e => handleProviderCodeChange(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm" 
              required 
              placeholder="Ej: 12018" 
            />
            {providerNamePreview && (
              <div className="lg:absolute lg:-bottom-6 lg:left-0 text-xs font-medium text-slate-500 truncate w-full mt-1 lg:mt-0">
                {providerNamePreview === 'No encontrado' ? (
                  <span className="text-red-500">⚠ No existe</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">✓ {providerNamePreview}</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full lg:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowUpRight size={14} className="text-orange-500"/> Día de Salida
          </label>
          <select 
            value={dayOut} 
            onChange={e => setDayOut(e.target.value)} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer text-sm font-medium text-slate-700"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="w-full lg:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Truck size={14} className="text-emerald-500"/> Día de Entrega
          </label>
          <select 
            value={dayIn} 
            onChange={e => setDayIn(e.target.value)} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer text-sm font-medium text-slate-700"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="w-full lg:w-1/4 pt-2 lg:pt-0">
          <button 
            type="submit" 
            disabled={!newCode.trim()} 
            className="w-full bg-indigo-600 text-white px-6 py-3.5 md:py-3 rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm disabled:opacity-50 disabled:hover:scale-100"
          >
            <Plus size={20} /> Agendar
          </button>
        </div>
      </form>

      {/* Calendar Grid / Mobile List */}
      {isLoading ? (
        <div className="flex justify-center p-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className={viewMode === 'board' ? 'overflow-x-auto pb-4 -mx-2 px-2' : ''}>
          <div className={
            viewMode === 'board'
              ? 'flex flex-col lg:grid lg:grid-cols-7 gap-3.5 min-w-0 lg:min-w-[1200px]'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
          }>
            {DAYS.map(day => {
              const outItems = filteredSchedule.filter(s => s.dia_pedido === day);
              const inItems = filteredSchedule.filter(s => s.dia_entrega === day);
              const isToday = new Date().toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase() === day.toLowerCase();
              
              // In board mode: keep empty days visible on desktop, hide on mobile unless today
              if (outItems.length === 0 && inItems.length === 0 && !isToday) {
                if (viewMode === 'cards') {
                  // In cards view, skip empty days for a clean compact experience
                  return null;
                }
                return (
                  <div key={day} className="hidden lg:flex lg:flex-col bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
                    <div className="p-3 text-center border-b bg-slate-50 border-slate-100 text-slate-500">
                      <h3 className="font-bold text-xs uppercase tracking-wider">{day}</h3>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center items-center text-xs text-slate-300 min-h-[160px]">
                      Sin actividad
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={day} 
                  className={`bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md ${
                    isToday ? 'border-indigo-400 ring-2 ring-indigo-400/20' : 'border-slate-200/60'
                  }`}
                >
                  <div className={`p-3 md:p-3.5 text-center border-b relative ${
                    isToday ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}>
                    <h3 className="font-bold text-sm uppercase tracking-wider">{day}</h3>
                    {isToday && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full inline-block mt-1">
                        HOY
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 p-3 flex flex-col gap-3 min-h-[auto] lg:min-h-[300px]">
                    
                    {/* Salen Pedidos */}
                    {(outItems.length > 0 || isToday) && (
                      <div className="flex-1 bg-orange-50/50 rounded-xl border border-orange-100/60 p-3 relative group/section overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <ArrowUpRight size={15} className="text-orange-500 shrink-0" />
                          <h4 className="text-[11px] font-bold text-orange-700 uppercase tracking-wider whitespace-nowrap">
                            Salen Pedidos
                          </h4>
                          <span className="ml-auto bg-orange-200/60 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                            {outItems.length}
                          </span>
                        </div>
                        
                        <ul className="space-y-2 relative z-10">
                          {outItems.length === 0 && (
                            <li className="text-xs text-orange-400/70 italic py-1">Ninguno</li>
                          )}
                          {outItems.map(s => (
                            <li 
                              key={`out-${s.id}`} 
                              className="text-xs md:text-sm bg-white border border-orange-200/70 p-2.5 rounded-xl shadow-sm flex items-start justify-between gap-1.5 group/item transition-colors hover:border-orange-400"
                            >
                              <div className="flex-1 min-w-0">
                                <span 
                                  className="text-slate-800 font-semibold block text-xs md:text-sm leading-snug break-words"
                                  title={s.nombre_proveedor || 'Sin nombre'}
                                >
                                  {s.nombre_proveedor || 'Sin nombre'}
                                </span>
                                <span className="font-mono text-[10px] md:text-[11px] text-slate-500 block mt-0.5">
                                  CÓD: {s.codigo_proveedor}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDelete(s.id)} 
                                className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 md:opacity-0 group-hover/item:opacity-100 transition-all shrink-0 mt-0.5"
                                title="Eliminar de la agenda"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Entregas */}
                    {(inItems.length > 0 || isToday) && (
                      <div className="flex-1 bg-emerald-50/50 rounded-xl border border-emerald-100/60 p-3 relative group/section overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <Truck size={15} className="text-emerald-500 shrink-0" />
                          <h4 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider whitespace-nowrap">
                            Entregas
                          </h4>
                          <span className="ml-auto bg-emerald-200/60 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                            {inItems.length}
                          </span>
                        </div>
                        
                        <ul className="space-y-2 relative z-10">
                          {inItems.length === 0 && (
                            <li className="text-xs text-emerald-400/70 italic py-1">Ninguna</li>
                          )}
                          {inItems.map(s => (
                            <li 
                              key={`in-${s.id}`} 
                              className="text-xs md:text-sm bg-white border border-emerald-200/70 p-2.5 rounded-xl shadow-sm flex items-start justify-between gap-1.5 group/item transition-colors hover:border-emerald-400"
                            >
                              <div className="flex-1 min-w-0">
                                <span 
                                  className="text-slate-800 font-semibold block text-xs md:text-sm leading-snug break-words"
                                  title={s.nombre_proveedor || 'Sin nombre'}
                                >
                                  {s.nombre_proveedor || 'Sin nombre'}
                                </span>
                                <span className="font-mono text-[10px] md:text-[11px] text-slate-500 block mt-0.5">
                                  CÓD: {s.codigo_proveedor}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDelete(s.id)} 
                                className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 md:opacity-0 group-hover/item:opacity-100 transition-all shrink-0 mt-0.5"
                                title="Eliminar de la agenda"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
