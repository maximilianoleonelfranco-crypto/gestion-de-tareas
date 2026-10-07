import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, Search, ArrowLeft, Plus } from 'lucide-react';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [items, setItems] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  
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
    const snapshot = await getDocs(collection(db, 'offers'));
    setOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
    const term = globalSearch.toLowerCase();
    const itemsSnap = await getDocs(collection(db, 'offer_items'));
    const allItems = itemsSnap.docs.map(d => d.data());
    
    // Filtro dinámico: descripcion, codigo de articulo, codigo proveedor, nombre proveedor
    const filtered = allItems.filter(item => 
      (item.descripcion || '').toLowerCase().includes(term) ||
      (item.codigo_articulo || '').toLowerCase().includes(term) ||
      (item.codigo_proveedor || '').toLowerCase().includes(term) ||
      (item.nombre_proveedor || '').toLowerCase().includes(term)
    );

    // Agrupar por Oferta
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
  };

  if (selectedOffer) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => setSelectedOffer(null)} className="flex items-center gap-2 text-indigo-600 mb-6 hover:underline">
          <ArrowLeft size={18} /> Volver a Ofertas
        </button>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-2xl font-bold text-slate-800">{selectedOffer.nombre_oferta}</h2>
          <p className="text-slate-500">Vigencia: {selectedOffer.vigencia_inicio} a {selectedOffer.vigencia_fin}</p>
        </div>

        <form onSubmit={handleAddItem} className="flex gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Cód. Artículo</label>
            <input type="text" value={newItemCode} onChange={e => setNewItemCode(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Cód. Proveedor</label>
            <input type="text" value={newProviderCode} onChange={e => handleProviderCodeChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            {providerNamePreview && <p className="text-xs mt-1 text-slate-500 font-medium truncate">{providerNamePreview}</p>}
          </div>
          <div className="flex items-end">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition h-[42px]">
              <Plus size={20} />
            </button>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <tr>
                <th className="p-4 font-semibold">Cód. Art</th>
                <th className="p-4 font-semibold">Descripción</th>
                <th className="p-4 font-semibold">Proveedor</th>
                <th className="p-4 font-semibold w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-mono text-sm">{item.codigo_articulo}</td>
                  <td className="p-4 text-slate-800">{item.descripcion}</td>
                  <td className="p-4">
                    {item.codigo_proveedor && <span className="font-mono text-sm mr-2">{item.codigo_proveedor}</span>}
                    <span className="text-slate-600 text-sm">{item.nombre_proveedor}</span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">No hay artículos en esta oferta.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Ofertas y Artículos</h2>
        <div className="flex gap-2 w-1/3">
          <input 
            type="text" 
            placeholder="Búsqueda global..." 
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
            className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={handleGlobalSearch} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700">
            <Search size={20} />
          </button>
        </div>
      </div>

      {searchResults ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg text-indigo-800">
            <p>Resultados de búsqueda para: <strong>{globalSearch}</strong></p>
            <button onClick={() => { setSearchResults(null); setGlobalSearch(''); }} className="text-sm font-semibold underline">Limpiar</button>
          </div>
          {Object.values(searchResults).map((group, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h3 className="font-bold text-slate-800">{group.offer.nombre_oferta}</h3>
              </div>
              <table className="w-full text-left">
                <tbody>
                  {group.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 text-sm">
                      <td className="p-3 font-mono w-32">{item.codigo_articulo}</td>
                      <td className="p-3 text-slate-800">{item.descripcion}</td>
                      <td className="p-3 w-48 text-slate-600">{item.nombre_proveedor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {Object.keys(searchResults).length === 0 && (
            <p className="text-center text-slate-500 p-8 bg-white rounded-xl border border-slate-200">No se encontraron artículos.</p>
          )}
        </div>
      ) : (
        <>
          <form onSubmit={handleCreateOffer} className="flex gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex-[2]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Oferta</label>
              <input type="text" value={newOfferName} onChange={e => setNewOfferName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Inicio</label>
              <input type="date" value={newOfferStart} onChange={e => setNewOfferStart(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin</label>
              <input type="date" value={newOfferEnd} onChange={e => setNewOfferEnd(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition h-[42px]">Crear</button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map(o => (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition cursor-pointer relative group" onClick={() => setSelectedOffer(o)}>
                <h3 className="font-bold text-lg text-slate-800 mb-2 pr-8">{o.nombre_oferta}</h3>
                <p className="text-sm text-slate-500">Del: {o.vigencia_inicio || '-'}</p>
                <p className="text-sm text-slate-500">Al: {o.vigencia_fin || '-'}</p>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteOffer(o.id); }} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
