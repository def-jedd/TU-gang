"""HTTP API for the mobile app: the same tutor as chat.py, over JSON.

    python server.py                       # http://0.0.0.0:8000, phone-reachable
    PORT=9000 python server.py

GET  /api/health   200 when retrieval and the provider are ready, else 503
POST /api/explain  contract in apps/mobile/src/types/tutor.ts
Errors are always {"error": "readable message"}. Try it at /docs.
"""

import os
import socket
import uuid
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException

import config
from answer_check import clearly_english
from tutor import generate_answer, load_providers, load_retriever, readiness_error

providers = load_providers()
retriever = None
retriever_error = None


@asynccontextmanager
async def lifespan(_app):
    # Start even when embeddings are missing, so /api/health can say why.
    global retriever, retriever_error
    try:
        retriever = load_retriever()
    except (RuntimeError, ValueError) as error:
        retriever_error = str(error)
    yield


app = FastAPI(title="Bikol tutor API", lifespan=lifespan)
# Lets `npm run web` (another localhost port) call the API. No cookies are used.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ExplainRequest(BaseModel):
    question: str = Field("", max_length=500)
    topic: str | None = Field(None, max_length=64)
    language: Literal["bikol_daet"] = "bikol_daet"
    difficulty: Literal["very_simple", "simple", "normal"] = "simple"
    style: Literal["teacher", "friend", "ate_kuya"] = "teacher"
    action: Literal["explain", "explain_differently"] = "explain"


def error(status, message):
    return JSONResponse({"error": message}, status_code=status)


@app.exception_handler(HTTPException)
async def http_error(_request, exc):
    return error(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_request, exc):
    first = exc.errors()[0]
    field = ".".join(str(part) for part in first["loc"] if part != "body")
    return error(422, f"{field}: {first['msg']}" if field else first["msg"])


def not_ready():
    return retriever_error or readiness_error(providers)


@app.get("/api/health")
def health():
    body = {"status": "ok", "version": "mvp", "provider": config.ACTIVE_PROVIDER}
    problem = not_ready()
    if problem:
        return JSONResponse({**body, "status": "unavailable", "error": problem}, status_code=503)
    return body


@app.post("/api/explain")
def explain(request: ExplainRequest):
    question = request.question.strip()
    if not question and request.topic:
        question = f"What is {request.topic.replace('_', ' ')}?"
    if not question:
        return error(422, "Ask a question or choose a topic card.")
    problem = not_ready()
    if problem:
        return error(503, problem)

    references = retriever.retrieve(question, config.TOP_GENERAL_CHUNKS, config.TOP_CUSTOM_CHUNKS)
    try:
        answer = generate_answer(*providers, question, references,
                                 request.difficulty, request.style, request.action)
    except (RuntimeError, ValueError) as failure:
        return error(502, str(failure))
    if clearly_english(" ".join([answer["explanation"], answer["example"], *answer["key_points"]])):
        return error(502, "The model answered in English instead of Bikol. Please try again.")

    matched = next((ref["topic"] for ref in references if ref.get("retrieval_use") == "topic_and_style"), None)
    return {
        "request_id": uuid.uuid4().hex,
        "topic": request.topic or matched,
        "language": request.language,
        **answer,  # explanation, example, key_points (see tutor.generate_answer)
        "source_ids": [ref["id"] for ref in references],
        "provider": config.ACTIVE_PROVIDER,
    }


def lan_address():
    """The IP a phone on the same Wi-Fi uses to reach this machine."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        try:
            probe.connect(("10.255.255.255", 1))
            return probe.getsockname()[0]
        except OSError:
            return "127.0.0.1"


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    print(f"Phone setting: EXPO_PUBLIC_API_BASE_URL=http://{lan_address()}:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
