"""Gunicorn config tuned for the SSE streaming endpoint.

One worker + gthread keeps the shared SQLAlchemy session single-threaded
(our parallel pipeline writes to it after the reply stream ends) while
threads allow concurrent requests. Do not switch to sync workers for
long-lived SSE responses.
"""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = 1
threads = int(os.getenv('GUNICORN_THREADS', '8'))
worker_class = "gthread"
timeout = int(os.getenv('GUNICORN_TIMEOUT', '120'))
graceful_timeout = 30
keepalive = 65
accesslog = "-"
errorlog = "-"
