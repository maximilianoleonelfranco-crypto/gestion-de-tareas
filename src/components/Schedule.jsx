import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2 } from 'lucide-react';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  
  const [newCode, setNewCode] = useState('');
  const [providerNamePreview, setProviderNamePreview] = useState('');
  const [dayOut, setDayOut] = useState('Lunes');
  const [dayIn, setDayIn] = useState('Lunes');

  const fetchSchedule = async () => {
    const snapshot = await getDocs(collection(db, 'schedule'));
    setSchedule(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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

  // Filtrado local
  const term = searchFilter.toLowerCase();
  const filteredSchedule = schedule.filter(s => 
    (s.codigo_proveedor || '').toLowerCase().includes(term) ||
    (s.nombre_proveedor || '').toLowerCase().includes(term)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Agenda de Proveedores</h2>
        <div className="w-1/3">
          <input 
            type="text" 
            placeholder="Filtrar por proveedor o código..." 
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor (Cód)</label>
          <input type="text" value={newCode} onChange={e => handleProviderCodeChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
          {providerNamePreview && <p className="text-xs mt-1 text-slate-500 font-medium truncate">{providerNamePreview}</p>}
        </div>
        <div className="flex-[1.5]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Día salen pedidos</label>
          <select value={dayOut} onChange={e => setDayOut(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex-[1.5]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Día de entrega</label>
          <select value={dayIn} onChange={e => setDayIn(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition h-[42px]">Agendar</button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {DAYS.map(day => {
          const outItems = filteredSchedule.filter(s => s.dia_pedido === day);
          const inItems = filteredSchedule.filter(s => s.dia_entrega === day);
          
          return (
            <div key={day} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-slate-800 text-white p-3 text-center font-bold">
                {day}
              </div>
              <div className="flex-1 p-3 flex flex-col gap-4">
                
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2 border-b pb-1">Salen Pedidos</h4>
                  <ul className="space-y-2">
                    {outItems.map(s => (
                      <li key={`out-${s.id}`} className="text-sm flex justify-between items-start group">
                        <span>
                          <span className="font-mono text-xs text-slate-500 block">{s.codigo_proveedor}</span>
                          <span className="text-slate-800 leading-tight">{s.nombre_proveedor || 'Sin nombre'}</span>
                        </span>
                        <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                      </li>
                    ))}
                    {outItems.length === 0 && <p className="text-xs text-slate-400 italic">Ninguno</p>}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 border-b pb-1">Entregas</h4>
                  <ul className="space-y-2">
                    {inItems.map(s => (
                      <li key={`in-${s.id}`} className="text-sm flex justify-between items-start group">
                        <span>
                          <span className="font-mono text-xs text-slate-500 block">{s.codigo_proveedor}</span>
                          <span className="text-slate-800 leading-tight">{s.nombre_proveedor || 'Sin nombre'}</span>
                        </span>
                        <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                      </li>
                    ))}
                    {inItems.length === 0 && <p className="text-xs text-slate-400 italic">Ninguna</p>}
                  </ul>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
