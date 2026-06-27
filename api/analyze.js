import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciar la IA (Usaremos process.env.GEMINI_API_KEY que configuraremos en Vercel)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Elegir el modelo de visión
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analiza esta imagen y extrae todas las ofertas, precios o productos que encuentres. 
    Devuelve ÚNICAMENTE un array en formato JSON con la siguiente estructura, sin texto adicional antes o después:
    [
      {
        "productName": "Nombre del producto",
        "price": "Precio extraído",
        "details": "Cualquier detalle extra o condición de la oferta"
      }
    ]
    Si no encuentras ofertas, devuelve un array vacío [].`;

    // Preparar la imagen para Gemini (quitando el prefijo de base64 si lo tiene)
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const image = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    let text = response.text();

    // Limpiar el texto devuelto por si la IA añade markdown (ej. ```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(text);

    return res.status(200).json({ offers: parsedData });

  } catch (error) {
    console.error('Error analyzing image:', error);
    return res.status(500).json({ error: 'Error procesando la imagen' });
  }
}
