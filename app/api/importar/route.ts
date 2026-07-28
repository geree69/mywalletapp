import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la API Key en el entorno de Vercel' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const prompt = `Analiza este documento/texto y extrae los movimientos financieros en un JSON válido con un array llamado "transactions" que contenga: date ("YYYY-MM-DD", usando el año ${currentYear} si no hay), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano). Solo devuelve el JSON puro.`;

    let result;

    if (file) {
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      };

      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent([prompt, textContent || '']);
    }

    const responseText = result.response.text() || '{"transactions":[]}';
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado en el servidor:', error);
    return NextResponse.json({ 
      error: `Error de Google AI: ${error.message || 'Error desconocido'}` 
    }, { status: 500 });
  }
}