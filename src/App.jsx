import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Loader2, Save, FileText, CheckCircle2, AlertCircle, Eye, Trash2, Search } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Schedule from './components/Schedule';

function App() {
  const [currentTab, setCurrentTab] = useState('offers'); // 'offers' | 'schedule'
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'metadata' | 'editor' | 'success'
  
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Metadata state
  const [offerName, setOfferName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Table state
  const [tableData, setTableData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dashboard state
  const [savedOffers, setSavedOffers] = useState([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [currentOfferId, setCurrentOfferId] = useState(null); // Para saber si estamos editando o creando

  const loadOffers = async () => {
    setIsLoadingOffers(true);
    setStep('dashboard');
    try {
      const q = query(collection(db, 'catalogs'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const offers = [];
      querySnapshot.forEach((doc) => {
        offers.push({ id: doc.id, ...doc.data() });
      });
      setSavedOffers(offers);
    } catch (error) {
      console.error("Error loading offers: ", error);
      alert("Hubo un error al cargar las ofertas.");
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta oferta de forma permanente?")) return;
    try {
      await deleteDoc(doc(db, 'catalogs', id));
      setSavedOffers(prev => prev.filter(offer => offer.id !== id));
    } catch (error) {
      console.error("Error al borrar:", error);
      alert("No se pudo eliminar la oferta.");
    }
  };

  const viewOffer = (offer) => {
    setCurrentOfferId(offer.id);
    setOfferName(offer.offerName);
    setStartDate(offer.startDate);
    setEndDate(offer.endDate);
    setTableData(offer.items || []);
    setSearchQuery('');
    // Usamos el mismo editor para visualizar y poder editar
    setStep('editor');
  };

  // --- Handlers ---
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // Si no es imagen, procesar normal (ej. PDF en el futuro)
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
        return;
      }

      // Optimización de velocidad: Comprimir imagen antes de enviarla a la IA
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; // Reducir a max 1200px para acelerar la red
          const scaleSize = MAX_WIDTH / img.width;
          
          let width = img.width;
          let height = img.height;

          if (scaleSize < 1) {
            width = MAX_WIDTH;
            height = img.height * scaleSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Comprimir en JPEG calidad 80% (acelera enormemente el upload)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = error => reject(error);
        img.src = event.target.result;
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file) => {
    setSelectedFile(file);
    setStep('processing');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("Error: Faltan credenciales de Gemini (VITE_GEMINI_API_KEY). Usando datos de prueba por defecto.");
        // Fallback a datos de prueba si no hay API Key para que no se bloquee la app
        setTableData([
           { id: 1, proveedor: 'FALTA API', numeroProveedor: '', codigoProducto: '123', descripcion: 'Configura el .env', precioNormal: '0', precioOferta: '0' }
        ]);
        setStep('metadata');
        return;
      }

      // 1. Convertir imagen a base64
      const base64Data = await fileToBase64(file);
      const mimeType = file.type;

      // 2. Prompt estricto del usuario
      const promptText = `Analiza la tabla de la imagen adjunta y extrae los datos fila por fila. Aplica las siguientes reglas de mapeo estrictas:
Código de producto: Extraer de la 1ª columna (fondo rojo). Si contiene guiones o más de 6 caracteres, extrae solo los primeros 6 dígitos numéricos.   
Número de proveedor: Extraer de la 2ª columna. Si la celda está vacía (como ocurre en varias filas), devuelve "".   
Descripción del artículo: Extraer de la 3ª columna.   
Proveedor: Debes DEDUCIRLO a partir de la 3ª columna. Extrae la marca que aparece en letras mayúsculas dentro de la descripción del producto (ejemplo: si dice 'Queso gouda CONAPROLE - kg', el proveedor es 'CONAPROLE'). Si no es evidente, devuelve "".   
Precio normal: Extraer de la 4ª columna. Devuelve solo el valor numérico.   
Precio de venta: Extraer de la 5ª columna. Devuelve solo el valor numérico.

El LLM debe responder únicamente con un objeto JSON válido que contenga un array de objetos. Las claves deben ser exactamente: proveedor, numero_proveedor, codigo_producto, descripcion, precio_normal, precio_venta. No incluyas markdown, texto adicional ni explicaciones.`;

      // 3. Petición a Gemini REST API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let responseText = data.candidates[0].content.parts[0].text;
      
      // 4. Limpieza (por si el modelo incluye markdown a pesar de las restricciones)
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(responseText);
      
      // 5. Mapear el JSON al formato de la tabla del frontend
      // El array devuelto puede ser directo o estar envuelto en un objeto { "ofertas": [...] }
      let itemsArray = [];
      if (Array.isArray(parsedData)) {
        itemsArray = parsedData;
      } else {
        // Encontrar la primera propiedad que sea un array
        const arrayKey = Object.keys(parsedData).find(key => Array.isArray(parsedData[key]));
        if (arrayKey) itemsArray = parsedData[arrayKey];
        else throw new Error("No se encontró un array en la respuesta JSON");
      }

      const formattedData = itemsArray.map((item, index) => ({
        id: index + 1,
        proveedor: item.proveedor || "",
        numeroProveedor: item.numero_proveedor || "",
        codigoProducto: item.codigo_producto || "",
        descripcion: item.descripcion || "",
        precioNormal: item.precio_normal || "",
        precioOferta: item.precio_venta || ""
      }));

      setTableData(formattedData);
      setStep('metadata');
      
    } catch (error) {
      console.error("Error procesando con Gemini:", error);
      alert("Error detallado: " + error.message + "\n\nPor favor, verifica la consola (F12) si necesitas más detalles.");
      setStep('upload');
    }
  };

  const handleMetadataSubmit = (e) => {
    e.preventDefault();
    if (!offerName.trim() || !startDate || !endDate) return;
    setStep('editor');
  };

  const handleCellChange = (id, field, value) => {
    setTableData(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const validateCode = (code) => {
    return code && code.length === 6 && /^\d+$/.test(code);
  };

  const saveToFirebase = async () => {
    setIsSaving(true);
    try {
      // Validaciones estrictas removidas por solicitud del usuario
      // Se permite guardar aunque falten datos o el código no tenga 6 dígitos

      // Save to Firestore
      const docData = {
        offerName,
        startDate,
        endDate,
        fileName: selectedFile?.name || 'Archivo desconocido',
        items: tableData,
        createdAt: new Date().toISOString()
      };
      
      if (currentOfferId) {
        // Actualizar existente
        await updateDoc(doc(db, 'catalogs', currentOfferId), {
          offerName, startDate, endDate, items: tableData
        });
      } else {
        // Crear nuevo
        await addDoc(collection(db, 'catalogs'), docData);
      }
      
      setStep('success');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Hubo un error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetApp = () => {
    setOfferName('');
    setStartDate('');
    setEndDate('');
    setTableData([]);
    setSelectedFile(null);
    setCurrentOfferId(null);
    setSearchQuery('');
    setStep('upload');
  };

  const filteredData = tableData.filter(row => {
    if (!searchQuery) return true;
    const queryLower = searchQuery.toLowerCase();
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(queryLower)
    );
  });

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestor de Ofertas IA</h1>
          <p>Procesamiento inteligente de catálogos y promociones</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setCurrentTab('offers')}
              style={{ background: currentTab === 'offers' ? 'white' : 'transparent', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: currentTab === 'offers' ? '#0f172a' : '#64748b', boxShadow: currentTab === 'offers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Ofertas
            </button>
            <button 
              onClick={() => setCurrentTab('schedule')}
              style={{ background: currentTab === 'schedule' ? 'white' : 'transparent', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: currentTab === 'schedule' ? '#0f172a' : '#64748b', boxShadow: currentTab === 'schedule' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Agenda
            </button>
          </div>
          {currentTab === 'offers' && (
            step === 'dashboard' ? (
              <button className="btn-primary" onClick={() => setStep('upload')}>
                Nueva Oferta
              </button>
            ) : (
              <button className="btn-secondary" onClick={loadOffers}>
                <FileText size={16} /> Ver Ofertas
              </button>
            )
          )}
        </div>
      </header>

      {currentTab === 'schedule' ? (
        <Schedule />
      ) : (
        <>
          {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div 
          className={`dropzone-container ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={48} className="dropzone-icon" />
          <p className="dropzone-text">Haz clic o arrastra un archivo aquí</p>
          <p className="dropzone-subtext">Soporta JPG, PNG, PDF, XLSX, DOCX</p>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".jpg,.jpeg,.png,.pdf,.xlsx,.docx"
          />
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === 'processing' && (
        <div className="loading-container">
          <Loader2 size={48} className="spinner" />
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Analizando documento...</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Extrayendo tablas, precios y proveedores mediante IA</p>
        </div>
      )}

      {/* STEP 3: METADATA MODAL */}
      {step === 'metadata' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Datos de la Oferta</h2>
            <form onSubmit={handleMetadataSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre de la oferta o catálogo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Promociones Verano 2026"
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="date-row form-group">
                <div>
                  <label className="form-label">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Fecha de Fin</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="submit" className="btn-primary" disabled={!offerName.trim() || !startDate || !endDate}>
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STEP 4: EDITOR TABLE */}
      {step === 'editor' && (
        <div className="workspace-container">
          <div className="workspace-header">
            <div className="workspace-meta">
              <h2>{offerName}</h2>
              <p>Vigencia: {startDate} al {endDate} • {selectedFile?.name}</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Buscar producto, marca..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', width: '250px' }}
                />
              </div>
              <button className="btn-primary btn-sage" onClick={saveToFirebase} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spinner" style={{margin:0, animation: 'spin 1s linear infinite'}} /> : <Save size={16} />}
                Guardar Datos
              </button>
            </div>
          </div>
          
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>N°</th>
                  <th style={{ width: '15%' }}>Proveedor</th>
                  <th style={{ width: '10%' }}>N° Proveedor</th>
                  <th style={{ width: '12%' }}>Código (6 dígitos)</th>
                  <th style={{ width: 'auto', minWidth: '300px' }}>Descripción</th>
                  <th style={{ width: '10%' }}>Precio Normal</th>
                  <th style={{ width: '10%' }}>Precio Oferta</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                      {index + 1}
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input"
                        value={row.proveedor} 
                        onChange={(e) => handleCellChange(row.id, 'proveedor', e.target.value)}
                        placeholder="Opcional"
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input"
                        value={row.numeroProveedor} 
                        onChange={(e) => handleCellChange(row.id, 'numeroProveedor', e.target.value)}
                        placeholder="Opcional"
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input"
                        value={row.codigoProducto} 
                        onChange={(e) => handleCellChange(row.id, 'codigoProducto', e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input"
                        value={row.descripcion} 
                        onChange={(e) => handleCellChange(row.id, 'descripcion', e.target.value)}
                        placeholder="Opcional"
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input"
                        value={row.precioNormal} 
                        onChange={(e) => handleCellChange(row.id, 'precioNormal', e.target.value)}
                        placeholder="$0.00"
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input"
                        value={row.precioOferta} 
                        onChange={(e) => handleCellChange(row.id, 'precioOferta', e.target.value)}
                        placeholder="$0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS */}
      {step === 'success' && (
        <div className="loading-container" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--accent-sage)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>¡Catálogo guardado!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Los datos se han sincronizado correctamente en la base de datos.</p>
          <button className="btn-primary" onClick={resetApp}>Subir otro archivo</button>
        </div>
      )}

      {/* STEP 6: DASHBOARD */}
      {step === 'dashboard' && (
        <div className="workspace-container" style={{ maxWidth: '800px', margin: '0 auto', background: 'transparent', boxShadow: 'none' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>Tus Ofertas Guardadas</h2>
          
          {isLoadingOffers ? (
            <div className="loading-container">
              <Loader2 size={32} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <p>Cargando ofertas...</p>
            </div>
          ) : savedOffers.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Aún no has guardado ninguna oferta.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {savedOffers.map(offer => (
                <div key={offer.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{offer.offerName}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Vigencia: {offer.startDate} al {offer.endDate}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ display: 'inline-block', background: '#e2e8f0', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {offer.items?.length || 0} ítems
                    </span>
                    <button 
                      onClick={() => viewOffer(offer)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-slate)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500' }}
                    >
                      <Eye size={18} /> Ver
                    </button>
                    <button 
                      onClick={() => deleteOffer(offer.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500' }}
                    >
                      <Trash2 size={18} /> Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default App;
