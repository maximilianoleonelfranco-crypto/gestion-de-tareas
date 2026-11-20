import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Trash2, Search, ArrowLeft, Plus, Tags, Calendar, Box, Activity, Building2, 
  Edit3, Check, X, UploadCloud, Sparkles, FileText, FileSpreadsheet, 
  Image as ImageIcon, Loader2, AlertCircle, Key, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';
import { extractProductsFromFile, getGeminiApiKey } from '../utils/fileExtractor';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [items, setItems] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [offerFilter, setOfferFilter] = useState('activas'); // 'activas' | 'vencidas' | 'todas'
  
  // Suppliers cache map { [code]: name }
  const [suppliersMap, setSuppliersMap] = useState({});

  // States for new offer
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferStart, setNewOfferStart] = useState('');
  const [newOfferEnd, setNewOfferEnd] = useState('');

  // States for editing offer dates (dentro de selectedOffer)
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editOfferName, setEditOfferName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isSavingDates, setIsSavingDates] = useState(false);

  // States for editing offer from modal (desde la grilla)
  const [modalEditOffer, setModalEditOffer] = useState(null);
  const [modalOfferName, setModalOfferName] = useState('');
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');

  // States for new item manual
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newProviderCode, setNewProviderCode] = useState('');
  const [providerNamePreview, setProviderNamePreview] = useState('');

  // States for File Upload & Extraction Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetOffer, setImportTargetOffer] = useState(null); // null => crear nueva, o objeto oferta existente
  const [importOfferName, setImportOfferName] = useState('');
  const [importStartDate, setImportStartDate] = useState('');
  const [importEndDate, setImportEndDate] = useState('');
  const [importDefaultProvider, setImportDefaultProvider] = useState('');
  const [importExpandCompounds, setImportExpandCompounds] = useState(true);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [extractedItems, setExtractedItems] = useState([]);
  const [massProviderCode, setMassProviderCode] = useState('');
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // API Key config modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [apiKeySavedSuccess, setApiKeySavedSuccess] = useState(false);

  const fileInputRef = useRef(null);
  const directFileInputRef = useRef(null);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'offers'));
      setOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'suppliers'));
      const map = {};
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        map[docSnap.id] = data.nombre || '';
      });
      setSuppliersMap(map);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedOffer) {
      fetchItems(selectedOffer.id);
      setEditOfferName(selectedOffer.nombre_oferta || '');
      setEditStartDate(selectedOffer.vigencia_inicio || '');
      setEditEndDate(selectedOffer.vigencia_fin || '');
      setIsEditingDates(false);
    }
  }, [selectedOffer]);

  const fetchItems = async (offerId) => {
    try {
      const q = query(collection(db, 'offer_items'), where('offer_id', '==', offerId));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!newOfferName.trim()) return;
    try {
      await addDoc(collection(db, 'offers'), {
        nombre_oferta: newOfferName.trim(),
        vigencia_inicio: newOfferStart,
        vigencia_fin: newOfferEnd
      });
      setNewOfferName('');
      setNewOfferStart('');
      setNewOfferEnd('');
      fetchOffers();
    } catch (err) {
      console.error('Error creating offer:', err);
      alert('Error al crear la oferta.');
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta oferta y sus artículos?')) return;
    try {
      await deleteDoc(doc(db, 'offers', id));
      // Eliminar también sus items
      const q = query(collection(db, 'offer_items'), where('offer_id', '==', id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      fetchOffers();
    } catch (err) {
      console.error('Error deleting offer:', err);
      alert('Error al eliminar la oferta.');
    }
  };

  const handleSaveDates = async () => {
    if (!selectedOffer) return;
    setIsSavingDates(true);
    try {
      const updatedData = {
        nombre_oferta: editOfferName.trim() || selectedOffer.nombre_oferta,
        vigencia_inicio: editStartDate,
        vigencia_fin: editEndDate
      };
      await setDoc(doc(db, 'offers', selectedOffer.id), updatedData, { merge: true });

      setSelectedOffer(prev => ({ ...prev, ...updatedData }));
      setOffers(prev => prev.map(o => o.id === selectedOffer.id ? { ...o, ...updatedData } : o));
      setIsEditingDates(false);
    } catch (err) {
      console.error('Error al actualizar fechas de la oferta:', err);
      alert('Error al guardar las fechas.');
    } finally {
      setIsSavingDates(false);
    }
  };

  const openEditModal = (offer) => {
    setModalEditOffer(offer);
    setModalOfferName(offer.nombre_oferta || '');
    setModalStartDate(offer.vigencia_inicio || '');
    setModalEndDate(offer.vigencia_fin || '');
  };

  const handleSaveModalOffer = async (e) => {
    e.preventDefault();
    if (!modalEditOffer) return;
    setIsSavingDates(true);
    try {
      const updatedData = {
        nombre_oferta: modalOfferName.trim() || modalEditOffer.nombre_oferta,
        vigencia_inicio: modalStartDate,
        vigencia_fin: modalEndDate
      };
      await setDoc(doc(db, 'offers', modalEditOffer.id), updatedData, { merge: true });

      setOffers(prev => prev.map(o => o.id === modalEditOffer.id ? { ...o, ...updatedData } : o));
      if (selectedOffer && selectedOffer.id === modalEditOffer.id) {
        setSelectedOffer(prev => ({ ...prev, ...updatedData }));
      }
      setModalEditOffer(null);
    } catch (err) {
      console.error('Error al actualizar oferta:', err);
      alert('Error al guardar los cambios de la oferta.');
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleProviderCodeChange = async (code) => {
    setNewProviderCode(code);
    const clean = code.trim();
    if (!clean) {
      setProviderNamePreview('');
      return;
    }
    if (suppliersMap[clean]) {
      setProviderNamePreview(suppliersMap[clean]);
      return;
    }
    const docRef = doc(db, 'suppliers', clean);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const name = docSnap.data().nombre || '';
      setProviderNamePreview(name);
      setSuppliersMap(prev => ({ ...prev, [clean]: name }));
    } else {
      setProviderNamePreview('No encontrado');
    }
  };

  const handleItemCodeChange = async (code) => {
    setNewItemCode(code);
    if (!code.trim()) return;
    try {
      const prodSnap = await getDoc(doc(db, 'products', code.trim().replace(/\//g, '-')));
      if (prodSnap.exists()) {
        const prodData = prodSnap.data();
        if (prodData.descripcion && !newItemDesc) {
          setNewItemDesc(prodData.descripcion);
        }
        if (prodData.codigo_proveedor && !newProviderCode) {
          setNewProviderCode(prodData.codigo_proveedor);
          setProviderNamePreview(prodData.nombre_proveedor || '');
        }
      }
    } catch (err) {
      console.error('Error prefetching product:', err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemCode.trim() || !newItemDesc.trim()) return;

    const cleanCode = newItemCode.trim();
    const cleanDesc = newItemDesc.trim();
    const cleanProviderCode = newProviderCode.trim();
    const cleanProviderName = providerNamePreview !== 'No encontrado' ? providerNamePreview : (suppliersMap[cleanProviderCode] || '');

    try {
      // 1. Guardar en los artículos de la oferta
      await addDoc(collection(db, 'offer_items'), {
        offer_id: selectedOffer.id,
        codigo_articulo: cleanCode,
        descripcion: cleanDesc,
        codigo_proveedor: cleanProviderCode,
        nombre_proveedor: cleanProviderName
      });

      // 2. Guardar fijo en la base de datos de productos ('products')
      await setDoc(doc(db, 'products', cleanCode.replace(/\//g, '-')), {
        codigo_articulo: cleanCode,
        descripcion: cleanDesc,
        codigo_proveedor: cleanProviderCode,
        nombre_proveedor: cleanProviderName,
        updated_at: new Date()
      }, { merge: true });

      setNewItemCode('');
      setNewItemDesc('');
      setNewProviderCode('');
      setProviderNamePreview('');
      fetchItems(selectedOffer.id);
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Error al agregar el artículo.');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'offer_items', id));
      fetchItems(selectedOffer.id);
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleGlobalSearch = async () => {
    if (!globalSearch.trim()) {
      setSearchResults(null);
      return;
    }
    setIsLoading(true);
    const term = globalSearch.toLowerCase();
    try {
      const itemsSnap = await getDocs(collection(db, 'offer_items'));
      const allItems = itemsSnap.docs.map(d => d.data());
      
      const filtered = allItems.filter(item => 
        (item.descripcion || '').toLowerCase().includes(term) ||
        (item.codigo_articulo || '').toLowerCase().includes(term) ||
        (item.codigo_proveedor || '').toLowerCase().includes(term) ||
        (item.nombre_proveedor || '').toLowerCase().includes(term)
      );

      const grouped = {};
      filtered.forEach(item => {
        if (!grouped[item.offer_id]) {
          const offer = offers.find(o => o.id === item.offer_id);
          grouped[item.offer_id] = {
            offer: offer || { nombre_oferta: 'Oferta Desconocida' },
            items: []
          };
        }
        grouped[item.offer_id].items.push(item);
      });

      setSearchResults(grouped);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isOfferActive = (end) => {
    if (!end) return true;
    const today = new Date();
    today.setHours(0,0,0,0);
    const [year, month, day] = end.split('-');
    const endDate = new Date(year, month - 1, day);
    return endDate >= today;
  };

  const getOfferStatus = (end) => {
    if (!end) return { text: 'Sin fecha', classes: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (isOfferActive(end)) return { text: 'Activa', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { text: 'Vencida', classes: 'bg-red-100 text-red-700 border-red-200' };
  };

  // ==========================================
  // MANEJO DE ARCHIVOS CON IA (EXTRACCIÓN)
  // ==========================================

  const openImportModal = (targetOffer = null) => {
    setImportTargetOffer(targetOffer);
    if (targetOffer) {
      setImportOfferName(targetOffer.nombre_oferta || '');
      setImportStartDate(targetOffer.vigencia_inicio || '');
      setImportEndDate(targetOffer.vigencia_fin || '');
    } else {
      setImportOfferName(newOfferName.trim() || '');
      setImportStartDate(newOfferStart || '');
      setImportEndDate(newOfferEnd || '');
    }
    setImportDefaultProvider('');
    setSelectedFile(null);
    setExtractedItems([]);
    setExtractionError(null);
    setSaveSuccessMsg(null);
    setIsImportModalOpen(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    processFile(file);
  };

  const processFile = async (fileToProcess) => {
    const file = fileToProcess || selectedFile;
    if (!file) return;

    setIsExtracting(true);
    setExtractionError(null);
    setExtractedItems([]);

    try {
      const res = await extractProductsFromFile(file, {
        defaultProviderCode: importDefaultProvider.trim(),
        expandCompoundCodes: importExpandCompounds
      });

      if (!res.items || res.items.length === 0) {
        throw new Error('No se detectaron artículos en el archivo. Verifica que la imagen o texto sea legible.');
      }

      // Enriquecer items con nombres de proveedores si ya existen en suppliersMap
      const enriched = res.items.map(item => {
        const provCode = (item.codigo_proveedor || '').trim();
        const provName = suppliersMap[provCode] || '';
        return {
          ...item,
          nombre_proveedor: provName
        };
      });

      setExtractedItems(enriched);
    } catch (err) {
      console.error('Error al extraer archivo:', err);
      setExtractionError(err.message || 'Error al procesar el archivo con Inteligencia Artificial.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Actualizar un item individual de la tabla extraída
  const handleUpdateExtractedItem = (tempId, field, value) => {
    setExtractedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'codigo_proveedor') {
        const cleanP = value.trim();
        updated.nombre_proveedor = suppliersMap[cleanP] || '';
      }
      return updated;
    }));
  };

  // Eliminar un item de la lista extraída
  const handleDeleteExtractedItem = (tempId) => {
    setExtractedItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Agregar una fila vacía en la tabla de extracción
  const handleAddManualRow = () => {
    const newItem = {
      tempId: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      codigo_articulo: '',
      codigo_proveedor: importDefaultProvider.trim() || '',
      nombre_proveedor: suppliersMap[importDefaultProvider.trim()] || '',
      descripcion: ''
    };
    setExtractedItems(prev => [newItem, ...prev]);
  };

  // Aplicar proveedor masivo a los que no tienen
  const handleApplyMassProvider = () => {
    const clean = massProviderCode.trim();
    if (!clean) return;
    const provName = suppliersMap[clean] || '';
    setExtractedItems(prev => prev.map(item => {
      if (!item.codigo_proveedor || item.codigo_proveedor.trim() === '') {
        return {
          ...item,
          codigo_proveedor: clean,
          nombre_proveedor: provName
        };
      }
      return item;
    }));
    setMassProviderCode('');
  };

  // Confirmar y guardar la oferta y todos los productos
  const handleConfirmAndSaveImport = async () => {
    if (extractedItems.length === 0) {
      alert('No hay artículos para guardar.');
      return;
    }

    // Si es oferta nueva, requerir nombre
    if (!importTargetOffer && !importOfferName.trim()) {
      alert('Por favor escribe un nombre para la nueva oferta.');
      return;
    }

    setIsSavingImport(true);

    try {
      let targetOfferId = importTargetOffer ? importTargetOffer.id : null;
      let finalOfferName = importTargetOffer ? importTargetOffer.nombre_oferta : importOfferName.trim();

      // 1. Crear oferta si es nueva
      if (!targetOfferId) {
        const newOfferRef = await addDoc(collection(db, 'offers'), {
          nombre_oferta: finalOfferName,
          vigencia_inicio: importStartDate || '',
          vigencia_fin: importEndDate || ''
        });
        targetOfferId = newOfferRef.id;
      }

      // 2. Guardar cada artículo en 'offer_items' y en 'products'
      let countSuccess = 0;
      for (const item of extractedItems) {
        const cleanCode = String(item.codigo_articulo || '').trim();
        const cleanDesc = String(item.descripcion || '').trim();
        const cleanProvCode = String(item.codigo_proveedor || '').trim();
        const cleanProvName = item.nombre_proveedor || suppliersMap[cleanProvCode] || '';

        if (!cleanCode && !cleanDesc) continue;

        // A. Insertar en offer_items
        await addDoc(collection(db, 'offer_items'), {
          offer_id: targetOfferId,
          codigo_articulo: cleanCode,
          descripcion: cleanDesc,
          codigo_proveedor: cleanProvCode,
          nombre_proveedor: cleanProvName
        });

        // B. Guardar fijo en la colección 'products'
        if (cleanCode) {
          const docId = cleanCode.replace(/\//g, '-');
          await setDoc(doc(db, 'products', docId), {
            codigo_articulo: cleanCode,
            descripcion: cleanDesc,
            codigo_proveedor: cleanProvCode,
            nombre_proveedor: cleanProvName,
            updated_at: new Date()
          }, { merge: true });
        }

        countSuccess++;
      }

      await fetchOffers();
      if (selectedOffer && selectedOffer.id === targetOfferId) {
        await fetchItems(targetOfferId);
      }

      setSaveSuccessMsg(`¡Éxito! Se guardaron ${countSuccess} productos en "${finalOfferName}" y quedaron registrados fijos en Productos.`);
      
      // Auto-cerrar después de 2.5 seg
      setTimeout(() => {
        setIsImportModalOpen(false);
        setSaveSuccessMsg(null);
        setExtractedItems([]);
        setSelectedFile(null);
        if (!selectedOffer && targetOfferId) {
          // Seleccionar la oferta creada para verla de inmediato
          const createdOfferObj = {
            id: targetOfferId,
            nombre_oferta: finalOfferName,
            vigencia_inicio: importStartDate,
            vigencia_fin: importEndDate
          };
          setSelectedOffer(createdOfferObj);
        }
      }, 2500);

    } catch (err) {
      console.error('Error saving imported items:', err);
      alert('Ocurrió un error al guardar los artículos: ' + err.message);
    } finally {
      setIsSavingImport(false);
    }
  };

  // Guardar API Key personalizada en localStorage
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setApiKeySavedSuccess(true);
      setTimeout(() => {
        setApiKeySavedSuccess(false);
        setIsApiKeyModalOpen(false);
      }, 1500);
    }
  };

  // ==========================================
  // VISTA DE DETALLE: OFERTA SELECCIONADA
  // ==========================================
  if (selectedOffer) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
        
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button 
            onClick={() => setSelectedOffer(null)} 
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 w-fit cursor-pointer"
          >
            <ArrowLeft size={18} /> <span className="hidden sm:inline">Volver al panel de ofertas</span><span className="sm:hidden">Volver</span>
          </button>

          {/* Botón para subir archivo directo a esta oferta */}
          <button
            type="button"
            onClick={() => openImportModal(selectedOffer)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs md:text-sm shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Sparkles size={16} className="text-amber-300" />
            <span>Subir Archivo a esta Oferta (Foto / PDF / Excel / Texto)</span>
          </button>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-md p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shrink-0"><Tags size={24} /></span>
                {!isEditingDates ? (
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{selectedOffer.nombre_oferta}</h2>
                ) : (
                  <input
                    type="text"
                    value={editOfferName}
                    onChange={(e) => setEditOfferName(e.target.value)}
                    placeholder="Nombre de la oferta"
                    className="text-xl md:text-2xl font-bold bg-white/15 border border-white/30 rounded-xl px-3 py-1.5 text-white outline-none focus:bg-white/25 focus:border-white transition-all w-full max-w-md"
                  />
                )}
              </div>

              {/* Botones de acción para editar fechas */}
              {!isEditingDates ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditOfferName(selectedOffer.nombre_oferta || '');
                    setEditStartDate(selectedOffer.vigencia_inicio || '');
                    setEditEndDate(selectedOffer.vigencia_fin || '');
                    setIsEditingDates(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-semibold transition-all border border-white/20 shadow-xs cursor-pointer w-fit shrink-0"
                >
                  <Edit3 size={15} />
                  <span>Modificar Fechas</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveDates}
                    disabled={isSavingDates}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Check size={15} />
                    <span>{isSavingDates ? 'Guardando...' : 'Guardar Fechas'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDates(false)}
                    className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Fechas de vigencia de la oferta */}
            {!isEditingDates ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-indigo-100 mt-5">
                <div 
                  onClick={() => {
                    setEditOfferName(selectedOffer.nombre_oferta || '');
                    setEditStartDate(selectedOffer.vigencia_inicio || '');
                    setEditEndDate(selectedOffer.vigencia_fin || '');
                    setIsEditingDates(true);
                  }}
                  className="flex items-center gap-2 bg-black/15 hover:bg-black/25 px-4 py-2.5 rounded-xl backdrop-blur-sm w-full sm:w-auto cursor-pointer transition-colors border border-white/10 group"
                  title="Haz clic para modificar las fechas"
                >
                  <Calendar size={18} className="group-hover:text-amber-300 transition-colors" />
                  <span><span className="opacity-70">Inicio:</span> <strong className="font-semibold">{selectedOffer.vigencia_inicio || 'Sin definir'}</strong></span>
                  <Edit3 size={13} className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <div 
                  onClick={() => {
                    setEditOfferName(selectedOffer.nombre_oferta || '');
                    setEditStartDate(selectedOffer.vigencia_inicio || '');
                    setEditEndDate(selectedOffer.vigencia_fin || '');
                    setIsEditingDates(true);
                  }}
                  className="flex items-center gap-2 bg-black/15 hover:bg-black/25 px-4 py-2.5 rounded-xl backdrop-blur-sm w-full sm:w-auto cursor-pointer transition-colors border border-white/10 group"
                  title="Haz clic para modificar las fechas"
                >
                  <Calendar size={18} className="group-hover:text-amber-300 transition-colors" />
                  <span><span className="opacity-70">Fin:</span> <strong className="font-semibold">{selectedOffer.vigencia_fin || 'Sin definir'}</strong></span>
                  <Edit3 size={13} className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 text-white mt-4 bg-black/25 p-4 rounded-xl border border-white/15">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <label className="text-xs font-bold text-indigo-200">Fecha Inicio:</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="bg-white text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg outline-none border border-slate-200 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <label className="text-xs font-bold text-indigo-200">Fecha Fin:</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="bg-white text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg outline-none border border-slate-200 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            
            {/* Botón destacado de importar archivo */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200/70 p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-white text-indigo-600 rounded-2xl shadow-xs flex items-center justify-center border border-indigo-100">
                <UploadCloud size={24} />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Carga Masiva con Archivo</h4>
              <p className="text-xs text-slate-500 mb-3">Foto de hoja, PDF, Excel o lista de texto.</p>
              <button
                type="button"
                onClick={() => openImportModal(selectedOffer)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>Importar Archivo</span>
              </button>
            </div>

            {/* Formulario manual de item */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <Box size={20} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800 text-base">Añadir Individual</h3>
              </div>
              
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Código de Artículo</label>
                  <input type="text" value={newItemCode} onChange={e => handleItemCodeChange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Descripción</label>
                  <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm" required />
                </div>
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Cód. Proveedor <span className="text-slate-400 font-normal lowercase">(opcional)</span></label>
                  <input type="text" value={newProviderCode} onChange={e => handleProviderCodeChange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm" />
                  {providerNamePreview && (
                    <div className={`mt-2 p-2 rounded-lg text-xs font-medium border ${providerNamePreview === 'No encontrado' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      {providerNamePreview === 'No encontrado' ? 'No registrado' : `✓ ${providerNamePreview}`}
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm mt-3 cursor-pointer">
                  <Plus size={16} /> Agregar Artículo
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 md:p-16 text-center text-slate-400">
                <Box size={40} className="mx-auto mb-3 text-slate-300 opacity-50" />
                <p className="text-lg font-medium text-slate-600">Catálogo vacío</p>
                <p className="text-sm">Agrega el primer artículo o sube un archivo con IA para poblarlo al instante.</p>
                <button
                  type="button"
                  onClick={() => openImportModal(selectedOffer)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <UploadCloud size={16} /> Cargar desde Archivo
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total de artículos: <span className="text-indigo-600 font-bold">{items.length}</span>
                  </span>
                </div>

                {/* Mobile view (< md) */}
                <div className="md:hidden flex flex-col gap-3">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 block shrink-0">
                          {item.codigo_articulo}
                        </span>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h4 className="text-slate-800 font-medium text-sm leading-snug">{item.descripcion}</h4>
                      {item.codigo_proveedor ? (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg flex items-center gap-2">
                          <Building2 size={12} className="shrink-0" />
                          <span className="truncate">{item.nombre_proveedor || `Cód: ${item.codigo_proveedor}`}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin proveedor</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table view (>= md) */}
                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden h-full min-h-[500px]">
                  <div className="overflow-x-auto max-h-[700px]">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/80">
                        <tr>
                          <th className="p-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Código</th>
                          <th className="p-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Descripción del Artículo</th>
                          <th className="p-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Proveedor</th>
                          <th className="p-3.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider w-16 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.id} className="group transition-colors duration-150 hover:bg-slate-50/80">
                            <td className="p-3.5 px-4">
                              <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                                {item.codigo_articulo}
                              </span>
                            </td>
                            <td className="p-3.5 px-4 text-slate-800 font-medium text-sm">{item.descripcion}</td>
                            <td className="p-3.5 px-4">
                              {item.codigo_proveedor ? (
                                <div className="flex flex-col">
                                  <span className="text-slate-800 text-xs font-medium">{item.nombre_proveedor || 'Proveedor Registrado'}</span>
                                  <span className="font-mono text-[11px] text-slate-400">N° {item.codigo_proveedor}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Sin proveedor</span>
                              )}
                            </td>
                            <td className="p-3.5 px-4 text-center">
                              <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL: GRILLA DE OFERTAS
  // ==========================================
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center md:items-start text-center md:text-left">
        <div>
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl mb-2 md:mb-0">
              <Tags size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Catálogos y Ofertas</h2>
          </div>
          <p className="text-sm md:text-base text-slate-500">Crea ofertas automáticas desde cualquier archivo (foto, PDF, Excel o texto) o gestiona las campañas vigentes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <div className="w-full md:w-80 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar artículo o proveedor..." 
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
              className="w-full pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:bg-white outline-none transition-all duration-200 shadow-2xs text-sm"
            />
            <button 
              onClick={handleGlobalSearch} 
              className="absolute inset-y-1 right-1 bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center font-medium text-xs shadow-2xs cursor-pointer"
            >
              Buscar
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsApiKeyModalOpen(true)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer shrink-0"
            title="Configuración de IA / API Key"
          >
            <Key size={18} />
          </button>
        </div>
      </div>

      {searchResults ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-indigo-800 gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <div className="p-2 bg-indigo-100 rounded-lg shrink-0"><Activity size={20} className="text-indigo-600"/></div>
              <p className="font-medium text-sm md:text-base text-center sm:text-left">Resultados para: <span className="font-bold">"{globalSearch}"</span></p>
            </div>
            <button onClick={() => { setSearchResults(null); setGlobalSearch(''); }} className="w-full sm:w-auto px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-100 text-xs font-semibold transition-colors shadow-2xs cursor-pointer">
              Limpiar filtros
            </button>
          </div>
          
          {Object.keys(searchResults).length === 0 ? (
            <div className="p-12 md:p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <Search size={40} className="mx-auto mb-3 text-slate-300 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Sin coincidencias</p>
              <p className="text-sm">Prueba buscando con otras palabras.</p>
            </div>
          ) : (
            Object.values(searchResults).map((group, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200/60 p-4 px-4 md:px-6 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2">
                    <Tags size={16} className="text-slate-400 shrink-0" />
                    <h3 className="font-bold text-slate-800 truncate">{group.offer.nombre_oferta}</h3>
                  </div>
                  <span className="md:ml-auto text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full w-fit">
                    {group.items.length} coincidencia{group.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Mobile view */}
                <div className="md:hidden flex flex-col divide-y divide-slate-100">
                  {group.items.map((item, i) => (
                    <div key={i} className="p-4 flex flex-col gap-2 bg-white">
                      <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded w-fit">{item.codigo_articulo}</span>
                      <p className="text-slate-800 font-medium text-sm">{item.descripcion}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5"><Building2 size={12}/> {item.nombre_proveedor || 'Sin proveedor'}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop view */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[600px]">
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 px-6 font-mono text-sm w-40 text-slate-600">{item.codigo_articulo}</td>
                          <td className="p-4 px-6 text-slate-800 font-medium">{item.descripcion}</td>
                          <td className="p-4 px-6 w-64">
                            <span className="text-slate-600 text-sm flex items-center gap-2">
                              <Building2 size={14} className="text-slate-400"/>
                              {item.nombre_proveedor || 'Sin proveedor'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Panel Lateral: Crear Oferta */}
          <div className="xl:col-span-1 space-y-5">
            
            {/* Tarjeta de Carga Inteligente de Archivo */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-md p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl -translate-y-8 translate-x-8"></div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Sparkles size={18} className="text-amber-300" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">Carga con IA</span>
              </div>

              <h3 className="font-bold text-lg mb-1 leading-snug">Crear Oferta desde Archivo</h3>
              <p className="text-xs text-indigo-100/90 mb-4 leading-relaxed">
                Sube cualquier archivo (foto, PDF, Excel o texto) y la IA extraerá códigos, proveedores y descripciones automáticamente.
              </p>

              <button
                type="button"
                onClick={() => openImportModal(null)}
                className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-3 px-4 rounded-xl text-xs md:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <UploadCloud size={18} className="group-hover:scale-110 transition-transform" />
                <span>Subir Archivo de Oferta</span>
              </button>
            </div>

            {/* Formulario Tradicional para Crear Oferta Vacía */}
            <form onSubmit={handleCreateOffer} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:sticky top-8">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus size={18} className="text-indigo-500" /> Crear Oferta Manual
              </h3>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nombre de Catálogo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Aniversario, Lácteos..."
                    value={newOfferName} 
                    onChange={e => setNewOfferName(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Desde</label>
                    <input 
                      type="date" 
                      value={newOfferStart} 
                      onChange={e => setNewOfferStart(e.target.value)} 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs text-slate-600 cursor-pointer" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Hasta</label>
                    <input 
                      type="date" 
                      value={newOfferEnd} 
                      onChange={e => setNewOfferEnd(e.target.value)} 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs text-slate-600 cursor-pointer" 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={!newOfferName.trim()} 
                  className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-semibold text-xs shadow-2xs mt-1 disabled:opacity-50 cursor-pointer"
                >
                  Crear Manual
                </button>
              </div>
            </form>
          </div>

          {/* Grilla de Ofertas */}
          <div className="xl:col-span-3">
            {/* Filtros de Pestaña */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5 bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOfferFilter('activas')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    offerFilter === 'activas' 
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Vigentes ({offers.filter(o => isOfferActive(o.vigencia_fin)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOfferFilter('vencidas')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    offerFilter === 'vencidas' 
                      ? 'bg-white text-red-700 shadow-2xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span>Vencidas ({offers.filter(o => !isOfferActive(o.vigencia_fin)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOfferFilter('todas')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    offerFilter === 'todas' 
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Todas ({offers.length})</span>
                </button>
              </div>

              <span className="text-xs text-slate-400 font-medium px-2">
                {offerFilter === 'activas' ? 'Solo ofertas en curso' : offerFilter === 'vencidas' ? 'Historial de ofertas' : 'Todas las campañas'}
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            ) : (() => {
              const activeOffers = offers.filter(o => isOfferActive(o.vigencia_fin));
              const expiredOffers = offers.filter(o => !isOfferActive(o.vigencia_fin));
              const displayedOffers = offerFilter === 'activas' ? activeOffers : offerFilter === 'vencidas' ? expiredOffers : offers;

              if (displayedOffers.length === 0) {
                return (
                  <div className="p-12 md:p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-2xs">
                    <Tags size={44} className="mx-auto mb-3 text-slate-300 opacity-60" />
                    <p className="text-lg font-semibold text-slate-700">
                      {offerFilter === 'activas' 
                        ? 'No hay ofertas vigentes actualmente' 
                        : offerFilter === 'vencidas'
                        ? 'No hay ofertas vencidas registradas'
                        : 'No hay ofertas creadas'}
                    </p>
                    <p className="text-sm mt-1 max-w-sm mx-auto">
                      {offerFilter === 'activas' && expiredOffers.length > 0 
                        ? 'Tienes ofertas finalizadas guardadas en la pestaña "Vencidas".' 
                        : 'Sube un archivo con el botón de IA o crea una oferta manual.'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openImportModal(null)}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles size={14} className="text-amber-300" />
                        <span>Subir Archivo de Oferta</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {displayedOffers.map(o => {
                    const status = getOfferStatus(o.vigencia_fin);
                    return (
                      <div 
                        key={o.id} 
                        onClick={() => setSelectedOffer(o)}
                        className="bg-white rounded-2xl shadow-xs hover:shadow-md border border-slate-200/60 p-5 md:p-6 cursor-pointer transition-all duration-200 group relative md:hover:-translate-y-1 flex flex-col h-full"
                      >
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <h3 className="font-bold text-base md:text-lg text-slate-800 pr-14 leading-tight break-words">{o.nombre_oferta}</h3>
                          <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2 md:px-2.5 py-1 rounded-md border shrink-0 ${status.classes}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); openEditModal(o); }}
                            className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium hover:text-indigo-600 transition-colors p-1 -ml-1 rounded-lg hover:bg-indigo-50/70"
                            title="Haz clic para modificar las fechas"
                          >
                            <Calendar size={14} className="text-slate-400"/>
                            <span>{o.vigencia_inicio || '-'}</span> <span className="text-slate-300">→</span> <span>{o.vigencia_fin || '-'}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                openImportModal(o);
                              }}
                              className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-all cursor-pointer"
                              title="Subir archivo a esta oferta"
                            >
                              <UploadCloud size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditModal(o); }}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all cursor-pointer"
                              title="Modificar fechas de esta oferta"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteOffer(o.id); }} 
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer"
                              title="Eliminar oferta"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE IMPORTACIÓN INTELIGENTE DE ARCHIVOS CON IA      */}
      {/* ======================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-purple-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Sparkles size={20} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base md:text-lg">
                    {importTargetOffer 
                      ? `Importar Artículos a "${importTargetOffer.nombre_oferta}"` 
                      : 'Nueva Oferta desde Archivo'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Soporta imágenes (JPG, PNG), documentos PDF, planillas Excel (.xlsx) y archivos de texto (.csv, .txt).
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  if (isExtracting || isSavingImport) return;
                  setIsImportModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Mensaje de Éxito al Guardar */}
              {saveSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 animate-in fade-in duration-200">
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold">{saveSuccessMsg}</p>
                </div>
              )}

              {/* Si es una oferta nueva, pedir datos de la oferta */}
              {!importTargetOffer && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Tags size={14} className="text-indigo-600" /> 1. Datos de la Oferta a Crear
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de Oferta *</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Aniversario, Super Descuentos..."
                        value={importOfferName} 
                        onChange={e => setImportOfferName(e.target.value)} 
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Inicio</label>
                      <input 
                        type="date" 
                        value={importStartDate} 
                        onChange={e => setImportStartDate(e.target.value)} 
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/30 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Fin</label>
                      <input 
                        type="date" 
                        value={importEndDate} 
                        onChange={e => setImportEndDate(e.target.value)} 
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/30 outline-none" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Parámetros de Extracción */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proveedor por defecto (si el archivo no tiene columna de proveedor)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Ej: 12018 (Conaprole)"
                      value={importDefaultProvider} 
                      onChange={e => setImportDefaultProvider(e.target.value)} 
                      className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500/30" 
                    />
                    {importDefaultProvider && suppliersMap[importDefaultProvider.trim()] && (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
                        {suppliersMap[importDefaultProvider.trim()]}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Si el archivo carece de código de proveedor, se le asignará este número.</p>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 mb-1 select-none">
                    <input 
                      type="checkbox" 
                      checked={importExpandCompounds} 
                      onChange={e => setImportExpandCompounds(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <span>Expandir códigos compuestos (ej: 212031/032)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Si está marcado, desglosa códigos con barras o guiones en items individuales para que sean buscables por cualquiera de sus códigos.
                  </p>
                </div>
              </div>

              {/* Zona de Subida de Archivo */}
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*,application/pdf,.xlsx,.xls,.csv,.txt,text/*"
                  onChange={handleFileSelect}
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    selectedFile 
                      ? 'border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/50' 
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <UploadCloud size={28} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm md:text-base mb-1">
                    {selectedFile ? selectedFile.name : 'Haz clic aquí para seleccionar o arrastra un archivo'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                    Acepta cualquier extensión: fotos de hojas impresas (.jpg, .png), documentos (.pdf), planillas de Excel (.xlsx, .xls) o archivos de texto (.csv, .txt).
                  </p>
                  
                  <div className="flex items-center justify-center flex-wrap gap-2 text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <ImageIcon size={12} className="text-blue-500" /> Imágenes
                    </span>
                    <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <FileText size={12} className="text-red-500" /> PDFs
                    </span>
                    <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <FileSpreadsheet size={12} className="text-emerald-500" /> Excel / CSV
                    </span>
                  </div>
                </div>
              </div>

              {/* Spinner de Extracción con IA */}
              {isExtracting && (
                <div className="p-8 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-center space-y-3 animate-in fade-in duration-200">
                  <div className="w-12 h-12 mx-auto border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <h4 className="font-bold text-slate-800 text-base">Analizando archivo con Inteligencia Artificial...</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Estamos leyendo los datos del archivo, detectando columnas de códigos de artículo, proveedores y descripciones de producto.
                  </p>
                </div>
              )}

              {/* Error de Extracción */}
              {extractionError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">No se pudo completar la extracción:</p>
                    <p>{extractionError}</p>
                    <button 
                      type="button" 
                      onClick={() => processFile(selectedFile)}
                      className="underline font-semibold hover:text-red-900 cursor-pointer"
                    >
                      Reintentar análisis
                    </button>
                  </div>
                </div>
              )}

              {/* TABLA DE RESULTADOS EXTRAÍDOS PARA REVISAR Y EDITAR */}
              {extractedItems.length > 0 && !isExtracting && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg text-xs">
                        {extractedItems.length} artículos detectados
                      </span>
                      <span className="text-xs text-slate-500">
                        (Revisa, corrige o añade datos antes de guardar)
                      </span>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleAddManualRow}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus size={14} /> Añadir fila manual
                    </button>
                  </div>

                  {/* Asignación Masiva de Proveedor para los que estén vacíos */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="text-xs text-amber-900 font-medium flex-1">
                      <span className="font-bold">¿Artículos sin proveedor?</span> Puedes asignar un proveedor masivo a todas las filas que no lo tengan:
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input 
                        type="text" 
                        placeholder="N° Proveedor..."
                        value={massProviderCode} 
                        onChange={e => setMassProviderCode(e.target.value)}
                        className="p-1.5 px-3 bg-white border border-amber-300 rounded-lg text-xs font-mono w-32 outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button 
                        type="button"
                        onClick={handleApplyMassProvider}
                        disabled={!massProviderCode.trim()}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Aplicar a vacíos
                      </button>
                    </div>
                  </div>

                  {/* Tabla con scroll de productos */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="p-2.5 px-3 font-bold w-36">Cód. Artículo</th>
                          <th className="p-2.5 px-3 font-bold">Descripción del Producto</th>
                          <th className="p-2.5 px-3 font-bold w-48">N° Proveedor</th>
                          <th className="p-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {extractedItems.map((item, index) => (
                          <tr key={item.tempId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2 px-3">
                              <input 
                                type="text" 
                                value={item.codigo_articulo} 
                                onChange={e => handleUpdateExtractedItem(item.tempId, 'codigo_articulo', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="p-2 px-3">
                              <input 
                                type="text" 
                                value={item.descripcion} 
                                onChange={e => handleUpdateExtractedItem(item.tempId, 'descripcion', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="p-2 px-3">
                              <div className="flex flex-col gap-1">
                                <input 
                                  type="text" 
                                  placeholder="Sin proveedor"
                                  value={item.codigo_proveedor} 
                                  onChange={e => handleUpdateExtractedItem(item.tempId, 'codigo_proveedor', e.target.value)}
                                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                {item.nombre_proveedor && (
                                  <span className="text-[10px] text-emerald-700 font-semibold truncate">
                                    ✓ {item.nombre_proveedor}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 px-2 text-center">
                              <button 
                                type="button" 
                                onClick={() => handleDeleteExtractedItem(item.tempId)}
                                className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button 
                type="button" 
                onClick={() => setIsImportModalOpen(false)}
                disabled={isSavingImport}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button 
                type="button" 
                onClick={handleConfirmAndSaveImport}
                disabled={isSavingImport || extractedItems.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingImport ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando en Oferta y Productos...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>
                      {importTargetOffer 
                        ? `Guardar ${extractedItems.length} artículos en la oferta` 
                        : `Crear Oferta y Guardar ${extractedItems.length} artículos`}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PARA EDITAR FECHAS DE LA OFERTA DIRECTAMENTE      */}
      {/* ======================================================== */}
      {modalEditOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Modificar Fechas de Oferta</h3>
                  <p className="text-[11px] text-slate-400">Edita la vigencia y nombre de la campaña</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalEditOffer(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModalOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Oferta
                </label>
                <input
                  type="text"
                  value={modalOfferName}
                  onChange={(e) => setModalOfferName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={modalStartDate}
                    onChange={(e) => setModalStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none text-xs font-semibold cursor-pointer transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none text-xs font-semibold cursor-pointer transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditOffer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDates}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-200 cursor-pointer disabled:opacity-50"
                >
                  <Check size={15} />
                  <span>{isSavingDates ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CONFIGURACIÓN API KEY DE IA                       */}
      {/* ======================================================== */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Clave de Inteligencia Artificial</h3>
                  <p className="text-[11px] text-slate-400">Gemini API Key para extracción de archivos</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                El sistema ya cuenta con una API Key activa configurada en el servidor. Si deseas cambiarla o usar tu propia clave de Google AI Studio, puedes pegarla aquí:
              </p>
              <div>
                <input 
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {apiKeySavedSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" /> Clave guardada correctamente.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer"
                >
                  Guardar Clave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
