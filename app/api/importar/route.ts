import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la variable GROQ_API_KEY en Vercel' }, { status: 500 });
    }

    // Inicializamos Groq
    const groq = new Groq({ apiKey });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const promptText = `Analiza este documento (ticket/factura) o texto y extrae los movimientos financieros. 
    DEBES responder ÚNICAMENTE con un objeto JSON válido que contenga un array llamado "transactions".
    Cada transacción debe tener:
    - date: "YYYY-MM-DD" (usa el año ${currentYear} si no se especifica).
    - title: Concepto breve.
    - amount: Número positivo (formato numérico).
    - type: "expense" o "income".
    - category: Categoría.
    - isRecurring: false.
    NO añadas texto antes ni después del JSON. NO uses markdown. Devuelve solo el código JSON puro.`;

    let messages: any[] = [];

    if (file) {
      // Si es una imagen (ticket/factura)
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
      // Si es solo texto
      messages = [
        {
          role: 'user',
          content: `${promptText}\n\nTexto a analizar:\n${textContent}`
        }
      ];
    }

    // Usamos Llama 3.2 90B Vision, un modelo brutalmente potente y gratis en Groq
    const response = await groq.chat.completions.create({
      model: file ? 'llama-3.2-90b-vision-preview' : 'llama-3.1-8b-instant',
      messages: messages,
      temperature: 0.1, // Temperatura baja para que no se invente datos
    });

    let responseText = response.choices[0]?.message?.content || '{"transactions":[]}';

    // LIMPIEZA EXTREMA: A veces la IA añade texto basura alrededor del JSON, esto lo limpia
    responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Busca dónde empieza y acaba el JSON real
    if (jsonMatch) {
        responseText = jsonMatch[0];
    }

    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado en el servidor:', error);
    return NextResponse.json({ 
      error: `Error de Groq AI: ${error.message || 'Error desconocido'}` 
    }, { status: 500 });
  }
}