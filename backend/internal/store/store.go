package store

import (
	"context"
	"errors"

	"clock-orchestrio/backend/internal/model"
)

var (
	ErrNoActiveEntry  = errors.New("no active entry")
	ErrActiveConflict = errors.New("active entry already exists")
)

type Store interface {
	Health(context.Context) error
	ListEntries(context.Context) ([]model.Entry, error)
	ActiveEntry(context.Context) (*model.Entry, error)
	StartEntry(context.Context, string, *string) (*model.Entry, error)
	StopEntry(context.Context) (*model.Entry, error)
	AddManualEntry(context.Context, string, string, string, *string) (*model.Entry, error)
	DeleteEntry(context.Context, int64) (bool, error)
	Close()
}
