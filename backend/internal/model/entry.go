package model

import "time"

type Entry struct {
	ID              int64
	Task            string
	StartedAt       time.Time
	EndedAt         *time.Time
	DurationSeconds *int
	Notes           *string
	CreatedAt       time.Time
}
