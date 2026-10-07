import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, Search, ArrowLeft, Plus, Tags, Calendar, Box, Activity, Building2 } from 'lucide-react';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [items, setItems] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for new offer
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferStart, setNewOfferStart] = useState('');
  const [newOfferEnd, setNewOfferEnd] = useState('');

  // States for new item
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newProviderCode, setNewProviderCode] = useState('');
  const [providerNamePreview, setProviderNamePreview] = useState('');

  const fetchOffers = async () => {
    setIsLoading(true);
    const snapshot = await getDocs(collection(db, 'offers'));
    setOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    if (selectedOffer) {
      fetchItems(selectedOffer.id);
    }
  }, [selectedOffer]);

  const fetchItems = async (offerId) => {
    const q = query(collection(db, 'offer_items'), where('offer_id', '==', offerId));
    const snapshot = await getDocs(q);
    setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!newOfferName.trim()) return;
    await addDoc(collection(db, 'offers'), {
      nombre_oferta: newOfferName,
      vigencia_inicio: newOfferStart,
      vigencia_fin: newOfferEnd
    });
    setNewOfferName('');
    setNewOfferStart('');
    setNewOfferEnd('');
    fetchOffers();
  };

  const handleDeleteOffer = async (id) => {
    await deleteDoc(doc(db, 'offers', id));
    fetchOffers();
  };

  const handleProviderCodeChange = async (code) => {
    setNewProviderCode(code);
    if (!code.trim()) {
      setProviderNamePreview('');
      return;
    }
    const docRef = doc(db, 'suppliers', code.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProviderNamePreview(docSnap.data().nombre);
    } else {
      setProviderNamePreview('No encontrado');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemCode.trim() || !newItemDesc.trim()) return;
    await addDoc(collection(db, 'offer_items'), {
      offer_id: selectedOffer.id,
      codigo_articulo: newItemCode,
      descripcion: newItemDesc,
      codigo_proveedor: newProviderCode,
      nombre_proveedor: providerNamePreview !== 'No encontrado' ? providerNamePreview : ''
    });
    setNewItemCode('');
    setNewItemDesc('');
    setNewProviderCode('');
    setProviderNamePreview('');
    fetchItems(selectedOffer.id);
  };

  const handleDeleteItem = async (id) => {
    await deleteDoc(doc(db, 'offer_items', id));
    fetchItems(selectedOffer.id);
  };

  const handleGlobalSearch = async () => {
    if (!globalSearch.trim()) {
      setSearchResults(null);
      return;
    }
    setIsLoading(true);
    const term = globalSearch.toLowerCase();
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
    setIsLoading(false);
  };

  const getOfferStatus = (end) => {
    if (!end) return { text: 'Sin fecha', classes: 'bg-slate-100 text-slate-600 border-slate-200' };
    const today = new Date();
    today.setHours(0,0,0,0);
    const [year, month, day] = end.split('-');
    const endDate = new Date(year, month - 1, day);
    if (endDate >= today) return { text: 'Activa', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { text: 'Vencida', classes: 'bg-red-100 text-red-700 border-red-200' };
  };

  if (selectedOffer) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
        
        <button 
          onClick={() => setSelectedOffer(null)} 
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 w-fit"
        >
          <ArrowLeft size={18} /> <span className="hidden sm:inline">Volver al panel de ofertas</span><span className="sm:hidden">Volver</span>
        </button>
        
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-md p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Tags size={24} /></span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{selectedOffer.nombre_oferta}</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-indigo-100 mt-6">
              <div className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-lg backdrop-blur-sm w-full sm:w-auto">
                <Calendar size={18} />
                <span><span className="opacity-70">Inicio:</span> {selectedOffer.vigencia_inicio || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-lg backdrop-blur-sm w-full sm:w-auto">
                <Calendar size={18} />
                <span><span className="opacity-70">Fin:</span> {selectedOffer.vigencia_fin || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:sticky top-8">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <Box size={20} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800 text-lg">Añadir Artículo</h3>
              </div>
              
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Código de Artículo</label>
                  <input type="text" value={newItemCode} onChange={e => setNewItemCode(e.target.value)} className="w-full p-3 md:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                  <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full p-3 md:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none" required />
                </div>
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cód. Proveedor <span className="text-slate-400 font-normal">(Opcional)</span></label>
                  <input type="text" value={newProviderCode} onChange={e => handleProviderCodeChange(e.target.value)} className="w-full p-3 md:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm" />
                  {providerNamePreview && (
                    <div className={`mt-2 p-2 rounded-lg text-xs font-medium border ${providerNamePreview === 'No encontrado' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      {providerNamePreview === 'No encontrado' ? 'No registrado' : `✓ ${providerNamePreview}`}
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white px-6 py-3.5 md:py-3 rounded-xl hover:bg-slate-900 transition-all duration-200 flex items-center justify-center gap-2 font-medium mt-4">
                  <Plus size={18} /> Agregar
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 md:p-16 text-center text-slate-400">
                <Box size={40} className="mx-auto mb-3 text-slate-300 opacity-50" />
                <p className="text-lg font-medium text-slate-600">Catálogo vacío</p>
                <p className="text-sm">Agrega el primer artículo a esta oferta.</p>
              </div>
            ) : (
              <>
                {/* Mobile view (< md) */}
                <div className="md:hidden flex flex-col gap-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 block shrink-0">
                          {item.codigo_articulo}
                        </span>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h4 className="text-slate-800 font-medium leading-tight">{item.descripcion}</h4>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/80">
                        <tr>
                          <th className="p-4 font-semibold text-slate-600 text-sm tracking-wide">Código</th>
                          <th className="p-4 font-semibold text-slate-600 text-sm tracking-wide">Descripción del Artículo</th>
                          <th className="p-4 font-semibold text-slate-600 text-sm tracking-wide">Proveedor</th>
                          <th className="p-4 font-semibold text-slate-600 text-sm tracking-wide w-16 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.id} className="group transition-colors duration-200 hover:bg-slate-50">
                            <td className="p-4">
                              <span className="font-mono text-sm font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                                {item.codigo_articulo}
                              </span>
                            </td>
                            <td className="p-4 text-slate-800 font-medium">{item.descripcion}</td>
                            <td className="p-4">
                              {item.codigo_proveedor ? (
                                <div className="flex flex-col">
                                  <span className="text-slate-700 text-sm">{item.nombre_proveedor || 'Desconocido'}</span>
                                  <span className="font-mono text-xs text-slate-400">Cód: {item.codigo_proveedor}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm italic">Sin proveedor</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100">
                                <Trash2 size={18} />
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
          <p className="text-sm md:text-base text-slate-500">Gestiona las campañas y artículos asociados.</p>
        </div>
        
        <div className="w-full md:w-96 relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar artículo o proveedor..." 
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
            className="w-full pl-10 pr-24 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:bg-white outline-none transition-all duration-200 shadow-sm text-sm md:text-base"
          />
          <button 
            onClick={handleGlobalSearch} 
            className="absolute inset-y-1.5 right-1.5 bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center font-medium text-sm shadow-sm"
          >
            Buscar
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
            <button onClick={() => { setSearchResults(null); setGlobalSearch(''); }} className="w-full sm:w-auto px-4 py-2.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-semibold transition-colors shadow-sm">
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
          
          {/* Create Offer Form */}
          <div className="xl:col-span-1">
            <form onSubmit={handleCreateOffer} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:sticky top-8">
              <h3 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Plus size={20} className="text-indigo-500" /> Nueva Oferta
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de Catálogo</label>
                  <input type="text" value={newOfferName} onChange={e => setNewOfferName(e.target.value)} className="w-full p-3 md:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm md:text-base" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 md:gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
                    <input type="date" value={newOfferStart} onChange={e => setNewOfferStart(e.target.value)} className="w-full p-3 md:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-slate-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
                    <input type="date" value={newOfferEnd} onChange={e => setNewOfferEnd(e.target.value)} className="w-full p-3 md:p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-slate-600" />
                  </div>
                </div>
                <button type="submit" disabled={!newOfferName.trim()} className="w-full bg-indigo-600 text-white px-6 py-3.5 md:py-3 rounded-xl hover:bg-indigo-700 transition-all duration-200 font-semibold shadow-sm mt-2 disabled:opacity-50">
                  Crear Oferta
                </button>
              </div>
            </form>
          </div>

          {/* Offers Grid */}
          <div className="xl:col-span-3">
            {isLoading ? (
              <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            ) : offers.length === 0 ? (
              <div className="p-12 md:p-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/60 border-dashed">
                <Tags size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
                <p className="text-xl font-medium text-slate-600 mb-2">No hay ofertas creadas</p>
                <p className="text-sm max-w-sm mx-auto">Comienza creando tu primera oferta en el formulario para empezar a agregar articulos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {offers.map(o => {
                  const status = getOfferStatus(o.vigencia_fin);
                  return (
                    <div 
                      key={o.id} 
                      onClick={() => setSelectedOffer(o)}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 p-5 md:p-6 cursor-pointer transition-all duration-200 group relative md:hover:-translate-y-1 flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h3 className="font-bold text-base md:text-lg text-slate-800 pr-6 leading-tight break-words">{o.nombre_oferta}</h3>
                        <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2 md:px-2.5 py-1 rounded-md border shrink-0 ${status.classes}`}>
                          {status.text}
                        </span>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-4">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar size={14} className="text-slate-400"/>
                          <span>{o.vigencia_inicio || '-'}</span> <span className="text-slate-300">→</span> <span>{o.vigencia_fin || '-'}</span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteOffer(o.id); }} 
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 p-2 rounded-lg"
                        title="Eliminar oferta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
