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

As rotas internas usam JWT Bearer no header:

```text
Authorization: Bearer <token>
```

## Usuarios

- `GET /users`
- `POST /users`
- `GET /users/{id}`
- `PUT /users/{id}`
- `DELETE /users/{id}`

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
- `PUT /criteria-sets/{id}`
- `DELETE /criteria-sets/{id}`
- `POST /criteria-sets/import`
- `POST /criteria/from-natural-language`
- `GET /criteria`
- `POST /criteria`
- `GET /criteria/{id}`
- `PUT /criteria/{id}`
- `DELETE /criteria/{id}`

`POST /criteria-sets/import` aceita `multipart/form-data` com `file` em CSV, TXT, XLS ou XLSX. Opcionalmente, envie `criteria_set_id` para importar em um conjunto existente.

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

`POST /audits` executa o motor inicial contra o IFC salvo e criterios ativos. Regras suportadas neste ciclo: `ifc_schema`, `entity_exists`, `entity_count_min`, `property_exists`, `property_not_empty` e `globalid_unique`.
