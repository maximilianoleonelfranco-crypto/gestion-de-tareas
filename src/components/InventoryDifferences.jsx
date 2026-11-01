import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
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
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Layers,
  FolderPlus,
  Clock,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';

// Las 4 secciones principales solicitadas por la gerencia
export const DEFAULT_SECTIONS = [
  { id: 'lacteos', name: 'Autoservice lácteos', icon: '🥛', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'congelados', name: 'Autoservice congelados', icon: '❄️', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { id: 'fiambres', name: 'Fiambres', icon: '🥓', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'quesos', name: 'Quesos', icon: '🧀', color: 'bg-amber-50 text-amber-800 border-amber-200' }
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatPeriodLabel(periodStr) {
  if (!periodStr) return '';
  const [yearStr, monthStr] = periodStr.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

function getTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function InventoryDifferences() {
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod);
  const [inventories, setInventories] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [isLoadingInventories, setIsLoadingInventories] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('todas');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Modal para Crear Nuevo Inventario
  const [isCreateInvModalOpen, setIsCreateInvModalOpen] = useState(false);
  const [newInvSection, setNewInvSection] = useState('Autoservice lácteos');
  const [newInvCustomSection, setNewInvCustomSection] = useState('');
  const [newInvDate, setNewInvDate] = useState(getTodayISO);
  const [newInvName, setNewInvName] = useState('');
  const [newInvNotes, setNewInvNotes] = useState('');
  const [isCreatingInv, setIsCreatingInv] = useState(false);

  // Modal para Editar Inventario
  const [editingInventory, setEditingInventory] = useState(null);
  const [editInvName, setEditInvName] = useState('');
  const [editInvDate, setEditInvDate] = useState('');
  const [editInvNotes, setEditInvNotes] = useState('');

  // Formulario para Agregar Producto a la Merma (dentro de un inventario)
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('u');
  const [newItemNote, setNewItemNote] = useState('');
  const [newProviderCode, setNewProviderCode] = useState('');
  const [newProviderName, setNewProviderName] = useState('');
  const [codeSuggestions, setCodeSuggestions] = useState([]);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Filtros de artículos dentro del inventario seleccionado
  const [itemsFilterStatus, setItemsFilterStatus] = useState('pendientes'); // 'pendientes' | 'completadas' | 'todas'
  const [itemsSearchQuery, setItemsSearchQuery] = useState('');

  // Modal para Merma Parcial (descontar de a poco)
  const [partialDiscountModal, setPartialDiscountModal] = useState(null);
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

  // Cargar catálogo de productos para autocompletado
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

  // Cargar la lista de inventarios del período seleccionado
  const fetchInventories = async () => {
    setIsLoadingInventories(true);
    try {
      // Traer los inventarios del mes
      const invQ = query(
        collection(db, 'inventory_sheets'),
        where('period', '==', selectedPeriod)
      );
      const invSnap = await getDocs(invQ);
      const invList = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Traer también todos los items del mes para calcular métricas en tiempo real por inventario
      const itemsQ = query(
        collection(db, 'inventory_differences'),
        where('period', '==', selectedPeriod)
      );
      const itemsSnap = await getDocs(itemsQ);
      const allMonthItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Vincular métricas a cada inventario
      const enriched = invList.map(inv => {
        const matchingItems = allMonthItems.filter(i => i.inventory_id === inv.id);
        const totalItems = matchingItems.length;
        const pendingCount = matchingItems.filter(i => (i.cantidad_actual || 0) > 0).length;
        const completedCount = matchingItems.filter(i => (i.cantidad_actual || 0) <= 0).length;
        const totalPendingQty = matchingItems.reduce((acc, i) => acc + (parseFloat(i.cantidad_actual) || 0), 0);
        const totalShrinkedQty = matchingItems.reduce((acc, i) => acc + (parseFloat(i.cantidad_mermada) || 0), 0);
        const totalInitialQty = matchingItems.reduce((acc, i) => acc + (parseFloat(i.cantidad_inicial) || 0), 0);
        const progress = totalInitialQty > 0 ? Math.round((totalShrinkedQty / totalInitialQty) * 100) : (totalItems > 0 && pendingCount === 0 ? 100 : 0);

        return {
          ...inv,
          totalItems,
          pendingCount,
          completedCount,
          totalPendingQty,
          totalShrinkedQty,
          progress
        };
      });

      // Ordenar por fecha desc
      enriched.sort((a, b) => (b.fecha_inventario || '').localeCompare(a.fecha_inventario || ''));
      setInventories(enriched);

      // Si teníamos un inventario seleccionado, actualizarlo
      if (selectedInventory) {
        const updatedSelected = enriched.find(i => i.id === selectedInventory.id);
        if (updatedSelected) {
          setSelectedInventory(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Error al cargar inventarios:', err);
    } finally {
      setIsLoadingInventories(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, [selectedPeriod]);

  // Cargar items del inventario seleccionado
  const fetchItemsOfInventory = async (invId) => {
    if (!invId) return;
    setIsLoadingItems(true);
    try {
      const q = query(
        collection(db, 'inventory_differences'),
        where('inventory_id', '==', invId)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => {
        const tA = a.created_at?.seconds || 0;
        const tB = b.created_at?.seconds || 0;
        return tB - tA;
      });
      setInventoryItems(loaded);
    } catch (err) {
      console.error('Error al cargar items del inventario:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    if (selectedInventory) {
      fetchItemsOfInventory(selectedInventory.id);
    } else {
      setInventoryItems([]);
    }
  }, [selectedInventory?.id]);

  // Autogenerar nombre de inventario al cambiar sección o mes
  useEffect(() => {
    const secName = newInvSection === 'Otra' ? (newInvCustomSection || 'Sección') : newInvSection;
    setNewInvName(`Inventario ${secName} - ${formatPeriodLabel(selectedPeriod)}`);
  }, [newInvSection, newInvCustomSection, selectedPeriod]);

  // Crear nuevo inventario
  const handleCreateInventory = async (e) => {
    e.preventDefault();
    const finalSection = newInvSection === 'Otra' ? (newInvCustomSection.trim() || 'Otra') : newInvSection;
    const finalName = newInvName.trim() || `Inventario ${finalSection} - ${formatPeriodLabel(selectedPeriod)}`;

    setIsCreatingInv(true);
    try {
      const docRef = await addDoc(collection(db, 'inventory_sheets'), {
        period: selectedPeriod,
        period_label: formatPeriodLabel(selectedPeriod),
        seccion: finalSection,
        nombre: finalName,
        fecha_inventario: newInvDate,
        observaciones: newInvNotes.trim(),
        estado: 'abierto',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });

      setIsCreateInvModalOpen(false);
      setNewInvNotes('');
      await fetchInventories();

      // Abrir automáticamente el inventario recién creado
      setSelectedInventory({
        id: docRef.id,
        period: selectedPeriod,
        period_label: formatPeriodLabel(selectedPeriod),
        seccion: finalSection,
        nombre: finalName,
        fecha_inventario: newInvDate,
        observaciones: newInvNotes.trim(),
        totalItems: 0,
        pendingCount: 0,
        completedCount: 0,
        totalPendingQty: 0,
        totalShrinkedQty: 0,
        progress: 0
      });
    } catch (err) {
      console.error('Error al crear inventario:', err);
      alert('Error al crear inventario.');
    } finally {
      setIsCreatingInv(false);
    }
  };

  // Crear inventario rápido para una sección específica
  const handleQuickCreateSectionInventory = async (secName) => {
    try {
      const finalName = `Inventario ${secName} - ${formatPeriodLabel(selectedPeriod)}`;
      const docRef = await addDoc(collection(db, 'inventory_sheets'), {
        period: selectedPeriod,
        period_label: formatPeriodLabel(selectedPeriod),
        seccion: secName,
        nombre: finalName,
        fecha_inventario: getTodayISO(),
        observaciones: '',
        estado: 'abierto',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });

      await fetchInventories();
      setSelectedInventory({
        id: docRef.id,
        period: selectedPeriod,
        period_label: formatPeriodLabel(selectedPeriod),
        seccion: secName,
        nombre: finalName,
        fecha_inventario: getTodayISO(),
        observaciones: '',
        totalItems: 0,
        pendingCount: 0,
        completedCount: 0,
        totalPendingQty: 0,
        totalShrinkedQty: 0,
        progress: 0
      });
    } catch (err) {
      console.error('Error al crear inventario rápido:', err);
      alert('Error al crear inventario.');
    }
  };

  // Guardar edición de datos del inventario
  const handleSaveEditInventory = async (e) => {
    e.preventDefault();
    if (!editingInventory) return;
    try {
      const invRef = doc(db, 'inventory_sheets', editingInventory.id);
      await updateDoc(invRef, {
        nombre: editInvName.trim() || editingInventory.nombre,
        fecha_inventario: editInvDate,
        observaciones: editInvNotes.trim(),
        updated_at: Timestamp.now()
      });

      setEditingInventory(null);
      await fetchInventories();
    } catch (err) {
      console.error('Error al editar inventario:', err);
      alert('Error al guardar cambios.');
    }
  };

  // Eliminar un inventario completo y sus items
  const handleDeleteInventory = async (inv) => {
    if (!window.confirm(`¿Estás seguro de eliminar el "${inv.nombre}" y todos sus artículos registrados?`)) {
      return;
    }
    try {
      // 1. Eliminar documento del inventario
      await deleteDoc(doc(db, 'inventory_sheets', inv.id));

      // 2. Eliminar los items de este inventario
      const itemsQ = query(
        collection(db, 'inventory_differences'),
        where('inventory_id', '==', inv.id)
      );
      const itemsSnap = await getDocs(itemsQ);
      for (const d of itemsSnap.docs) {
        await deleteDoc(doc(db, 'inventory_differences', d.id));
      }

      if (selectedInventory && selectedInventory.id === inv.id) {
        setSelectedInventory(null);
      }
      fetchInventories();
    } catch (err) {
      console.error('Error al eliminar inventario:', err);
      alert('Error al eliminar inventario.');
    }
  };

  // Manejar búsqueda de código de producto con sugerencias
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

  // Agregar producto a la lista de mermas del inventario seleccionado
  const handleAddItemToInventory = async (e) => {
    e.preventDefault();
    if (!selectedInventory) return;

    const qtyNum = parseFloat(newItemQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Ingresa una cantidad válida mayor a 0 (puedes usar decimales, ej: 1.5).');
      return;
    }
    if (!newItemDesc.trim() && !newItemCode.trim()) {
      alert('Ingresa al menos el código o la descripción del producto.');
      return;
    }

    setIsSubmittingItem(true);
    try {
      const docData = {
        inventory_id: selectedInventory.id,
        inventory_name: selectedInventory.nombre,
        seccion: selectedInventory.seccion,
        period: selectedPeriod,
        period_label: formatPeriodLabel(selectedPeriod),
        codigo_articulo: newItemCode.trim(),
        descripcion: newItemDesc.trim() || 'Sin descripción',
        codigo_proveedor: newProviderCode.trim(),
        nombre_proveedor: newProviderName.trim(),
        cantidad_inicial: qtyNum,
        cantidad_actual: qtyNum, // Cantidad pendiente de mermar
        cantidad_mermada: 0,
        unidad: newItemUnit,
        nota: newItemNote.trim(),
        estado: 'pendiente',
        historial: [
          {
            fecha: new Date().toISOString(),
            tipo: 'registro_inicial',
            cantidad_inicial: qtyNum,
            nota: `Registrado en ${selectedInventory.nombre}`
          }
        ],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      await addDoc(collection(db, 'inventory_differences'), docData);

      setNewItemCode('');
      setNewItemDesc('');
      setNewItemQty('');
      setNewItemNote('');
      setNewProviderCode('');
      setNewProviderName('');
      setCodeSuggestions([]);

      fetchItemsOfInventory(selectedInventory.id);
      fetchInventories();
    } catch (err) {
      console.error('Error al agregar producto al inventario:', err);
      alert('Error al guardar el producto.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Merma Parcial (descontar de a poco)
  const handleApplyPartialDiscount = async (e) => {
    e.preventDefault();
    if (!partialDiscountModal) return;
    const discountNum = parseFloat(discountAmount);
    if (isNaN(discountNum) || discountNum <= 0) {
      alert('Ingresa una cantidad válida mayor a 0.');
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

      const itemRef = doc(db, 'inventory_differences', partialDiscountModal.id);
      await updateDoc(itemRef, {
        cantidad_actual: newPending,
        cantidad_mermada: parseFloat(alreadyDiscounted.toFixed(3)),
        estado: isCompleted ? 'completada' : 'en_proceso',
        historial: [...(partialDiscountModal.historial || []), newHistoryEntry],
        updated_at: Timestamp.now()
      });

      setPartialDiscountModal(null);
      setDiscountAmount('');
      setDiscountNote('');
      if (selectedInventory) {
        fetchItemsOfInventory(selectedInventory.id);
      }
      fetchInventories();
    } catch (err) {
      console.error('Error al aplicar merma parcial:', err);
      alert('Error al descontar la cantidad.');
    } finally {
      setIsDiscounting(false);
    }
  };

  // Mermar todo (completar a saldo 0)
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

      if (selectedInventory) {
        fetchItemsOfInventory(selectedInventory.id);
      }
      fetchInventories();
    } catch (err) {
      console.error('Error al completar merma:', err);
    }
  };

  // Edición directa rápida inline de la cantidad
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
        nota: 'Ajuste manual de saldo pendiente'
      };

      const itemRef = doc(db, 'inventory_differences', item.id);
      await updateDoc(itemRef, {
        cantidad_actual: valNum,
        cantidad_mermada: parseFloat(newMermada.toFixed(3)),
        estado: isCompleted ? 'completada' : (newMermada > 0 ? 'en_proceso' : 'pendiente'),
        historial: [...(item.historial || []), newHistoryEntry],
        updated_at: Timestamp.now()
      });

      if (selectedInventory) {
        fetchItemsOfInventory(selectedInventory.id);
      }
      fetchInventories();
    } catch (err) {
      console.error('Error al actualizar cantidad inline:', err);
    }
  };

  // Editar datos completos de un producto
  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setEditDesc(item.descripcion || '');
    setEditPendingQty(String(item.cantidad_actual ?? ''));
    setEditInitialQty(String(item.cantidad_inicial ?? ''));
    setEditUnit(item.unidad || 'u');
    setEditNote(item.nota || '');
  };

  const handleSaveEditItem = async (e) => {
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
      if (selectedInventory) {
        fetchItemsOfInventory(selectedInventory.id);
      }
      fetchInventories();
    } catch (err) {
      console.error('Error al guardar edición de artículo:', err);
      alert('Error al guardar los cambios.');
    }
  };

  // Eliminar un producto del inventario
  const handleDeleteItem = async (id, desc) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${desc}" de este inventario?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'inventory_differences', id));
      if (selectedInventory) {
        fetchItemsOfInventory(selectedInventory.id);
      }
      fetchInventories();
    } catch (err) {
      console.error('Error al eliminar item:', err);
    }
  };

  // Navegación de mes
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
    setSelectedInventory(null);
  };

  // Copiar reporte para WhatsApp
  const handleCopyWhatsAppReport = () => {
    const periodName = formatPeriodLabel(selectedPeriod);
    let text = ``;

    if (selectedInventory) {
      text += `📦 *DIFERENCIAS DE INVENTARIO - ${selectedInventory.seccion.toUpperCase()}*\n`;
      text += `Inventario: *${selectedInventory.nombre}*\n`;
      text += `Mes: ${periodName} • Fecha: ${selectedInventory.fecha_inventario || 'N/A'}\n`;
      text += `─────────────────────────\n\n`;

      const pendingItems = inventoryItems.filter(i => (i.cantidad_actual || 0) > 0);
      const completedItems = inventoryItems.filter(i => (i.cantidad_actual || 0) <= 0);

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
    } else {
      text += `📦 *RESUMEN DE INVENTARIOS Y MERMAS - ${periodName.toUpperCase()}*\n`;
      text += `─────────────────────────\n\n`;
      inventories.forEach(inv => {
        text += `🏷️ *${inv.nombre}* (${inv.seccion}):\n`;
        text += `  • Artículos: ${inv.totalItems || 0} (${inv.pendingCount || 0} pendientes)\n`;
        text += `  • Saldo por mermar: *${inv.totalPendingQty || 0}*\n`;
        text += `  • Ya mermado: ${inv.totalShrinkedQty || 0} (${inv.progress || 0}% avance)\n\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  // Filtrado de inventarios por sección
  const displayedInventories = inventories.filter(inv => {
    if (sectionFilter === 'todas') return true;
    return inv.seccion === sectionFilter;
  });

  // Filtrado de items del inventario seleccionado
  const displayedItems = inventoryItems.filter(item => {
    const isPending = (item.cantidad_actual || 0) > 0;
    if (itemsFilterStatus === 'pendientes' && !isPending) return false;
    if (itemsFilterStatus === 'completadas' && isPending) return false;

    if (itemsSearchQuery.trim()) {
      const q = itemsSearchQuery.toLowerCase();
      const codeMatch = (item.codigo_articulo || '').toLowerCase().includes(q);
      const descMatch = (item.descripcion || '').toLowerCase().includes(q);
      const provMatch = (item.nombre_proveedor || '').toLowerCase().includes(q);
      return codeMatch || descMatch || provMatch;
    }
    return true;
  });

  // Helper para color y emoji de sección
  const getSectionBadge = (seccionName) => {
    const found = DEFAULT_SECTIONS.find(s => s.name.toLowerCase() === (seccionName || '').toLowerCase());
    if (found) {
      return {
        icon: found.icon,
        classes: found.color
      };
    }
    return {
      icon: '📁',
      classes: 'bg-indigo-50 text-indigo-800 border-indigo-200'
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Encabezado Superior y Navegación de Mes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 md:p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-amber-200 shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>Diferencias de Inventarios</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                4 Secciones
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Control y mermas por sección: Autoservice lácteos, congelados, fiambres y quesos
            </p>
          </div>
        </div>

        {/* Controles de Período / Mes y Botón Nuevo Inventario */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
          <button
            type="button"
            onClick={() => {
              setSelectedPeriod(getCurrentPeriod());
              setSelectedInventory(null);
            }}
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

          {/* Botón para Crear Nuevo Inventario */}
          <button
            type="button"
            onClick={() => setIsCreateInvModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer"
          >
            <FolderPlus size={15} />
            <span>+ Nuevo Inventario</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: LISTADO DE INVENTARIOS DE LAS SECCIONES (SI NO HAY UNO ABIERTO) */}
      {/* ========================================================================= */}
      {!selectedInventory ? (
        <div className="space-y-6">
          
          {/* Filtro por Sección */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSectionFilter('todas')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  sectionFilter === 'todas'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas las Secciones ({inventories.length})
              </button>

              {DEFAULT_SECTIONS.map((sec) => {
                const count = inventories.filter(i => i.seccion === sec.name).length;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSectionFilter(sec.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      sectionFilter === sec.name
                        ? 'bg-white text-slate-800 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{sec.icon}</span>
                    <span>{sec.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 text-slate-600">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">
              Mes: {formatPeriodLabel(selectedPeriod)}
            </span>
          </div>

          {/* Tarjetas Bento Grid de los Inventarios Creados */}
          {isLoadingInventories ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-500">Cargando inventarios de {formatPeriodLabel(selectedPeriod)}...</p>
            </div>
          ) : displayedInventories.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/60 shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <FolderPlus size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  No hay inventarios creados en {formatPeriodLabel(selectedPeriod)}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Crea los inventarios para tus secciones para comenzar a registrar las diferencias y mermar de a poco.
                </p>
              </div>

              {/* Botones de creación rápida para cada sección */}
              <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {DEFAULT_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleQuickCreateSectionInventory(sec.name)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50 hover:bg-amber-50/50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    <span>{sec.icon}</span>
                    <span>Crear Inventario de {sec.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {displayedInventories.map((inv) => {
                const secBadge = getSectionBadge(inv.seccion);
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInventory(inv)}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200/70 p-5 md:p-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${secBadge.classes}`}>
                            <span>{secBadge.icon}</span>
                            <span>{inv.seccion}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInventory(inv);
                              setEditInvName(inv.nombre);
                              setEditInvDate(inv.fecha_inventario || '');
                              setEditInvNotes(inv.observaciones || '');
                            }}
                            className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar datos del inventario"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInventory(inv);
                            }}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar este inventario"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Nombre y fecha del inventario */}
                      <h3 className="font-bold text-base md:text-lg text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                        {inv.nombre}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
                        <Calendar size={13} />
                        <span>Fecha: {inv.fecha_inventario || 'Sin fecha'}</span>
                        <span>•</span>
                        <span>{formatPeriodLabel(inv.period)}</span>
                      </div>

                      {inv.observaciones && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-1 italic">
                          "{inv.observaciones}"
                        </p>
                      )}
                    </div>

                    {/* Métricas y Estado del inventario */}
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Artículos</span>
                          <span className="block text-sm font-bold text-slate-700">{inv.totalItems || 0}</span>
                        </div>
                        <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                          <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">Por Mermar</span>
                          <span className="block text-sm font-bold text-amber-700">
                            {(inv.totalPendingQty || 0).toFixed(2).replace(/\.00$/, '')}
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                          <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Mermado</span>
                          <span className="block text-sm font-bold text-emerald-700">
                            {(inv.totalShrinkedQty || 0).toFixed(2).replace(/\.00$/, '')}
                          </span>
                        </div>
                      </div>

                      {/* Progreso visual y botón entrar */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                            <span>Avance de mermas</span>
                            <span>{inv.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, inv.progress || 0)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform shrink-0 pl-3">
                          <span>Abrir</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA 2: DENTRO DE UN INVENTARIO SELECCIONADO (GESTIÓN DE PRODUCTOS/MERMAS) */
        /* ========================================================================= */
        <div className="space-y-6">
          
          {/* Botón Volver al Listado de Inventarios */}
          <button 
            type="button"
            onClick={() => setSelectedInventory(null)} 
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 w-fit cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Volver a Inventarios del Mes</span>
          </button>

          {/* Banner Principal del Inventario Seleccionado */}
          <div className="bg-gradient-to-br from-slate-800 to-indigo-900 rounded-2xl shadow-md p-6 md:p-8 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white/20 px-3 py-1 rounded-xl text-xs font-bold backdrop-blur-sm flex items-center gap-1.5">
                    <span>{getSectionBadge(selectedInventory.seccion).icon}</span>
                    <span>{selectedInventory.seccion}</span>
                  </span>
                  <span className="text-white/60 text-xs">
                    • Período: {formatPeriodLabel(selectedInventory.period)}
                  </span>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {selectedInventory.nombre}
                </h2>

                <div className="flex items-center gap-3 text-white/80 text-xs">
                  <Calendar size={14} />
                  <span>Fecha de Inventario: <strong>{selectedInventory.fecha_inventario || 'Sin definir'}</strong></span>
                </div>
              </div>

              {/* Métricas rápidas en el banner */}
              <div className="grid grid-cols-3 gap-3 bg-black/20 p-3 rounded-xl backdrop-blur-sm shrink-0 text-center">
                <div className="px-2">
                  <span className="block text-[10px] text-white/70 uppercase font-bold">Artículos</span>
                  <span className="text-lg font-black">{inventoryItems.length}</span>
                </div>
                <div className="px-2 border-x border-white/10">
                  <span className="block text-[10px] text-amber-300 uppercase font-bold">Por Mermar</span>
                  <span className="text-lg font-black text-amber-300">
                    {inventoryItems.reduce((acc, i) => acc + (parseFloat(i.cantidad_actual) || 0), 0).toFixed(2).replace(/\.00$/, '')}
                  </span>
                </div>
                <div className="px-2">
                  <span className="block text-[10px] text-emerald-300 uppercase font-bold">Mermado</span>
                  <span className="text-lg font-black text-emerald-300">
                    {inventoryItems.reduce((acc, i) => acc + (parseFloat(i.cantidad_mermada) || 0), 0).toFixed(2).replace(/\.00$/, '')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Contenido: Formulario Agregar Producto + Lista de Mermas */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Panel Formulario: Agregar Producto a este Inventario */}
            <div className="xl:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Añadir Producto a Mermar</h3>
                  <p className="text-[11px] text-slate-400">
                    Sección: <strong>{selectedInventory.seccion}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddItemToInventory} className="space-y-3.5">
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

                {/* Cantidad inicial a mermar (admite decimales) y Unidad */}
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

                {/* Observación / Motivo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo / Observación <span className="font-normal text-slate-400">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={newItemNote}
                    onChange={(e) => setNewItemNote(e.target.value)}
                    placeholder="Ej: Vencimiento 15/11, rotura..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none text-xs text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-200 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingItem ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Agregar al Inventario</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Panel Listado de Productos de este Inventario */}
            <div className="xl:col-span-8 space-y-4">
              
              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setItemsFilterStatus('pendientes')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      itemsFilterStatus === 'pendientes'
                        ? 'bg-white text-amber-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pendientes ({inventoryItems.filter(i => (i.cantidad_actual || 0) > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsFilterStatus('completadas')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      itemsFilterStatus === 'completadas'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Completadas ({inventoryItems.filter(i => (i.cantidad_actual || 0) <= 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsFilterStatus('todas')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      itemsFilterStatus === 'todas'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Todas ({inventoryItems.length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={itemsSearchQuery}
                    onChange={(e) => setItemsSearchQuery(e.target.value)}
                    placeholder="Buscar código o descripción..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  />
                  {itemsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setItemsSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Items del Inventario */}
              {isLoadingItems ? (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/60 shadow-2xs">
                  <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-500">Cargando productos de {selectedInventory.nombre}...</p>
                </div>
              ) : displayedItems.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/60 shadow-2xs text-slate-400">
                  <Scale size={44} className="mx-auto mb-3 text-slate-300 opacity-60" />
                  <p className="text-base font-bold text-slate-700">
                    {itemsSearchQuery ? 'No se encontraron artículos con esa búsqueda' : 'No hay productos registrados en este inventario'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Utiliza el formulario lateral para añadir los artículos que presentan diferencias en esta sección.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedItems.map((item) => {
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

                        {/* Controles de Cantidad y Mermas */}
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

                          {/* Botón Acción Merma Parcial */}
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

                          {/* Historial de mermas */}
                          <button
                            type="button"
                            onClick={() => setHistoryModalItem(item)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="Ver bitácora de mermas de este producto"
                          >
                            <History size={16} />
                          </button>

                          {/* Editar completo */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditItem(item)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Modificar datos del artículo"
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* Eliminar */}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES DEL SISTEMA                                                        */}
      {/* ========================================================================= */}

      {/* MODAL: Crear Nuevo Inventario */}
      {isCreateInvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Crear Nuevo Inventario</h3>
                  <p className="text-[11px] text-slate-400">
                    Mes: <strong>{formatPeriodLabel(selectedPeriod)}</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCreateInvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInventory} className="space-y-4">
              {/* Selector de Sección */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Selecciona la Sección
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setNewInvSection(sec.name)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        newInvSection === sec.name
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{sec.icon}</span>
                      <span className="truncate">{sec.name}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setNewInvSection('Otra')}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium border text-left cursor-pointer transition-all ${
                      newInvSection === 'Otra'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-dashed border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    + Otra sección personalizada...
                  </button>
                  {newInvSection === 'Otra' && (
                    <input
                      type="text"
                      value={newInvCustomSection}
                      onChange={(e) => setNewInvCustomSection(e.target.value)}
                      placeholder="Escribe el nombre de la sección..."
                      className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold text-slate-800"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Fecha y Nombre del Inventario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Realización
                  </label>
                  <input
                    type="date"
                    value={newInvDate}
                    onChange={(e) => setNewInvDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Inventario
                  </label>
                  <input
                    type="text"
                    value={newInvName}
                    onChange={(e) => setNewInvName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones / Notas <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <textarea
                  value={newInvNotes}
                  onChange={(e) => setNewInvNotes(e.target.value)}
                  placeholder="Ej: Conteo realizado por turno mañana, revisar fiambrería..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateInvModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInv}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-200 cursor-pointer disabled:opacity-50"
                >
                  <Check size={15} />
                  <span>{isCreatingInv ? 'Creando...' : 'Crear y Abrir'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Inventario */}
      {editingInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-base">Modificar Inventario</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingInventory(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditInventory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editInvName}
                  onChange={(e) => setEditInvName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editInvDate}
                  onChange={(e) => setEditInvDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  value={editInvNotes}
                  onChange={(e) => setEditInvNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInventory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            <form onSubmit={handleSaveEditItem} className="space-y-3.5">
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
