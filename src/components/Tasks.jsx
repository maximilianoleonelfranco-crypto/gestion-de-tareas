import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Check, Trash2, Plus, Clock } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setIsLoading(false);
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

  const completedCount = tasks.filter(t => t.completada).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8">
      {/* Header Bento Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center md:items-start relative overflow-hidden">
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Pendientes</h2>
          <p className="text-sm md:text-base text-slate-500 mt-2">Gestiona tus tareas del día.</p>
        </div>
        <div className="flex items-center gap-4 relative z-10 bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 w-full md:w-auto justify-between md:justify-start">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Progreso</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl md:text-3xl font-bold text-indigo-600">{progress}%</span>
              <span className="text-xs md:text-sm font-medium text-slate-400 mb-1">({completedCount}/{tasks.length})</span>
            </div>
          </div>
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-indigo-100 flex items-center justify-center relative shrink-0">
            <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-100" />
              <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="4" fill="transparent" 
                strokeDasharray="264%" strokeDashoffset={`${264 - (264 * progress) / 100}%`}
                className="text-indigo-600 transition-all duration-1000 ease-out" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Input Card */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-3 flex flex-col sm:flex-row gap-3 transition-shadow focus-within:shadow-md focus-within:border-indigo-300">
        <input 
          type="text" 
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="¿Qué necesitas hacer hoy?" 
          className="w-full flex-1 p-3 bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200 rounded-xl sm:rounded-none text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:focus:ring-0 text-base md:text-lg font-medium"
        />
        <button type="submit" disabled={!newTask.trim()} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3.5 sm:py-3 rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 font-semibold shadow-sm shadow-indigo-200">
          <Plus size={20} />
          <span>Agregar</span>
        </button>
      </form>

      {/* List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 md:p-16 text-center text-slate-400 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-slate-50/50">
              <Check size={32} className="text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-600">Todo limpio por aquí</p>
            <p className="text-sm">No tienes tareas pendientes en este momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 flex flex-col">
            {tasks.map(t => (
              <div key={t.id} className={`group flex flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 transition-all duration-300 hover:bg-slate-50/80 ${t.completada ? 'opacity-60 bg-slate-50' : ''}`}>
                <button 
                  onClick={() => toggleComplete(t)} 
                  className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all duration-200 mt-0.5 sm:mt-0 ${
                    t.completada 
                      ? 'bg-indigo-500 border-indigo-500 text-white sm:scale-110 shadow-sm shadow-indigo-200' 
                      : 'border-slate-300 text-transparent hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-slate-800 font-medium text-sm sm:text-base md:text-[17px] transition-all duration-300 ${t.completada ? 'line-through text-slate-500' : ''} break-words`}>
                    {t.descripcion}
                  </p>
                  {t.created_at && (
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 mt-1.5 font-medium">
                      <Clock size={12} />
                      {new Date(t.created_at.seconds * 1000).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => deleteTask(t.id)} 
                  className="text-slate-300 hover:text-red-500 p-2 sm:p-2.5 rounded-xl hover:bg-red-50 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
