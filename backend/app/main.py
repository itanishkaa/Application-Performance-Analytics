from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, analytics, auth, datasets, endpoints, incidents, logs, regions, releases, services
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Import models so they register on Base.metadata before create_all runs.
from app.models import api_log, dataset, incident, user  # noqa: F401


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Application Performance & Reliability Analytics Platform",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        # V1 uses create_all for simplicity (PRD explicitly scopes out
        # heavier infra for V1). Swap for Alembic migrations once the
        # schema needs to evolve without dropping data.
        Base.metadata.create_all(bind=engine)

    @app.get("/health", tags=["health"])
    def health_check():
        return {"status": "ok", "app": settings.APP_NAME}

    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router, prefix=prefix)
    app.include_router(datasets.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(services.router, prefix=prefix)
    app.include_router(endpoints.router, prefix=prefix)
    app.include_router(releases.router, prefix=prefix)
    app.include_router(regions.router, prefix=prefix)
    app.include_router(logs.router, prefix=prefix)
    app.include_router(incidents.router, prefix=prefix)
    app.include_router(ai.router, prefix=prefix)

    return app


app = create_app()
