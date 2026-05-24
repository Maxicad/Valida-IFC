from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.google import GoogleTokenError, verify_google_id_token
from app.auth.schemas import CurrentUserResponse, GoogleLoginRequest, LoginRequest, RegisterRequest, TokenResponse
from app.core.database import get_db
from app.core.models import User
from app.core.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=CurrentUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(subject=user.id, extra_claims={"role": user.role, "email": user.email})
    return TokenResponse(access_token=token)


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        claims = verify_google_id_token(payload.id_token)
    except GoogleTokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    email = str(claims.get("email") or "").lower()
    email_verified = claims.get("email_verified") is True or str(claims.get("email_verified")).lower() == "true"
    if not email or not email_verified:
        raise HTTPException(status_code=401, detail="Google account email is not verified.")
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid Google credential.")

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            name=str(claims.get("name") or email.split("@")[0]),
            email=email,
            password_hash=f"google-oauth:{claims.get('sub', '')}",
            role="auditor_bim",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(subject=user.id, extra_claims={"role": user.role, "email": user.email})
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
