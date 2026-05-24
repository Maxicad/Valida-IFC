from pathlib import Path

from app.core.config import settings
from app.core.database import Base, engine
from app.core import models  # noqa: F401


def main() -> None:
    db_path = settings.database_url.removeprefix("sqlite:///")
    if settings.database_url.startswith("sqlite:///") and db_path != ":memory:":
        path = Path(db_path)
        if path.exists():
            path.unlink()
        path.parent.mkdir(parents=True, exist_ok=True)

    storage_path = Path(settings.local_storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    main()
