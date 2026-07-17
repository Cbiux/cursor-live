# Cursor Live

Experiencia interactiva en vivo tipo Mentimeter: hostea, edita preguntas y únete desde el celular.

**Live:** [https://cursor-live.vercel.app](https://cursor-live.vercel.app)  
**Repo:** [github.com/Cbiux/cursor-live](https://github.com/Cbiux/cursor-live)

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

Proyecto: `cursor-live` · Root Directory: `web`

1. Instala Upstash Redis (Marketplace) o define:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
2. Define `HOST_KEY` para proteger controles del host
3. Despliega desde `web/` o con Git (rootDirectory = `web`)

## Guion del meetup

Ver [`MENTIMETER.md`](./MENTIMETER.md) para el guion editorial del Cursor Meetup Costa Rica.
