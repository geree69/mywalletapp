import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la API Key en el entorno de Vercel' }, { status: 500 });
    }

    // Inicializar con el SDK oficial
    const ai = new GoogleGenAI({ apiKey });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    let contents: any[] = [];

    if (file) {
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');

      contents.push({
        inlineData: { mimeType: file.type, data: base64Data }
      });

      contents.push({
        text: `Analiza este documento y extrae los movimientos financieros en un JSON válido con un array llamado "transactions" que contenga: date ("YYYY-MM-DD", usando el año ${currentYear} si no hay), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano). Solo devuelve el JSON puro sin markdown.`
      });
    } else {
      contents.push({
        text: `Analiza este texto y extrae las transacciones en un JSON con formato {"transactions": [...]}.`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text || '{"transactions":[]}';
    const data = JSON.parse(resultText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado SDK:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar con IA' }, { status: 500 });
  }
}