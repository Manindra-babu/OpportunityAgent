# Multi-stage Dockerfile for OpportunityAgent Multi-User BYOK Platform
FROM python:3.11-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies & Node.js for building frontend
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements & install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Install Playwright Chromium dependencies
RUN playwright install-deps chromium && playwright install chromium

# Copy frontend source & build static bundle
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend
RUN cd frontend && npm run build

# Copy backend source
COPY backend ./backend
COPY .env ./

# Expose default port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Start Uvicorn FastAPI server
CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
