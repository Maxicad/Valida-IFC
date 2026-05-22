FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/api/requirements.txt /app/apps/api/requirements.txt
COPY apps/worker/requirements.txt /app/apps/worker/requirements.txt
RUN pip install --no-cache-dir -r /app/apps/api/requirements.txt -r /app/apps/worker/requirements.txt

COPY apps/api /app/apps/api
COPY apps/worker /app/apps/worker
COPY packages /app/packages

ENV PYTHONPATH=/app:/app/apps/api:/app/apps/worker:/app/packages/rules-engine:/app/packages/ifc-utils

CMD ["python", "-m", "apps.worker.tasks.worker"]
