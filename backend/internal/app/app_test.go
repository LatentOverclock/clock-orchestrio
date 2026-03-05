package app

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clock-orchestrio/backend/internal/model"
)

type fakeStore struct {
	entries []model.Entry
	nextID  int64
}

func (f *fakeStore) Health(context.Context) error { return nil }
func (f *fakeStore) Close()                      {}

func (f *fakeStore) ListEntries(context.Context) ([]model.Entry, error) {
	return f.entries, nil
}

func (f *fakeStore) ActiveEntry(context.Context) (*model.Entry, error) {
	for i := len(f.entries) - 1; i >= 0; i-- {
		if f.entries[i].EndedAt == nil {
			e := f.entries[i]
			return &e, nil
		}
	}
	return nil, nil
}

func (f *fakeStore) StartEntry(_ context.Context, task string, notes *string) (*model.Entry, error) {
	f.nextID++
	now := time.Now().UTC()
	e := model.Entry{ID: f.nextID, Task: task, StartedAt: now, Notes: notes, CreatedAt: now}
	f.entries = append(f.entries, e)
	return &e, nil
}

func (f *fakeStore) StopEntry(_ context.Context) (*model.Entry, error) {
	for i := len(f.entries) - 1; i >= 0; i-- {
		if f.entries[i].EndedAt == nil {
			now := time.Now().UTC()
			d := int(now.Sub(f.entries[i].StartedAt).Seconds())
			f.entries[i].EndedAt = &now
			f.entries[i].DurationSeconds = &d
			e := f.entries[i]
			return &e, nil
		}
	}
	return nil, nil
}

func (f *fakeStore) AddManualEntry(_ context.Context, task, startedAt, endedAt string, notes *string) (*model.Entry, error) {
	f.nextID++
	s, _ := time.Parse(time.RFC3339, startedAt)
	eTime, _ := time.Parse(time.RFC3339, endedAt)
	d := int(eTime.Sub(s).Seconds())
	e := model.Entry{ID: f.nextID, Task: task, StartedAt: s, EndedAt: &eTime, DurationSeconds: &d, Notes: notes, CreatedAt: time.Now().UTC()}
	f.entries = append(f.entries, e)
	return &e, nil
}

func (f *fakeStore) DeleteEntry(_ context.Context, id int64) (bool, error) {
	for i := range f.entries {
		if f.entries[i].ID == id {
			f.entries = append(f.entries[:i], f.entries[i+1:]...)
			return true, nil
		}
	}
	return false, nil
}

func gqlRequest(t *testing.T, h http.Handler, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"query": query, "variables": variables})
	req := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status %d: %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	return out
}

func TestReq1BackendAndFrontendSurface(t *testing.T) {
	a, err := New(&fakeStore{})
	if err != nil {
		t.Fatal(err)
	}
	h := a.Router()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestReq2CreateAndManageEntries(t *testing.T) {
	a, err := New(&fakeStore{})
	if err != nil {
		t.Fatal(err)
	}
	h := a.Router()

	gqlRequest(t, h, `mutation($task:String!){startEntry(task:$task){id task}}`, map[string]any{"task": "Active"})
	gqlRequest(t, h, `mutation{addManualEntry(task:"Manual", startedAt:"2026-03-05T09:00:00Z", endedAt:"2026-03-05T09:30:00Z"){id}}`, nil)
	res := gqlRequest(t, h, `query{entries{id task}}`, nil)
	data := res["data"].(map[string]any)
	entries := data["entries"].([]any)
	if len(entries) < 2 {
		t.Fatalf("expected >=2 entries, got %d", len(entries))
	}
}

func TestReq3DeleteEntries(t *testing.T) {
	store := &fakeStore{}
	a, err := New(store)
	if err != nil {
		t.Fatal(err)
	}
	h := a.Router()
	gqlRequest(t, h, `mutation{addManualEntry(task:"Delete", startedAt:"2026-03-05T09:00:00Z", endedAt:"2026-03-05T09:30:00Z"){id}}`, nil)
	res := gqlRequest(t, h, `query{entries{id}}`, nil)
	entries := res["data"].(map[string]any)["entries"].([]any)
	id := entries[0].(map[string]any)["id"].(string)
	gqlRequest(t, h, `mutation($id:ID!){deleteEntry(id:$id)}`, map[string]any{"id": id})
	res2 := gqlRequest(t, h, `query{entries{id}}`, nil)
	entries2 := res2["data"].(map[string]any)["entries"].([]any)
	if len(entries2) != 0 {
		t.Fatalf("expected 0 entries, got %d", len(entries2))
	}
}
