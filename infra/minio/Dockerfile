FROM golang:1.27.2-alpine AS builder

WORKDIR /source

RUN apk add --no-cache ca-certificates curl
RUN curl --fail --location --retry 3 \
      https://codeload.github.com/minio/minio/tar.gz/7aac2a2c5b7c882e68c1ce017d8256be2feea27f \
      --output /tmp/minio.tar.gz \
    && echo "71794c2df26aad0cc99e8421c58b7aa2dd55969f979b0e7d1e931042e9fabcd6  /tmp/minio.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/minio.tar.gz --strip-components=1 \
    && rm /tmp/minio.tar.gz
RUN CGO_ENABLED=0 go build -trimpath -o /minio .

FROM alpine:3.22

LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="7aac2a2c5b7c882e68c1ce017d8256be2feea27f" \
      org.opencontainers.image.licenses="AGPL-3.0-only"

RUN apk add --no-cache ca-certificates curl
COPY --from=builder /minio /usr/local/bin/minio
COPY --from=builder /source/LICENSE /usr/share/licenses/minio/LICENSE

EXPOSE 9000 9001

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
