import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, Trash2, CheckCircle2, ListTodo, Users, UserPlus, Download, User, Calendar, History, TrendingUp, AlertCircle, MessageSquare, Pin, Camera, Tag, Loader2, Folder, ArrowLeft, Search, CalendarDays, Edit2 } from 'lucide-react';

const APP_VERSION = 2;
import { db } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore';

function App() {
  const [currentView, setCurrentView] = useState('tasks'); // 'tasks', 'history', 'productivity', 'staff', 'reminders', 'offers'
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  
  // Forms state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newStaffName, setNewStaffName] = useState('');
  
  const [newReminderText, setNewReminderText] = useState('');
  
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferStartDate, setNewOfferStartDate] = useState('');
  const [newOfferEndDate, setNewOfferEndDate] = useState('');
  
  // Folders and Search state
  const [selectedOfferGroup, setSelectedOfferGroup] = useState(null);
  const [offerSearchTerm, setOfferSearchTerm] = useState('');
  
  // Edit state
  const [editingTask, setEditingTask] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingOfferItem, setEditingOfferItem] = useState(null);
  
  // Completion Modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [completionStatus, setCompletionStatus] = useState('success'); 
  const [completionComment, setCompletionComment] = useState('');

  // Reminders state
  const [reminders, setReminders] = useState([]);

  // Offers state
  const [offers, setOffers] = useState([]);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Staff state
  const [staff, setStaff] = useState([]);
  const [updateConfig, setUpdateConfig] = useState(null);

  // Tasks state
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Update Checker
    const unsubscribeUpdate = onSnapshot(doc(db, 'settings', 'appConfig'), (snapshot) => {
      if (snapshot.exists()) setUpdateConfig(snapshot.data());
    });

    // Tasks
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Reminders
    const qReminders = query(collection(db, 'reminders'), orderBy('createdAt', 'desc'));
    const unsubscribeReminders = onSnapshot(qReminders, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Offers
    const qOffers = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
    const unsubscribeOffers = onSnapshot(qOffers, (snapshot) => {
      setOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Staff
    const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeStaff();
      unsubscribeReminders();
      unsubscribeOffers();
      unsubscribeUpdate();
    };
  }, []);

  // --- Tasks Logic ---
  const deleteTask = async (id) => await deleteDoc(doc(db, 'tasks', id));

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee || !newTaskDate) return;
    
    await addDoc(collection(db, 'tasks'), { 
      title: newTaskTitle, assignee: newTaskAssignee, targetDate: newTaskDate,
      completed: false, status: 'pending', createdAt: new Date().getTime() 
    });
    setNewTaskTitle(''); setNewTaskAssignee(''); setIsTaskModalOpen(false);
  };

  const openCompletionModal = (task) => {
    setTaskToComplete(task); setCompletionStatus('success'); setCompletionComment(''); setIsCompletionModalOpen(true);
  };

  const submitCompletion = async (e) => {
    e.preventDefault();
    if (completionStatus === 'failed' && !completionComment.trim()) return;
    if (taskToComplete) {
      await updateDoc(doc(db, 'tasks', taskToComplete.id), { 
        completed: true, status: completionStatus, comment: completionComment.trim()
      });
    }
    setIsCompletionModalOpen(false); setTaskToComplete(null);
  };

  // --- Edit Logic ---
  const submitEditTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim() || !editingTask.assignee || !editingTask.dueDate) return;
    await updateDoc(doc(db, 'tasks', editingTask.id), {
      title: editingTask.title.trim(),
      assignee: editingTask.assignee,
      dueDate: editingTask.dueDate
    });
    setEditingTask(null);
  };

  const submitEditFolder = async (e) => {
    e.preventDefault();
    if (!editingFolder || !editingFolder.groupTitle.trim()) return;
    
    // Update all items in this folder
    const batch = writeBatch(db);
    const itemsToUpdate = offers.filter(o => o.groupTitle === editingFolder.oldGroupTitle);
    
    itemsToUpdate.forEach(item => {
      const itemRef = doc(db, 'offers', item.id);
      batch.update(itemRef, {
        groupTitle: editingFolder.groupTitle.trim(),
        startDate: editingFolder.startDate || null,
        endDate: editingFolder.endDate || null
      });
    });
    
    await batch.commit();
    setEditingFolder(null);
    if (selectedOfferGroup === editingFolder.oldGroupTitle) {
      setSelectedOfferGroup(editingFolder.groupTitle.trim());
    }
  };

  const submitEditOfferItem = async (e) => {
    e.preventDefault();
    if (!editingOfferItem || !editingOfferItem.productName.trim() || !editingOfferItem.price.trim()) return;
    await updateDoc(doc(db, 'offers', editingOfferItem.id), {
      productName: editingOfferItem.productName.trim(),
      details: editingOfferItem.details?.trim() || '',
      price: editingOfferItem.price.trim()
    });
    setEditingOfferItem(null);
  };

  // --- Reminders Logic ---
  const addReminder = async (e) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    await addDoc(collection(db, 'reminders'), { text: newReminderText, createdAt: new Date().getTime() });
    setNewReminderText(''); setIsReminderModalOpen(false);
  };
  const deleteReminder = async (id) => await deleteDoc(doc(db, 'reminders', id));

  // --- Offers Logic (AI) ---
  const deleteOffer = async (id) => await deleteDoc(doc(db, 'offers', id));

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzingImage(true);
    
    try {
      // Comprimir la imagen usando Canvas antes de enviarla
      const base64Data = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Reducir a un máximo de 1200px para que Gemini pueda leer bien sin pesar mucho
          const MAX_SIZE = 1200;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Exportar a JPEG con 80% de calidad
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data })
      });
      
      if (!response.ok) {
        let errorDetails = '';
        try {
          const errData = await response.json();
          if (errData.details) errorDetails = errData.details;
        } catch(e) {}
        
        if (errorDetails) throw new Error(`Error de IA: ${errorDetails}`);
        if (response.status === 413) throw new Error('La imagen es demasiado pesada.');
        if (response.status === 504) throw new Error('La IA tardó demasiado en responder (Timeout).');
        throw new Error('Error en los servidores de IA.');
      }
      
      const data = await response.json();
      
      if (data.offers && data.offers.length > 0) {
        for (const offer of data.offers) {
          await addDoc(collection(db, 'offers'), {
            ...offer,
            groupTitle: newOfferTitle.trim() || 'Ofertas Sueltas',
            startDate: newOfferStartDate || null,
            endDate: newOfferEndDate || null,
            createdAt: new Date().getTime()
          });
        }
        alert(`¡Éxito! Se extrajeron ${data.offers.length} ofertas.`);
      } else {
        alert('No se detectaron ofertas claras en la imagen.');
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Hubo un error al procesar la foto con Inteligencia Artificial.');
    } finally {
      setIsAnalyzingImage(false);
      setIsOfferModalOpen(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Staff Logic ---
  const deleteStaff = async (id) => await deleteDoc(doc(db, 'staff', id));

  const addStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    await addDoc(collection(db, 'staff'), { name: newStaffName, createdAt: new Date().getTime() });
    setNewStaffName(''); setIsStaffModalOpen(false);
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
    return { ...person, total, successful, percentage };
  }).sort((a, b) => b.percentage - a.percentage);

  const needsUpdate = false; 

  return (
    <div className="app-container">
      {/* Hidden input for camera */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleImageCapture} 
      />

      {isAnalyzingImage && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="update-modal" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <Loader2 size={48} className="lucide-spin" style={{ color: '#3b82f6', margin: '0 auto', animation: 'spin 2s linear infinite' }} />
            <h2 style={{ color: 'white', marginTop: '16px' }}>Analizando imagen con IA...</h2>
            <p style={{ color: 'white' }}>Extrayendo ofertas y precios</p>
          </div>
        </div>
      )}

      {/* Dynamic Header */}
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
        {currentView === 'reminders' && (
          <>
            <h1>Mis Notas</h1>
            <p>Recordatorios personales ({reminders.length})</p>
          </>
        )}
        {currentView === 'offers' && (
          <>
            <h1>Escáner IA</h1>
            <p>Ofertas extraídas ({offers.length})</p>
          </>
        )}
        {currentView === 'staff' && (
          <>
            <h1>Personal</h1>
            <p>Gestiona tu equipo</p>
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
                    {task.assignee && <div className="task-badge bg-blue"><User size={10} />{task.assignee}</div>}
                    {task.targetDate && <div className="task-badge bg-gray"><Calendar size={10} />{new Date(task.targetDate + 'T12:00:00Z').toLocaleDateString()}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="edit-btn" onClick={() => setEditingTask(task)}><Edit2 size={18} /></button>
                  <button className="delete-btn" onClick={() => deleteTask(task.id)}><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'history' && (
        <div className="task-list">
          {completedTasks.length === 0 ? (
             <div className="empty-state"><History size={48} /><h3>Aún no hay historial</h3></div>
          ) : (
            completedTasks.map(task => (
              <div key={task.id} className="glass-panel task-card completed">
                <div className="checkbox-wrapper completed" style={{ background: task.status === 'failed' ? 'var(--danger-color)' : 'var(--success-color)' }}>
                  {task.status === 'failed' ? <AlertCircle size={14} color="white" /> : <Check className="checkbox-icon" style={{ opacity: 1, transform: 'scale(1)' }} />}
                </div>
                <div className="task-content">
                  <span className="task-title" style={{ textDecoration: 'none', color: task.status === 'failed' ? 'var(--text-primary)' : 'var(--success-color)' }}>{task.title}</span>
                  <div className="task-meta">
                    <div className={`task-badge ${task.status === 'failed' ? 'bg-red' : 'bg-green'}`}>
                      {task.status === 'failed' ? 'No Realizada' : 'Realizada'}
                    </div>
                    {task.assignee && <div className="task-badge bg-blue"><User size={10} />{task.assignee}</div>}
                  </div>
                  {task.comment && <div className="task-comment"><MessageSquare size={12} />{task.comment}</div>}
                </div>
                <button className="delete-btn" onClick={() => deleteTask(task.id)}><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'productivity' && (
        <div className="task-list">
          {productivityRanking.length === 0 ? (
            <div className="empty-state"><TrendingUp size={48} /><h3>Sin datos</h3></div>
          ) : (
            productivityRanking.map((person, index) => (
              <div key={person.id} className="glass-panel prod-card">
                <div className="prod-header">
                  <div className="prod-rank">#{index + 1}</div>
                  <div className="prod-name">{person.name}</div>
                  <div className="prod-percentage">{person.percentage}%</div>
                </div>
                <div className="prod-progress-bg">
                  <div className="prod-progress-fill" style={{ width: `${person.percentage}%`, background: person.percentage >= 80 ? 'var(--success-color)' : person.percentage >= 50 ? '#eab308' : 'var(--danger-color)' }}></div>
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

      {currentView === 'reminders' && (
        <div className="task-list">
          {reminders.length === 0 ? (
            <div className="empty-state"><Pin size={48} /><h3>Sin recordatorios</h3></div>
          ) : (
            reminders.map(reminder => (
              <div key={reminder.id} className="glass-panel task-card">
                <div className="checkbox-wrapper" style={{ border: 'none', background: 'rgba(59, 130, 246, 0.2)' }}>
                  <Pin className="checkbox-icon" style={{ opacity: 1, transform: 'scale(1)', color: '#3b82f6' }} />
                </div>
                <div className="task-content">
                  <span className="task-title" style={{ whiteSpace: 'pre-wrap' }}>{reminder.text}</span>
                </div>
                <button className="delete-btn" onClick={() => deleteReminder(reminder.id)}><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>
      )}

      {currentView === 'offers' && (() => {
        const groupedOffers = offers.reduce((acc, offer) => {
          const group = offer.groupTitle || 'Ofertas Sueltas';
          if (!acc[group]) {
            acc[group] = {
              items: [],
              startDate: offer.startDate,
              endDate: offer.endDate
            };
          }
          acc[group].items.push(offer);
          return acc;
        }, {});
        
        if (selectedOfferGroup) {
          const groupData = groupedOffers[selectedOfferGroup];
          if (!groupData) {
            setSelectedOfferGroup(null);
            return null;
          }
          
          const filteredItems = groupData.items.filter(offer => 
            (offer.productName || '').toLowerCase().includes(offerSearchTerm.toLowerCase()) || 
            (offer.details || '').toLowerCase().includes(offerSearchTerm.toLowerCase())
          );
          
          return (
            <div className="task-list">
              <div className="offer-group-header">
                <button className="back-btn" onClick={() => { setSelectedOfferGroup(null); setOfferSearchTerm(''); }}>
                  <ArrowLeft size={20} />
                </button>
                <h2 style={{ fontSize: '18px', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedOfferGroup}</h2>
              </div>
              
              <div className="search-bar-container">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar producto..." 
                  value={offerSearchTerm} 
                  onChange={(e) => setOfferSearchTerm(e.target.value)}
                />
              </div>

              <div className="offer-group-list" style={{ marginTop: '16px' }}>
                {filteredItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                    No se encontraron productos.
                  </div>
                ) : (
                  filteredItems.map(offer => (
                    <div key={offer.id} className="offer-item">
                      <div className="offer-item-details">
                        <span className="offer-item-name">{offer.productName || 'Oferta'}</span>
                        {offer.details && <span className="offer-item-cond">{offer.details}</span>}
                      </div>
                      <div className="offer-item-right">
                        <span className="offer-item-price">{offer.price}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="offer-edit-btn" onClick={() => setEditingOfferItem(offer)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="offer-delete-btn" onClick={() => deleteOffer(offer.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="task-list">
            {offers.length === 0 ? (
              <div className="empty-state">
                <Camera size={48} />
                <h3>Ninguna oferta escaneada</h3>
                <p>Toma una foto o sube un archivo para extraer datos.</p>
              </div>
            ) : (
              <div className="folders-grid">
                {Object.entries(groupedOffers).map(([groupName, groupData]) => (
                  <div key={groupName} className="glass-panel folder-card" onClick={() => setSelectedOfferGroup(groupName)}>
                    <div className="folder-icon-wrapper">
                      <Folder size={24} className="folder-icon" />
                    </div>
                    <div className="folder-content">
                      <h3 className="folder-title">{groupName}</h3>
                      <div className="folder-meta">
                        <span>{groupData.items.length} productos</span>
                        {(groupData.startDate || groupData.endDate) && (
                          <div className="folder-dates">
                            <CalendarDays size={12} />
                            {groupData.startDate ? new Date(groupData.startDate + 'T12:00:00Z').toLocaleDateString() : '...'} al {groupData.endDate ? new Date(groupData.endDate + 'T12:00:00Z').toLocaleDateString() : '...'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="folder-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '4px', zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                      <button className="edit-btn" onClick={() => setEditingFolder({
                        oldGroupTitle: groupName,
                        groupTitle: groupName,
                        startDate: groupData.startDate || '',
                        endDate: groupData.endDate || ''
                      })}><Edit2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {currentView === 'staff' && (
        <div className="task-list">
          {staff.length === 0 ? (
            <div className="empty-state"><Users size={48} /><h3>Sin personal</h3></div>
          ) : (
            staff.map(person => (
              <div key={person.id} className="glass-panel task-card">
                <div className="checkbox-wrapper" style={{ border: 'none', background: 'rgba(59, 130, 246, 0.2)' }}>
                  <Users className="checkbox-icon" style={{ opacity: 1, transform: 'scale(1)', color: '#3b82f6' }} />
                </div>
                <div className="task-content"><span className="task-title">{person.name}</span></div>
                <button className="delete-btn" onClick={() => deleteStaff(person.id)}><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dynamic FAB */}
      <button 
        className="fab" 
        style={{ display: (currentView === 'tasks' || currentView === 'staff' || currentView === 'reminders' || currentView === 'offers') ? 'flex' : 'none' }}
        onClick={() => {
          if (currentView === 'tasks') setIsTaskModalOpen(true);
          else if (currentView === 'staff') setIsStaffModalOpen(true);
          else if (currentView === 'reminders') setIsReminderModalOpen(true);
          else if (currentView === 'offers') {
            setNewOfferTitle('');
            setNewOfferStartDate('');
            setNewOfferEndDate('');
            setIsOfferModalOpen(true);
          }
        }}
      >
        {currentView === 'tasks' && <Plus size={28} />}
        {currentView === 'staff' && <UserPlus size={28} />}
        {currentView === 'reminders' && <Plus size={28} />}
        {currentView === 'offers' && <Camera size={28} />}
      </button>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" style={{ padding: '0 4px', justifyContent: 'space-between', gap: '2px' }}>
        <button className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`} onClick={() => setCurrentView('tasks')} style={{ padding: '8px 2px' }}>
          <ListTodo size={20} />
          <span style={{ fontSize: '9px', marginTop: '2px' }}>Pendientes</span>
        </button>
        <button className={`nav-item ${currentView === 'history' ? 'active' : ''}`} onClick={() => setCurrentView('history')} style={{ padding: '8px 2px' }}>
          <History size={20} />
          <span style={{ fontSize: '9px', marginTop: '2px' }}>Realizadas</span>
        </button>
        <button className={`nav-item ${currentView === 'productivity' ? 'active' : ''}`} onClick={() => setCurrentView('productivity')} style={{ padding: '8px 2px' }}>
          <TrendingUp size={20} />
          <span style={{ fontSize: '9px', marginTop: '2px' }}>Ranking</span>
        </button>
        <button className={`nav-item ${currentView === 'reminders' ? 'active' : ''}`} onClick={() => setCurrentView('reminders')} style={{ padding: '8px 2px' }}>
          <Pin size={20} />
          <span style={{ fontSize: '9px', marginTop: '2px' }}>Notas</span>
        </button>
        <button className={`nav-item ${currentView === 'offers' ? 'active' : ''}`} onClick={() => setCurrentView('offers')} style={{ padding: '8px 2px' }}>
          <Tag size={20} />
          <span style={{ fontSize: '9px', marginTop: '2px' }}>Ofertas</span>
        </button>
        <button className={`nav-item ${currentView === 'staff' ? 'active' : ''}`} onClick={() => setCurrentView('staff')} style={{ padding: '8px 2px' }}>
          <Users size={20} />
          <span style={{ fontSize: '9px', marginTop: '2px' }}>Personal</span>
        </button>
      </nav>

      {/* Modals... */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setIsTaskModalOpen(false); }}>
          <div className="bottom-sheet">
            <h2>Nueva Tarea</h2>
            <form onSubmit={addTask}>
              <div className="input-group">
                <input type="text" className="input-field" placeholder="¿Qué necesitas hacer?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus style={{ marginBottom: '16px' }} />
                <input type="date" className="input-field" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} style={{ marginBottom: '16px' }} />
                <select className="input-field select-field" value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)}>
                  <option value="" disabled>Selecciona un funcionario</option>
                  {staff.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={!newTaskTitle.trim() || !newTaskAssignee || !newTaskDate}>Añadir Tarea</button>
            </form>
          </div>
        </div>
      )}

      {isReminderModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setIsReminderModalOpen(false); }}>
          <div className="bottom-sheet">
            <h2>Nuevo Recordatorio</h2>
            <form onSubmit={addReminder}>
              <div className="input-group">
                <textarea className="input-field" placeholder="Escribe tu nota aquí..." value={newReminderText} onChange={(e) => setNewReminderText(e.target.value)} autoFocus rows="3" style={{ resize: 'none' }} />
              </div>
              <button type="submit" className="btn-primary" disabled={!newReminderText.trim()}>Guardar Nota</button>
            </form>
          </div>
        </div>
      )}

      {isOfferModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setIsOfferModalOpen(false); }}>
          <div className="bottom-sheet">
            <h2>Escanear Ofertas</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Agrupa estas ofertas bajo un título (ej. "Catálogo Vea")</p>
            <div className="input-group">
              <input type="text" className="input-field" placeholder="Título del grupo de ofertas" value={newOfferTitle} onChange={(e) => setNewOfferTitle(e.target.value)} autoFocus style={{ marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Desde (Opcional)</label>
                  <input type="date" className="input-field" value={newOfferStartDate} onChange={(e) => setNewOfferStartDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Hasta (Opcional)</label>
                  <input type="date" className="input-field" value={newOfferEndDate} onChange={(e) => setNewOfferEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={() => {
              if (fileInputRef.current) fileInputRef.current.click();
            }}>
              <Camera size={20} style={{ marginRight: '8px' }} />
              Seleccionar Imagen (Cámara o Galería)
            </button>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setIsStaffModalOpen(false); }}>
          <div className="bottom-sheet">
            <h2>Nuevo Miembro</h2>
            <form onSubmit={addStaff}>
              <div className="input-group">
                <input type="text" className="input-field" placeholder="Nombre del empleado" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={!newStaffName.trim()}>Añadir Personal</button>
            </form>
          </div>
        </div>
      )}

      {isCompletionModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') { setIsCompletionModalOpen(false); setTaskToComplete(null); }
        }}>
          <div className="bottom-sheet">
            <h2>Finalizar Tarea</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{taskToComplete?.title}</p>
            <form onSubmit={submitCompletion}>
              <div className="completion-toggle">
                <button type="button" className={`toggle-btn ${completionStatus === 'success' ? 'active-success' : ''}`} onClick={() => setCompletionStatus('success')}>
                  <CheckCircle2 size={20} /> Realizada
                </button>
                <button type="button" className={`toggle-btn ${completionStatus === 'failed' ? 'active-danger' : ''}`} onClick={() => setCompletionStatus('failed')}>
                  <AlertCircle size={20} /> No Realizada
                </button>
              </div>
              <div className="input-group">
                <textarea className="input-field" placeholder={completionStatus === 'failed' ? 'Motivo (Obligatorio)...' : 'Comentarios (Opcional)...'} value={completionComment} onChange={(e) => setCompletionComment(e.target.value)} rows="3" style={{ resize: 'none', marginTop: '16px' }}></textarea>
              </div>
              <button type="submit" className="btn-primary" disabled={completionStatus === 'failed' && !completionComment.trim()}>Guardar Registro</button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODALS --- */}
      {editingTask && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setEditingTask(null); }}>
          <div className="bottom-sheet">
            <h2>Editar Tarea</h2>
            <form onSubmit={submitEditTask}>
              <div className="input-group">
                <input type="text" className="input-field" placeholder="¿Qué necesitas hacer?" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} autoFocus style={{ marginBottom: '16px' }} />
                <input type="date" className="input-field" value={editingTask.dueDate} onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})} style={{ marginBottom: '16px' }} />
                <select className="input-field select-field" value={editingTask.assignee} onChange={(e) => setEditingTask({...editingTask, assignee: e.target.value})}>
                  <option value="" disabled>Selecciona un funcionario</option>
                  {staff.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={!editingTask.title.trim() || !editingTask.assignee || !editingTask.dueDate}>Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {editingFolder && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setEditingFolder(null); }}>
          <div className="bottom-sheet">
            <h2>Editar Carpeta</h2>
            <form onSubmit={submitEditFolder}>
              <div className="input-group">
                <input type="text" className="input-field" placeholder="Título de la carpeta" value={editingFolder.groupTitle} onChange={(e) => setEditingFolder({...editingFolder, groupTitle: e.target.value})} autoFocus style={{ marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Desde (Opcional)</label>
                    <input type="date" className="input-field" value={editingFolder.startDate} onChange={(e) => setEditingFolder({...editingFolder, startDate: e.target.value})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Hasta (Opcional)</label>
                    <input type="date" className="input-field" value={editingFolder.endDate} onChange={(e) => setEditingFolder({...editingFolder, endDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={!editingFolder.groupTitle.trim()}>Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {editingOfferItem && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setEditingOfferItem(null); }}>
          <div className="bottom-sheet">
            <h2>Editar Producto</h2>
            <form onSubmit={submitEditOfferItem}>
              <div className="input-group">
                <input type="text" className="input-field" placeholder="Nombre del producto" value={editingOfferItem.productName} onChange={(e) => setEditingOfferItem({...editingOfferItem, productName: e.target.value})} autoFocus style={{ marginBottom: '16px' }} />
                <input type="text" className="input-field" placeholder="Detalles (ej. 2x1)" value={editingOfferItem.details} onChange={(e) => setEditingOfferItem({...editingOfferItem, details: e.target.value})} style={{ marginBottom: '16px' }} />
                <input type="text" className="input-field" placeholder="Precio (ej. $1000)" value={editingOfferItem.price} onChange={(e) => setEditingOfferItem({...editingOfferItem, price: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary" disabled={!editingOfferItem.productName.trim() || !editingOfferItem.price.trim()}>Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
