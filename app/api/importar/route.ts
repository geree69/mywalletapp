import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'La variable GEMINI_API_KEY no está configurada en el entorno.' },
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
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      });
      
      parts.push({
        text: `Analiza esta imagen, PDF o documento de un extracto bancario, ticket o captura de pantalla. Extrae todos los movimientos financieros que encuentres. 
        Devuelve estrictamente un JSON válido con un array llamado "transactions", donde cada elemento tenga exactamente estas propiedades:
        - date: "YYYY-MM-DD" (si no hay año exacto, usa el año actual ${currentYear})
        - title: "Nombre del comercio o concepto limpio"
        - amount: número positivo (ej: 45.90)
        - type: "expense" (si es un gasto/cargo) o "income" (si es un ingreso/abono)
        - category: "Categoría sugerida (ej: Alimentación, Transporte, Ocio, Nómina, Suscripciones, etc.)"
        - isRecurring: booleano (true si parece un gasto fijo mensual como alquiler, luz, netflix, etc., false si no)
        No incluyas texto adicional ni formato markdown fuera del JSON, solo el JSON puro.`
      });
    } else {
      parts.push({
        text: `Analiza el siguiente texto de movimientos bancarios. Extrae todos los movimientos.
        Devuelve estrictamente un JSON válido con un array llamado "transactions", con las propiedades: date ("YYYY-MM-DD"), title, amount (número positivo), type ("expense" o "income"), category, isRecurring (booleano).
        Texto: ${textContent}`
      });
    }

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        }),
      }
    );

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      throw new Error(`Error de la API de Gemini: ${errText}`);
    }

    const resultJson = await apiResponse.json();
    const resultText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || '{"transactions":[]}';
    const data = JSON.parse(resultText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error procesando con IA:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el archivo con IA' }, { status: 500 });
  }
}