# Multi-stage Dockerfile for LinguaLive AI (Frontend + Backend in One Container)

# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web

# Install web dependencies
COPY web/package*.json ./
RUN npm install

# Build static bundle
COPY web/ ./
RUN npm run build

# Stage 2: Python Backend & Static SPA Server
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    DEBUG=false \
    HOST=0.0.0.0 \
    PORT=8000

# Install system dependencies (curl for healthcheck, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/web/dist ./web/dist

# Expose port (Render/Railway map this to $PORT)
EXPOSE 8000

# Start server
WORKDIR /app/backend
CMD ["python", "run.py"]

