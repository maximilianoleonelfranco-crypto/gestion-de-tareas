import { useState, useEffect } from 'react';
import { collection, setDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2 } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const fetchSuppliers = async () => {
    const snapshot = await getDocs(collection(db, 'suppliers'));
    setSuppliers(snapshot.docs.map(d => ({ codigo_proveedor: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    // Usamos el código de proveedor como ID del documento (Primary Key)
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
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Maestro de Proveedores</h2>
      
      <form onSubmit={handleAdd} className="flex gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
          <input 
            type="text" 
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Ej: 12018" 
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Conaprole" 
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition h-[42px]">
            Guardar
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
            <tr>
              <th className="p-4 font-semibold">Código</th>
              <th className="p-4 font-semibold">Nombre</th>
              <th className="p-4 font-semibold w-16"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.codigo_proveedor} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="p-4 text-slate-800 font-mono">{s.codigo_proveedor}</td>
                <td className="p-4 text-slate-800">{s.nombre}</td>
                <td className="p-4 text-center">
                  <button onClick={() => deleteSupplier(s.codigo_proveedor)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan="3" className="p-8 text-center text-slate-500">No hay proveedores registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
