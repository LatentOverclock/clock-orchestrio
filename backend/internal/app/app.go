package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"clock-orchestrio/backend/internal/model"
	"clock-orchestrio/backend/internal/store"
	"github.com/graphql-go/graphql"
)

type App struct {
	store  store.Store
	schema graphql.Schema
}

func New(s store.Store) (*App, error) {
	schema, err := buildSchema(s)
	if err != nil {
		return nil, err
	}
	return &App{store: s, schema: schema}, nil
}

func (a *App) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.handleHealth)
	mux.HandleFunc("/graphql", a.handleGraphQL)
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	if err := a.store.Health(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

type graphqlRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

func (a *App) handleGraphQL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req graphqlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	result := graphql.Do(graphql.Params{
		Schema:         a.schema,
		RequestString:  req.Query,
		VariableValues: req.Variables,
		Context:        r.Context(),
	})
	writeJSON(w, result)
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(payload)
}

func entryType() *graphql.Object {
	return graphql.NewObject(graphql.ObjectConfig{
		Name: "Entry",
		Fields: graphql.Fields{
			"id":              &graphql.Field{Type: graphql.ID},
			"task":            &graphql.Field{Type: graphql.String},
			"startedAt":       &graphql.Field{Type: graphql.String},
			"endedAt":         &graphql.Field{Type: graphql.String},
			"durationSeconds": &graphql.Field{Type: graphql.Int},
			"notes":           &graphql.Field{Type: graphql.String},
		},
	})
}

func formatEntry(e *model.Entry) map[string]any {
	result := map[string]any{
		"id":        fmt.Sprintf("%d", e.ID),
		"task":      e.Task,
		"startedAt": e.StartedAt.UTC().Format("2006-01-02T15:04:05Z"),
		"notes":     e.Notes,
	}
	if e.EndedAt != nil {
		result["endedAt"] = e.EndedAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	if e.DurationSeconds != nil {
		result["durationSeconds"] = *e.DurationSeconds
	}
	return result
}

func buildSchema(s store.Store) (graphql.Schema, error) {
	entryObj := entryType()

	query := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"entries": &graphql.Field{
				Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(entryObj))),
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					entries, err := s.ListEntries(ctxOrBackground(p.Context))
					if err != nil {
						return nil, err
					}
					mapped := make([]map[string]any, 0, len(entries))
					for i := range entries {
						e := entries[i]
						mapped = append(mapped, formatEntry(&e))
					}
					return mapped, nil
				},
			},
			"activeEntry": &graphql.Field{
				Type: entryObj,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					e, err := s.ActiveEntry(ctxOrBackground(p.Context))
					if err != nil || e == nil {
						return nil, err
					}
					return formatEntry(e), nil
				},
			},
		},
	})

	mutation := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			"startEntry": &graphql.Field{
				Type: graphql.NewNonNull(entryObj),
				Args: graphql.FieldConfigArgument{
					"task":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"notes": &graphql.ArgumentConfig{Type: graphql.String},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					task := strings.TrimSpace(p.Args["task"].(string))
					var notes *string
					if raw, ok := p.Args["notes"].(string); ok {
						raw = strings.TrimSpace(raw)
						notes = &raw
					}
					e, err := s.StartEntry(ctxOrBackground(p.Context), task, notes)
					if err != nil {
						return nil, err
					}
					return formatEntry(e), nil
				},
			},
			"stopEntry": &graphql.Field{
				Type: graphql.NewNonNull(entryObj),
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					e, err := s.StopEntry(ctxOrBackground(p.Context))
					if err != nil {
						return nil, err
					}
					return formatEntry(e), nil
				},
			},
			"addManualEntry": &graphql.Field{
				Type: graphql.NewNonNull(entryObj),
				Args: graphql.FieldConfigArgument{
					"task":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"startedAt": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"endedAt":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"notes":     &graphql.ArgumentConfig{Type: graphql.String},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					task := strings.TrimSpace(p.Args["task"].(string))
					startedAt := p.Args["startedAt"].(string)
					endedAt := p.Args["endedAt"].(string)
					var notes *string
					if raw, ok := p.Args["notes"].(string); ok {
						raw = strings.TrimSpace(raw)
						notes = &raw
					}
					e, err := s.AddManualEntry(ctxOrBackground(p.Context), task, startedAt, endedAt, notes)
					if err != nil {
						return nil, err
					}
					return formatEntry(e), nil
				},
			},
			"deleteEntry": &graphql.Field{
				Type: graphql.NewNonNull(graphql.Boolean),
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					idRaw := fmt.Sprintf("%v", p.Args["id"])
					id, err := strconv.ParseInt(idRaw, 10, 64)
					if err != nil {
						return nil, errors.New("invalid id")
					}
					ok, err := s.DeleteEntry(ctxOrBackground(p.Context), id)
					if err != nil {
						return nil, err
					}
					return ok, nil
				},
			},
		},
	})

	return graphql.NewSchema(graphql.SchemaConfig{Query: query, Mutation: mutation})
}

func ctxOrBackground(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}
	return ctx
}
