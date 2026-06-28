from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from socketio import ASGIApp

from routers.auth import router as auth_router
from routers.documents import router as documents_router
from ws.editor import sio

fastapi_app = FastAPI(title="NERD Collab Text Editor")
fastapi_app.include_router(auth_router)
fastapi_app.include_router(documents_router)


@fastapi_app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


app = ASGIApp(sio, fastapi_app)
