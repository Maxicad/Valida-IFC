from fastapi import APIRouter, status

from app.auth.schemas import CurrentUserResponse, LoginRequest, RegisterRequest, TokenResponse
from app.core.security import create_access_token, hash_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=CurrentUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> CurrentUserResponse:
    # MVP stub: persistencia real entra na proxima etapa.
    _password_hash = hash_password(payload.password)
    return CurrentUserResponse(
        id="user-demo",
        name=payload.name,
        email=payload.email,
        role=payload.role,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    token = create_access_token(subject=payload.email, extra_claims={"role": "auditor_bim"})
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/me", response_model=CurrentUserResponse)
def me() -> CurrentUserResponse:
    return CurrentUserResponse(
        id="user-demo",
        name="Auditor BIM",
        email="auditor@example.com",
        role="auditor_bim",
    )
