package database

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct{ client *redis.Client }

func ConnectRedis(url string) (*Cache, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return &Cache{}, nil
	}
	c := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := c.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis unavailable (%v) — running without cache", err)
		return &Cache{}, nil
	}
	log.Println("✅ Redis connected")
	return &Cache{client: c}, nil
}

func (c *Cache) Set(ctx context.Context, key string, val interface{}, ttl time.Duration) error {
	if c.client == nil {
		return nil
	}
	return c.client.Set(ctx, key, val, ttl).Err()
}

func (c *Cache) Get(ctx context.Context, key string) (string, error) {
	if c.client == nil {
		return "", redis.Nil
	}
	return c.client.Get(ctx, key).Result()
}

func (c *Cache) Del(ctx context.Context, keys ...string) error {
	if c.client == nil {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}
