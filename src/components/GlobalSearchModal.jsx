import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Search, 
  X, 
  Package, 
  Building2, 
  Tags, 
  CalendarDays, 
  ArrowUpRight, 
  Truck, 
  Clock, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function GlobalSearchModal({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState({
    products: [],
    suppliers: [],
    schedule: [],
    offers: [],
    offerItems: []
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'products' | 'suppliers' | 'offers'
  const inputRef = useRef(null);

  // Cargar datos en memoria cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setIsLoadingData(true);

      const loadAllData = async () => {
        try {
          const [prodSnap, supSnap, schSnap, offSnap, offItemsSnap] = await Promise.all([
            getDocs(collection(db, 'products')),
            getDocs(collection(db, 'suppliers')),
            getDocs(collection(db, 'schedule')),
            getDocs(collection(db, 'offers')),
            getDocs(collection(db, 'offer_items'))
          ]);

          setData({
            products: prodSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            suppliers: supSnap.docs.map(d => ({ codigo_proveedor: d.id, ...d.data() })),
            schedule: schSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            offers: offSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            offerItems: offItemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          });
        } catch (err) {
          console.error('Error al cargar datos para buscador global:', err);
        } finally {
          setIsLoadingData(false);
        }
      };

      loadAllData();

      // Enfocar input automáticamente
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Normalizador de búsqueda insensible a acentos y mayúsculas
  const normalize = (text) => 
    (text || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const searchTokens = normalize(query).split(/\s+/).filter(Boolean);

  // Mapeos rápidos para cruce relacional instantáneo
  const scheduleBySupplier = {};
  data.schedule.forEach(s => {
    const sCode = (s.codigo_proveedor || '').trim();
    if (!scheduleBySupplier[sCode]) scheduleBySupplier[sCode] = [];
    scheduleBySupplier[sCode].push(s);
  });

  const offerItemsByProductCode = {};
  data.offerItems.forEach(item => {
    const pCode = (item.codigo_articulo || '').trim();
    if (!offerItemsByProductCode[pCode]) offerItemsByProductCode[pCode] = [];
    offerItemsByProductCode[pCode].push(item);
  });

  const offersById = {};
  data.offers.forEach(o => {
    offersById[o.id] = o;
  });

  const isOfferActive = (end) => {
    if (!end) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const [year, month, day] = end.split('-');
    const endDate = new Date(year, month - 1, day);
    return endDate >= today;
  };

  // Filtrar Productos
  let matchedProducts = [];
  if (searchTokens.length > 0) {
    matchedProducts = data.products.filter(p => {
      const code = normalize(p.codigo_articulo || p.id);
      const desc = normalize(p.descripcion);
      const pCode = normalize(p.codigo_proveedor);
      const pName = normalize(p.nombre_proveedor);
      const combined = `${code} ${desc} ${pCode} ${pName}`;
      return searchTokens.every(tok => combined.includes(tok));
    });
  }

  // Filtrar Proveedores
  let matchedSuppliers = [];
  if (searchTokens.length > 0) {
    matchedSuppliers = data.suppliers.filter(s => {
      const code = normalize(s.codigo_proveedor);
      const name = normalize(s.nombre);
      const combined = `${code} ${name}`;
      return searchTokens.every(tok => combined.includes(tok));
    });
  }

  // Filtrar Ofertas
  let matchedOffers = [];
  if (searchTokens.length > 0) {
    matchedOffers = data.offers.filter(o => {
      const name = normalize(o.nombre_oferta);
      return searchTokens.every(tok => name.includes(tok));
    });
  }

  const totalResults = matchedProducts.length + matchedSuppliers.length + matchedOffers.length;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-16 p-3 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={e => e.stopPropagation()} 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* Search Header Bar */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search size={22} className="text-indigo-600 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar artículo, proveedor, oferta o código (ej: 241320, McCain, Colet)..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-medium text-base md:text-lg outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
              title="Borrar texto"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 hidden sm:block"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills */}
        {query.trim() && (
          <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCategory === 'all' 
                  ? 'bg-white text-indigo-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({totalResults})
            </button>
            <button
              onClick={() => setActiveCategory('products')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeCategory === 'products' 
                  ? 'bg-white text-indigo-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package size={13} />
              <span>Productos ({matchedProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveCategory('suppliers')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeCategory === 'suppliers' 
                  ? 'bg-white text-indigo-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={13} />
              <span>Proveedores ({matchedSuppliers.length})</span>
            </button>
            <button
              onClick={() => setActiveCategory('offers')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeCategory === 'offers' 
                  ? 'bg-white text-indigo-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tags size={13} />
              <span>Ofertas ({matchedOffers.length})</span>
            </button>
          </div>
        )}

        {/* Results Body */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">
          {isLoadingData ? (
            <div className="py-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 mt-2">Cargando base de datos...</p>
            </div>
          ) : !query.trim() ? (
            /* Estado Inicial */
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-indigo-50/50">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-slate-700 font-semibold text-base">Buscador Inteligente Unificado</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Escribe cualquier código de artículo, nombre de producto o proveedor para ver de inmediato su logística y ofertas vigentes.
                </p>
              </div>
            </div>
          ) : totalResults === 0 ? (
            /* Sin Resultados */
            <div className="py-16 text-center text-slate-400">
              <Search size={40} className="mx-auto mb-3 text-slate-300 opacity-60" />
              <p className="text-base font-semibold text-slate-700">Sin coincidencias para "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Intenta buscando por código numérico o por otra palabra.</p>
            </div>
          ) : (
            /* Lista de Resultados */
            <div className="space-y-6">
              
              {/* SECCIÓN 1: PRODUCTOS */}
              {(activeCategory === 'all' || activeCategory === 'products') && matchedProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <Package size={14} className="text-indigo-600" />
                    <span>Productos Encontrados ({matchedProducts.length})</span>
                  </div>

                  <div className="space-y-3">
                    {matchedProducts.map(prod => {
                      const cleanCode = (prod.codigo_articulo || prod.id).trim();
                      const provCode = (prod.codigo_proveedor || '').trim();
                      const scheduleEntries = scheduleBySupplier[provCode] || [];
                      const linkedOfferItems = offerItemsByProductCode[cleanCode] || [];

                      return (
                        <div 
                          key={prod.id || cleanCode}
                          className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs hover:border-indigo-300 hover:shadow-sm transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200 inline-block">
                                CÓD: {cleanCode}
                              </span>
                              <h4 className="text-base font-bold text-slate-800 leading-snug">
                                {prod.descripcion}
                              </h4>
                            </div>

                            {onNavigate && (
                              <button
                                onClick={() => {
                                  onNavigate('products');
                                  onClose();
                                }}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                              >
                                <span>Ver catálogo</span>
                                <ArrowRight size={13} />
                              </button>
                            )}
                          </div>

                          {/* Proveedor */}
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-wrap">
                            <Building2 size={14} className="text-slate-400 shrink-0" />
                            <span className="font-medium">
                              Proveedor: <strong className="text-slate-800">{prod.nombre_proveedor || 'Sin nombre'}</strong>
                            </span>
                            {provCode && (
                              <span className="font-mono text-[11px] text-slate-400 ml-auto">
                                CÓD: {provCode}
                              </span>
                            )}
                          </div>

                          {/* Agenda Logística (Cuándo sale y cuándo entrega) */}
                          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <CalendarDays size={13} className="text-indigo-500" />
                              <span>Agenda Operativa de Pedidos y Entregas</span>
                            </div>

                            {scheduleEntries.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                Este proveedor aún no tiene días configurados en la agenda.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {scheduleEntries.map((sch, i) => (
                                  <div key={sch.id || i} className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-orange-700">
                                      <ArrowUpRight size={14} className="text-orange-500" />
                                      <span>Sale: <strong>{sch.dia_pedido}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-700">
                                      <Truck size={14} className="text-emerald-500" />
                                      <span>Entrega: <strong>{sch.dia_entrega}</strong></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Ofertas Vigentes asociadas a este producto */}
                          {linkedOfferItems.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                                <Tags size={13} className="text-indigo-600" />
                                <span>Incluido en Ofertas:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {linkedOfferItems.map((item, i) => {
                                  const offer = offersById[item.offer_id];
                                  const active = offer ? isOfferActive(offer.vigencia_fin) : false;
                                  return (
                                    <div 
                                      key={i}
                                      className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 font-medium ${
                                        active 
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                          : 'bg-slate-100 border-slate-200 text-slate-600'
                                      }`}
                                    >
                                      <span>{offer ? offer.nombre_oferta : 'Oferta'}</span>
                                      {offer && (
                                        <span className="text-[10px] opacity-70">
                                          ({offer.vigencia_inicio} al {offer.vigencia_fin})
                                        </span>
                                      )}
                                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                      }`}>
                                        {active ? 'Vigente' : 'Finalizada'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: PROVEEDORES */}
              {(activeCategory === 'all' || activeCategory === 'suppliers') && matchedSuppliers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <Building2 size={14} className="text-indigo-600" />
                    <span>Proveedores Encontrados ({matchedSuppliers.length})</span>
                  </div>

                  <div className="space-y-3">
                    {matchedSuppliers.map(sup => {
                      const sCode = (sup.codigo_proveedor || '').trim();
                      const scheduleEntries = scheduleBySupplier[sCode] || [];

                      return (
                        <div 
                          key={sCode}
                          className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs hover:border-indigo-300 hover:shadow-sm transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200 inline-block mb-1">
                                CÓDIGO: {sCode}
                              </span>
                              <h4 className="text-base font-bold text-slate-800 leading-snug">
                                {sup.nombre}
                              </h4>
                            </div>

                            {onNavigate && (
                              <button
                                onClick={() => {
                                  onNavigate('suppliers');
                                  onClose();
                                }}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                              >
                                <span>Ver ficha</span>
                                <ArrowRight size={13} />
                              </button>
                            )}
                          </div>

                          {/* Agenda del Proveedor */}
                          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <CalendarDays size={13} className="text-indigo-500" />
                              <span>Agenda Semanal</span>
                            </div>

                            {scheduleEntries.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                Sin días de agenda asignados aún.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {scheduleEntries.map((sch, i) => (
                                  <div key={sch.id || i} className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-orange-700">
                                      <ArrowUpRight size={14} className="text-orange-500" />
                                      <span>Sale: <strong>{sch.dia_pedido}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-700">
                                      <Truck size={14} className="text-emerald-500" />
                                      <span>Entrega: <strong>{sch.dia_entrega}</strong></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECCIÓN 3: OFERTAS */}
              {(activeCategory === 'all' || activeCategory === 'offers') && matchedOffers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <Tags size={14} className="text-indigo-600" />
                    <span>Ofertas Encontradas ({matchedOffers.length})</span>
                  </div>

                  <div className="space-y-3">
                    {matchedOffers.map(off => {
                      const active = isOfferActive(off.vigencia_fin);
                      return (
                        <div 
                          key={off.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-800">
                                {off.nombre_oferta}
                              </h4>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
                              }`}>
                                {active ? 'Activa' : 'Vencida'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <CalendarDays size={13} className="text-slate-400" />
                              <span>Vigencia: {off.vigencia_inicio || '-'} al {off.vigencia_fin || '-'}</span>
                            </div>
                          </div>

                          {onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('offers');
                                onClose();
                              }}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                            >
                              <span>Ver oferta</span>
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 md:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Presiona <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-600">Ctrl K</kbd> para abrir o cerrar</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200/70 hover:bg-slate-300/80 text-slate-700 rounded-lg font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
