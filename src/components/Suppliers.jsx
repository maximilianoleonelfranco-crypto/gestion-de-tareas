import { useState, useEffect } from 'react';
import { collection, setDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Trash2, 
  Building2, 
  Plus, 
  UsersRound, 
  Search, 
  X, 
  ArrowUpRight, 
  Truck, 
  CalendarDays, 
  Info 
} from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal Ficha del Proveedor
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSchedule, setSupplierSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    const snapshot = await getDocs(collection(db, 'suppliers'));
    setSuppliers(snapshot.docs.map(d => ({ codigo_proveedor: d.id, ...d.data() })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openSupplierModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setLoadingSchedule(true);
    try {
      const snap = await getDocs(collection(db, 'schedule'));
      const matches = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => (s.codigo_proveedor || '').trim().toLowerCase() === (supplier.codigo_proveedor || '').trim().toLowerCase());
      setSupplierSchedule(matches);
    } catch (err) {
      console.error('Error fetching supplier schedule:', err);
      setSupplierSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const closeSupplierModal = () => {
    setSelectedSupplier(null);
    setSupplierSchedule([]);
  };

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedSupplier) {
        closeSupplierModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSupplier]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    await setDoc(doc(db, 'suppliers', code.trim()), {
      nombre: name.trim()
    });
    setCode('');
    setName('');
    fetchSuppliers();
  };

  const deleteSupplier = async (id) => {
    await deleteDoc(doc(db, 'suppliers', id));
    if (selectedSupplier && selectedSupplier.codigo_proveedor === id) {
      closeSupplierModal();
    }
    fetchSuppliers();
  };

  const normalizeText = (text) => 
    (text || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const searchTokens = normalizeText(searchTerm).split(/\s+/).filter(Boolean);

  const filteredSuppliers = suppliers.filter(s => {
    if (searchTokens.length === 0) return true;
    const targetCode = normalizeText(s.codigo_proveedor);
    const targetName = normalizeText(s.nombre);
    const combined = `${targetCode} ${targetName}`;
    return searchTokens.every(token => combined.includes(token));
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 md:space-y-8">
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center md:items-start text-center md:text-left">
        <div>
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl mb-2 md:mb-0">
              <UsersRound size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Maestro de Proveedores</h2>
          </div>
          <p className="text-sm md:text-base text-slate-500">Administra el catálogo central de proveedores del sistema.</p>
        </div>
        <div className="bg-slate-50 px-8 md:px-6 py-4 rounded-2xl ring-1 ring-slate-100 flex flex-col items-center justify-center w-full md:w-auto shrink-0">
          <span className="text-3xl font-bold text-indigo-600">
            {searchTerm ? `${filteredSuppliers.length} / ${suppliers.length}` : suppliers.length}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {searchTerm ? 'Encontrados' : 'Registrados'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:sticky top-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <Building2 size={20} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-800 text-lg">Nuevo Proveedor</h3>
            </div>
            
            <form onSubmit={handleAdd} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Código Único</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Ej: 12018" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 font-mono text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre / Razón Social</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Conaprole S.A." 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 text-slate-700"
                />
              </div>
              <button 
                type="submit" 
                disabled={!code.trim() || !name.trim()}
                className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:hover:scale-100 mt-2"
              >
                <Plus size={20} />
                Guardar
              </button>
            </form>
          </div>
        </div>

        {/* Data Column */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Smart Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-3 md:p-4">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Buscar por código o nombre (ej: 12018, Conaprole)..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 text-sm text-slate-700 placeholder-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 md:p-16 text-center text-slate-400">
              <Building2 size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Base de datos vacía</p>
              <p className="text-sm">Ingresa tu primer proveedor en el formulario.</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center text-slate-400">
              <Search size={40} className="mx-auto mb-3 text-slate-300 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Sin coincidencias</p>
              <p className="text-sm mt-1">No se encontró ningún proveedor con "{searchTerm}".</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-colors"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards View (< md) */}
              <div className="md:hidden flex flex-col gap-4">
                {filteredSuppliers.map(s => (
                  <div 
                    key={s.codigo_proveedor} 
                    onClick={() => openSupplierModal(s)}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex justify-between items-center cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99] group"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60 block w-fit">
                          CÓD: {s.codigo_proveedor}
                        </span>
                        <span className="text-[11px] text-indigo-600 font-medium">
                          Ver ficha
                        </span>
                      </div>
                      <h4 className="text-slate-800 font-medium truncate group-hover:text-indigo-600 transition-colors">{s.nombre}</h4>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSupplier(s.codigo_proveedor);
                      }} 
                      className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                      title="Eliminar proveedor"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-col h-full min-h-[450px]">
                <div className="overflow-x-auto w-full flex-1">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/80">
                      <tr>
                        <th className="p-5 font-semibold text-slate-600 text-sm tracking-wide">Código</th>
                        <th className="p-5 font-semibold text-slate-600 text-sm tracking-wide">Nombre del Proveedor</th>
                        <th className="p-5 font-semibold text-slate-600 text-sm tracking-wide w-28 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSuppliers.map(s => (
                        <tr 
                          key={s.codigo_proveedor} 
                          onClick={() => openSupplierModal(s)}
                          className="group transition-colors duration-200 hover:bg-indigo-50/40 cursor-pointer"
                        >
                          <td className="p-5">
                            <span className="font-mono text-sm font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60 group-hover:border-indigo-200 group-hover:bg-white transition-colors">
                              {s.codigo_proveedor}
                            </span>
                          </td>
                          <td className="p-5 text-slate-700 font-medium group-hover:text-indigo-900 transition-colors">
                            <div className="flex items-center gap-2">
                              <span>{s.nombre}</span>
                              <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                                (Ver ficha)
                              </span>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSupplier(s.codigo_proveedor);
                              }} 
                              className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95 mx-auto block opacity-0 group-hover:opacity-100"
                              title="Eliminar proveedor"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL FICHA DEL PROVEEDOR */}
      {selectedSupplier && (
        <div 
          onClick={closeSupplierModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative">
              <button 
                onClick={closeSupplierModal}
                className="absolute top-5 right-5 text-white/70 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                title="Cerrar ficha"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/20">
                  CÓDIGO: {selectedSupplier.codigo_proveedor}
                </span>
                <span className="text-xs font-medium text-indigo-200 flex items-center gap-1">
                  <Building2 size={13} /> Proveedor
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white pr-8">
                {selectedSupplier.nombre}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays size={20} className="text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-base md:text-lg">
                    Agenda Operativa
                  </h4>
                </div>

                {loadingSchedule ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                ) : supplierSchedule.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center text-slate-500">
                    <Info size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">Sin agenda registrada</p>
                    <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                      Este proveedor aún no tiene días de salida de pedidos ni entregas asignados en la pestaña Agenda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supplierSchedule.map((item, idx) => (
                      <div 
                        key={item.id || idx}
                        className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Salida de pedido */}
                          <div className="bg-orange-50/70 border border-orange-200/60 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center gap-1.5 text-orange-600 text-xs font-semibold uppercase tracking-wider mb-1.5">
                              <ArrowUpRight size={16} />
                              <span>Sale Pedido</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">
                              {item.dia_pedido || 'No asignado'}
                            </span>
                          </div>

                          {/* Entrega */}
                          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-1.5">
                              <Truck size={16} />
                              <span>Día de Entrega</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">
                              {item.dia_entrega || 'No asignado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:px-8 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={closeSupplierModal}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
