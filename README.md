# AudioApuntes

MVP pequeño de una web app de aprendizaje hecha con Next.js, TypeScript y Tailwind.

## Que hace ahora

- Permite elegir un archivo de audio o video.
- Muestra el nombre del archivo seleccionado.
- Muestra un boton de Transcribir.
- Envia el archivo a una API route del servidor.
- Llama a OpenAI Speech-to-Text desde el servidor.
- Muestra la transcripcion en pantalla.

## Que no hace todavia

- No usa autenticacion.
- No guarda datos en base de datos.
- No usa pagos.
- No guarda historial.
- No genera resumenes todavia.

## Variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto:

```bash
OPENAI_API_KEY=tu_api_key_aqui
```

No pongas esta key en el frontend ni en archivos que vayas a subir a GitHub.

## Comandos

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000`.
