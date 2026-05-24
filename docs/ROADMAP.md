# Roadmap

Este roadmap organiza o Valida IFC em duas entregas de produto:

- **Versao Alfa**: validar o uso real do fluxo principal de auditoria IFC.
- **Versao Beta**: expandir produtividade BIM apos a Alfa ser validada por usuarios reais.

## Criterio de validacao da Versao Alfa

A Versao Alfa so deve ser considerada validada quando houver evidencia com usuarios reais cobrindo:

- login;
- criacao ou selecao de projeto;
- upload de IFC real;
- importacao ou selecao de criterios;
- execucao de auditoria;
- visualizacao de falhas no viewer;
- emissao/compartilhamento de evidencia;
- aceite ou rejeicao documentada pelo usuario piloto.

## Versao Alfa - escopo planejado

Objetivo: entregar o menor produto confiavel para auditoria IFC, com baixa friccao de entrada e evidencia tecnica rastreavel.

### Produto e UX

- Fluxo principal claro: `Upload IFC -> Selecionar criterios -> Rodar auditoria -> Ver resultado -> Compartilhar evidencia`.
- Modo de auditoria rapida com defaults seguros.
- Entrada simplificada para abrir/validar um IFC com poucos cliques.
- Viewer conectado aos resultados da auditoria, com foco por elemento, filtros por status/severidade/codigo/GlobalId e lista de falhas.
- Relatorio executivo com detalhes tecnicos, sugestao de correcao e evidencia compartilhavel.
- Snapshots somente leitura para compartilhamento externo.
- Historico simples por projeto e comparacao entre execucoes de auditoria.

### Autenticacao e acesso

- Login local com e-mail/senha.
- **Login com Google na Alfa**, dentro da fase atual de construcao, para reduzir friccao de onboarding.
- Rotas protegidas e JWT/Bearer mantidos para APIs internas.

### Auditoria e openBIM

- Leitura IFC real com IfcOpenShell/web-ifc conforme necessidade do fluxo.
- Regras iniciais reais para schema, estrutura espacial, propriedades obrigatorias, GlobalId, classificacao e geometria.
- IDS MVP para casos comuns: entidade, propriedade obrigatoria, valores esperados/permitidos.
- Importacao de criterios por CSV/TXT/XLS/XLSX e IDS/XML.
- Fix guides para falhas recorrentes.

### Operacao e confiabilidade

- Worker assincrono para auditorias.
- Observabilidade minima: logs correlacionados, metricas, alertas e fila de falhas.
- Limites de upload, retencao e limpeza de storage.
- Checklist de release, rollback dry-run, monitoramento e suporte nominal.
- Pagina/documentacao de seguranca, LGPD, retencao e responsabilidade tecnica.

### Explicitamente fora da Alfa

- Quantitativos.
- IA.
- Solicitacao de auditoria por linguagem natural.
- Clash detection.
- Sets/search sets/viewpoints avancados.
- Workflows complexos de colaboracao, aprovacao, atribuicao ou comentarios.

## Gate Alfa -> Beta

So iniciar Beta quando todos os itens abaixo estiverem fechados:

- UAT com pelo menos um projeto real validado e registrado.
- Sign-off nominal do stakeholder.
- Suporte e canal de monitoramento definidos.
- Evidencia de interface desktop e mobile.
- Decisao de produto documentada: o fluxo de auditoria foi util, compreensivel e repetivel.

## Versao Beta - escopo planejado

Objetivo: adicionar produtividade BIM e automacao apos a validacao do uso principal.

### Quantitativos

- **Quantitativos entram apenas na Beta**, apos a primeira validacao de uso da Versao Alfa.
- Agrupamentos por tipo IFC, pavimento, disciplina e status de auditoria.
- Exportacao CSV/XLSX.
- Relacao entre quantitativos e falhas: filtrar/contar elementos reprovados por regra.

### IA

- Implementacao de IA somente apos a Alfa ser validada.
- Assistente para explicar falhas, sugerir correcoes e resumir relatorios.
- Solicitacao de auditoria por linguagem natural usando IA, com revisao/confirmacao humana antes de criar criterios ou executar auditoria.
- Opcao BYOK ou provedor configurado, com politica clara de dados.

### Clash/Sets

- Clash detection na Beta.
- Sets/search sets/viewpoints na Beta.
- Exportacao de apontamentos e integracao futura com BCF quando fizer sentido para o piloto.

### Evolucoes adicionais

- API publica versionada.
- bSDD.
- Colaboracao mais rica somente se o piloto comprovar necessidade.

## Mapeamento das fases tecnicas existentes

### Fase 1 - MVP base

- Monorepo.
- Frontend inicial.
- Backend inicial.
- Docker Compose.
- Leitura de `FILE_SCHEMA`.
- Criterios e score base.
- Relatorio HTML inicial.

### Fase 2 - Backend persistente

- Alembic.
- Repositorios SQLAlchemy.
- Autenticacao real.
- CRUD completo de projetos e criterios.
- Upload com storage local.

### Fase 3 - Auditoria IFC

- IfcOpenShell.
- Regras iniciais reais.
- Resultado por elemento.
- Score por criticidade.

### Fase 4 - Viewer e relatorios

- Viewer IFC real.
- Cores por status.
- Relatorios exportaveis.

### Fase 5 - openBIM avancado

- IDS MVP na Alfa.
- BCF, bSDD e API publica planejados para pos-Alfa/Beta conforme validacao.
