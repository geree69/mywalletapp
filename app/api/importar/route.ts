import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la variable OPENROUTER_API_KEY en Vercel' }, { status: 500 });
    }

    // Configuración para usar los servidores gratuitos de OpenRouter con la librería de OpenAI
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
    IMPORTANTE: No añadas saludos, ni explicaciones, ni texto en formato markdown. Devuelve SOLO el código JSON puro.`;

    let messages: any[] = [];

    if (file) {
      // Procesamiento de la imagen del ticket
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
      // Procesamiento de solo texto
      messages = [
        {
          role: 'user',
          content: `${promptText}\n\nTexto a analizar:\n${textContent}`
        }
      ];
    }

    // Llamada al modelo Llama 3.2 11B Vision (100% Gratis en OpenRouter)
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      messages: messages,
      temperature: 0.1, // Temperatura baja para respuestas precisas y sin inventos
    });

    let responseText = response.choices[0]?.message?.content || '{"transactions":[]}';

    // LIMPIEZA EXTREMA DEL JSON: Para evitar que un texto mal formateado rompa tu app
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
      error: `Error de OpenRouter AI: ${error.message || 'Error desconocido al procesar el archivo'}` 
    }, { status: 500 });
  }
}