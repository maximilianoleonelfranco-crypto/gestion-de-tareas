import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Check, Trash2 } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const fetchTasks = async () => {
    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await addDoc(collection(db, 'tasks'), {
      descripcion: newTask,
      completada: false,
      created_at: serverTimestamp()
    });
    setNewTask('');
    fetchTasks();
  };

  const toggleComplete = async (task) => {
    await updateDoc(doc(db, 'tasks', task.id), {
      completada: !task.completada
    });
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id));
    fetchTasks();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Pendientes</h2>
      
      <form onSubmit={handleAdd} className="flex gap-4 mb-8">
        <input 
          type="text" 
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Nuevo pendiente..." 
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition">
          Agregar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-slate-50 transition">
            <button onClick={() => toggleComplete(t)} className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${t.completada ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 text-transparent'}`}>
              <Check size={16} />
            </button>
            <div className="flex-1">
              <p className={`text-slate-800 ${t.completada ? 'line-through text-slate-400' : ''}`}>{t.descripcion}</p>
              {t.created_at && (
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(t.created_at.seconds * 1000).toLocaleString()}
                </p>
              )}
            </div>
            <button onClick={() => deleteTask(t.id)} className="text-red-400 hover:text-red-600 p-2">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {tasks.length === 0 && <div className="p-8 text-center text-slate-500">No hay tareas pendientes.</div>}
      </div>
    </div>
  );
}
