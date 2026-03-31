FROM golang:1.25.8-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /polka-api ./cmd/api

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /polka-api /usr/local/bin/polka-api

EXPOSE 8080

ENTRYPOINT ["polka-api"]
