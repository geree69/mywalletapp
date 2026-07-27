import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la API Key en el entorno' }, { status: 500 });
    }

    // Inicializamos el SDK clásico y más estable
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Le pedimos explícitamente la versión "latest" para evitar el error 404
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    let prompt = '';
    let result;

    if (file) {
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      
      prompt = `Analiza este documento y extrae los movimientos financieros en un JSON válido con un array llamado "transactions" que contenga: date ("YYYY-MM-DD", usando el año ${currentYear} si no hay), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano). Solo devuelve el JSON puro sin markdown.`;
      
      const imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ];
      
      result = await model.generateContent([prompt, ...imageParts]);
    } else {
      prompt = `Analiza este texto y extrae las transacciones en un JSON con formato {"transactions": [...]}. Solo devuelve el JSON puro.`;
      result = await model.generateContent(prompt);
    }

    const responseText = result.response.text();
    
    // Limpiamos los "backticks" (```json) que Google a veces incluye y rompen el código
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText || '{"transactions":[]}');

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar con IA' }, { status: 500 });
  }
}