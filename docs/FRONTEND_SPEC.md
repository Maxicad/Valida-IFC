# Frontend

Stack:

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui em fase futura.
- Three.js ou web-ifc/That Open Components para viewer.

## Telas criadas

- `/login`
- `/dashboard`
- `/projetos`
- `/projetos/upload`
- `/criterios`
- `/auditorias`
- `/visualizador`
- `/relatorios`

## Integracao

O arquivo `apps/web/src/services/api.ts` centraliza a URL da API em `NEXT_PUBLIC_API_BASE_URL`.

No MVP-base, as telas usam dados demonstrativos. A proxima fase deve trocar dados mockados por chamadas reais.
