# Valida IFC — Estrutura de Projeto para Codex

**Objetivo:** criar uma aplicação web para auditoria de arquivos IFC BIM, com login, frontend, backend, upload de arquivos, importação/criação de critérios, visualização 3D, auditoria por criticidade e geração/impressão de relatórios.

---

## 1. Visão geral do produto

O **Valida IFC** será uma aplicação web para validar arquivos IFC com base em critérios configuráveis de auditoria BIM/openBIM.

O sistema deverá permitir:

- Autenticação de usuários.
- Cadastro de projetos.
- Upload de arquivos IFC.
- Extração de metadados do IFC, incluindo versão/schema.
- Importação de critérios em `.txt`, `.csv`, `.xls` e `.xlsx`.
- Criação manual de critérios.
- Criação assistida de critérios por linguagem natural.
- Execução de auditoria automática.
- Classificação das inconformidades por criticidade: **baixa**, **moderada** e **alta**.
- Cálculo de percentual de conformidade ponderado pela criticidade.
- Visualização 3D do modelo IFC.
- Aplicação de cores nos elementos aprovados, reprovados e não avaliados.
- Geração de relatório em tela.
- Impressão do relatório.
- Exportação futura em PDF, CSV e XLSX.

---

## 2. Referências técnicas

O projeto deve ser orientado por princípios openBIM e por padrões relacionados a:

- IFC — Industry Foundation Classes.
- IDS — Information Delivery Specification.
- BCF — BIM Collaboration Format.
- bSDD — buildingSMART Data Dictionary.
- ISO 16739 / IFC.
- Fluxos openBIM baseados em formatos neutros de fornecedor.

Referências úteis:

- buildingSMART Brasil — openBIM, IFC, BCF, IDS, bSDD.
- buildingSMART International — IDS.
- IfcOpenShell — toolkit open source para leitura, escrita e manipulação de IFC.
- web-ifc / That Open — leitura e visualização de IFC no navegador.

---

## 3. Arquitetura recomendada

```text
Usuário
  ↓
Frontend Web
  ↓
API Backend
  ↓
Serviço de Upload
  ↓
Parser IFC / Motor de Auditoria
  ↓
Banco de Dados
  ↓
Visualizador IFC + Relatórios
```

### Camadas principais

```text
Frontend
- Interface web
- Login
- Dashboard
- Projetos
- Upload
- Critérios
- Auditoria
- Visualizador IFC
- Relatórios

Backend
- Autenticação
- API REST
- Projetos
- Arquivos IFC
- Critérios
- Auditorias
- Relatórios

Worker
- Processamento pesado
- Leitura de IFC
- Execução de auditoria
- Geração de dados para visualizador
- Geração de relatórios

Banco de dados
- Usuários
- Projetos
- Arquivos
- Critérios
- Auditorias
- Resultados

Storage
- Arquivos IFC enviados
- Relatórios gerados
- Arquivos temporários
```

---

## 4. Stack técnica recomendada

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Three.js
web-ifc ou That Open Components
```

### Backend

```text
Python
FastAPI
Pydantic
SQLAlchemy
Alembic
IfcOpenShell
Pandas
OpenPyXL
JWT
```

### Worker

```text
Celery ou RQ
Redis
IfcOpenShell
```

### Banco de dados

```text
PostgreSQL
```

### Infraestrutura

```text
Docker
Docker Compose
Nginx
Storage local no MVP
S3 ou MinIO em produção
```

---

## 5. Estrutura de pastas

```text
valida-ifc/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projetos/
│   │   │   │   ├── auditorias/
│   │   │   │   ├── criterios/
│   │   │   │   ├── visualizador/
│   │   │   │   └── relatorios/
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── auth/
│   │   │   │   ├── layout/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── upload/
│   │   │   │   ├── criteria/
│   │   │   │   ├── audit/
│   │   │   │   ├── ifc-viewer/
│   │   │   │   └── reports/
│   │   │   │
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   │
│   │   ├── public/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── api/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   ├── files/
│   │   │   ├── criteria/
│   │   │   ├── audits/
│   │   │   ├── reports/
│   │   │   ├── viewer/
│   │   │   └── core/
│   │   │
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   │
│   └── worker/
│       ├── tasks/
│       │   ├── parse_ifc.py
│       │   ├── run_audit.py
│       │   ├── generate_report.py
│       │   └── generate_viewer_data.py
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── constants/
│   │   └── schemas/
│   │
│   ├── rules-engine/
│   │   ├── criteria_schema.json
│   │   ├── evaluator.py
│   │   ├── severity.py
│   │   ├── scoring.py
│   │   └── validators/
│   │       ├── ifc_schema.py
│   │       ├── entity_exists.py
│   │       ├── property_exists.py
│   │       ├── property_not_empty.py
│   │       ├── classification_exists.py
│   │       ├── spatial_structure.py
│   │       ├── globalid_unique.py
│   │       └── geometry_exists.py
│   │
│   └── ifc-utils/
│       ├── ifc_reader.py
│       ├── ifc_metadata.py
│       ├── ifc_properties.py
│       ├── ifc_geometry.py
│       ├── ifc_spatial.py
│       └── ifc_classification.py
│
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── RULES_SCHEMA.md
│   ├── IFC_AUDIT_CRITERIA.md
│   ├── FRONTEND_SPEC.md
│   ├── BACKEND_SPEC.md
│   ├── VIEWER_SPEC.md
│   ├── REPORT_SPEC.md
│   └── ROADMAP.md
│
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   ├── postgres/
│   └── storage/
│
├── samples/
│   ├── ifc/
│   ├── criteria/
│   │   ├── criterios_exemplo.csv
│   │   ├── criterios_exemplo.xlsx
│   │   └── criterios_exemplo.txt
│   └── reports/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
└── TODO.md
```

---

## 6. Requisitos funcionais

### RF01 — Login e autenticação

O sistema deve permitir:

- Criar usuário.
- Fazer login.
- Fazer logout.
- Recuperar senha.
- Proteger rotas internas.
- Controlar permissões por perfil.

Perfis iniciais:

```text
Administrador
Auditor BIM
Cliente / Visualizador
```

---

### RF02 — Dashboard

O dashboard deve exibir:

- Total de projetos.
- Total de arquivos IFC enviados.
- Total de auditorias.
- Média geral de conformidade.
- Quantidade de arquivos aprovados.
- Quantidade de arquivos reprovados.
- Pendências críticas.
- Últimos relatórios emitidos.

---

### RF03 — Cadastro de projetos

Campos mínimos:

```text
Nome do projeto
Cliente
Descrição
Disciplina
Fase
Responsável
Status
Data de criação
Data de atualização
```

Status sugeridos:

```text
Em preparação
Aguardando IFC
Em auditoria
Auditado
Aprovado
Reprovado
Arquivado
```

---

### RF04 — Upload de arquivos IFC

O sistema deve permitir:

- Upload de `.ifc`.
- Validação de extensão.
- Validação de tamanho.
- Registro do arquivo no projeto.
- Armazenamento do arquivo.
- Identificação da versão/schema IFC.
- Extração de metadados.
- Histórico de versões de upload.

Metadados mínimos:

```text
Nome do arquivo
Tamanho
Data de upload
Usuário responsável
Schema IFC
Versão IFC
Software autor, quando disponível
Quantidade de entidades
Quantidade de elementos
Quantidade de pavimentos
Quantidade de tipos
Quantidade de propriedades
```

A versão IFC deve ser lida pelo cabeçalho do arquivo, especialmente no trecho:

```text
FILE_SCHEMA(('IFC2X3'));
FILE_SCHEMA(('IFC4'));
FILE_SCHEMA(('IFC4X3'));
```

---

### RF05 — Importação de critérios

O sistema deve aceitar critérios nos formatos:

```text
TXT
CSV
XLS
XLSX
```

Campos recomendados para CSV/XLSX:

```text
codigo
nome
descricao
categoria
criticidade
tipo_regra
entidade_ifc
propriedade
operador
valor_esperado
mensagem_reprovacao
sugestao_correcao
referencia
ativo
```

Exemplo:

```csv
codigo,nome,descricao,categoria,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,mensagem_reprovacao,sugestao_correcao,referencia,ativo
IFC-001,Versão mínima IFC,O arquivo deve estar em IFC4 ou IFC4X3,Metadados,alta,ifc_schema,,FILE_SCHEMA,in,"IFC4|IFC4X3",O arquivo IFC não está na versão mínima exigida,Exportar novamente em IFC4 ou IFC4X3,openBIM,sim
IFC-002,Ambientes com nome,Todos os ambientes devem possuir nome preenchido,Espaços,moderada,property_not_empty,IfcSpace,Name,not_empty,,Ambiente sem nome preenchido,Preencher o nome do ambiente no software autoral,Requisito BIM,sim
IFC-003,Portas com identificação,Todas as portas devem possuir Tag preenchida,Elementos,alta,property_not_empty,IfcDoor,Tag,not_empty,,Porta sem código de identificação,Preencher o parâmetro Tag/Código da porta,Requisito BIM,sim
```

---

### RF06 — Cadastro manual de critérios

A interface deve permitir cadastrar:

```text
Código
Nome
Descrição
Categoria
Criticidade
Tipo de regra
Entidade IFC
Propriedade
Operador
Valor esperado
Mensagem de reprovação
Sugestão de correção
Referência
Ativo/inativo
```

---

### RF07 — Criação de critérios por linguagem natural

O usuário deve escrever critérios em linguagem natural.

Exemplo:

```text
Verificar se todos os ambientes possuem nome preenchido.
```

O sistema deve converter para uma regra estruturada:

```json
{
  "code": "AUTO-001",
  "name": "Ambientes com nome preenchido",
  "description": "Verifica se todos os IfcSpace possuem Name preenchido.",
  "category": "Espaços",
  "severity": "moderada",
  "rule_type": "property_not_empty",
  "entity_ifc": "IfcSpace",
  "property": "Name",
  "operator": "not_empty",
  "expected_value": null,
  "failure_message": "Ambiente sem nome preenchido.",
  "fix_suggestion": "Preencher o nome do ambiente no software autoral."
}
```

Importante:

- A IA deve gerar uma sugestão.
- O usuário deve revisar.
- A regra só deve ser salva após confirmação.
- O sistema deve guardar o texto original e a regra estruturada.

---

### RF08 — Auditoria IFC

O sistema deve executar a auditoria com base em:

- Arquivo IFC selecionado.
- Conjunto de critérios selecionado.
- Critérios ativos.
- Criticidade de cada critério.
- Resultado por critério.
- Resultado por elemento, quando aplicável.

Tipos iniciais de regra:

```text
ifc_schema
entity_exists
entity_count_min
property_exists
property_not_empty
property_value_equals
property_value_in_list
classification_exists
unit_check
spatial_structure_check
globalid_unique
geometry_exists
```

---

### RF09 — Criticidade

O sistema deve trabalhar com três níveis:

```text
Baixa
Moderada
Alta
```

Pesos sugeridos:

```text
Baixa = 1
Moderada = 3
Alta = 5
```

---

### RF10 — Cálculo de percentual

Fórmula:

```text
Pontuação máxima = soma dos pesos de todos os critérios aplicáveis
Pontuação obtida = soma dos pesos dos critérios aprovados
Percentual de conformidade = Pontuação obtida / Pontuação máxima * 100
```

Exemplo:

```text
Critério 1 — Alta — Peso 5 — Aprovado
Critério 2 — Alta — Peso 5 — Reprovado
Critério 3 — Moderada — Peso 3 — Aprovado
Critério 4 — Baixa — Peso 1 — Aprovado

Pontuação máxima = 14
Pontuação obtida = 9
Percentual = 64,28%
```

Classificação final sugerida:

```text
90% a 100% = Aprovado
75% a 89% = Aprovado com ressalvas
50% a 74% = Reprovado parcialmente
0% a 49% = Reprovado
```

Regra adicional:

```text
Se houver reprovação em critério de criticidade alta, o arquivo não pode ser considerado plenamente aprovado.
```

---

### RF11 — Visualizador IFC

O visualizador deve permitir:

- Abrir o modelo IFC no navegador.
- Navegar no modelo 3D.
- Selecionar elementos.
- Exibir propriedades do elemento selecionado.
- Exibir GlobalId.
- Exibir tipo IFC.
- Exibir critérios aplicados.
- Filtrar por aprovado/reprovado.
- Filtrar por criticidade.
- Isolar elementos reprovados.
- Ocultar elementos aprovados.
- Aplicar cores por status.

Cores recomendadas:

```text
Verde = aprovado
Vermelho = reprovado em criticidade alta
Laranja = reprovado em criticidade moderada
Amarelo = reprovado em criticidade baixa
Cinza = não avaliado
Azul = selecionado
```

---

### RF12 — Relatórios

O relatório deve conter:

```text
Nome do projeto
Cliente
Nome do arquivo IFC
Versão IFC
Data da auditoria
Responsável
Quantidade de critérios avaliados
Quantidade de critérios aprovados
Quantidade de critérios reprovados
Percentual geral
Resultado por criticidade
Resumo executivo
Lista de inconformidades
Elementos afetados
GlobalId dos elementos
Tipo IFC dos elementos
Mensagem de reprovação
Valor encontrado
Valor esperado
Sugestão de correção
Conclusão
```

Saídas:

```text
Visualização HTML
Impressão pelo navegador
PDF em fase futura
CSV em fase futura
XLSX em fase futura
BCF em fase futura
```

---

## 7. Modelo de dados inicial

### users

```text
id
name
email
password_hash
role
created_at
updated_at
```

### projects

```text
id
name
client
description
discipline
phase
status
created_by
created_at
updated_at
```

### ifc_files

```text
id
project_id
file_name
file_path
file_size
ifc_schema
ifc_version
uploaded_by
uploaded_at
status
metadata_json
```

### criteria_sets

```text
id
name
description
source_type
created_by
created_at
updated_at
```

### criteria

```text
id
criteria_set_id
code
name
description
category
severity
rule_type
entity_ifc
property_name
operator
expected_value
failure_message
fix_suggestion
reference
active
natural_language_source
created_at
updated_at
```

### audit_runs

```text
id
project_id
ifc_file_id
criteria_set_id
status
score_percent
score_low
score_moderate
score_high
total_criteria
approved_criteria
failed_criteria
started_at
finished_at
created_by
```

### audit_results

```text
id
audit_run_id
criteria_id
element_guid
element_type
element_name
status
severity
message
actual_value
expected_value
weight
created_at
```

### reports

```text
id
audit_run_id
file_path
format
created_at
```

---

## 8. API inicial

### Autenticação

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Projetos

```text
GET    /projects
POST   /projects
GET    /projects/{id}
PUT    /projects/{id}
DELETE /projects/{id}
```

### Arquivos IFC

```text
POST /projects/{id}/ifc/upload
GET  /projects/{id}/ifc-files
GET  /ifc-files/{id}
GET  /ifc-files/{id}/metadata
GET  /ifc-files/{id}/viewer-data
DELETE /ifc-files/{id}
```

### Critérios

```text
GET    /criteria-sets
POST   /criteria-sets
GET    /criteria-sets/{id}
POST   /criteria-sets/import
POST   /criteria/from-natural-language
POST   /criteria
PUT    /criteria/{id}
DELETE /criteria/{id}
```

### Auditorias

```text
POST /audits
GET  /audits/{id}
GET  /audits/{id}/status
GET  /audits/{id}/summary
GET  /audits/{id}/results
```

### Relatórios

```text
GET /audits/{id}/report/html
GET /audits/{id}/report/pdf
GET /audits/{id}/export/csv
GET /audits/{id}/export/xlsx
```

---

## 9. Esquema JSON para critérios

```json
{
  "code": "IFC-001",
  "name": "Versão mínima IFC",
  "description": "O arquivo deve estar em IFC4 ou IFC4X3.",
  "category": "Metadados",
  "severity": "alta",
  "rule_type": "ifc_schema",
  "target": {
    "entity_ifc": null,
    "property": "FILE_SCHEMA"
  },
  "operator": "in",
  "expected_value": ["IFC4", "IFC4X3"],
  "failure_message": "O arquivo IFC não está na versão mínima exigida.",
  "fix_suggestion": "Exportar novamente o modelo em IFC4 ou IFC4X3.",
  "reference": "openBIM",
  "active": true
}
```

---

## 10. Pseudocódigo do motor de auditoria

```python
def run_audit(ifc_file, criteria_set):
    model = open_ifc(ifc_file.path)
    metadata = extract_metadata(model)

    results = []

    for criterion in criteria_set.criteria:
        if not criterion.active:
            continue

        evaluator = get_evaluator(criterion.rule_type)
        result = evaluator.evaluate(model, metadata, criterion)

        results.append(result)

    score = calculate_score(results)

    audit_run = save_audit_results(results, score)

    return audit_run
```

---

## 11. Pseudocódigo do cálculo

```python
SEVERITY_WEIGHTS = {
    "baixa": 1,
    "moderada": 3,
    "alta": 5
}

def calculate_score(results):
    max_score = 0
    obtained_score = 0

    for result in results:
        weight = SEVERITY_WEIGHTS[result.severity]
        max_score += weight

        if result.status == "approved":
            obtained_score += weight

    if max_score == 0:
        return 0

    return round((obtained_score / max_score) * 100, 2)
```

---

## 12. Prioridade de desenvolvimento

### Fase 1 — MVP base

- [ ] Criar monorepo.
- [ ] Criar frontend Next.js.
- [ ] Criar backend FastAPI.
- [ ] Criar banco PostgreSQL.
- [ ] Criar autenticação simples.
- [ ] Criar CRUD de projetos.
- [ ] Criar upload IFC.
- [ ] Ler `FILE_SCHEMA`.
- [ ] Exibir versão IFC na interface.
- [ ] Importar critérios CSV.
- [ ] Criar motor básico de auditoria.
- [ ] Calcular percentual por criticidade.
- [ ] Exibir relatório em HTML.
- [ ] Permitir impressão do relatório.

### Fase 2 — Auditoria IFC ampliada

- [ ] Validar existência de entidades.
- [ ] Validar propriedades.
- [ ] Validar propriedades vazias.
- [ ] Validar GlobalId duplicado.
- [ ] Validar estrutura espacial.
- [ ] Validar classificação.
- [ ] Gerar resultado por elemento.
- [ ] Associar resultado ao GlobalId.

### Fase 3 — Visualizador IFC

- [ ] Integrar viewer IFC no frontend.
- [ ] Carregar arquivo IFC.
- [ ] Selecionar elementos.
- [ ] Exibir propriedades.
- [ ] Colorir elementos por status.
- [ ] Filtrar por criticidade.
- [ ] Isolar elementos reprovados.
- [ ] Sincronizar tabela de inconformidades com modelo 3D.

### Fase 4 — Linguagem natural

- [ ] Criar campo para critério em linguagem natural.
- [ ] Gerar regra estruturada.
- [ ] Mostrar prévia para revisão.
- [ ] Salvar regra aprovada.
- [ ] Guardar texto original.
- [ ] Criar histórico de critérios gerados.

### Fase 5 — Relatórios avançados

- [ ] Gerar PDF.
- [ ] Exportar CSV.
- [ ] Exportar XLSX.
- [ ] Criar resumo executivo.
- [ ] Criar relatório por criticidade.
- [ ] Criar relatório por elemento.
- [ ] Criar comparativo entre versões do IFC.

### Fase 6 — openBIM avançado

- [ ] Exportar inconformidades em BCF.
- [ ] Importar requisitos IDS.
- [ ] Exportar critérios como IDS, quando aplicável.
- [ ] Integrar bSDD.
- [ ] Criar API pública para auditoria externa.
- [ ] Integrar com CDE futuramente.

---

## 13. Telas necessárias

### Login

Componentes:

- Campo e-mail.
- Campo senha.
- Botão entrar.
- Link recuperar senha.
- Link criar conta.

### Dashboard

Componentes:

- Cards de indicadores.
- Lista de projetos recentes.
- Lista de auditorias recentes.
- Botão novo projeto.

### Projetos

Componentes:

- Lista de projetos.
- Filtros.
- Cadastro/edição.
- Página de detalhe do projeto.

### Upload IFC

Componentes:

- Drag and drop.
- Barra de progresso.
- Validação de arquivo.
- Resumo dos metadados.
- Botão confirmar.

### Critérios

Componentes:

- Tabela de critérios.
- Importação CSV/XLSX/TXT.
- Cadastro manual.
- Criação por linguagem natural.
- Filtro por categoria.
- Filtro por criticidade.

### Auditoria

Componentes:

- Selecionar arquivo IFC.
- Selecionar conjunto de critérios.
- Botão executar auditoria.
- Status do processamento.
- Resultado resumido.

### Visualizador

Componentes:

- Viewer 3D.
- Árvore do modelo.
- Painel de propriedades.
- Painel de inconformidades.
- Legenda de cores.
- Filtros por status/criticidade.

### Relatório

Componentes:

- Resumo executivo.
- Percentual geral.
- Resultado por criticidade.
- Tabela de critérios.
- Lista de elementos reprovados.
- Conclusão.
- Botão imprimir.
- Botão exportar.

---

## 14. Critérios iniciais de exemplo

### IFC-001 — Versão mínima IFC

```text
Categoria: Metadados
Criticidade: Alta
Regra: ifc_schema
Condição: FILE_SCHEMA deve ser IFC4 ou IFC4X3
```

### IFC-002 — Existência de IfcProject

```text
Categoria: Estrutura IFC
Criticidade: Alta
Regra: entity_exists
Entidade: IfcProject
```

### IFC-003 — Existência de IfcSite

```text
Categoria: Estrutura espacial
Criticidade: Moderada
Regra: entity_exists
Entidade: IfcSite
```

### IFC-004 — Pavimentos existentes

```text
Categoria: Estrutura espacial
Criticidade: Alta
Regra: entity_count_min
Entidade: IfcBuildingStorey
Valor mínimo: 1
```

### IFC-005 — Ambientes com nome preenchido

```text
Categoria: Espaços
Criticidade: Moderada
Regra: property_not_empty
Entidade: IfcSpace
Propriedade: Name
```

### IFC-006 — Portas com Tag

```text
Categoria: Elementos
Criticidade: Alta
Regra: property_not_empty
Entidade: IfcDoor
Propriedade: Tag
```

### IFC-007 — GlobalId único

```text
Categoria: Qualidade IFC
Criticidade: Alta
Regra: globalid_unique
```

### IFC-008 — Elementos com geometria

```text
Categoria: Geometria
Criticidade: Alta
Regra: geometry_exists
Entidades: IfcWall, IfcDoor, IfcWindow, IfcSlab, IfcColumn, IfcBeam
```

---

## 15. Comando inicial para o Codex

Use este comando para iniciar o projeto:

```text
Crie um monorepo chamado valida-ifc para uma aplicação web de auditoria IFC BIM.

Use:
- Frontend em Next.js + TypeScript + Tailwind CSS.
- Backend em Python + FastAPI.
- Banco de dados PostgreSQL.
- Worker com Redis para processamento futuro.
- Estrutura de pastas apps/web, apps/api, apps/worker, packages/shared, packages/rules-engine, packages/ifc-utils, docs, infra e samples.

O sistema deve possuir:
- Login.
- Dashboard.
- CRUD de projetos.
- Upload de arquivos IFC.
- Leitura da versão IFC pelo cabeçalho FILE_SCHEMA.
- Importação de critérios em CSV, XLSX e TXT.
- Cadastro manual de critérios.
- Estrutura para criação de critérios por linguagem natural.
- Motor de auditoria por regras.
- Criticidade baixa, moderada e alta.
- Cálculo de percentual ponderado por criticidade.
- Tela de resultado da auditoria.
- Estrutura inicial para visualizador IFC.
- Relatório HTML com opção de impressão.

Crie também os documentos:
- README.md
- docs/ARCHITECTURE.md
- docs/API.md
- docs/DATABASE.md
- docs/RULES_SCHEMA.md
- docs/FRONTEND_SPEC.md
- docs/BACKEND_SPEC.md
- docs/VIEWER_SPEC.md
- docs/REPORT_SPEC.md
- docs/ROADMAP.md

Não implemente tudo em um único arquivo. Organize o projeto de forma modular e preparada para crescimento.
```

---

## 16. Prompts sequenciais para desenvolvimento no Codex

### Prompt 1 — Estrutura inicial

```text
Crie a estrutura inicial do monorepo valida-ifc com frontend, backend, worker, packages, docs, infra e samples. Configure arquivos README, .gitignore, .env.example e docker-compose inicial.
```

### Prompt 2 — Backend base

```text
Implemente o backend FastAPI com módulos de autenticação, usuários, projetos, arquivos IFC, critérios, auditorias e relatórios. Crie modelos SQLAlchemy, schemas Pydantic e rotas REST iniciais.
```

### Prompt 3 — Upload IFC e metadados

```text
Implemente o endpoint de upload de arquivos IFC. Salve o arquivo em storage local, valide extensão, registre no banco e leia o cabeçalho FILE_SCHEMA para identificar IFC2X3, IFC4 ou IFC4X3.
```

### Prompt 4 — Importação de critérios

```text
Implemente importação de critérios em CSV, XLSX e TXT. Converta os dados importados para o schema interno de critérios. Valide criticidade, tipo de regra, operador e campos obrigatórios.
```

### Prompt 5 — Motor de auditoria

```text
Implemente o motor de auditoria com suporte inicial às regras ifc_schema, entity_exists, entity_count_min, property_exists, property_not_empty e globalid_unique. Cada regra deve retornar status, mensagem, severidade, valor encontrado e valor esperado.
```

### Prompt 6 — Cálculo de pontuação

```text
Implemente cálculo de pontuação ponderada por criticidade, usando baixa=1, moderada=3 e alta=5. Gere percentual geral, percentual por criticidade e classificação final.
```

### Prompt 7 — Frontend base

```text
Implemente o frontend com telas de login, dashboard, projetos, upload IFC, critérios, execução de auditoria e relatório. Use componentes reutilizáveis, layout limpo e design moderno.
```

### Prompt 8 — Visualizador IFC

```text
Implemente uma tela inicial de visualizador IFC usando Three.js e web-ifc ou That Open Components. Permita carregar o modelo IFC, selecionar elementos e preparar estrutura para aplicação de cores por resultado da auditoria.
```

### Prompt 9 — Relatório

```text
Implemente relatório HTML com resumo executivo, dados do projeto, dados do IFC, percentual geral, resultado por criticidade, lista de critérios avaliados e lista de inconformidades. Adicione botão de impressão usando window.print().
```

### Prompt 10 — Testes

```text
Crie testes unitários para leitura de FILE_SCHEMA, importação de critérios, execução de regras, cálculo de pontuação e geração do resumo da auditoria.
```

---

## 17. Critérios de aceite do MVP

O MVP será considerado concluído quando:

- [ ] Usuário consegue fazer login.
- [ ] Usuário consegue criar projeto.
- [ ] Usuário consegue enviar arquivo IFC.
- [ ] Sistema identifica a versão/schema IFC.
- [ ] Usuário consegue importar critérios CSV.
- [ ] Sistema executa auditoria básica.
- [ ] Sistema calcula percentual ponderado por criticidade.
- [ ] Sistema exibe resultado da auditoria.
- [ ] Sistema gera relatório HTML.
- [ ] Usuário consegue imprimir o relatório.
- [ ] Código está organizado em frontend, backend e pacotes auxiliares.
- [ ] Documentação básica está criada.

---

## 18. Definition of Done

Para cada funcionalidade implementada:

- Código limpo e modular.
- Sem lógica crítica duplicada.
- Tipagem adequada.
- Tratamento de erros.
- Validação de entrada.
- Mensagens claras para o usuário.
- Testes quando aplicável.
- Documentação atualizada.
- Sem dados sensíveis no repositório.
- Arquivos pesados IFC fora do Git, preferencialmente em storage local ou externo.

---

## 19. Observações importantes para o desenvolvimento

- Não colocar arquivos IFC pesados dentro do repositório Git.
- Usar pasta `samples/ifc/` apenas para arquivos pequenos de teste.
- Prever `.gitignore` para uploads, relatórios gerados e arquivos temporários.
- Separar claramente regra de auditoria, leitura IFC e interface.
- O visualizador deve consumir os resultados da auditoria pelo `GlobalId`.
- O backend deve ser a fonte confiável dos resultados.
- O frontend deve apenas exibir e interagir com os dados processados.
- A criação por linguagem natural deve gerar uma sugestão revisável, não uma regra definitiva sem validação humana.
- Em produção, processar auditorias pesadas em worker assíncrono.
- Em produção, usar storage externo ou MinIO/S3.
- Em produção, adicionar controle de permissões por projeto.

---

## 20. Resultado esperado

Ao final do desenvolvimento, o sistema deverá permitir que um usuário faça upload de um arquivo IFC, selecione ou crie critérios de auditoria, execute a validação, visualize os resultados em tabela e no modelo 3D colorido, e gere um relatório técnico com percentual de conformidade por criticidade.

O principal valor do produto não é apenas visualizar IFC, mas transformar o IFC em um objeto auditável com critérios claros, rastreabilidade, pontuação e evidências para tomada de decisão BIM.
