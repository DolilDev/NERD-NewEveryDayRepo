from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Dict

from config import SECRET_KEY, ALGORITHM, settings
from store.memory import get_user

security = HTTPBearer()


def get_token_from_auth_header(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if credentials.scheme.lower() != settings.token_prefix.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )
    return credentials.credentials


def validate_token(token: str) -> Dict[str, str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        if user_id is None or username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return {"user_id": user_id, "username": username}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token",
        )


def get_current_user(token: str = Depends(get_token_from_auth_header)):
    token_data = validate_token(token)
    user = get_user(token_data["user_id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_user_from_request(request: Request):
    authorization = request.headers.get(settings.auth_header)
    if not authorization:
        return None
    try:
        scheme, token = authorization.split(" ", 1)
    except ValueError:
        return None
    if scheme.lower() != settings.token_prefix.lower():
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return get_user(payload.get("sub"))
    except JWTError:
        return None
