import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Save, Plus } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Schedule() {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [newDay, setNewDay] = useState('Lunes');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  const initSchedule = () => {
    const initial = {};
    DAYS.forEach(day => {
      initial[day] = [];
    });
    return initial;
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'settings', 'schedule');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSchedule({ ...initSchedule(), ...docSnap.data() });
        } else {
          setSchedule(initSchedule());
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;

    setSchedule(prev => ({
      ...prev,
      [newDay]: [...(prev[newDay] || []), { id: Date.now().toString(), name: newName.trim(), code: newCode.trim() }]
    }));

    setNewName('');
    setNewCode('');
  };

  const handleRemove = (day, id) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(item => item.id !== id)
    }));
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'schedule'), schedule);
      alert('Agenda guardada correctamente');
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert('Error al guardar la agenda');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="workspace-container" style={{ padding: '40px', textAlign: 'center' }}>
        <Loader2 size={32} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="workspace-container" style={{ background: 'transparent', boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Agenda de Proveedores (Pedidos Automáticos)</h2>
        <button className="btn-primary btn-sage" onClick={saveSchedule} disabled={saving}>
          {saving ? <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>

      {/* Formulario de Agregado Rápido */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Añadir nuevo pedido</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Día de la semana</label>
            <select 
              className="form-input" 
              value={newDay} 
              onChange={(e) => setNewDay(e.target.value)}
              style={{ padding: '10px 14px' }}
            >
              {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label className="form-label">Código del proveedor</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: 12018"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </div>
          <div style={{ flex: 3, minWidth: '250px' }}>
            <label className="form-label">Nombre del proveedor</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: Conaprole Sub Productos + Congelados"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!newName.trim() || !newCode.trim()} style={{ height: '42px' }}>
            <Plus size={16} /> Agregar
          </button>
        </form>
      </div>

      {/* Grid de Días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {DAYS.map(day => (
          <div key={day} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>
              {day}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedule[day] && schedule[day].length > 0 ? (
                schedule[day].map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>
                      {item.code} - {item.name}
                    </span>
                    <button 
                      onClick={() => handleRemove(day, item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '16px 0' }}>Sin pedidos este día</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
