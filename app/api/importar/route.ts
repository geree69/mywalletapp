import { NextResponse } from 'next/server';
import OpenAI from 'openai'; // Reutilizamos la librería que ya tienes instalada

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la variable OPENROUTER_API_KEY en Vercel' }, { status: 500 });
    }

    // MAGIA: Usamos el formato de OpenAI pero lo conectamos a los servidores gratuitos de OpenRouter
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const promptText = `Eres un asistente financiero. Analiza este documento o texto y extrae los movimientos financieros. 
    DEBES responder ÚNICAMENTE con un objeto JSON válido que contenga un array llamado "transactions".
    Cada transacción debe tener:
    - date: "YYYY-MM-DD" (usa el año ${currentYear} si no se especifica).
    - title: Concepto breve.
    - amount: Número positivo (formato numérico).
    - type: "expense" o "income".
    - category: Categoría.
    - isRecurring: false.
    NO añadas texto antes ni después del JSON. Solo devuelve el código JSON puro.`;

    let messages: any[] = [];

    if (file) {
      // Imagen del ticket
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      const fileUrl = `data:${file.type};base64,${base64Data}`;

      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: fileUrl } }
          ]
        }
      ];
    } else {
      // Solo texto
      messages = [
        {
          role: 'user',
          content: `${promptText}\n\nTexto a analizar:\n${textContent}`
        }
      ];
    }

    // Usamos el modelo Gemini 2.0 Flash a través de OpenRouter (100% GRATIS)
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
      messages: messages,
      temperature: 0.1,
    });

    let responseText = response.choices[0]?.message?.content || '{"transactions":[]}';

    // Limpieza por si la IA añade texto extra
    responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); 
    if (jsonMatch) {
        responseText = jsonMatch[0];
    }

    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado en el servidor:', error);
    return NextResponse.json({ 
      error: `Error de OpenRouter AI: ${error.message || 'Error desconocido'}` 
    }, { status: 500 });
  }
}