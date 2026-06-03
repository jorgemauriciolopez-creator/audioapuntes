"use client";

import { ChangeEvent, useEffect, useState } from "react";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const PROGRESS_MESSAGES = [
  "Subiendo archivo...",
  "Procesando audio...",
  "Generando transcripción...",
  "Casi listo..."
];

type StudyNotes = {
  summary: string;
  keyPoints: string[];
  importantConcepts: string[];
  reviewQuestions: string[];
  studyActions: string[];
};

function NotesList({
  items
}: Readonly<{
  items: string[];
}>) {
  if (items.length === 0) {
    return <p className="text-sm text-[#6d7469]">Sin elementos todavia.</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li
          className="rounded-md border border-[#e1e5d9] bg-[#fbfcf8] px-3 py-2 text-sm leading-6 text-[#444a42]"
          key={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [studyNotes, setStudyNotes] = useState<StudyNotes | null>(null);
  const [notesError, setNotesError] = useState("");
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    setProgress(8);

    const intervalId = window.setInterval(() => {
      setProgress((currentProgress) => {
        if (currentProgress >= 90) {
          return 90;
        }

        return Math.min(currentProgress + 7, 90);
      });
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isLoading]);

  const progressMessage =
    PROGRESS_MESSAGES[
      Math.min(
        Math.floor(progress / 25),
        PROGRESS_MESSAGES.length - 1
      )
    ];

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setTranscription("");
    setError("");
    setStudyNotes(null);
    setNotesError("");

    if (file && file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      event.target.value = "";
      setProgress(0);
      setError("El archivo debe pesar 20 MB o menos.");
      return;
    }

    setSelectedFile(file ?? null);
    setProgress(0);
  }

  async function handleTranscribe() {
    if (isLoading) {
      return;
    }

    if (!selectedFile) {
      setError("Selecciona un archivo antes de transcribir.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("El archivo debe pesar 20 MB o menos.");
      return;
    }

    setIsLoading(true);
    setProgress(8);
    setError("");
    setTranscription("");
    setStudyNotes(null);
    setNotesError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo transcribir el archivo.");
      }

      setProgress(100);
      setTranscription(data.text ?? "");
    } catch (caughtError) {
      setProgress(0);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo transcribir el archivo."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateNotes() {
    if (isGeneratingNotes) {
      return;
    }

    if (!transcription) {
      setNotesError("Primero necesitas una transcripcion.");
      return;
    }

    setIsGeneratingNotes(true);
    setNotesError("");
    setStudyNotes(null);

    try {
      const response = await fetch("/api/study-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ transcription })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron generar los apuntes.");
      }

      setStudyNotes(data.notes ?? null);
    } catch (caughtError) {
      setNotesError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron generar los apuntes."
      );
    } finally {
      setIsGeneratingNotes(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-[#202124] sm:px-8">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6f5e]">
            Milestone 3
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">AudioApuntes</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#555b52]">
            Selecciona un audio o video de clase, transcribelo y conviertelo en
            apuntes de estudio.
          </p>
        </header>

        <section className="rounded-md border border-[#d7dbcf] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold">Archivo de clase</h2>
              <p className="mt-1 text-sm leading-6 text-[#6d7469]">
                El archivo se envia al servidor de esta app para transcribirlo
                con Gemini.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-[#b8c4b2] bg-[#fbfcf8] px-5 py-8 text-center hover:border-[#2f6f5e] hover:bg-[#edf5ef]">
              <span className="text-base font-semibold text-[#2f6f5e]">
                Seleccionar audio o video
              </span>
              <span className="mt-2 text-sm text-[#6d7469]">
                Audio o video, maximo 20 MB
              </span>
              <input
                className="sr-only"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
              />
            </label>

            <div className="rounded-md border border-[#e1e5d9] bg-[#fbfcf8] px-4 py-3">
              <p className="text-sm font-semibold text-[#444a42]">
                Archivo seleccionado
              </p>
              <p className="mt-1 break-words text-sm text-[#6d7469]">
                {selectedFile?.name ||
                  "Todavia no has seleccionado ningun archivo."}
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-[#f0b9b2] bg-[#fff3f1] px-4 py-3 text-sm text-[#9a3529]">
                {error}
              </p>
            ) : null}

            <button
              className="rounded-md bg-[#2f6f5e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#255b4d] disabled:cursor-not-allowed disabled:bg-[#9da9a2]"
              type="button"
              onClick={handleTranscribe}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? "Transcribiendo..." : "Transcribir"}
            </button>

            {(isLoading || progress === 100) && !error ? (
              <div className="rounded-md border border-[#d7dbcf] bg-[#fbfcf8] p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-semibold text-[#315846]">
                    {progress === 100 ? "Transcripción lista." : progressMessage}
                  </p>
                  <p className="text-[#6d7469]">{progress}%</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e1e5d9]">
                  <div
                    className="h-full rounded-full bg-[#2f6f5e] transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-[#d7dbcf] bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Transcripcion</h2>
            <p className="mt-1 text-sm leading-6 text-[#6d7469]">
              Aqui aparecera el texto cuando termine el proceso.
            </p>
          </div>
          <div className="mt-4 min-h-48 whitespace-pre-wrap rounded-md border border-[#e1e5d9] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#444a42]">
            {isLoading
              ? "Transcribiendo el archivo..."
              : transcription ||
                "Selecciona un archivo y presiona Transcribir para ver el texto aqui."}
          </div>
        </section>

        <section className="rounded-md border border-[#d7dbcf] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Apuntes de estudio</h2>
              <p className="mt-1 text-sm leading-6 text-[#6d7469]">
                Genera una guia ordenada a partir de la transcripcion.
              </p>
            </div>
            {transcription ? (
              <button
                className="rounded-md bg-[#2f6f5e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#255b4d] disabled:cursor-not-allowed disabled:bg-[#9da9a2]"
                type="button"
                onClick={handleGenerateNotes}
                disabled={isGeneratingNotes}
              >
                {isGeneratingNotes ? "Generando..." : "Generar apuntes"}
              </button>
            ) : null}
          </div>

          {notesError ? (
            <p className="mt-4 rounded-md border border-[#f0b9b2] bg-[#fff3f1] px-4 py-3 text-sm text-[#9a3529]">
              {notesError}
            </p>
          ) : null}

          {isGeneratingNotes ? (
            <div className="mt-4 rounded-md border border-[#e1e5d9] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#6d7469]">
              Generando apuntes con Gemini...
            </div>
          ) : null}

          {!transcription && !isGeneratingNotes ? (
            <div className="mt-4 rounded-md border border-[#e1e5d9] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#6d7469]">
              La opcion para generar apuntes aparecera cuando tengas una
              transcripcion.
            </div>
          ) : null}

          {studyNotes ? (
            <div className="mt-5 grid gap-4">
              <article className="rounded-md border border-[#e1e5d9] bg-[#fbfcf8] p-4">
                <h3 className="text-base font-semibold text-[#202124]">
                  Resumen breve
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#444a42]">
                  {studyNotes.summary}
                </p>
              </article>

              <article className="rounded-md border border-[#e1e5d9] bg-white p-4">
                <h3 className="text-base font-semibold text-[#202124]">
                  Puntos clave
                </h3>
                <NotesList items={studyNotes.keyPoints} />
              </article>

              <article className="rounded-md border border-[#e1e5d9] bg-white p-4">
                <h3 className="text-base font-semibold text-[#202124]">
                  Conceptos importantes
                </h3>
                <NotesList items={studyNotes.importantConcepts} />
              </article>

              <article className="rounded-md border border-[#e1e5d9] bg-white p-4">
                <h3 className="text-base font-semibold text-[#202124]">
                  Preguntas de repaso
                </h3>
                <NotesList items={studyNotes.reviewQuestions} />
              </article>

              <article className="rounded-md border border-[#e1e5d9] bg-white p-4">
                <h3 className="text-base font-semibold text-[#202124]">
                  Recomendaciones de estudio
                </h3>
                <NotesList items={studyNotes.studyActions} />
              </article>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
