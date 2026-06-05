import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-3.5-flash";
const RATE_LIMIT_ERROR =
  "Gemini alcanzo el limite de uso por ahora. Espera un poco y vuelve a intentar.";

type StudyNotes = {
  summary: string;
  keyPoints: string[];
  importantConcepts: string[];
  reviewQuestions: string[];
  studyActions: string[];
};

type GeminiPart = {
  text?: unknown;
};

const emptyNotes: StudyNotes = {
  summary: "",
  keyPoints: [],
  importantConcepts: [],
  reviewQuestions: [],
  studyActions: []
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

  return "No se pudieron generar los apuntes.";
}

function validateAccessCode(request: Request) {
  const accessCode = process.env.APP_ACCESS_CODE;

  if (!accessCode) {
    return null;
  }

  if (request.headers.get("x-app-access-code") === accessCode) {
    return null;
  }

  return NextResponse.json(
    { error: "Codigo de acceso incorrecto." },
    { status: 401 }
  );
}

function getGeminiText(result: unknown) {
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

  return (candidate.content.parts as GeminiPart[])
    .map((part) =>
      typeof part.text === "string" ? part.text : ""
    )
    .join("")
    .trim();
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeNotes(value: unknown): StudyNotes {
  if (typeof value !== "object" || value === null) {
    return emptyNotes;
  }

  return {
    summary:
      "summary" in value && typeof value.summary === "string"
        ? value.summary
        : "",
    keyPoints:
      "keyPoints" in value ? asStringArray(value.keyPoints) : [],
    importantConcepts:
      "importantConcepts" in value
        ? asStringArray(value.importantConcepts)
        : [],
    reviewQuestions:
      "reviewQuestions" in value
        ? asStringArray(value.reviewQuestions)
        : [],
    studyActions:
      "studyActions" in value ? asStringArray(value.studyActions) : []
  };
}

export async function POST(request: Request) {
  const accessError = validateAccessCode(request);

  if (accessError) {
    return accessError;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar GEMINI_API_KEY en .env.local." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const transcription =
    typeof body === "object" &&
    body !== null &&
    "transcription" in body &&
    typeof body.transcription === "string"
      ? body.transcription.trim()
      : "";

  if (!transcription) {
    return NextResponse.json(
      { error: "Primero necesitas una transcripcion para generar apuntes." },
      { status: 400 }
    );
  }

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
                text: `Convierte esta transcripcion en apuntes de estudio en espanol.

Devuelve solo JSON valido, sin markdown, con esta estructura exacta:
{
  "summary": "resumen breve",
  "keyPoints": ["punto clave"],
  "importantConcepts": ["concepto importante"],
  "reviewQuestions": ["pregunta de repaso"],
  "studyActions": ["accion o recomendacion de estudio"]
}

Transcripcion:
${transcription}`
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    if (response.status === 429) {
      return NextResponse.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
    }

    return NextResponse.json(
      { error: getErrorMessage(result) },
      { status: response.status }
    );
  }

  const text = getGeminiText(result);

  try {
    const notes = normalizeNotes(JSON.parse(text));

    if (!notes.summary) {
      return NextResponse.json(
        { error: "Gemini no devolvio apuntes validos." },
        { status: 502 }
      );
    }

    return NextResponse.json({ notes });
  } catch {
    return NextResponse.json(
      { error: "Gemini no devolvio apuntes en formato valido." },
      { status: 502 }
    );
  }
}
