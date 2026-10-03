"""Kiro CLI in headless mode: https://kiro.dev/docs/cli/headless/

NOT YET TESTED against a live Kiro account. Before relying on it, run one
question through `python chat.py` with BIKOL_PROVIDER=kiro and check that
stdout holds only the answer.

Requires `kiro-cli` on PATH and KIRO_API_KEY (Kiro Pro tier or above).
Optional: KIRO_MODEL (model id for --model), KIRO_AGENT (custom agent name).
"""

import os
import re
import shutil
import subprocess
import tempfile

from .base import LLMProvider

ANSI_ESCAPE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


class KiroProvider(LLMProvider):
    def __init__(self, model_name: str | None = None, agent: str | None = None):
        self.model_name = model_name or os.getenv("KIRO_MODEL")
        self.agent = agent or os.getenv("KIRO_AGENT")
        self.executable = shutil.which(os.getenv("KIRO_CLI", "kiro-cli"))
        # Kiro is a coding agent and the prompt contains student text. Tools are
        # never pre-approved (no --trust-*), and it runs in an empty folder so
        # even read-only tools see nothing of this project.
        self.workdir = tempfile.mkdtemp(prefix="bikol-kiro-")

    def check_ready(self) -> str | None:
        if not self.executable:
            return "kiro-cli is not installed or not on PATH. See https://kiro.dev/docs/cli/ to install it."
        if not os.getenv("KIRO_API_KEY"):
            return "Set KIRO_API_KEY (Kiro account settings) to use the Kiro provider."
        return None

    def generate(self, prompt: str) -> str:
        command = [self.executable, "chat", "--no-interactive"]
        if self.model_name:
            command += ["--model", self.model_name]
        if self.agent:
            command += ["--agent", self.agent]
        try:
            # The prompt goes through stdin: multi-line prompts break Windows argv quoting.
            result = subprocess.run(command, input=prompt, capture_output=True, text=True,
                                    encoding="utf-8", cwd=self.workdir, timeout=180)
        except subprocess.TimeoutExpired as error:
            raise RuntimeError("Kiro did not answer within 180 seconds.") from error
        if result.returncode != 0:
            detail = ANSI_ESCAPE.sub("", result.stderr).strip()[-300:]
            raise RuntimeError(f"Kiro request failed (exit {result.returncode}): {detail}")
        return ANSI_ESCAPE.sub("", result.stdout).strip()
