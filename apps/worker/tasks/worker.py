from redis import Redis
from rq import Worker

from app.core.config import settings


def main() -> None:
    redis_conn = Redis.from_url(settings.redis_url)
    queue_names = [settings.audit_queue_name]
    worker = Worker(queue_names, connection=redis_conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
