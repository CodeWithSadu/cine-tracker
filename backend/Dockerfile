# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /build
COPY . .
# go.sum is generated here so the repo builds straight from a fresh clone.
# For reproducible builds, run `go mod tidy` locally and commit go.sum.
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /movietracker ./cmd/server

# ── Stage 2: Minimal runtime ─────────────────────────────────────────────────
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /movietracker /movietracker
EXPOSE 8080
ENTRYPOINT ["/movietracker"]
