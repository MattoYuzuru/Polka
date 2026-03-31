package media

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	backendconfig "github.com/MattoYuzuru/Polka/backend/internal/config"
)

var (
	ErrStorageDisabled = errors.New("storage is disabled")
	ErrObjectNotFound  = errors.New("object not found")
)

type UploadInput struct {
	FileName    string
	ContentType string
	Body        []byte
}

type UploadedObject struct {
	ObjectKey   string
	ContentType string
	Palette     []string
}

type DownloadedObject struct {
	ContentType string
	Body        io.ReadCloser
}

type Storage interface {
	EnsureBucket(ctx context.Context) error
	UploadCover(ctx context.Context, input UploadInput) (UploadedObject, error)
	Open(ctx context.Context, objectKey string) (DownloadedObject, error)
	Delete(ctx context.Context, objectKey string) error
}

type S3Storage struct {
	client *s3.Client
	bucket string
}

func New(cfg backendconfig.Config) (Storage, error) {
	if strings.TrimSpace(cfg.StorageEndpoint) == "" ||
		strings.TrimSpace(cfg.StorageAccessKeyID) == "" ||
		strings.TrimSpace(cfg.StorageSecretAccessKey) == "" {
		return nil, nil
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithRegion(cfg.StorageRegion),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(
				cfg.StorageAccessKeyID,
				cfg.StorageSecretAccessKey,
				"",
			),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(cfg.StorageEndpoint)
		options.UsePathStyle = cfg.StorageUsePathStyle
	})

	return &S3Storage{
		client: client,
		bucket: cfg.StorageBucket,
	}, nil
}

func (storage *S3Storage) EnsureBucket(ctx context.Context) error {
	_, err := storage.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(storage.bucket),
	})
	if err == nil {
		return nil
	}

	_, createErr := storage.client.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(storage.bucket),
	})
	if createErr != nil && !strings.Contains(strings.ToLower(createErr.Error()), "already") {
		return fmt.Errorf("ensure bucket: %w", createErr)
	}

	return nil
}

func (storage *S3Storage) UploadCover(ctx context.Context, input UploadInput) (UploadedObject, error) {
	palette, err := ExtractPalette(input.Body)
	if err != nil {
		return UploadedObject{}, err
	}

	objectKey := buildObjectKey(input.FileName)
	contentType := normalizeContentType(input.ContentType, input.FileName)

	_, err = storage.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(storage.bucket),
		Key:          aws.String(objectKey),
		Body:         bytes.NewReader(input.Body),
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return UploadedObject{}, fmt.Errorf("put cover object: %w", err)
	}

	return UploadedObject{
		ObjectKey:   objectKey,
		ContentType: contentType,
		Palette:     palette,
	}, nil
}

func (storage *S3Storage) Open(ctx context.Context, objectKey string) (DownloadedObject, error) {
	result, err := storage.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(storage.bucket),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "no such key") {
			return DownloadedObject{}, ErrObjectNotFound
		}

		return DownloadedObject{}, fmt.Errorf("get cover object: %w", err)
	}

	return DownloadedObject{
		ContentType: aws.ToString(result.ContentType),
		Body:        result.Body,
	}, nil
}

func (storage *S3Storage) Delete(ctx context.Context, objectKey string) error {
	if strings.TrimSpace(objectKey) == "" {
		return nil
	}

	_, err := storage.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(storage.bucket),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		return fmt.Errorf("delete cover object: %w", err)
	}

	return nil
}

func buildObjectKey(fileName string) string {
	extension := strings.ToLower(filepath.Ext(fileName))
	if extension == "" {
		extension = ".bin"
	}

	return fmt.Sprintf("covers/%d-%d%s", time.Now().UnixNano(), time.Now().UnixMilli(), extension)
}

func normalizeContentType(contentType string, fileName string) string {
	trimmed := strings.TrimSpace(contentType)
	if trimmed != "" {
		return trimmed
	}

	if guessed := mime.TypeByExtension(filepath.Ext(fileName)); guessed != "" {
		return guessed
	}

	return "application/octet-stream"
}
