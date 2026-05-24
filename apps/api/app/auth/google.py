from functools import lru_cache
from typing import Any

import httpx
from jose import JWTError, jwt

from app.core.config import settings

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleTokenError(ValueError):
    pass


@lru_cache(maxsize=1)
def get_google_jwks() -> dict[str, Any]:
    response = httpx.get(GOOGLE_JWKS_URL, timeout=5)
    response.raise_for_status()
    return response.json()


def _select_key(id_token: str, jwks: dict[str, Any]) -> dict[str, Any]:
    header = jwt.get_unverified_header(id_token)
    kid = header.get("kid")
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    raise GoogleTokenError("Google signing key not found.")


def _allowed_domain(claims: dict[str, Any]) -> bool:
    if not settings.google_allowed_hosted_domains:
        return True

    allowed = {domain.lower() for domain in settings.google_allowed_hosted_domains}
    email = str(claims.get("email") or "").lower()
    email_domain = email.rsplit("@", maxsplit=1)[-1] if "@" in email else ""
    hosted_domain = str(claims.get("hd") or "").lower()
    return hosted_domain in allowed or email_domain in allowed


def _is_verified(value: Any) -> bool:
    return value is True or str(value).lower() == "true"


def verify_google_id_token(id_token: str) -> dict[str, Any]:
    if not settings.google_client_id:
        raise GoogleTokenError("Google login is not configured.")

    try:
        jwks = get_google_jwks()
        try:
            key = _select_key(id_token, jwks)
        except GoogleTokenError:
            get_google_jwks.cache_clear()
            key = _select_key(id_token, get_google_jwks())
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=settings.google_client_id,
        )
    except (httpx.HTTPError, JWTError, GoogleTokenError) as exc:
        raise GoogleTokenError("Invalid Google credential.") from exc

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleTokenError("Invalid Google issuer.")
    if not claims.get("email") or not _is_verified(claims.get("email_verified")):
        raise GoogleTokenError("Google account email is not verified.")
    if not _allowed_domain(claims):
        raise GoogleTokenError("Google account domain is not allowed.")

    return claims
