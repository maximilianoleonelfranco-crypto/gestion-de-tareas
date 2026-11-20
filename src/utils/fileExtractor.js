import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';

// Obtiene la API Key de Gemini desde variables de entorno o localStorage
export const getGeminiApiKey = () => {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem('gemini_api_key') ||
    ''
  );
};

// Convierte un archivo a Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Convierte archivo Excel (.xlsx / .xls) a texto estructurado
const parseExcelToText = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const lines = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    // Convertir a CSV para que los delimitadores sean claros
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv && csv.trim().length > 0) {
      lines.push(`--- HOJA: ${sheetName} ---`);
      lines.push(csv);
    }
  });

  return lines.join('\n\n');
};

// Convierte archivo de texto (.txt / .csv / .tsv) a string
const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

/**
 * Extrae productos y proveedores desde cualquier tipo de archivo usando Gemini.
 * @param {File} file - El archivo seleccionado (imagen, pdf, excel, texto, etc.)
 * @param {Object} options - { defaultProviderCode, expandCompoundCodes, apiKey }
 * @returns {Promise<{ success: boolean, items?: Array, error?: string }>}
 */
export async function extractProductsFromFile(file, options = {}) {
  const {
    defaultProviderCode = '',
    expandCompoundCodes = true,
    apiKey = getGeminiApiKey()
  } = options;

  if (!apiKey) {
    throw new Error(
      'No se encontró la clave de API de Gemini (VITE_GEMINI_API_KEY). Por favor configúrala.'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Probamos gemini-2.5-flash y gemini-2.0-flash como fallback
  const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  const promptText = `Eres un asistente experto en digitalización de catálogos y ofertas de supermercados y distribuidoras.
Tu tarea es analizar el documento adjunto (puede ser una imagen de una hoja impresa, un PDF, un Excel o un archivo de texto) y extraer de forma exhaustiva y precisa la lista de todos los productos en oferta o inventario.

Para CADA producto debes extraer:
1. "codigo_articulo": El código numérico o alfanumérico del producto / artículo (generalmente de 4 a 8 dígitos, ej: 243313, 12018, 300947, 360120, etc.).
   - IMPORTANTE CON CÓDIGOS COMPUESTOS O MÚLTIPLES:
     ${expandCompoundCodes ? `Si una fila tiene códigos combinados o separados por barras o guiones (ejemplo: "212031/032", "270720 - 270721", "212033/034/035/036", "241059/069/241308"), RECONSTRUYE y GENERA UN ITEM INDEPENDIENTE para cada código con la misma descripción y proveedor (ej: genera un item con 212031 y otro con 212032). Si no puedes deducir con certeza los prefijos de los sufijos cortos, mantén el código completo tal como aparece.` : `Conserva el código tal como aparece en el documento.`}
2. "codigo_proveedor": El número o código del proveedor asociado al producto si está presente (ej: 10959, 12018, 28040, etc.).
   - Si el documento no tiene columna de proveedor o está vacía para ese producto, déjalo como string vacío: "".
3. "descripcion": La descripción o nombre completo del producto (ej: "Papas MC.CAIN air fryer finitas bl. 700 grs.", "JAMON EXTRA DE CAMPO CAMPOSUR AHUMADO - 100 GR", etc.). Limpia caracteres extraños.

REGLAS ESTRICTAS:
- No inventes productos.
- Omite encabezados de página, fechas de impresión, números de página, totales o títulos de familia que no correspondan a productos individuales.
- Tu respuesta DEBE SER EXCLUSIVAMENTE un bloque de código JSON válido con la lista de objetos.
Formato de salida esperado:
[
  {
    "codigo_articulo": "243313",
    "codigo_proveedor": "21203",
    "descripcion": "Papas MC.CAIN air fryer finitas bl. 700 grs."
  }
]`;

  let contentParts = [];

  const fileName = file.name.toLowerCase();
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(fileName);
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(fileName);
  const isExcel = /\.(xlsx|xls)$/i.test(fileName) || file.type.includes('spreadsheet') || file.type.includes('excel');
  const isText = file.type.startsWith('text/') || /\.(txt|csv|tsv|dat|json)$/i.test(fileName);

  if (isImage || isPdf) {
    const { base64, mimeType } = await fileToBase64(file);
    const resolvedMime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
    contentParts = [
      promptText,
      {
        inlineData: {
          data: base64,
          mimeType: resolvedMime
        }
      }
    ];
  } else if (isExcel) {
    const excelText = await parseExcelToText(file);
    contentParts = [
      `${promptText}\n\nAquí tienes el contenido extraído de las hojas de Excel:\n${excelText}`
    ];
  } else if (isText) {
    const textContent = await readTextFile(file);
    contentParts = [
      `${promptText}\n\nAquí tienes el contenido del archivo de texto:\n${textContent}`
    ];
  } else {
    // Para otros tipos de archivos, intentamos leer como texto primero, o como base64
    try {
      const textContent = await readTextFile(file);
      contentParts = [
        `${promptText}\n\nContenido del archivo:\n${textContent}`
      ];
    } catch {
      const { base64, mimeType } = await fileToBase64(file);
      contentParts = [
        promptText,
        {
          inlineData: {
            data: base64,
            mimeType: mimeType || 'application/octet-stream'
          }
        }
      ];
    }
  }

  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });

      const response = await model.generateContent(contentParts);
      let rawText = response.response.text();

      // Limpieza de formato markdown si lo hubiera
      rawText = rawText.trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedItems = JSON.parse(rawText);

      if (!Array.isArray(parsedItems)) {
        throw new Error('El modelo no devolvió una lista de productos.');
      }

      // Normalización y enriquecimiento de items
      const cleanItems = parsedItems
        .filter((item) => item && (item.codigo_articulo || item.descripcion))
        .map((item, index) => {
          let artCode = String(item.codigo_articulo || '').trim();
          let provCode = String(item.codigo_proveedor || '').trim();
          const desc = String(item.descripcion || '').trim();

          // Si no tiene código de proveedor y el usuario especificó uno por defecto
          if (!provCode && defaultProviderCode) {
            provCode = defaultProviderCode.trim();
          }

          return {
            tempId: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
            codigo_articulo: artCode,
            codigo_proveedor: provCode,
            descripcion: desc,
            nombre_proveedor: '' // Se llenará en la UI al consultar proveedores
          };
        });

      return {
        success: true,
        items: cleanItems,
        totalExtracted: cleanItems.length,
        modelUsed: modelName
      };
    } catch (err) {
      console.warn(`Fallo con el modelo ${modelName}:`, err.message);
      lastError = err;
      // Probar siguiente modelo
    }
  }

  throw new Error(
    `No se pudo procesar el archivo con IA: ${lastError?.message || 'Error desconocido'}`
  );
}
