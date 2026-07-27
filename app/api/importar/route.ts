import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: `🔥 MODO DEBUG: Vercel está leyendo tu código, pero la API Key sigue invisible. Entorno: ${process.env.NODE_ENV}` },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const textContent = formData.get('text') as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo o texto' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    let parts: any[] = [];

    if (file) {
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      
      parts.push({
        inlineData: { mimeType: file.type, data: base64Data }
      });
      
      parts.push({
        text: `Analiza este documento y extrae los movimientos financieros en un JSON válido con un array llamado "transactions" que contenga: date ("YYYY-MM-DD", usando el año ${currentYear} si no hay), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano). Solo devuelve el JSON puro sin markdown.`
      });
    } else {
      parts.push({
        text: `Analiza este texto y extrae las transacciones en un JSON con formato {"transactions": [...]}.`
      });
    }

    // Quitamos la clave de la URL para que Google no se confunda
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 🔴 LA ENVIAMOS POR AQUÍ: Esta es la forma oficial y a prueba de balas
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      throw new Error(`Google API Error (${apiResponse.status}): ${errText}`);
    }

    const resultJson = await apiResponse.json();
    const resultText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || '{"transactions":[]}';
    const data = JSON.parse(resultText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error detallado:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar con IA' }, { status: 500 });
  }
}