from datetime import datetime, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext
from jose import jwt

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from store.memory import create_user, find_user_by_username

router = APIRouter(prefix="/api/auth", tags=["auth"])
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def build_token_response(user_id: str, username: str):
    token = create_access_token({"sub": user_id, "username": username})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register")
def register(payload: dict):
    username = payload.get("username")
    password = payload.get("password")
    if not username or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password required")
    if find_user_by_username(username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    hashed_password = password_context.hash(password)
    user_id = f"user-{uuid4().hex}"
    create_user(user_id, username, hashed_password)
    return build_token_response(user_id, username)


@router.post("/login")
def login(payload: dict):
    username = payload.get("username")
    password = payload.get("password")
    if not username or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password required")
    user = find_user_by_username(username)
    if not user or not password_context.verify(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return build_token_response(user["id"], user["username"])
