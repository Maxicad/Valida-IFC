from time import sleep, time

from redis import Redis
from rq import Worker
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine


def wait_for_dependencies() -> None:
    deadline = time() + settings.worker_startup_timeout_seconds
    last_error: Exception | None = None

    while time() < deadline:
        try:
            redis_conn = Redis.from_url(settings.redis_url)
            redis_conn.ping()
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return
        except Exception as exc:
            last_error = exc
            sleep(settings.worker_startup_poll_seconds)

    raise RuntimeError(f"Worker dependencies are unavailable: {last_error}")


def main() -> None:
    wait_for_dependencies()
    redis_conn = Redis.from_url(settings.redis_url)
    queue_names = [settings.audit_queue_name]
    worker = Worker(queue_names, connection=redis_conn)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
