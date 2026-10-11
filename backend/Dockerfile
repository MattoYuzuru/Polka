FROM golang:1.27.2-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /polka-api ./cmd/api

FROM alpine:3.22

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /polka-api /usr/local/bin/polka-api

EXPOSE 8080

ENTRYPOINT ["polka-api"]
