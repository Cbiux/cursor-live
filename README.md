# Cursor Live

Experiencias interactivas para meetups, clases y eventos en vivo.

[Abrir Cursor Live](https://cursor-live.vercel.app) ·
[Ver documentación](https://cursor-live.vercel.app/docs) ·
[Repositorio](https://github.com/Cbiux/cursor-live)

Cursor Live es una alternativa ligera y personalizable al flujo de herramientas como Mentimeter. Un host crea una sala, proyecta los resultados y la audiencia responde desde el teléfono sin registrarse.

## Qué puedes hacer

- Crear salas con códigos fáciles de compartir, como `CURSOR1`.
- Proteger cada sala con una clave de host.
- Editar títulos, instrucciones, preguntas y opciones.
- Personalizar los mensajes que ve la audiencia.
- Importar preguntas desde Markdown pegado o desde un archivo `.md`.
- Generar y cargar respuestas de prueba para ensayar una presentación.
- Proyectar un lobby con QR, código y participantes conectados.
- Descargar el QR como PNG para compartirlo o imprimirlo.
- Mostrar resultados en vivo con avance manual o automático.
- Usar español o inglés y modo claro u oscuro.
- Ejecutar la experiencia sin cuentas para los participantes.

## Modos de la aplicación

### Host

El panel de host permite crear o reclamar una sala, configurar la experiencia y preparar datos de prueba.

- Edita las preguntas manualmente.
- Reordena o elimina preguntas.
- Configura el lobby y los mensajes de espera.
- Copia prompts para generar preguntas o respuestas con una IA.
- Pega Markdown o sube archivos.
- Recibe confirmaciones y errores mediante notificaciones emergentes.

Ruta: [`/host`](https://cursor-live.vercel.app/host)

### Presentar

La vista de presentación está diseñada para proyectarse en una pantalla grande.

- Lobby con QR y código de acceso.
- Lista de personas conectadas.
- Resultados actualizados en vivo.
- Navegación manual o automática.
- Modo pantalla completa.
- Carrusel horizontal para respuestas abiertas.

Ruta: [`/present`](https://cursor-live.vercel.app/present)

### Participar

La audiencia entra desde el celular, escribe un nombre opcional y responde las preguntas en secuencia. Si no escribe un nombre, aparece como `Anónimo`.

Ruta: [`/join`](https://cursor-live.vercel.app/join)

## Tipos de pregunta

- **Nube de palabras:** agrupa respuestas equivalentes y aumenta su tamaño según la frecuencia.
- **Opción múltiple:** muestra la distribución en barras.
- **Escala 0–10:** calcula el promedio y presenta un histograma.
- **Ranking:** permite elegir y ordenar un top 3.
- **Respuesta abierta:** muestra respuestas cortas en un carrusel continuo.

## Flujo recomendado

1. Abre el panel de Host.
2. Escribe un número para crear el código, por ejemplo `CURSOR1`.
3. Define una clave de al menos cuatro caracteres.
4. Edita las preguntas o impórtalas desde Markdown.
5. Guarda o reclama la sala.
6. Abre Presentar con el mismo código y clave.
7. Comparte el QR o el código con la audiencia.
8. Pulsa **Comenzar** cuando todos estén listos.

## Configuración con Markdown

Cursor Live puede convertir Markdown en un deck de preguntas:

```md
# Cursor Meetup

## 1. word-cloud | ¿Qué vienes a buscar hoy?
Responde con una palabra

## 2. choice | ¿Con qué frecuencia utilizas Cursor?
Selecciona una opción
- Nunca lo he usado
- Lo he probado
- Lo uso varias veces por semana
- Lo uso todos los días

## 3. open | ¿Qué proyecto estás construyendo?
Máximo 7 palabras
```

Tipos válidos: `word-cloud`, `choice`, `scale`, `ranking` y `open`.

Ejemplo completo: [`web/public/examples/questions-example.md`](./web/public/examples/questions-example.md)

## Respuestas de prueba

Para ensayar la proyección puedes crear respuestas demo automáticamente o importar Markdown:

```md
# Respuestas Cursor Live

### Ana García
Una herramienta para documentar APIs

### Bruno López
Un asistente para equipos remotos

### Camila Rojas
Automatización para pequeños negocios
```

También se acepta el formato corto:

```md
- Diego Mora: AI Notes
- Elena Vargas: Local LLM
- Fabián Solís | Green Route
```

Ejemplo completo: [`web/public/examples/responses-example.md`](./web/public/examples/responses-example.md)

## Stack

- Next.js 16 con App Router y Turbopack
- React 19
- TypeScript
- Vercel Functions y Runtime Cache
- Upstash Redis opcional
- `qrcode.react`
- Lucide React
- CSS personalizado, sin framework de componentes

## Desarrollo local

Requisitos:

- Node.js 20 o superior
- npm

```bash
git clone https://github.com/Cbiux/cursor-live.git
cd cursor-live/web
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # ejecutar el build
npm run lint     # revisar reglas de código
npx tsc --noEmit # verificar tipos
```

## Variables de entorno

Todas son opcionales para desarrollo local:

```env
# Clave administrativa global opcional
HOST_KEY=

# Persistencia opcional con Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Sin Redis:

- En local, el estado vive en memoria y se pierde al reiniciar el proceso.
- En Vercel, la aplicación utiliza Runtime Cache.

Con Upstash Redis, salas, participantes y respuestas se almacenan en Redis. Las sesiones tienen una duración configurada de 12 horas.

## Despliegue en Vercel

El proyecto de Next.js vive en [`web/`](./web), por lo que Vercel debe usar:

- **Root Directory:** `web`
- **Framework Preset:** Next.js
- **Install Command:** `npm install`
- **Build Command:** `npm run build`

También puedes desplegar desde la CLI:

```bash
npx vercel --prod
```

Producción actual: [cursor-live.vercel.app](https://cursor-live.vercel.app)

## Estructura del repositorio

```text
.
├── README.md
├── MENTIMETER.md
└── web/
    ├── public/
    │   └── examples/
    └── src/
        ├── app/
        │   └── api/room/
        ├── components/
        └── lib/
```

Piezas principales:

- `host-studio.tsx`: editor y herramientas del host.
- `presenter-experience.tsx`: lobby y resultados proyectados.
- `audience-experience.tsx`: flujo móvil de participantes.
- `store.ts`: persistencia de salas, participantes y respuestas.
- `questions-md.ts`: importación de preguntas.
- `responses-md.ts`: importación de respuestas de prueba.
- `preferences.tsx`: idioma y tema.

## Consideraciones antes de abrirlo al público

La aplicación funciona bien para demos, meetups y comunidades pequeñas. Para operar como servicio público conviene agregar:

- autenticación de usuarios;
- rate limiting y protección contra abuso;
- límites de salas y respuestas;
- moderación de contenido;
- observabilidad y alertas de costos;
- política de privacidad y términos de uso;
- almacenamiento persistente dedicado.

Los códigos de sala no son secretos. La clave del host protege la edición y la presentación, pero no sustituye un sistema completo de autenticación.

## Guion original del meetup

[`MENTIMETER.md`](./MENTIMETER.md) contiene la propuesta editorial que dio origen a la experiencia para Cursor Meetup Costa Rica.

## Autor

Creado por [cbiux](https://github.com/Cbiux).
