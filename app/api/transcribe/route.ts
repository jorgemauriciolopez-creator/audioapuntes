import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "message" in error.error &&
    typeof error.error.message === "string"
  ) {
    return error.error.message;
  }

  return "No se pudo transcribir el archivo.";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar OPENAI_API_KEY en .env.local." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecciona un archivo de audio o video." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo debe pesar 25 MB o menos." },
      { status: 400 }
    );
  }

  const openAiFormData = new FormData();
  openAiFormData.append("file", file);
  openAiFormData.append("model", "gpt-4o-mini-transcribe");
  openAiFormData.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: openAiFormData
  });

  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: getErrorMessage(result) },
      { status: response.status }
    );
  }

  if (typeof result.text !== "string") {
    return NextResponse.json(
      { error: "OpenAI no devolvio una transcripcion valida." },
      { status: 502 }
    );
  }

  return NextResponse.json({ text: result.text });
}
