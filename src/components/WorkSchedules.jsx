import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Clock, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  Share2, 
  Printer, 
  Sparkles, 
  RotateCcw, 
  UserCheck, 
  Save, 
  Info,
  CalendarDays,
  FileText
} from 'lucide-react';

// Empleados fijos definidos por la gerencia
export const EMPLOYEES = [
  { id: '32399', name: 'Virginia', isManager: false },
  { id: '33605', name: 'Helen', isManager: false },
  { id: '37791', name: 'Karina', isManager: false },
  { id: '48915', name: 'Roy', isManager: false },
  { id: '50044', name: 'Yanelis', isManager: false },
  { id: '50059', name: 'Bladimil', isManager: false },
  { id: '43245', name: 'Maximiliano (yo)', isManager: true }
];

// Días de la semana fijos de Lunes a Domingo
export const DAYS = [
  { key: 'lunes', label: 'Lunes', short: 'Lun' },
  { key: 'martes', label: 'Martes', short: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'jueves', label: 'Jueves', short: 'Jue' },
  { key: 'viernes', label: 'Viernes', short: 'Vie' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb' },
  { key: 'domingo', label: 'Domingo', short: 'Dom' }
];

// Presets de turnos habituales para carga ultra rápida
const SHIFT_PRESETS = [
  'Libre',
  '06:00 - 14:00',
  '07:00 - 15:00',
  '08:00 - 16:00',
  '10:00 - 18:00',
  '12:00 - 20:00',
  '14:00 - 22:00',
  '15:00 - 23:00'
];

// Helper: Obtener el lunes de la semana dada una fecha
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 es Domingo, 1 es Lunes...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper: Formato YYYY-MM-DD
function toISOString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Formato legible DD/MM
function formatShortDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export default function WorkSchedules() {
  // Fecha base para la semana (siempre apunta al Lunes)
  const [selectedMonday, setSelectedMonday] = useState(() => {
    // Por defecto iniciamos apuntando a la semana siguiente como pidió el usuario,
    // o calculamos el próximo lunes
    const now = new Date();
    const currentMonday = getMonday(now);
    // Próximo lunes (+7 días)
    const nextMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextMonday;
  });

  const [shifts, setShifts] = useState({});
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [activePresetMenu, setActivePresetMenu] = useState(null); // { empId, dayKey }
  const [mobileViewMode, setMobileViewMode] = useState('employee'); // 'employee' | 'day'
  const [mobileSelectedDay, setMobileSelectedDay] = useState('lunes');
  const presetMenuRef = useRef(null);

  // Calcula las fechas de la semana (Lunes a Domingo)
  const weekDates = DAYS.map((day, index) => {
    const date = new Date(selectedMonday.getTime() + index * 24 * 60 * 60 * 1000);
    return {
      ...day,
      date,
      isoDate: toISOString(date),
      displayDate: formatShortDate(date)
    };
  });

  const weekStartDate = toISOString(selectedMonday);
  const weekEndDate = weekDates[6].isoDate;
  const docId = `week_${weekStartDate}`;

  // Verificar si la semana seleccionada es la semana actual o siguiente
  const currentMondayISO = toISOString(getMonday(new Date()));
  const isCurrentWeek = weekStartDate === currentMondayISO;
  const nextMondayISO = toISOString(new Date(getMonday(new Date()).getTime() + 7 * 24 * 60 * 60 * 1000));
  const isNextWeek = weekStartDate === nextMondayISO;

  // Cargar datos de la semana desde Firestore
  useEffect(() => {
    const fetchWeekSchedule = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'work_schedules', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setShifts(data.shifts || {});
          setNotes(data.notes || '');
        } else {
          setShifts({});
          setNotes('');
        }
      } catch (err) {
        console.error('Error al cargar horarios de la semana:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeekSchedule();
  }, [docId]);

  // Cerrar menú de presets al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target)) {
        setActivePresetMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Guardar en Firestore
  const handleSave = async (customShifts = shifts, customNotes = notes) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'work_schedules', docId);
      await setDoc(docRef, {
        weekStartDate,
        weekEndDate,
        shifts: customShifts,
        notes: customNotes,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Error al guardar horarios:', err);
      alert('Error al guardar los horarios. Revisa tu conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  // Actualizar turno específico
  const updateShift = (empId, dayKey, value) => {
    const updated = {
      ...shifts,
      [empId]: {
        ...(shifts[empId] || {}),
        [dayKey]: value
      }
    };
    setShifts(updated);
  };

  // Seleccionar preset rápido
  const selectPreset = (empId, dayKey, preset) => {
    updateShift(empId, dayKey, preset);
    setActivePresetMenu(null);
  };

  // Navegación de semanas
  const goToPreviousWeek = () => {
    setSelectedMonday(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const goToNextWeek = () => {
    setSelectedMonday(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const goToCurrentWeek = () => {
    setSelectedMonday(getMonday(new Date()));
  };

  const goToTargetNextWeek = () => {
    const currentMon = getMonday(new Date());
    setSelectedMonday(new Date(currentMon.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  // Copiar horarios de la semana anterior
  const handleCopyPreviousWeek = async () => {
    const prevMonday = new Date(selectedMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevDocId = `week_${toISOString(prevMonday)}`;

    try {
      setIsLoading(true);
      const prevDocRef = doc(db, 'work_schedules', prevDocId);
      const prevSnap = await getDoc(prevDocRef);

      if (!prevSnap.exists() || !prevSnap.data().shifts || Object.keys(prevSnap.data().shifts).length === 0) {
        alert('No se encontraron horarios guardados en la semana anterior para copiar.');
        setIsLoading(false);
        return;
      }

      const prevData = prevSnap.data();
      const clonedShifts = { ...prevData.shifts };
      setShifts(clonedShifts);
      await handleSave(clonedShifts, notes);
      alert('¡Horarios de la semana anterior copiados y guardados con éxito!');
    } catch (err) {
      console.error('Error al copiar semana anterior:', err);
      alert('Error al copiar los datos de la semana anterior.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copiar al portapapeles con formato WhatsApp listo para enviar
  const handleCopyForWhatsApp = () => {
    let text = `📅 *HORARIOS DE TRABAJO* 📅\n`;
    text += `Semana: *${formatShortDate(selectedMonday)} al ${weekDates[6].displayDate}*\n`;
    text += `────────────────────\n\n`;

    EMPLOYEES.forEach(emp => {
      text += `👤 *${emp.name} (${emp.id})*:\n`;
      DAYS.forEach(day => {
        const val = shifts[emp.id]?.[day.key]?.trim() || 'Sin definir';
        const icon = val.toLowerCase() === 'libre' ? '🟢' : '🕒';
        text += `  ${icon} ${day.short}: ${val}\n`;
      });
      text += `\n`;
    });

    if (notes.trim()) {
      text += `📝 *Observaciones:*\n${notes.trim()}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  // Imprimir cartelera
  const handlePrint = () => {
    window.print();
  };

  // Helper para estilo de celda según el turno
  const getShiftBadgeStyle = (value) => {
    if (!value || !value.trim()) return 'text-slate-400 bg-slate-50 border-slate-200';
    const lower = value.toLowerCase();
    if (lower.includes('libre')) {
      return 'bg-emerald-50 text-emerald-700 font-bold border-emerald-200';
    }
    if (lower.includes('06:') || lower.includes('07:')) {
      return 'bg-sky-50 text-sky-700 font-medium border-sky-200';
    }
    if (lower.includes('14:') || lower.includes('15:') || lower.includes('cierre')) {
      return 'bg-purple-50 text-purple-700 font-medium border-purple-200';
    }
    return 'bg-indigo-50 text-indigo-700 font-medium border-indigo-200';
  };

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0">
      {/* Top Header & Week Navigator */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/60 shadow-2xs print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Horarios de Empleados
                </h2>
                {isNextWeek && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                    Semana Siguiente
                  </span>
                )}
                {isCurrentWeek && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    Semana Actual
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Carga y control semanal de turnos de Lunes a Domingo
              </p>
            </div>
          </div>
        </div>

        {/* Week Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Shortcuts */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={goToCurrentWeek}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isCurrentWeek 
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana Actual
            </button>
            <button
              onClick={goToTargetNextWeek}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isNextWeek 
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana Siguiente
            </button>
          </div>

          {/* Previous / Next Arrows */}
          <div className="flex items-center bg-white border border-slate-200/80 rounded-xl shadow-2xs p-1">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="px-3 text-xs md:text-sm font-bold text-slate-700 flex items-center gap-1.5 min-w-[170px] justify-center">
              <Calendar size={14} className="text-indigo-600" />
              <span>{formatShortDate(selectedMonday)} al {weekDates[6].displayDate}</span>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Semana siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              savedSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check size={16} />
                <span>¡Guardado!</span>
              </>
            ) : isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Bar (Clone, WhatsApp, Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyPreviousWeek}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold border border-slate-200/60 transition-all cursor-pointer"
            title="Copiar turnos de la semana previa si son similares"
          >
            <Copy size={14} />
            <span>Copiar de semana anterior</span>
          </button>

          <button
            onClick={handleCopyForWhatsApp}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              copiedWhatsApp 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80'
            }`}
          >
            {copiedWhatsApp ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copiedWhatsApp ? '¡Copiado para WhatsApp!' : 'Copiar para WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/60 transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir Cartelera</span>
          </button>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setMobileViewMode('employee')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mobileViewMode === 'employee' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
            }`}
          >
            Por Empleado
          </button>
          <button
            onClick={() => setMobileViewMode('day')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mobileViewMode === 'day' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
            }`}
          >
            Por Día
          </button>
        </div>
      </div>

      {/* Printable Header (Only shows in print mode) */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wider">
          Horarios de Trabajo del Personal
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Semana del Lunes {formatShortDate(selectedMonday)} al Domingo {weekDates[6].displayDate}
        </p>
      </div>

      {/* Main Schedule Content */}
      {isLoading ? (
        <div className="p-20 text-center bg-white rounded-2xl border border-slate-200/60">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Cargando horarios de la semana...</p>
        </div>
      ) : (
        <>
          {/* DESKTOP MATRIX / TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 shadow-2xs overflow-hidden print:border-black print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 print:bg-slate-100">
                    <th className="py-3.5 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider w-[220px] sticky left-0 bg-slate-50/90 backdrop-blur-xs z-10 border-r border-slate-200/60">
                      Empleado ({EMPLOYEES.length})
                    </th>
                    {weekDates.map((day) => (
                      <th 
                        key={day.key} 
                        className={`py-3.5 px-3 text-center border-r border-slate-200/60 last:border-r-0 min-w-[130px] ${
                          day.key === 'domingo' ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-800">{day.label}</span>
                        <span className="block text-[11px] font-medium text-slate-400 mt-0.5">{day.displayDate}</span>
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-[100px] print:hidden">
                      Resumen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {EMPLOYEES.map((emp) => {
                    const empShifts = shifts[emp.id] || {};
                    let activeCount = 0;
                    let freeCount = 0;

                    DAYS.forEach(d => {
                      const val = empShifts[d.key]?.trim() || '';
                      if (val.toLowerCase() === 'libre') freeCount++;
                      else if (val) activeCount++;
                    });

                    return (
                      <tr 
                        key={emp.id} 
                        className={`hover:bg-slate-50/60 transition-colors group ${
                          emp.isManager ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        {/* Employee Identity Cell */}
                        <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/60 transition-colors border-r border-slate-200/60 z-10">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              emp.isManager 
                                ? 'bg-indigo-600 text-white shadow-2xs' 
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800 truncate block">
                                  {emp.name}
                                </span>
                                {emp.isManager && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded print:hidden">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ID: {emp.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Shift Input for each Day */}
                        {weekDates.map((day) => {
                          const shiftVal = empShifts[day.key] || '';
                          const isPresetOpen = activePresetMenu?.empId === emp.id && activePresetMenu?.dayKey === day.key;

                          return (
                            <td 
                              key={day.key} 
                              className={`py-2 px-2 text-center border-r border-slate-200/60 last:border-r-0 relative ${
                                day.key === 'domingo' ? 'bg-rose-50/10' : ''
                              }`}
                            >
                              <div className="relative">
                                <input
                                  type="text"
                                  value={shiftVal}
                                  placeholder="—"
                                  onChange={(e) => updateShift(emp.id, day.key, e.target.value)}
                                  className={`w-full text-center text-xs py-2 px-2 rounded-xl border transition-all outline-none font-medium ${getShiftBadgeStyle(shiftVal)} hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 print:border-none print:bg-transparent print:font-semibold`}
                                />

                                {/* Quick preset trigger button (Desktop hover) */}
                                <button
                                  type="button"
                                  onClick={() => setActivePresetMenu(isPresetOpen ? null : { empId: emp.id, dayKey: day.key })}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer print:hidden"
                                  title="Turnos rápidos"
                                >
                                  <Sparkles size={12} />
                                </button>

                                {/* Dropdown menu of presets */}
                                {isPresetOpen && (
                                  <div 
                                    ref={presetMenuRef}
                                    className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-40 text-left animate-in fade-in zoom-in-95 duration-100"
                                  >
                                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                      Turnos sugeridos
                                    </div>
                                    <div className="space-y-0.5">
                                      {SHIFT_PRESETS.map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => selectPreset(emp.id, day.key, preset)}
                                          className={`w-full text-left px-2 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                                            preset === 'Libre' 
                                              ? 'hover:bg-emerald-50 text-emerald-700 font-bold' 
                                              : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => selectPreset(emp.id, day.key, '')}
                                        className="w-full text-left px-2 py-1.5 text-xs rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border-t border-slate-100 mt-1"
                                      >
                                        Limpiar celda
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Summary Cell */}
                        <td className="py-2 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md" title="Días activos">
                              {activeCount}d
                            </span>
                            {freeCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md" title="Días libres">
                                {freeCount}L
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW (CARDS) */}
          <div className="block md:hidden space-y-4 print:hidden">
            {mobileViewMode === 'employee' ? (
              // Vista mobile: Una tarjeta por empleado
              EMPLOYEES.map((emp) => {
                const empShifts = shifts[emp.id] || {};
                return (
                  <div key={emp.id} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          emp.isManager ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{emp.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {emp.id}</span>
                        </div>
                      </div>
                      {emp.isManager && (
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Gerencia
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {weekDates.map((day) => {
                        const shiftVal = empShifts[day.key] || '';
                        return (
                          <div key={day.key} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50/70 rounded-xl">
                            <div className="w-24 shrink-0">
                              <span className="font-bold text-xs text-slate-700 block">{day.label}</span>
                              <span className="text-[10px] text-slate-400">{day.displayDate}</span>
                            </div>
                            <input
                              type="text"
                              value={shiftVal}
                              placeholder="Sin asignar"
                              onChange={(e) => updateShift(emp.id, day.key, e.target.value)}
                              className={`flex-1 text-center text-xs py-1.5 px-2 rounded-lg border font-medium outline-none ${getShiftBadgeStyle(shiftVal)}`}
                            />
                            {/* Botón rápido Libre */}
                            <button
                              type="button"
                              onClick={() => updateShift(emp.id, day.key, shiftVal === 'Libre' ? '' : 'Libre')}
                              className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                shiftVal === 'Libre' 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              Libre
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              // Vista mobile: Pestañas por Día
              <div className="space-y-4">
                {/* Selector de días horizontal */}
                <div className="flex overflow-x-auto gap-1.5 pb-2">
                  {weekDates.map((day) => (
                    <button
                      key={day.key}
                      onClick={() => setMobileSelectedDay(day.key)}
                      className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                        mobileSelectedDay === day.key 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      <span>{day.short}</span>
                      <span className="text-[10px] opacity-80">{day.displayDate}</span>
                    </button>
                  ))}
                </div>

                {/* Lista de empleados para el día seleccionado */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-2xs divide-y divide-slate-100">
                  {EMPLOYEES.map((emp) => {
                    const shiftVal = shifts[emp.id]?.[mobileSelectedDay] || '';
                    return (
                      <div key={emp.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {emp.id}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={shiftVal}
                            placeholder="Turno..."
                            onChange={(e) => updateShift(emp.id, mobileSelectedDay, e.target.value)}
                            className={`w-32 text-center text-xs py-1.5 px-2 rounded-lg border font-medium outline-none ${getShiftBadgeStyle(shiftVal)}`}
                          />
                          <button
                            type="button"
                            onClick={() => updateShift(emp.id, mobileSelectedDay, shiftVal === 'Libre' ? '' : 'Libre')}
                            className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                              shiftVal === 'Libre' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Libre
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Observaciones y Notas de la semana */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs space-y-2 print:border-black print:shadow-none">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs md:text-sm">
              <FileText size={16} className="text-indigo-600" />
              <span>Observaciones / Novedades de la Semana</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Feriado el lunes, inventario general el miércoles a las 22:00 hs, cambio de turnos acordado..."
              rows={2}
              className="w-full text-xs md:text-sm p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none text-slate-700 print:border-none print:p-0"
            />
          </div>
        </>
      )}
    </div>
  );
}
