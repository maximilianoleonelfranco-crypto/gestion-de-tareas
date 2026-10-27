import { useState, useEffect } from 'react';
import { collection, setDoc, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Package, 
  Search, 
  X, 
  Plus, 
  Trash2, 
  Pencil, 
  Building2, 
  Check, 
  Boxes, 
  RefreshCw 
} from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states for manual creation / edit
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [providerCode, setProviderCode] = useState('');
  const [providerNamePreview, setProviderNamePreview] = useState('');

  // Editing state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editProviderCode, setEditProviderCode] = useState('');
  const [editProviderName, setEditProviderName] = useState('');

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Si la colección está vacía o tiene pocos artículos, sincronizar automáticamente con los que ya estén en offer_items
      if (prods.length === 0) {
        await syncFromOfferItems();
      } else {
        setProducts(prods);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncFromOfferItems = async () => {
    setIsSyncing(true);
    try {
      const itemsSnap = await getDocs(collection(db, 'offer_items'));
      const synced = [];
      for (const itemDoc of itemsSnap.docs) {
        const item = itemDoc.data();
        if (item.codigo_articulo && item.descripcion) {
          const cleanCode = item.codigo_articulo.trim();
          await setDoc(doc(db, 'products', cleanCode.replace(/\//g, '-')), {
            codigo_articulo: cleanCode,
            descripcion: item.descripcion.trim(),
            codigo_proveedor: (item.codigo_proveedor || '').trim(),
            nombre_proveedor: item.nombre_proveedor || '',
            created_at: new Date()
          }, { merge: true });
        }
      }
      const refreshedSnap = await getDocs(collection(db, 'products'));
      setProducts(refreshedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error syncing items to products:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProviderCodeChange = async (pCode, isEditing = false) => {
    if (isEditing) {
      setEditProviderCode(pCode);
    } else {
      setProviderCode(pCode);
    }

    if (!pCode.trim()) {
      if (isEditing) setEditProviderName('');
      else setProviderNamePreview('');
      return;
    }

    try {
      const docSnap = await getDoc(doc(db, 'suppliers', pCode.trim()));
      if (docSnap.exists()) {
        const name = docSnap.data().nombre;
        if (isEditing) setEditProviderName(name);
        else setProviderNamePreview(name);
      } else {
        if (isEditing) setEditProviderName('No encontrado');
        else setProviderNamePreview('No encontrado');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return;

    const cleanCode = code.trim();
    const cleanDesc = description.trim();
    const cleanPCode = providerCode.trim();
    const cleanPName = providerNamePreview !== 'No encontrado' ? providerNamePreview : '';

    await setDoc(doc(db, 'products', cleanCode.replace(/\//g, '-')), {
      codigo_articulo: cleanCode,
      descripcion: cleanDesc,
      codigo_proveedor: cleanPCode,
      nombre_proveedor: cleanPName,
      updated_at: new Date()
    }, { merge: true });

    setCode('');
    setDescription('');
    setProviderCode('');
    setProviderNamePreview('');
    fetchProducts();
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto de la base maestra?')) return;
    await deleteDoc(doc(db, 'products', id));
    fetchProducts();
  };

  const startEditProduct = (prod) => {
    setEditingProduct(prod);
    setEditDesc(prod.descripcion || '');
    setEditProviderCode(prod.codigo_proveedor || '');
    setEditProviderName(prod.nombre_proveedor || '');
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !editDesc.trim()) return;

    const cleanDesc = editDesc.trim();
    const cleanPCode = editProviderCode.trim();
    const cleanPName = editProviderName !== 'No encontrado' ? editProviderName : '';

    await setDoc(doc(db, 'products', editingProduct.id), {
      descripcion: cleanDesc,
      codigo_proveedor: cleanPCode,
      nombre_proveedor: cleanPName,
      updated_at: new Date()
    }, { merge: true });

    setEditingProduct(null);
    fetchProducts();
  };

  // Normalizador de búsqueda inteligente
  const normalizeText = (text) => 
    (text || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const searchTokens = normalizeText(searchTerm).split(/\s+/).filter(Boolean);

  const filteredProducts = products.filter(p => {
    if (searchTokens.length === 0) return true;
    const targetCode = normalizeText(p.codigo_articulo || p.id);
    const targetDesc = normalizeText(p.descripcion);
    const targetPCode = normalizeText(p.codigo_proveedor);
    const targetPName = normalizeText(p.nombre_proveedor);
    const combined = `${targetCode} ${targetDesc} ${targetPCode} ${targetPName}`;
    return searchTokens.every(token => combined.includes(token));
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* Header Bento Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center md:items-start text-center md:text-left">
        <div>
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl mb-2 md:mb-0">
              <Package size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Catálogo de Productos</h2>
          </div>
          <p className="text-sm md:text-base text-slate-500">
            Base maestra de artículos guardados automáticamente desde las ofertas.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={syncFromOfferItems}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Sincronizar artículos existentes desde las ofertas"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ofertas'}</span>
          </button>

          <div className="bg-slate-50 px-8 md:px-6 py-4 rounded-2xl ring-1 ring-slate-100 flex flex-col items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-indigo-600">
              {searchTerm ? `${filteredProducts.length} / ${products.length}` : products.length}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {searchTerm ? 'Encontrados' : 'Productos'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:sticky top-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <Boxes size={20} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-800 text-lg">Nuevo Producto</h3>
            </div>
            
            <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Código de Artículo
                </label>
                <input 
                  type="text" 
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Ej: ART-901" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 font-mono text-sm text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Descripción del Producto
                </label>
                <input 
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ej: Leche Entera 1L" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 text-sm text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Código Proveedor <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={providerCode}
                  onChange={e => handleProviderCodeChange(e.target.value)}
                  placeholder="Ej: 12018" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 font-mono text-sm text-slate-700"
                />
                {providerNamePreview && (
                  <div className={`mt-2 p-2 rounded-lg text-xs font-medium border ${
                    providerNamePreview === 'No encontrado' 
                      ? 'bg-red-50 text-red-600 border-red-100' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {providerNamePreview === 'No encontrado' ? 'No registrado' : `✓ ${providerNamePreview}`}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={!code.trim() || !description.trim()}
                className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:hover:scale-100 mt-2"
              >
                <Plus size={20} />
                Guardar Producto
              </button>
            </form>
          </div>
        </div>

        {/* Data Column */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Smart Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-3 md:p-4">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Buscar por código, descripción o proveedor..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200 text-sm text-slate-700 placeholder-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 md:p-16 text-center text-slate-400">
              <Package size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Catálogo vacío</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                Los productos que vayas agregando en tus ofertas se guardarán automáticamente aquí por su código.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center text-slate-400">
              <Search size={40} className="mx-auto mb-3 text-slate-300 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Sin coincidencias</p>
              <p className="text-sm mt-1">No se encontró ningún producto con "{searchTerm}".</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-colors"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards View (< md) */}
              <div className="md:hidden flex flex-col gap-4">
                {filteredProducts.map(p => (
                  <div 
                    key={p.codigo_articulo || p.id} 
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex flex-col gap-3 group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                        {p.codigo_articulo || p.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEditProduct(p)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="Editar producto"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)} 
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-slate-800 font-semibold text-base leading-snug break-words">
                      {p.descripcion}
                    </h4>

                    {p.codigo_proveedor ? (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {p.nombre_proveedor || `Cód: ${p.codigo_proveedor}`}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 ml-auto shrink-0">
                          {p.codigo_proveedor}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin proveedor asignado</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-col h-full min-h-[450px]">
                <div className="overflow-x-auto w-full flex-1">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/80">
                      <tr>
                        <th className="p-4 px-6 font-semibold text-slate-600 text-xs uppercase tracking-wider w-36">Código</th>
                        <th className="p-4 px-6 font-semibold text-slate-600 text-xs uppercase tracking-wider">Descripción</th>
                        <th className="p-4 px-6 font-semibold text-slate-600 text-xs uppercase tracking-wider w-64">Proveedor</th>
                        <th className="p-4 px-6 font-semibold text-slate-600 text-xs uppercase tracking-wider w-24 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map(p => (
                        <tr 
                          key={p.codigo_articulo || p.id} 
                          className="group transition-colors duration-200 hover:bg-indigo-50/30"
                        >
                          <td className="p-4 px-6">
                            <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                              {p.codigo_articulo || p.id}
                            </span>
                          </td>
                          <td className="p-4 px-6 text-slate-800 font-medium text-sm break-words">
                            {p.descripcion}
                          </td>
                          <td className="p-4 px-6">
                            {p.codigo_proveedor ? (
                              <div className="flex flex-col">
                                <span className="text-slate-800 text-sm font-medium leading-tight">
                                  {p.nombre_proveedor || 'Sin nombre'}
                                </span>
                                <span className="font-mono text-xs text-slate-400 mt-0.5">
                                  CÓD: {p.codigo_proveedor}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Sin proveedor</span>
                            )}
                          </td>
                          <td className="p-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEditProduct(p)}
                                className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                title="Editar producto"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.id)} 
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="Eliminar producto"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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

      {/* Modal para Editar Producto */}
      {editingProduct && (
        <div 
          onClick={() => setEditingProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative">
              <button 
                onClick={() => setEditingProduct(null)}
                className="absolute top-5 right-5 text-white/70 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/20">
                  CÓDIGO: {editingProduct.codigo_articulo || editingProduct.id}
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Editar Producto
              </h3>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Descripción
                </label>
                <input 
                  type="text" 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Cód. Proveedor <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={editProviderCode}
                  onChange={e => handleProviderCodeChange(e.target.value, true)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm text-slate-800"
                />
                {editProviderName && (
                  <div className={`mt-2 p-2 rounded-lg text-xs font-medium border ${
                    editProviderName === 'No encontrado' 
                      ? 'bg-red-50 text-red-600 border-red-100' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {editProviderName === 'No encontrado' ? 'No registrado' : `✓ ${editProviderName}`}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Check size={14} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
