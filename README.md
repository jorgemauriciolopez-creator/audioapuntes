# AudioApuntes

MVP pequeño de una web app de aprendizaje hecha con Next.js, TypeScript y Tailwind.

## Que hace ahora

- Permite elegir un archivo de audio o video.
- Muestra el nombre del archivo seleccionado.
- Muestra un boton de Transcribir.
- Envia el archivo a una API route del servidor.
- Llama a Gemini API desde el servidor.
- Muestra la transcripcion en pantalla.
- Valida archivos de maximo 20 MB.
- Genera apuntes de estudio desde la transcripcion.
- Puede proteger el uso de las APIs con un codigo de acceso opcional.

## Que no hace todavia

- No usa autenticacion.
- No guarda datos en base de datos.
- No usa pagos.
- No guarda historial.
- No exporta apuntes todavia.

## Variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto:

```bash
GEMINI_API_KEY=tu_api_key_aqui
APP_ACCESS_CODE=un_codigo_opcional
```

No pongas estas variables en el frontend ni en archivos que vayas a subir a GitHub.

`APP_ACCESS_CODE` es opcional. Si existe, las rutas `/api/transcribe` y
`/api/study-notes` piden ese codigo por header antes de usar Gemini. Esto es
una proteccion basica para deploys personales, no autenticacion real.

## Deploy en Vercel

En Vercel, abre tu proyecto y ve a `Settings` -> `Environment Variables`.
Agrega:

- `GEMINI_API_KEY`: tu API key de Gemini.
- `APP_ACCESS_CODE`: un codigo privado si quieres bloquear el uso publico.

Despues de cambiar variables, redeploya el proyecto para que Vercel las cargue.

## Limites

- Los archivos deben pesar 20 MB o menos.
- El free tier de Gemini puede aplicar rate limits; si aparece ese error, espera un poco y vuelve a intentar.

## Comandos

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000`.
