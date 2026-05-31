from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import asyncio
import json
import logging

from app.workers.celery_app import celery_app
from app.api.deps.auth import verify_token_from_string
from fastapi import HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)

# Basic connection manager for WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        self.active_connections[task_id] = websocket

    def disconnect(self, task_id: str):
        if task_id in self.active_connections:
            del self.active_connections[task_id]

    async def send_personal_message(self, message: str, task_id: str):
        if task_id in self.active_connections:
            await self.active_connections[task_id].send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint that streams live Celery task status back to the frontend dashboard.
    Requires a valid JWT passed as ?token=<jwt> query parameter (WebSockets cannot
    send Authorization headers from the browser).
    """
    # [C-2] Authenticate before accepting the connection
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        logger.warning(f"WebSocket rejected (no token) for task: {task_id}")
        return

    try:
        user_id = verify_token_from_string(token)
    except HTTPException:
        await websocket.close(code=4001)
        logger.warning(f"WebSocket rejected (invalid token) for task: {task_id}")
        return

    await manager.connect(websocket, task_id)
    try:
        while True:
            # Poll Celery task status (MVP approach; can be upgraded to Redis PubSub)
            task_result = celery_app.AsyncResult(task_id)

            # [L-2] Sanitize .info — never expose raw Celery internals to the client
            raw_info = task_result.info
            safe_info = str(raw_info)[:200] if raw_info is not None else None

            payload = {
                "task_id": task_id,
                "status": task_result.status,
                "result": task_result.result if task_result.ready() else None,
                "info": safe_info,
            }

            await manager.send_personal_message(json.dumps(payload, default=str), task_id)

            # If the task is finished (SUCCESS or FAILURE), close the socket cleanly
            if task_result.ready():
                break

            await asyncio.sleep(2)  # Poll interval

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for task: {task_id} (user: {user_id})")
    finally:
        manager.disconnect(task_id)
