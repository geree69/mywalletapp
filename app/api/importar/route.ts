import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la variable OPENROUTER_API_KEY en Vercel' }, { status: 500 });
    }

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
    const promptText = `Eres un asistente financiero experto. Analiza el documento o texto proporcionado y extrae los movimientos financieros. 
    DEBES responder ÚNICAMENTE con un objeto JSON válido que contenga un array llamado "transactions".
    Cada transacción debe tener:
    - date: "YYYY-MM-DD" (usa el año ${currentYear} si no se especifica).
    - title: Concepto breve.
    - amount: Número positivo (formato numérico).
    - type: "expense" o "income".
    - category: Categoría del gasto/ingreso.
    - isRecurring: false.
    IMPORTANTE: No añadas saludos, ni explicaciones. Devuelve SOLO el código JSON puro.`;

    let messages: any[] = [];

    if (file) {
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
      messages = [
        {
          role: 'user',
          content: `${promptText}\n\nTexto a analizar:\n${textContent}`
        }
      ];
    }

    // LISTA DE RESPALDO: Usamos los modelos gratuitos de Gemini con visión. Si falla el 2.0, prueba el 1.5.
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash:free,google/gemini-1.5-flash:free',
      messages: messages,
      temperature: 0.0,
    });

    const responseText = response.choices[0]?.message?.content || '';

    let cleanText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    let data;
    try {
      data = JSON.parse(cleanText);
      if (Array.isArray(data)) {
        data = { transactions: data };
      }
    } catch (parseError) {
      // AQUÍ ESTÁ LA MAGIA NUEVA: Si falla, te mostrará qué narices ha respondido la IA
      console.error('Error al parsear:', cleanText);
      return NextResponse.json({ 
        error: `La IA no devolvió un formato válido. Respuesta de la IA: "${responseText.substring(0, 150)}..."` 
      }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado en el servidor:', error);
    return NextResponse.json({ 
      error: `Error de OpenRouter AI: ${error.message || 'Error desconocido al procesar el archivo'}` 
    }, { status: 500 });
  }
}