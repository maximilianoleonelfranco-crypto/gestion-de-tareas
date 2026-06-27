import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, CheckCircle2, ListTodo, Users, UserPlus, Download, User, Calendar, History, TrendingUp, AlertCircle, MessageSquare } from 'lucide-react';

const APP_VERSION = 2;
import { db } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';

function App() {
  const [currentView, setCurrentView] = useState('tasks'); // 'tasks', 'history', 'productivity', 'staff'
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Completion Modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [completionStatus, setCompletionStatus] = useState('success'); // 'success' or 'failed'
  const [completionComment, setCompletionComment] = useState('');

  // Staff state
  const [staff, setStaff] = useState([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [updateConfig, setUpdateConfig] = useState(null);

  useEffect(() => {
    // Update Checker Listener
    const unsubscribeUpdate = onSnapshot(doc(db, 'settings', 'appConfig'), (snapshot) => {
      if (snapshot.exists()) {
        setUpdateConfig(snapshot.data());
      }
    });
    // Tasks Listener
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Staff Listener
    const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeStaff();
      unsubscribeUpdate();
    };
  }, []);

  // --- Tasks Logic ---
  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee || !newTaskDate) return;
    
    await addDoc(collection(db, 'tasks'), { 
      title: newTaskTitle, 
      assignee: newTaskAssignee,
      targetDate: newTaskDate,
      completed: false,
      status: 'pending',
      createdAt: new Date().getTime() 
    });
    
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setIsTaskModalOpen(false);
  };

  // --- Completion Logic ---
  const openCompletionModal = (task) => {
    setTaskToComplete(task);
    setCompletionStatus('success');
    setCompletionComment('');
    setIsCompletionModalOpen(true);
  };

  const submitCompletion = async (e) => {
    e.preventDefault();
    if (completionStatus === 'failed' && !completionComment.trim()) return;

    if (taskToComplete) {
      await updateDoc(doc(db, 'tasks', taskToComplete.id), { 
        completed: true,
        status: completionStatus,
        comment: completionComment.trim()
      });
    }
    
    setIsCompletionModalOpen(false);
    setTaskToComplete(null);
  };

  // --- Staff Logic ---
  const deleteStaff = async (id) => {
    await deleteDoc(doc(db, 'staff', id));
  };

  const addStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    
    await addDoc(collection(db, 'staff'), { 
      name: newStaffName, 
      createdAt: new Date().getTime() 
    });
    
    setNewStaffName('');
    setIsStaffModalOpen(false);
  };

  // --- Derived Data ---
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const pendingCount = pendingTasks.length;

  const productivityRanking = staff.map(person => {
    const personTasks = completedTasks.filter(t => t.assignee === person.name);
    const total = personTasks.length;
    const successful = personTasks.filter(t => t.status !== 'failed').length;
    const percentage = total === 0 ? 0 : Math.round((successful / total) * 100);
    
    return {
      ...person,
      total,
      successful,
      percentage
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Desactivado para la versión web en Vercel
  const needsUpdate = false; 

  return (
    <div className="app-container">
      {/* UPDATE MODAL OVERLAY */}
      {needsUpdate && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="update-modal">
            <div className="update-icon-wrapper">
              <Download size={32} color="#3b82f6" />
            </div>
            <h2>¡Actualización Disponible!</h2>
            <p>Hay una nueva y mejor versión de la aplicación. Por favor, descárgala para continuar.</p>
            <button 
              className="btn-primary"
              onClick={() => window.open(updateConfig.downloadUrl, '_system')}
            >
              Descargar e Instalar
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Header based on view */}
      <header className="header">
        {currentView === 'tasks' && (
          <>
            <h1>Pendientes</h1>
            <p>Tienes {pendingCount} {pendingCount === 1 ? 'tarea' : 'tareas'}</p>
          </>
        )}
        {currentView === 'history' && (
          <>
            <h1>Historial</h1>
            <p>Tareas finalizadas ({completedTasks.length})</p>
          </>
        )}
        {currentView === 'productivity' && (
          <>
            <h1>Productividad</h1>
            <p>Rendimiento del equipo</p>
          </>
        )}
        {currentView === 'staff' && (
          <>
            <h1>Personal</h1>
            <p>Gestiona tu equipo de trabajo</p>
          </>
        )}
      </header>

      {/* Main Content Area */}
      {currentView === 'tasks' && (
        <div className="task-list">
          {pendingTasks.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={48} />
              <h3>¡Todo al día!</h3>
              <p>Disfruta tu tiempo libre o añade más tareas.</p>
            </div>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="glass-panel task-card">
                <div className="checkbox-wrapper" onClick={() => openCompletionModal(task)}>
                  <Check className="checkbox-icon" />
                </div>
                
                <div className="task-content">
                  <span className="task-title">{task.title}</span>
                  <div className="task-meta">
                    {task.assignee && (
                      <div className="task-badge bg-blue">
                        <User size={10} />
                        {task.assignee}
                      </div>
                    )}
                    {task.targetDate && (
                      <div className="task-badge bg-gray">
                        <Calendar size={10} />
                        {new Date(task.targetDate + 'T12:00:00Z').toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'history' && (
        <div className="task-list">
          {completedTasks.length === 0 ? (
             <div className="empty-state">
              <History size={48} />
              <h3>Aún no hay historial</h3>
              <p>Las tareas que finalices aparecerán aquí.</p>
            </div>
          ) : (
            completedTasks.map(task => (
              <div key={task.id} className="glass-panel task-card completed">
                <div className="checkbox-wrapper completed" style={{ 
                  background: task.status === 'failed' ? 'var(--danger-color)' : 'var(--success-color)' 
                }}>
                  {task.status === 'failed' ? <AlertCircle size={14} color="white" /> : <Check className="checkbox-icon" style={{ opacity: 1, transform: 'scale(1)' }} />}
                </div>
                
                <div className="task-content">
                  <span className="task-title" style={{ textDecoration: task.status === 'failed' ? 'none' : 'line-through' }}>{task.title}</span>
                  <div className="task-meta">
                    <div className={`task-badge ${task.status === 'failed' ? 'bg-red' : 'bg-green'}`}>
                      {task.status === 'failed' ? 'No Realizada' : 'Realizada'}
                    </div>
                    {task.assignee && (
                      <div className="task-badge bg-blue">
                        <User size={10} />
                        {task.assignee}
                      </div>
                    )}
                  </div>
                  {task.comment && (
                    <div className="task-comment">
                      <MessageSquare size={12} />
                      {task.comment}
                    </div>
                  )}
                </div>
                
                <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'productivity' && (
        <div className="task-list">
          {productivityRanking.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={48} />
              <h3>Sin datos</h3>
              <p>Agrega personal para medir su productividad.</p>
            </div>
          ) : (
            productivityRanking.map((person, index) => (
              <div key={person.id} className="glass-panel prod-card">
                <div className="prod-header">
                  <div className="prod-rank">#{index + 1}</div>
                  <div className="prod-name">{person.name}</div>
                  <div className="prod-percentage">{person.percentage}%</div>
                </div>
                <div className="prod-progress-bg">
                  <div className="prod-progress-fill" style={{ 
                    width: `${person.percentage}%`, 
                    background: person.percentage >= 80 ? 'var(--success-color)' : person.percentage >= 50 ? '#eab308' : 'var(--danger-color)' 
                  }}></div>
                </div>
                <div className="prod-stats">
                  <span>{person.successful} Éxitos</span>
                  <span>{person.total - person.successful} Fallos</span>
                  <span>{person.total} Totales</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'staff' && (
        <div className="task-list">
          {staff.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h3>Sin personal</h3>
              <p>Añade a los miembros de tu equipo.</p>
            </div>
          ) : (
            staff.map(person => (
              <div key={person.id} className="glass-panel task-card">
                <div className="checkbox-wrapper" style={{ border: 'none', background: 'rgba(59, 130, 246, 0.2)' }}>
                  <Users className="checkbox-icon" style={{ opacity: 1, transform: 'scale(1)', color: '#3b82f6' }} />
                </div>
                
                <div className="task-content">
                  <span className="task-title">{person.name}</span>
                </div>
                
                <button className="delete-btn" onClick={() => deleteStaff(person.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dynamic FAB based on view */}
      <button 
        className="fab" 
        style={{ display: (currentView === 'tasks' || currentView === 'staff') ? 'flex' : 'none' }}
        onClick={() => currentView === 'tasks' ? setIsTaskModalOpen(true) : setIsStaffModalOpen(true)}
      >
        {currentView === 'tasks' ? <Plus size={28} /> : <UserPlus size={28} />}
      </button>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <button className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`} onClick={() => setCurrentView('tasks')}>
          <ListTodo size={24} />
          <span>Pendientes</span>
        </button>
        <button className={`nav-item ${currentView === 'history' ? 'active' : ''}`} onClick={() => setCurrentView('history')}>
          <History size={24} />
          <span>Realizadas</span>
        </button>
        <button className={`nav-item ${currentView === 'productivity' ? 'active' : ''}`} onClick={() => setCurrentView('productivity')}>
          <TrendingUp size={24} />
          <span>Rendimiento</span>
        </button>
        <button className={`nav-item ${currentView === 'staff' ? 'active' : ''}`} onClick={() => setCurrentView('staff')}>
          <Users size={24} />
          <span>Personal</span>
        </button>
      </nav>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') setIsTaskModalOpen(false);
        }}>
          <div className="bottom-sheet">
            <h2>Nueva Tarea</h2>
            <form onSubmit={addTask}>
              <div className="input-group">
                <input
                  type="text"
                  className="input-field"
                  placeholder="¿Qué necesitas hacer?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                  style={{ marginBottom: '16px' }}
                />
                <input
                  type="date"
                  className="input-field"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  style={{ marginBottom: '16px' }}
                />
                <select
                  className="input-field select-field"
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                >
                  <option value="" disabled>Selecciona un funcionario</option>
                  {staff.map(person => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={!newTaskTitle.trim() || !newTaskAssignee || !newTaskDate}
              >
                Añadir Tarea
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') setIsStaffModalOpen(false);
        }}>
          <div className="bottom-sheet">
            <h2>Nuevo Miembro</h2>
            <form onSubmit={addStaff}>
              <div className="input-group">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nombre del empleado"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={!newStaffName.trim()}
              >
                Añadir Personal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {isCompletionModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') {
            setIsCompletionModalOpen(false);
            setTaskToComplete(null);
          }
        }}>
          <div className="bottom-sheet">
            <h2>Finalizar Tarea</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{taskToComplete?.title}</p>
            <form onSubmit={submitCompletion}>
              
              <div className="completion-toggle">
                <button 
                  type="button"
                  className={`toggle-btn ${completionStatus === 'success' ? 'active-success' : ''}`}
                  onClick={() => setCompletionStatus('success')}
                >
                  <CheckCircle2 size={20} />
                  Realizada
                </button>
                <button 
                  type="button"
                  className={`toggle-btn ${completionStatus === 'failed' ? 'active-danger' : ''}`}
                  onClick={() => setCompletionStatus('failed')}
                >
                  <AlertCircle size={20} />
                  No Realizada
                </button>
              </div>

              <div className="input-group">
                <textarea
                  className="input-field"
                  placeholder={completionStatus === 'failed' ? 'Motivo (Obligatorio)...' : 'Comentarios (Opcional)...'}
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  rows="3"
                  style={{ resize: 'none', marginTop: '16px' }}
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={completionStatus === 'failed' && !completionComment.trim()}
              >
                Guardar Registro
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
