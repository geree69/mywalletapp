import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

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

    // Usamos el modelo gemini-3.5-flash que es súper estable y evita el error 503
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '{"transactions":[]}';
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar con IA' }, { status: 500 });
  }
}