import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const GEMINI_MODEL = "gemini-3.5-flash";

type GeminiPart = {
  text?: unknown;
};

type GeminiFileUpload = {
  file?: {
    uri?: unknown;
    mimeType?: unknown;
  };
};

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

async function uploadFileToGemini(
  apiKey: string,
  file: File
) {
  const startUploadResponse = await fetch(
    "https://generativelanguage.googleapis.com/upload/v1beta/files",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(file.size),
        "X-Goog-Upload-Header-Content-Type": file.type,
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        file: {
          display_name: file.name || "audioapuntes-file"
        }
      })
    }
  );

  if (!startUploadResponse.ok) {
    const result = await startUploadResponse.json();
    throw new Error(getErrorMessage(result));
  }

  const uploadUrl = startUploadResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new Error("Gemini no devolvio una URL para subir el archivo.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(file.size),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize"
    },
    body: file
  });

  const uploadResult = (await uploadResponse.json()) as GeminiFileUpload;

  if (!uploadResponse.ok) {
    throw new Error(getErrorMessage(uploadResult));
  }

  if (typeof uploadResult.file?.uri !== "string") {
    throw new Error("Gemini no devolvio una referencia valida del archivo.");
  }

  return {
    uri: uploadResult.file.uri,
    mimeType:
      typeof uploadResult.file.mimeType === "string"
        ? uploadResult.file.mimeType
        : file.type
  };
}

function getTranscriptionText(result: unknown) {
  if (
    typeof result !== "object" ||
    result === null ||
    !("candidates" in result) ||
    !Array.isArray(result.candidates)
  ) {
    return "";
  }

  const candidate = result.candidates[0];

  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("content" in candidate) ||
    typeof candidate.content !== "object" ||
    candidate.content === null ||
    !("parts" in candidate.content) ||
    !Array.isArray(candidate.content.parts)
  ) {
    return "";
  }

  const parts = candidate.content.parts as GeminiPart[];

  return parts
    .map((part) =>
      typeof part === "object" &&
      part !== null &&
      "text" in part &&
      typeof part.text === "string"
        ? part.text
        : ""
    )
    .join("")
    .trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar GEMINI_API_KEY en .env.local." },
      { status: 500 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Selecciona un archivo de audio o video." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecciona un archivo de audio o video." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo debe pesar 20 MB o menos." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    return NextResponse.json(
      { error: "El archivo debe ser de audio o video." },
      { status: 400 }
    );
  }

  try {
    const uploadedFile = await uploadFileToGemini(apiKey, file);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Transcribe el audio o video completo con la mayor fidelidad posible. Devuelve solo palabras que escuches claramente. No inventes contenido, no resumas y no agregues comentarios. Si no hay voz clara, responde: No se detecto voz clara."
                },
                {
                  file_data: {
                    mime_type: uploadedFile.mimeType,
                    file_uri: uploadedFile.uri
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: getErrorMessage(result) },
        { status: response.status }
      );
    }

    const text = getTranscriptionText(result);

    if (!text) {
      return NextResponse.json(
        { error: "Gemini no devolvio una transcripcion valida." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo transcribir el archivo."
      },
      { status: 502 }
    );
  }
}
