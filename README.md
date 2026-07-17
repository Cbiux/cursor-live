# Cursor Live

Experiencia interactiva en vivo tipo Mentimeter: hostea, edita preguntas y únete desde el celular.

## App

El código de la aplicación vive en [`web/`](./web).

- `/` — Hostear, Presentar o Unirse
- `/host` — editar título, código y preguntas
- `/present` — proyección: lobby + carrusel
- `/join` — audiencia: nombre + quiz
- `/docs` — documentación

## Desarrollo local

```bash
cd web
npm install
copy .env.example .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Sin Redis funciona en demo local (estado en memoria, un solo proceso).

## Producción (Vercel)

1. Root Directory: `web`
2. Instala Upstash Redis (Marketplace) o define:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Define `HOST_KEY` para proteger controles del host
4. Despliega

## Guion del meetup

Ver [`MENTIMETER.md`](./MENTIMETER.md) para el guion editorial del Cursor Meetup Costa Rica.
