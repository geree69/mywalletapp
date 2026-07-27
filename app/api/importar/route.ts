import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    let contents: any[] = [];
    const currentYear = new Date().getFullYear();

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = buffer.toString('base64');
      
      contents = [
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        },
        `Analiza esta imagen, PDF o documento de un extracto bancario, ticket o captura de pantalla. Extrae todos los movimientos financieros que encuentres. 
        Devuelve estrictamente un JSON válido con un array llamado "transactions", donde cada elemento tenga exactamente estas propiedades:
        - date: "YYYY-MM-DD" (si no hay año exacto, usa el año actual ${currentYear})
        - title: "Nombre del comercio o concepto limpio"
        - amount: número positivo (ej: 45.90)
        - type: "expense" (si es un gasto/cargo) o "income" (si es un ingreso/abono)
        - category: "Categoría sugerida (ej: Alimentación, Transporte, Ocio, Nómina, Suscripciones, etc.)"
        - isRecurring: booleano (true si parece un gasto fijo mensual como alquiler, luz, netflix, etc., false si no)
        No incluyas texto adicional ni formato markdown fuera del JSON, solo el JSON puro.`
      ];
    } else {
      contents = [
        `Analiza el siguiente texto de movimientos bancarios. Extrae todos los movimientos.
        Devuelve estrictamente un JSON válido con un array llamado "transactions", con las propiedades: date ("YYYY-MM-DD"), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano).
        Texto: ${textContent}`
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text;
    const data = JSON.parse(resultText || '{"transactions":[]}');

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error procesando con IA:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el archivo con IA' }, { status: 500 });
  }
}