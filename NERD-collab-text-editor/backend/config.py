from datetime import timedelta

SECRET_KEY = "supersecretcollabkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

class Settings:
    auth_header = "Authorization"
    token_prefix = "Bearer"
    socket_namespace = "/"

settings = Settings()
