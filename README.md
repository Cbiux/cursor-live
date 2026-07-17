# Cursor Live

Plataforma de interacción en vivo para meetups, clases y eventos.

[Abrir aplicación](https://cursor-live.vercel.app) · [Documentación](https://cursor-live.vercel.app/docs)

Un host crea una sala, proyecta los resultados y la audiencia responde desde el teléfono sin registrarse.

## Funciones

- Salas con códigos fáciles de compartir, como `CURSOR1`.
- Clave independiente para administrar cada sala.
- Editor de preguntas, instrucciones y opciones.
- Lobby con QR, código y participantes conectados.
- Resultados actualizados en vivo.
- Importación de preguntas y respuestas de prueba mediante Markdown.
- Carrusel continuo para respuestas abiertas.
- Descarga del QR en PNG.
- Español e inglés.
- Modo claro y oscuro.

## Modos

- **Host (`/host`):** crea la sala, edita preguntas y prepara respuestas demo.
- **Presentar (`/present`):** proyecta el lobby y los resultados en vivo.
- **Participar (`/join`):** permite responder desde el celular.
- **Documentación (`/docs`):** explica el flujo completo de uso.

## Tipos de pregunta

- Nube de palabras
- Opción múltiple
- Escala 0–10
- Ranking top 3
- Respuesta abierta

## Uso rápido

1. Abre el panel de Host.
2. Elige un código, por ejemplo `CURSOR1`.
3. Define una clave de al menos cuatro caracteres.
4. Edita o importa las preguntas.
5. Guarda la sala.
6. Abre Presentar con el mismo código y clave.
7. Comparte el QR con la audiencia.
8. Pulsa **Comenzar**.

## Markdown

Las preguntas pueden escribirse o generarse con este formato:

```md
# Cursor Meetup

## 1. word-cloud | ¿Qué vienes a buscar hoy?
Responde con una palabra

## 2. choice | ¿Con qué frecuencia utilizas Cursor?
Selecciona una opción
- Nunca lo he usado
- Lo he probado
- Lo uso todos los días

## 3. open | ¿Qué proyecto estás construyendo?
Máximo 7 palabras
```

Tipos válidos: `word-cloud`, `choice`, `scale`, `ranking` y `open`.

También puedes importar respuestas de prueba:

```md
# Respuestas Cursor Live

### Ana García
Una herramienta para documentar APIs

### Bruno López
Un asistente para equipos remotos
```

Ejemplos:

- [`questions-example.md`](./web/public/examples/questions-example.md)
- [`responses-example.md`](./web/public/examples/responses-example.md)

## Stack

- Next.js 16
- React 19
- TypeScript
- Vercel Functions y Runtime Cache
- Upstash Redis opcional
- QRCode React y Lucide React

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
git clone https://github.com/Cbiux/cursor-live.git
cd cursor-live/web
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Comandos disponibles:

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

## Variables de entorno

```env
# Clave administrativa global opcional
HOST_KEY=

# Persistencia opcional
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Sin Redis, el desarrollo local usa memoria y Vercel utiliza Runtime Cache. Las sesiones tienen una duración configurada de 12 horas.

## Despliegue

La aplicación Next.js vive en `web/`. Configura Vercel con:

- **Root Directory:** `web`
- **Framework:** Next.js
- **Build Command:** `npm run build`

```bash
npx vercel --prod
```

## Estructura

```text
.
├── README.md
└── web/
    ├── public/
    │   └── examples/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   └── lib/
    ├── package.json
    └── vercel.json
```

`web/` se mantiene como raíz de la aplicación para conservar la configuración de despliegue existente.

## Notas para uso público

Antes de operar como servicio abierto conviene agregar autenticación, rate limiting, moderación, límites de uso, monitoreo de costos y una política de privacidad.

## Autor

Creado por [cbiux](https://github.com/Cbiux).
