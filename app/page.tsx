"use client";

import { ChangeEvent, useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    setTranscription("");
    setError("");
  }

  async function handleTranscribe() {
    if (!selectedFile) {
      setError("Selecciona un archivo antes de transcribir.");
      return;
    }

    setIsLoading(true);
    setError("");
    setTranscription("");

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

      setTranscription(data.text ?? "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo transcribir el archivo."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-[#202124] sm:px-8">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6f5e]">
            Milestone 2
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">AudioApuntes</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#555b52]">
            Selecciona un audio o video de clase y transcribelo a texto para
            estudiar con mas calma.
          </p>
        </header>

        <section className="rounded-md border border-[#d7dbcf] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold">Archivo de clase</h2>
              <p className="mt-1 text-sm leading-6 text-[#6d7469]">
                El archivo se envia al servidor de esta app para transcribirlo
                con OpenAI.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-[#b8c4b2] bg-[#fbfcf8] px-5 py-8 text-center hover:border-[#2f6f5e] hover:bg-[#edf5ef]">
              <span className="text-base font-semibold text-[#2f6f5e]">
                Seleccionar audio o video
              </span>
              <span className="mt-2 text-sm text-[#6d7469]">
                Audio o video, maximo 25 MB
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
      </section>
    </main>
  );
}
