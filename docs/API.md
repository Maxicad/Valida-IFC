# API

Base local:

```text
http://localhost:8000
```

## Health

- `GET /health`

## Autenticacao

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## Projetos

- `GET /projects`
- `POST /projects`
- `GET /projects/{id}`
- `PUT /projects/{id}`
- `DELETE /projects/{id}`

## Arquivos IFC

- `POST /projects/{id}/ifc/upload`
- `GET /projects/{id}/ifc-files`
- `GET /ifc-files/{id}`
- `GET /ifc-files/{id}/metadata`
- `GET /ifc-files/{id}/viewer-data`
- `DELETE /ifc-files/{id}`

## Criterios

- `GET /criteria-sets`
- `POST /criteria-sets`
- `GET /criteria-sets/{id}`
- `POST /criteria-sets/import`
- `POST /criteria/from-natural-language`
- `POST /criteria`
- `PUT /criteria/{id}`
- `DELETE /criteria/{id}`

## Auditorias e relatorios

- `POST /audits`
- `GET /audits/{id}`
- `GET /audits/{id}/status`
- `GET /audits/{id}/summary`
- `GET /audits/{id}/results`
- `GET /audits/{id}/report/html`
- `GET /audits/{id}/report/pdf`
- `GET /audits/{id}/export/csv`
- `GET /audits/{id}/export/xlsx`
