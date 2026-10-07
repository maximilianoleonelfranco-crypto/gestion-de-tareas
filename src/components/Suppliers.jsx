import { useState, useEffect } from 'react';
import { collection, setDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, Building2, Plus, UsersRound } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    const snapshot = await getDocs(collection(db, 'suppliers'));
    setSuppliers(snapshot.docs.map(d => ({ codigo_proveedor: d.id, ...d.data() })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

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
    fetchSuppliers();
  };

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
        <div className="bg-slate-50 px-8 md:px-6 py-4 rounded-2xl ring-1 ring-slate-100 flex flex-col items-center justify-center w-full md:w-auto">
          <span className="text-3xl font-bold text-indigo-600">{suppliers.length}</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registrados</span>
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
        <div className="lg:col-span-2">
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
          ) : (
            <>
              {/* Mobile Cards View (< md) */}
              <div className="md:hidden flex flex-col gap-4">
                {suppliers.map(s => (
                  <div key={s.codigo_proveedor} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex justify-between items-center">
                    <div className="min-w-0 pr-4">
                      <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60 block w-fit mb-2">
                        CÓD: {s.codigo_proveedor}
                      </span>
                      <h4 className="text-slate-800 font-medium truncate">{s.nombre}</h4>
                    </div>
                    <button 
                      onClick={() => deleteSupplier(s.codigo_proveedor)} 
                      className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-col h-full min-h-[500px]">
                <div className="overflow-x-auto w-full flex-1">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/80">
                      <tr>
                        <th className="p-5 font-semibold text-slate-600 text-sm tracking-wide">Código</th>
                        <th className="p-5 font-semibold text-slate-600 text-sm tracking-wide">Nombre del Proveedor</th>
                        <th className="p-5 font-semibold text-slate-600 text-sm tracking-wide w-24 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suppliers.map(s => (
                        <tr key={s.codigo_proveedor} className="group transition-colors duration-200 hover:bg-indigo-50/30">
                          <td className="p-5">
                            <span className="font-mono text-sm font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60">
                              {s.codigo_proveedor}
                            </span>
                          </td>
                          <td className="p-5 text-slate-700 font-medium">{s.nombre}</td>
                          <td className="p-5 text-center">
                            <button 
                              onClick={() => deleteSupplier(s.codigo_proveedor)} 
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
    </div>
  );
}
