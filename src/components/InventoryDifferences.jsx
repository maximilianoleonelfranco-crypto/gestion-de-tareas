import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Scale, 
  Calendar, 
  Search, 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  Minus, 
  TrendingDown, 
  Package, 
  History, 
  Share2, 
  Printer, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  ArrowDownCircle,
  FileSpreadsheet
} from 'lucide-react';

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper para obtener el mes actual en formato YYYY-MM
function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper para formatear periodo YYYY-MM a "Noviembre 2026"
function formatPeriodLabel(periodStr) {
  if (!periodStr) return '';
  const [yearStr, monthStr] = periodStr.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

export default function InventoryDifferences() {
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod);
  const [items, setItems] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pendientes'); // 'pendientes' | 'completadas' | 'todas'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Formulario de nuevo item
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('u');
  const [newItemNote, setNewItemNote] = useState('');
  const [newProviderCode, setNewProviderCode] = useState('');
  const [newProviderName, setNewProviderName] = useState('');
  const [codeSuggestions, setCodeSuggestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para Merma Parcial (descontar de a poco)
  const [partialDiscountModal, setPartialDiscountModal] = useState(null); // item object
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [isDiscounting, setIsDiscounting] = useState(false);

  // Modal para Editar Item Completo
  const [editingItem, setEditingItem] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editPendingQty, setEditPendingQty] = useState('');
  const [editInitialQty, setEditInitialQty] = useState('');
  const [editUnit, setEditUnit] = useState('u');
  const [editNote, setEditNote] = useState('');

  // Modal de Historial de Mermas de un item
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Cargar catálogo de productos para sugerencias y autocompletado
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        setProductsCatalog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error al cargar catálogo de productos:', err);
      }
    };
    fetchCatalog();
  }, []);

  // Cargar los items de diferencias de inventario del período seleccionado
  const fetchInventoryItems = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'inventory_differences'),
        where('period', '==', selectedPeriod)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha de creación desc
      loaded.sort((a, b) => {
        const tA = a.created_at?.seconds || 0;
        const tB = b.created_at?.seconds || 0;
        return tB - tA;
      });
      setItems(loaded);
    } catch (err) {
      console.error('Error al cargar diferencias de inventario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
  }, [selectedPeriod]);

  // Manejar cambio en el código para sugerencias y autocompletar
  const handleCodeChange = (val) => {
    setNewItemCode(val);
    if (!val.trim()) {
      setCodeSuggestions([]);
      return;
    }
    const clean = val.trim().toLowerCase();
    const matches = productsCatalog.filter(p => 
      (p.codigo_articulo || p.id || '').toLowerCase().includes(clean) ||
      (p.descripcion || '').toLowerCase().includes(clean)
    ).slice(0, 5);

    setCodeSuggestions(matches);

    // Si coincide exactamente con uno, rellenar descripción
    const exact = productsCatalog.find(p => (p.codigo_articulo || p.id || '').toLowerCase() === clean);
    if (exact) {
      if (exact.descripcion) setNewItemDesc(exact.descripcion);
      if (exact.codigo_proveedor) setNewProviderCode(exact.codigo_proveedor);
      if (exact.nombre_proveedor) setNewProviderName(exact.nombre_proveedor);
    }
  };

  const handleSelectSuggestion = (prod) => {
    setNewItemCode(prod.codigo_articulo || prod.id);
    setNewItemDesc(prod.descripcion || '');
    setNewProviderCode(prod.codigo_proveedor || '');
    setNewProviderName(prod.nombre_proveedor || '');
    setCodeSuggestions([]);
  };

  // Crear nuevo registro de diferencia de inventario
  const handleAddItem = async (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(newItemQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Ingresa una cantidad válida mayor a 0 (puedes usar decimales, ej: 1.5).');
      return;
    }
    if (!newItemDesc.trim() && !newItemCode.trim()) {
      alert('Ingresa al menos el código o la descripción del producto.');
      return;
    }

    setIsSubmitting(true);
    try {
      const docData = {
        period: selectedPeriod,
        period_label: formatPeriodLabel(selectedPeriod),
        codigo_articulo: newItemCode.trim(),
        descripcion: newItemDesc.trim() || 'Sin descripción',
        codigo_proveedor: newProviderCode.trim(),
        nombre_proveedor: newProviderName.trim(),
        cantidad_inicial: qtyNum,
        cantidad_actual: qtyNum, // Lo que resta mermar
        cantidad_mermada: 0,
        unidad: newItemUnit,
        nota: newItemNote.trim(),
        estado: 'pendiente', // 'pendiente' | 'en_proceso' | 'completada'
        historial: [
          {
            fecha: new Date().toISOString(),
            tipo: 'registro_inicial',
            cantidad_inicial: qtyNum,
            nota: 'Inventario inicial registrado'
          }
        ],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      await addDoc(collection(db, 'inventory_differences'), docData);

      // Limpiar formulario
      setNewItemCode('');
      setNewItemDesc('');
      setNewItemQty('');
      setNewItemNote('');
      setNewProviderCode('');
      setNewProviderName('');
      setCodeSuggestions([]);

      fetchInventoryItems();
    } catch (err) {
      console.error('Error al guardar diferencia de inventario:', err);
      alert('Error al guardar. Revisa tu conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registrar merma parcial (descontar de a poco)
  const handleApplyPartialDiscount = async (e) => {
    e.preventDefault();
    if (!partialDiscountModal) return;
    const discountNum = parseFloat(discountAmount);
    if (isNaN(discountNum) || discountNum <= 0) {
      alert('Ingresa una cantidad a descontar válida mayor a 0.');
      return;
    }

    const currentQty = partialDiscountModal.cantidad_actual || 0;
    if (discountNum > currentQty) {
      const confirmExceed = window.confirm(
        `La cantidad a mermar (${discountNum}) es mayor a la pendiente (${currentQty}). ¿Deseas marcarla como 0 y completada?`
      );
      if (!confirmExceed) return;
    }

    setIsDiscounting(true);
    try {
      const newPending = Math.max(0, parseFloat((currentQty - discountNum).toFixed(3)));
      const alreadyDiscounted = (partialDiscountModal.cantidad_mermada || 0) + Math.min(discountNum, currentQty);
      const isCompleted = newPending <= 0;

      const newHistoryEntry = {
        fecha: new Date().toISOString(),
        tipo: 'merma_parcial',
        cantidad_descontada: discountNum,
        cantidad_restante: newPending,
        nota: discountNote.trim() || 'Merma parcial aplicada'
      };

      const updatedHistory = [...(partialDiscountModal.historial || []), newHistoryEntry];

      const itemRef = doc(db, 'inventory_differences', partialDiscountModal.id);
      await updateDoc(itemRef, {
        cantidad_actual: newPending,
        cantidad_mermada: parseFloat(alreadyDiscounted.toFixed(3)),
        estado: isCompleted ? 'completada' : 'en_proceso',
        historial: updatedHistory,
        updated_at: Timestamp.now()
      });

      setPartialDiscountModal(null);
      setDiscountAmount('');
      setDiscountNote('');
      fetchInventoryItems();
    } catch (err) {
      console.error('Error al aplicar merma parcial:', err);
      alert('Error al descontar la cantidad.');
    } finally {
      setIsDiscounting(false);
    }
  };

  // Mermar todo de una vez (completar)
  const handleMarkAsCompleted = async (item) => {
    if (!window.confirm(`¿Confirmas que ya mermaste la totalidad restante (${item.cantidad_actual} ${item.unidad}) de "${item.descripcion}"?`)) {
      return;
    }

    try {
      const currentQty = item.cantidad_actual || 0;
      const alreadyDiscounted = (item.cantidad_mermada || 0) + currentQty;

      const newHistoryEntry = {
        fecha: new Date().toISOString(),
        tipo: 'merma_total',
        cantidad_descontada: currentQty,
        cantidad_restante: 0,
        nota: 'Mermado completo'
      };

      const itemRef = doc(db, 'inventory_differences', item.id);
      await updateDoc(itemRef, {
        cantidad_actual: 0,
        cantidad_mermada: parseFloat(alreadyDiscounted.toFixed(3)),
        estado: 'completada',
        historial: [...(item.historial || []), newHistoryEntry],
        updated_at: Timestamp.now()
      });

      fetchInventoryItems();
    } catch (err) {
      console.error('Error al completar merma:', err);
    }
  };

  // Edición directa rápida de la cantidad pendiente en línea
  const handleQuickInlineUpdate = async (item, newQuantityValue) => {
    const valNum = parseFloat(newQuantityValue);
    if (isNaN(valNum) || valNum < 0) return;

    try {
      const prevPending = item.cantidad_actual || 0;
      if (valNum === prevPending) return;

      const diff = prevPending - valNum;
      const newMermada = Math.max(0, (item.cantidad_mermada || 0) + diff);
      const isCompleted = valNum <= 0;

      const newHistoryEntry = {
        fecha: new Date().toISOString(),
        tipo: 'ajuste_manual',
        cantidad_anterior: prevPending,
        cantidad_restante: valNum,
        nota: 'Ajuste manual de cantidad pendiente'
      };

      const itemRef = doc(db, 'inventory_differences', item.id);
      await updateDoc(itemRef, {
        cantidad_actual: valNum,
        cantidad_mermada: parseFloat(newMermada.toFixed(3)),
        estado: isCompleted ? 'completada' : (newMermada > 0 ? 'en_proceso' : 'pendiente'),
        historial: [...(item.historial || []), newHistoryEntry],
        updated_at: Timestamp.now()
      });

      fetchInventoryItems();
    } catch (err) {
      console.error('Error al actualizar cantidad inline:', err);
    }
  };

  // Abrir modal de edición completa
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditDesc(item.descripcion || '');
    setEditPendingQty(String(item.cantidad_actual ?? ''));
    setEditInitialQty(String(item.cantidad_inicial ?? ''));
    setEditUnit(item.unidad || 'u');
    setEditNote(item.nota || '');
  };

  // Guardar edición completa
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const pendingNum = parseFloat(editPendingQty);
    const initialNum = parseFloat(editInitialQty);

    if (isNaN(pendingNum) || pendingNum < 0 || isNaN(initialNum) || initialNum <= 0) {
      alert('Ingresa cantidades válidas.');
      return;
    }

    try {
      const itemRef = doc(db, 'inventory_differences', editingItem.id);
      const isCompleted = pendingNum <= 0;
      const mermadaCalculada = Math.max(0, initialNum - pendingNum);

      await updateDoc(itemRef, {
        descripcion: editDesc.trim(),
        cantidad_actual: pendingNum,
        cantidad_inicial: initialNum,
        cantidad_mermada: parseFloat(mermadaCalculada.toFixed(3)),
        unidad: editUnit,
        nota: editNote.trim(),
        estado: isCompleted ? 'completada' : (mermadaCalculada > 0 ? 'en_proceso' : 'pendiente'),
        updated_at: Timestamp.now()
      });

      setEditingItem(null);
      fetchInventoryItems();
    } catch (err) {
      console.error('Error al guardar edición:', err);
      alert('Error al guardar los cambios.');
    }
  };

  // Eliminar item de la lista
  const handleDeleteItem = async (id, desc) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${desc}" del listado de inventario de este mes?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'inventory_differences', id));
      fetchInventoryItems();
    } catch (err) {
      console.error('Error al eliminar item:', err);
    }
  };

  // Navegar entre meses
  const changeMonth = (offset) => {
    const [yearStr, monthStr] = selectedPeriod.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + offset;

    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }

    setSelectedPeriod(`${year}-${String(month).padStart(2, '0')}`);
  };

  // Copiar reporte para WhatsApp
  const handleCopyWhatsAppReport = () => {
    const periodName = formatPeriodLabel(selectedPeriod);
    let text = `📦 *DIFERENCIAS DE INVENTARIO - ${periodName.toUpperCase()}*\n`;
    text += `Control y seguimiento de mermas mensuales\n`;
    text += `─────────────────────────\n\n`;

    const pendingItems = items.filter(i => (i.cantidad_actual || 0) > 0);
    const completedItems = items.filter(i => (i.cantidad_actual || 0) <= 0);

    if (pendingItems.length > 0) {
      text += `⏳ *PENDIENTES DE MERMAR (${pendingItems.length}):*\n`;
      pendingItems.forEach(i => {
        text += `• *${i.codigo_articulo || 'S/C'}* - ${i.descripcion}\n`;
        text += `  Falta mermar: *${i.cantidad_actual} ${i.unidad}* (Inicial: ${i.cantidad_inicial} ${i.unidad})\n`;
      });
      text += `\n`;
    }

    if (completedItems.length > 0) {
      text += `✅ *MERMAS YA COMPLETADAS (${completedItems.length}):*\n`;
      completedItems.forEach(i => {
        text += `• *${i.codigo_articulo || 'S/C'}* - ${i.descripcion} (${i.cantidad_inicial} ${i.unidad})\n`;
      });
      text += `\n`;
    }

    if (items.length === 0) {
      text += `No hay diferencias registradas para este mes.\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  // Filtrado de items
  const filteredItems = items.filter(item => {
    const isPending = (item.cantidad_actual || 0) > 0;
    if (filterStatus === 'pendientes' && !isPending) return false;
    if (filterStatus === 'completadas' && isPending) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = (item.codigo_articulo || '').toLowerCase().includes(q);
      const descMatch = (item.descripcion || '').toLowerCase().includes(q);
      const provMatch = (item.nombre_proveedor || '').toLowerCase().includes(q);
      return codeMatch || descMatch || provMatch;
    }
    return true;
  });

  // Métricas del mes
  const totalItemsCount = items.length;
  const pendingCount = items.filter(i => (i.cantidad_actual || 0) > 0).length;
  const completedCount = items.filter(i => (i.cantidad_actual || 0) <= 0).length;
  const totalPendingUnits = items.reduce((acc, i) => acc + (parseFloat(i.cantidad_actual) || 0), 0);
  const totalShrinkedUnits = items.reduce((acc, i) => acc + (parseFloat(i.cantidad_mermada) || 0), 0);
  const totalInitialUnits = items.reduce((acc, i) => acc + (parseFloat(i.cantidad_inicial) || 0), 0);
  const progressPercent = totalInitialUnits > 0 ? Math.round((totalShrinkedUnits / totalInitialUnits) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header y Selector de Mes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 md:p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-amber-200 shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>Diferencias de Inventarios</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                Mermas
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Control de artículos a mermar de a poco en el mes
            </p>
          </div>
        </div>

        {/* Controles de Navegación de Mes */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
          <button
            type="button"
            onClick={() => setSelectedPeriod(getCurrentPeriod())}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedPeriod === getCurrentPeriod()
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Mes Actual
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="px-3 min-w-[150px] text-center">
              <span className="block text-xs font-bold text-slate-800">
                {formatPeriodLabel(selectedPeriod)}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                {selectedPeriod}
              </span>
            </div>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyWhatsAppReport}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              copiedNotification
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
          >
            {copiedNotification ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copiedNotification ? '¡Copiado!' : 'Reporte WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/60 transition-all cursor-pointer print:hidden"
            title="Imprimir listado del mes"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Bento Grid de Métricas del Mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Artículos</span>
            <Package size={16} className="text-amber-500" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-800">{totalItemsCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {pendingCount} pendientes • {completedCount} listos
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Por Mermar</span>
            <TrendingDown size={16} className="text-amber-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-600">
            {totalPendingUnits.toFixed(2).replace(/\.00$/, '')}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Cantidad pendiente de baja</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Ya Mermado</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-600">
            {totalShrinkedUnits.toFixed(2).replace(/\.00$/, '')}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Descontado este mes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Progreso</span>
            <Sparkles size={16} className="text-indigo-500" />
          </div>
          <div className="text-xl md:text-2xl font-black text-indigo-700">{progressPercent}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid Principal: Formulario a la izquierda (o arriba en mobile) y Listado a la derecha */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Panel Formulario Agregar Producto al Mes */}
        <div className="xl:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Agregar Producto al Inventario</h3>
              <p className="text-[11px] text-slate-400">
                Corresponde a: <strong>{formatPeriodLabel(selectedPeriod)}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="space-y-3.5">
            {/* Código de Artículo con autocompletado */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código de Artículo
              </label>
              <input
                type="text"
                value={newItemCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Ej: 243313 o busca por nombre..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none font-mono text-xs font-semibold text-slate-800"
              />

              {/* Menú de sugerencias si tipea código o nombre */}
              {codeSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                  {codeSuggestions.map((sug) => (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left p-2 hover:bg-amber-50 rounded-lg text-xs transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-amber-700 block truncate">
                          {sug.codigo_articulo || sug.id}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate block">
                          {sug.descripcion}
                        </span>
                      </div>
                      {sug.nombre_proveedor && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                          {sug.nombre_proveedor}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Descripción del Producto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción del Producto
              </label>
              <input
                type="text"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                placeholder="Ej: Jamón cocido extra Schneck"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none text-xs text-slate-800 font-medium"
                required
              />
            </div>

            {/* Cantidad inicial a mermar y Unidad */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad a Mermar
                </label>
                <input
                  type="number"
                  step="any"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder="Ej: 5 o 2.500"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none font-mono text-sm font-bold text-amber-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unidad
                </label>
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="u">u (unid)</option>
                  <option value="kg">kg</option>
                  <option value="g">gramos</option>
                  <option value="lt">litros</option>
                  <option value="pq">paquetes</option>
                  <option value="cj">cajas</option>
                </select>
              </div>
            </div>

            {/* Observaciones / Motivo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo / Observación <span className="font-normal text-slate-400">(Opcional)</span>
              </label>
              <input
                type="text"
                value={newItemNote}
                onChange={(e) => setNewItemNote(e.target.value)}
                placeholder="Ej: Vencimiento 15/11, rotura de frío, faltante..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none text-xs text-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-200 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Agregar al Inventario del Mes</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Panel Listado de Productos y Mermas */}
        <div className="xl:col-span-8 space-y-4">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterStatus('pendientes')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'pendientes'
                    ? 'bg-white text-amber-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completadas')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'completadas'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Completadas ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('todas')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'todas'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas ({totalItemsCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código o producto..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Listado de Productos */}
          {isLoading ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-500">Cargando inventario de {formatPeriodLabel(selectedPeriod)}...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/60 shadow-2xs text-slate-400">
              <Scale size={44} className="mx-auto mb-3 text-slate-300 opacity-60" />
              <p className="text-base font-bold text-slate-700">
                {searchQuery ? 'No se encontraron artículos con esa búsqueda' : `No hay diferencias registradas en ${formatPeriodLabel(selectedPeriod)}`}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filterStatus === 'completadas'
                  ? 'Aún no has completado mermas este mes.'
                  : 'Agrega los productos que presentan diferencias para ir mermando de a poco durante el mes.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isPending = (item.cantidad_actual || 0) > 0;
                const percentDone = item.cantidad_inicial > 0
                  ? Math.min(100, Math.round(((item.cantidad_mermada || 0) / item.cantidad_inicial) * 100))
                  : (isPending ? 0 : 100);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all p-4 md:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      !isPending 
                        ? 'border-emerald-200/80 bg-emerald-50/20' 
                        : 'border-slate-200/80 hover:border-amber-300'
                    }`}
                  >
                    {/* Información del Producto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.codigo_articulo && (
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {item.codigo_articulo}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          !isPending
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : (item.cantidad_mermada > 0
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200')
                        }`}>
                          {!isPending ? '✓ Mermado Total' : (item.cantidad_mermada > 0 ? 'En Proceso' : 'Pendiente')}
                        </span>
                        {item.nombre_proveedor && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {item.nombre_proveedor}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm md:text-base text-slate-800 leading-snug break-words">
                        {item.descripcion}
                      </h4>

                      {item.nota && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          Nota: {item.nota}
                        </p>
                      )}

                      {/* Barra de progreso de la merma */}
                      <div className="mt-3 flex items-center gap-2 max-w-xs">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              !isPending ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percentDone}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          {percentDone}%
                        </span>
                      </div>
                    </div>

                    {/* Controles de Cantidad y Mermas (El corazón de la funcionalidad) */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      
                      {/* Caja de Cantidad Pendiente con Edición Rápida */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Falta Mermar
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            step="any"
                            defaultValue={item.cantidad_actual}
                            key={`${item.id}-${item.cantidad_actual}`}
                            onBlur={(e) => handleQuickInlineUpdate(item, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-16 text-center font-mono font-black text-sm bg-white border border-slate-200 rounded-lg p-1 outline-none text-amber-700 focus:ring-2 focus:ring-amber-500"
                            title="Haz clic para modificar la cantidad directamente"
                          />
                          <span className="text-xs font-bold text-slate-600">{item.unidad}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          Inicial: {item.cantidad_inicial} {item.unidad}
                        </span>
                      </div>

                      {/* Botón Acción Merma Parcial (-X) */}
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPartialDiscountModal(item);
                            setDiscountAmount('');
                            setDiscountNote('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-amber-200 cursor-pointer"
                          title="Descontar una cantidad que mermas hoy"
                        >
                          <Minus size={14} />
                          <span>Mermar Parcial</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-700 bg-emerald-100/60 px-3 py-2 rounded-xl text-xs font-bold">
                          <Check size={14} />
                          <span>Completado</span>
                        </div>
                      )}

                      {/* Botón Completar Todo */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsCompleted(item)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200 cursor-pointer"
                          title="Marcar como mermado total (0 restante)"
                        >
                          <Check size={16} />
                        </button>
                      )}

                      {/* Botón Historial de mermas de este producto */}
                      <button
                        type="button"
                        onClick={() => setHistoryModalItem(item)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                        title="Ver bitácora de mermas"
                      >
                        <History size={16} />
                      </button>

                      {/* Botón Editar completo */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Modificar datos del artículo"
                      >
                        <Edit3 size={16} />
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.descripcion)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar del inventario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Mermar Parcial (Descontar de a poco) */}
      {partialDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Registrar Merma Parcial</h3>
                  <p className="text-[11px] text-slate-400">Descuenta la cantidad que mermas ahora</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setPartialDiscountModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1">
              <p className="font-bold text-slate-800">{partialDiscountModal.descripcion}</p>
              <div className="flex items-center justify-between text-slate-500 pt-1">
                <span>Resta mermar actualmente:</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {partialDiscountModal.cantidad_actual} {partialDiscountModal.unidad}
                </span>
              </div>
            </div>

            <form onSubmit={handleApplyPartialDiscount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad que vas a mermar hoy:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder={`Máx ${partialDiscountModal.cantidad_actual}`}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none font-mono text-base font-bold text-amber-700"
                    autoFocus
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {partialDiscountModal.unidad}
                  </span>
                </div>
                {discountAmount && !isNaN(parseFloat(discountAmount)) && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Quedarán pendientes:{' '}
                    <strong className="text-slate-800 font-mono">
                      {Math.max(0, parseFloat((partialDiscountModal.cantidad_actual - parseFloat(discountAmount)).toFixed(3)))}{' '}
                      {partialDiscountModal.unidad}
                    </strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nota / Detalle <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={discountNote}
                  onChange={(e) => setDiscountNote(e.target.value)}
                  placeholder="Ej: Merma en fiambrería lote vencido..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPartialDiscountModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDiscounting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm shadow-amber-200 cursor-pointer disabled:opacity-50"
                >
                  <Check size={15} />
                  <span>{isDiscounting ? 'Descontando...' : 'Descontar Merma'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Artículo Completo */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-base">Modificar Datos de Inventario</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cant. Pendiente</label>
                  <input
                    type="number"
                    step="any"
                    value={editPendingQty}
                    onChange={(e) => setEditPendingQty(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cant. Inicial</label>
                  <input
                    type="number"
                    step="any"
                    value={editInitialQty}
                    onChange={(e) => setEditInitialQty(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidad</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="u">u (unid)</option>
                    <option value="kg">kg</option>
                    <option value="g">gramos</option>
                    <option value="lt">litros</option>
                    <option value="pq">paquetes</option>
                    <option value="cj">cajas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nota</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Observación..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bitácora / Historial de Mermas de un artículo */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">Historial de Mermas</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setHistoryModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs shrink-0">
              <p className="font-bold text-slate-800">{historyModalItem.descripcion}</p>
              <div className="flex items-center gap-4 text-slate-500 mt-1">
                <span>Inicial: <strong>{historyModalItem.cantidad_inicial} {historyModalItem.unidad}</strong></span>
                <span>Restante: <strong className="text-amber-700">{historyModalItem.cantidad_actual} {historyModalItem.unidad}</strong></span>
                <span>Mermado: <strong className="text-emerald-700">{historyModalItem.cantidad_mermada || 0} {historyModalItem.unidad}</strong></span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(!historyModalItem.historial || historyModalItem.historial.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay registros en el historial.</p>
              ) : (
                historyModalItem.historial.map((h, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-700 block">
                        {h.tipo === 'registro_inicial' && 'Registro inicial de inventario'}
                        {h.tipo === 'merma_parcial' && `Merma parcial de ${h.cantidad_descontada} ${historyModalItem.unidad}`}
                        {h.tipo === 'merma_total' && `Merma total de ${h.cantidad_descontada} ${historyModalItem.unidad}`}
                        {h.tipo === 'ajuste_manual' && `Ajuste manual`}
                      </span>
                      {h.nota && <span className="text-[11px] text-slate-500 mt-0.5 block">{h.nota}</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {h.fecha ? new Date(h.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {h.cantidad_restante !== undefined && (
                        <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                          Saldo: {h.cantidad_restante} {historyModalItem.unidad}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
