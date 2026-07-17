# Cursor Live

App Next.js de la experiencia interactiva en vivo.

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Variables de entorno

Copia `.env.example` a `.env.local`:

- `HOST_KEY` — clave del presentador
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Redis en producción

Sin Redis, el estado vive en memoria (demo local).
