# Stage 1: build the frontend bundle.
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: build a static Go binary.
FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Stage 3: the binary and the bundle, running as a non-root user.
FROM alpine:3
RUN adduser -D -u 10001 app
COPY --from=backend /out/server /usr/local/bin/server
COPY --from=frontend /app/dist /srv/static
ENV STATIC_DIR=/srv/static
USER app
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/health || exit 1
ENTRYPOINT ["server"]
