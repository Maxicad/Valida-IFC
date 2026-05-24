# Valida IFC Worker

Worker RQ para processamento pesado do Valida IFC.

Responsabilidades atuais:

- consumir a fila Redis configurada por `AUDIT_QUEUE_NAME`;
- executar auditorias IFC por `apps.api.app.audits.jobs.process_audit_run`;
- abrir sessao de banco da API e persistir status, score e resultados detalhados;
- aguardar Redis e banco antes de iniciar consumo;
- executar retries pelo scheduler interno do RQ;
- registrar falhas como `failed` com `error_message`;
- manter jobs com falha no failed job registry pelo periodo configurado.

Responsabilidades previstas:

- leitura IFC pesada;
- geracao de dados de visualizador;
- geracao assincrona de relatorios;
- dashboards operacionais de fila e tendencia de falhas.

Configuracao principal:

- `AUDIT_JOB_TIMEOUT_SECONDS`
- `AUDIT_JOB_RESULT_TTL_SECONDS`
- `AUDIT_JOB_FAILURE_TTL_SECONDS`
- `AUDIT_JOB_MAX_RETRIES`
- `AUDIT_JOB_RETRY_INTERVALS_SECONDS`
- `WORKER_STARTUP_TIMEOUT_SECONDS`
- `WORKER_STARTUP_POLL_SECONDS`

O fluxo de Fase 4 foi validado com API + Postgres + Redis + worker em Compose, garantindo `queue_job_id`, auditoria concluida pelo worker, auditoria falha pelo worker, persistencia de `error_message` e failed job registry.
