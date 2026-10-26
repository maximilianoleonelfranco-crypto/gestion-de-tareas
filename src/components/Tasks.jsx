import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Check, 
  Trash2, 
  Plus, 
  Clock, 
  Building2, 
  Briefcase, 
  CheckCircle2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pestañas: 'cogrup' | 'gerencia' | 'realizadas'
  const [activeTab, setActiveTab] = useState('cogrup');

  // Filtro dentro de Realizadas: 'todas' | 'cogrup' | 'gerencia'
  const [filterRealizadas, setFilterRealizadas] = useState('todas');

  // Suscripción en tiempo real a Firestore (onSnapshot) para sincronización instantánea
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(items);
      setIsLoading(false);
    }, (err) => {
      console.error('Error escuchando tasks:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Formateador de fecha y hora para Uruguay (GMT-3)
  const formatUruguayDateTime = (timestamp) => {
    if (!timestamp) return 'Recién';
    
    let dateObj;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      dateObj = timestamp.toDate();
    } else if (timestamp.seconds) {
      dateObj = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      dateObj = timestamp;
    } else {
      dateObj = new Date(timestamp);
    }

    if (isNaN(dateObj.getTime())) return 'Recién';

    return new Intl.DateTimeFormat('es-UY', {
      timeZone: 'America/Montevideo',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj) + ' hs';
  };

  // AGREGAR TAREA: Actualización Optimista a 0ms (Al toque, sin esperar a la red)
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const taskText = newTask.trim();
    const sector = activeTab === 'gerencia' ? 'gerencia' : 'cogrup';
    setNewTask(''); // Limpiar input inmediatamente

    const tempId = 'temp-' + Date.now();
    const optimisticTask = {
      id: tempId,
      descripcion: taskText,
      completada: false,
      sector: sector,
      created_at: { seconds: Math.floor(Date.now() / 1000) }
    };

    // Actualización local inmediata (0ms)
    setTasks(prev => [optimisticTask, ...prev]);

    // Persistencia asíncrona en Firebase en segundo plano
    try {
      await addDoc(collection(db, 'tasks'), {
        descripcion: taskText,
        completada: false,
        sector: sector,
        created_at: serverTimestamp()
      });
    } catch (err) {
      console.error('Error al agregar tarea:', err);
      // Revertir si hay error
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  // RESOLVER TAREA: Desaparece al instante y pasa a Realizadas con fecha/hora actual
  const toggleComplete = async (task) => {
    const isNowCompleted = !task.completada;
    const nowUruguayDate = new Date();

    // Actualización local inmediata (0ms): desaparece de la pestaña activa al instante
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          completada: isNowCompleted,
          realizada_at: isNowCompleted ? nowUruguayDate : null
        };
      }
      return t;
    }));

    // Actualización en Firebase en segundo plano
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completada: isNowCompleted,
        realizada_at: isNowCompleted ? serverTimestamp() : null
      });
    } catch (err) {
      console.error('Error al actualizar tarea:', err);
      // Revertir si falla
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  // ELIMINAR TAREA: Inmediato
  const deleteTask = async (id) => {
    const previousTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      console.error('Error al eliminar tarea:', err);
      setTasks(previousTasks);
    }
  };

  // Conteo de tareas por sector
  const cogrupTasks = tasks.filter(t => !t.completada && (t.sector === 'cogrup' || !t.sector));
  const gerenciaTasks = tasks.filter(t => !t.completada && t.sector === 'gerencia');
  const allCompletedTasks = tasks.filter(t => t.completada);

  // Lista según pestaña activa
  let displayedTasks = [];
  if (activeTab === 'cogrup') {
    displayedTasks = cogrupTasks;
  } else if (activeTab === 'gerencia') {
    displayedTasks = gerenciaTasks;
  } else {
    displayedTasks = allCompletedTasks.filter(t => {
      if (filterRealizadas === 'cogrup') return (t.sector === 'cogrup' || !t.sector);
      if (filterRealizadas === 'gerencia') return t.sector === 'gerencia';
      return true;
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-200">
      
      {/* Header Bento Card sin porcentaje */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-4 justify-between items-center text-center md:text-left">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2.5 mb-1.5">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Sparkles size={22} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Pendientes</h2>
          </div>
          <p className="text-sm md:text-base text-slate-500">
            Anota y gestiona tus tareas rápidamente por sector de trabajo.
          </p>
        </div>

        {/* Resumen rápido */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600">
          <span className="px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-200/60">
            {cogrupTasks.length} Cogrup
          </span>
          <span className="px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-200/60">
            {gerenciaTasks.length} Gerencia
          </span>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
            {allCompletedTasks.length} Hechas
          </span>
        </div>
      </div>

      {/* Pestañas de Sector y Realizadas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setActiveTab('cogrup')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'cogrup'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={16} />
            <span>COGRUP</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'cogrup' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {cogrupTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gerencia')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'gerencia'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase size={16} />
            <span>GERENCIA</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'gerencia' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {gerenciaTasks.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => setActiveTab('realizadas')}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'realizadas'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Realizadas</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            activeTab === 'realizadas' ? 'bg-emerald-700 text-white' : 'bg-emerald-200/80 text-emerald-800'
          }`}>
            {allCompletedTasks.length}
          </span>
        </button>
      </div>
      
      {/* Input Form (Solo visible en Cogrup o Gerencia) */}
      {activeTab !== 'realizadas' && (
        <form 
          onSubmit={handleAdd} 
          className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-3 flex flex-col sm:flex-row gap-3 transition-shadow focus-within:shadow-md focus-within:border-indigo-300"
        >
          <input 
            type="text" 
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder={activeTab === 'cogrup' ? '¿Qué pendiente hay en COGRUP?' : '¿Qué pendiente hay en GERENCIA?'}
            className="w-full flex-1 p-3 bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200 rounded-xl sm:rounded-none text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:focus:ring-0 text-base md:text-lg font-medium"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!newTask.trim()} 
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3.5 sm:py-3 rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 font-semibold shadow-sm shadow-indigo-200 cursor-pointer"
          >
            <Plus size={20} />
            <span>Agregar</span>
          </button>
        </form>
      )}

      {/* Sub-filtro si estamos en la pestaña Realizadas */}
      {activeTab === 'realizadas' && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Tareas Completadas</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterRealizadas('todas')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterRealizadas === 'todas' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas ({allCompletedTasks.length})
            </button>
            <button
              onClick={() => setFilterRealizadas('cogrup')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterRealizadas === 'cogrup' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cogrup ({allCompletedTasks.filter(t => t.sector === 'cogrup' || !t.sector).length})
            </button>
            <button
              onClick={() => setFilterRealizadas('gerencia')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterRealizadas === 'gerencia' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gerencia ({allCompletedTasks.filter(t => t.sector === 'gerencia').length})
            </button>
          </div>
        </div>
      )}

      {/* List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="p-12 md:p-16 text-center text-slate-400 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-slate-50/50">
              <Check size={32} className="text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-600">
              {activeTab === 'realizadas' 
                ? 'No hay tareas realizadas en este filtro' 
                : `Todo listo en ${activeTab === 'cogrup' ? 'COGRUP' : 'GERENCIA'}`}
            </p>
            <p className="text-sm mt-1">
              {activeTab === 'realizadas'
                ? 'Al marcar un pendiente como completado, aparecerá aquí con su fecha y hora exacta.'
                : 'No tienes pendientes en este sector. Escribe arriba para anotar uno nuevo.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 flex flex-col">
            {displayedTasks.map(t => {
              const isDone = t.completada;
              const sectorLabel = t.sector === 'gerencia' ? 'Gerencia' : 'Cogrup';

              return (
                <div 
                  key={t.id} 
                  className={`group flex flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 transition-all duration-150 hover:bg-slate-50/80 ${
                    isDone ? 'bg-slate-50/60' : ''
                  }`}
                >
                  {/* Botón de Checkbox para completar o restaurar */}
                  <button 
                    onClick={() => toggleComplete(t)} 
                    className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all duration-150 mt-0.5 sm:mt-0 cursor-pointer ${
                      isDone 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs shadow-emerald-200 hover:bg-emerald-600' 
                        : 'border-slate-300 text-transparent hover:border-indigo-400 hover:bg-indigo-50'
                    }`}
                    title={isDone ? 'Mover de vuelta a pendientes' : 'Marcar como realizada'}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Badge de sector */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        t.sector === 'gerencia' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200/60' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
                      }`}>
                        {sectorLabel}
                      </span>

                      {/* Fecha de Realización (Uruguay) si está completada */}
                      {isDone && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Realizada: {formatUruguayDateTime(t.realizada_at || t.updated_at || t.created_at)}
                        </span>
                      )}
                    </div>

                    <p className={`text-slate-800 font-medium text-sm sm:text-base md:text-[17px] leading-snug break-words ${
                      isDone ? 'line-through text-slate-500' : ''
                    }`}>
                      {t.descripcion}
                    </p>

                    {/* Fecha de Creación */}
                    {t.created_at && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-medium">
                        <Clock size={12} />
                        <span>Creado: {formatUruguayDateTime(t.created_at)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isDone && (
                      <button 
                        onClick={() => toggleComplete(t)}
                        className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-all duration-150"
                        title="Restaurar a pendientes"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteTask(t.id)} 
                      className="text-slate-300 hover:text-red-500 p-2 sm:p-2.5 rounded-xl hover:bg-red-50 sm:opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110 active:scale-95"
                      title="Eliminar tarea definitivamente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
