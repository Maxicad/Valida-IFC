from pydantic import BaseModel, EmailStr
from pydantic import ConfigDict


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "auditor_bim"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: str
