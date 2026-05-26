# Frontend

Stack:

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui em fase futura.
- Three.js + web-ifc para viewer IFC no navegador, com fallback de geometria via backend.

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

As telas principais devem operar contra a API real no fluxo Alfa: login, dashboard, projetos, upload IFC, criterios, auditorias, visualizador e relatorios.

## Escopo de produto

- Alfa: fluxo rapido de auditoria, criterios CSV/TXT/XLS/XLSX/IDS MVP, score por criticidade, viewer por elemento/GlobalId, relatorio tecnico e snapshots.
- Beta/pos-Alfa: BCF, IDS ampliado, API publica, self-host, IA, linguagem natural, clash e search sets.
