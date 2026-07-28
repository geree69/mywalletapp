import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

// Función auxiliar para pausar la ejecución (Delay)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la API Key en el entorno de Vercel' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    let contents = [];

    if (file) {
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      
      contents = [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: `Analiza este documento y extrae los movimientos financieros en un JSON válido con un array llamado "transactions" que contenga: date ("YYYY-MM-DD", usando el año ${currentYear} si no hay), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano). Solo devuelve el JSON puro sin markdown.` }
          ]
        }
      ];
    } else {
      contents = [
        {
          role: 'user',
          parts: [{ text: `Analiza este texto y extrae las transacciones en un JSON con formato {"transactions": [...]}.` }]
        }
      ];
    }

    let response;
    let success = false;
    const maxRetries = 3; // Intentará hasta 3 veces antes de rendirse

    // BUCLE DE REINTENTO AUTOMÁTICO
    for (let i = 0; i < maxRetries; i++) {
      try {
        response = await ai.models.generateContent({
          // AQUÍ ESTABA MI ERROR: Ya está puesto el modelo estable que te funciona
          model: 'gemini-3.5-flash', 
          contents: contents,
          config: {
            responseMimeType: 'application/json',
          }
        });
        
        success = true;
        break; // Si tiene éxito, rompe el bucle al instante
        
      } catch (err: any) {
        const errorMessage = err.message || '';
        
        // Si el error es de sobrecarga (503), esperamos y volvemos a intentarlo
        if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
          console.warn(`Intento ${i + 1} fallido por sobrecarga. Reintentando...`);
          if (i < maxRetries - 1) {
            await delay(2500); // Espera 2.5 segundos antes de volver a llamar
          }
        } else {
          // Si es un error distinto (como el 404), lanzamos el error
          throw err;
        }
      }
    }

    // Si después de 3 intentos sigue fallando, informamos al usuario
    if (!success || !response) {
      throw new Error('Google está experimentando una sobrecarga masiva. Por favor, inténtalo en 1 minuto.');
    }

    const responseText = response.text || '{"transactions":[]}';
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar con IA' }, { status: 500 });
  }
}