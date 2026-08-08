FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY frontend/dist frontend/dist

WORKDIR /app/backend

EXPOSE 8000

CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:create_app()"]