package store

import (
	"context"
	"time"

	"clock-orchestrio/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, databaseURL string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	s := &PostgresStore{pool: pool}
	if err := s.migrate(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return s, nil
}

func (s *PostgresStore) migrate(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `
	CREATE TABLE IF NOT EXISTS entries (
		id BIGSERIAL PRIMARY KEY,
		task TEXT NOT NULL,
		started_at TIMESTAMPTZ NOT NULL,
		ended_at TIMESTAMPTZ,
		duration_seconds INTEGER,
		notes TEXT,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`)
	return err
}

func (s *PostgresStore) Health(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func scanEntry(row pgx.Row) (*model.Entry, error) {
	var e model.Entry
	if err := row.Scan(&e.ID, &e.Task, &e.StartedAt, &e.EndedAt, &e.DurationSeconds, &e.Notes, &e.CreatedAt); err != nil {
		return nil, err
	}
	return &e, nil
}

func (s *PostgresStore) ListEntries(ctx context.Context) ([]model.Entry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, task, started_at, ended_at, duration_seconds, notes, created_at
		FROM entries
		ORDER BY started_at DESC
		LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []model.Entry{}
	for rows.Next() {
		var e model.Entry
		if err := rows.Scan(&e.ID, &e.Task, &e.StartedAt, &e.EndedAt, &e.DurationSeconds, &e.Notes, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (s *PostgresStore) ActiveEntry(ctx context.Context) (*model.Entry, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, task, started_at, ended_at, duration_seconds, notes, created_at
		FROM entries
		WHERE ended_at IS NULL
		ORDER BY id DESC
		LIMIT 1`)
	e, err := scanEntry(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return e, nil
}

func (s *PostgresStore) StartEntry(ctx context.Context, task string, notes *string) (*model.Entry, error) {
	active, err := s.ActiveEntry(ctx)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, ErrActiveConflict
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO entries (task, started_at, notes)
		VALUES ($1, NOW(), $2)
		RETURNING id, task, started_at, ended_at, duration_seconds, notes, created_at`,
		task, notes,
	)
	return scanEntry(row)
}

func (s *PostgresStore) StopEntry(ctx context.Context) (*model.Entry, error) {
	active, err := s.ActiveEntry(ctx)
	if err != nil {
		return nil, err
	}
	if active == nil {
		return nil, ErrNoActiveEntry
	}

	endedAt := time.Now().UTC()
	duration := int(endedAt.Sub(active.StartedAt).Seconds())
	if duration < 0 {
		duration = 0
	}

	row := s.pool.QueryRow(ctx, `
		UPDATE entries
		SET ended_at = $1, duration_seconds = $2
		WHERE id = $3
		RETURNING id, task, started_at, ended_at, duration_seconds, notes, created_at`,
		endedAt, duration, active.ID,
	)
	return scanEntry(row)
}

func (s *PostgresStore) AddManualEntry(ctx context.Context, task string, startedAt string, endedAt string, notes *string) (*model.Entry, error) {
	start, err := time.Parse(time.RFC3339, startedAt)
	if err != nil {
		return nil, err
	}
	end, err := time.Parse(time.RFC3339, endedAt)
	if err != nil {
		return nil, err
	}
	if !end.After(start) {
		return nil, ErrNoActiveEntry
	}
	duration := int(end.Sub(start).Seconds())

	row := s.pool.QueryRow(ctx, `
		INSERT INTO entries (task, started_at, ended_at, duration_seconds, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, task, started_at, ended_at, duration_seconds, notes, created_at`,
		task, start.UTC(), end.UTC(), duration, notes,
	)
	return scanEntry(row)
}

func (s *PostgresStore) DeleteEntry(ctx context.Context, id int64) (bool, error) {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM entries WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	return cmd.RowsAffected() > 0, nil
}

func (s *PostgresStore) Close() {
	s.pool.Close()
}
