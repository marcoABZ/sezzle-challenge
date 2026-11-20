package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// corsMethods is the Access-Control-Allow-Methods value for every preflight.
// It lists every method the routes in NewHandler accept, so it must change
// when they do.
const corsMethods = "GET, POST, OPTIONS"

// route is a path we define and the only method it accepts.
type route struct {
	method string
	serve  http.HandlerFunc
}

// router answers every request, keyed by exact path.
type router map[string]route

// NewHandler returns the handler that serves the calculator API defined in
// docs/api.md.
func NewHandler() http.Handler {
	return router{
		"/api/v1/calculations": {method: http.MethodPost, serve: calculate},
		"/api/v1/health":       {method: http.MethodGet, serve: health},
	}
}

// ServeHTTP runs the checks in the order the contract sets: path and method
// here, then whatever the route checks itself.
func (routes router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// The spec answers OPTIONS on any path, defined or not, so it comes
	// before the path lookup.
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", corsMethods)
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusNoContent)
		return
	}

	rt, ok := routes[r.URL.Path]
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "path not found")
		return
	}
	if r.Method != rt.method {
		w.Header().Set("Allow", rt.method+", "+http.MethodOptions)
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed on this path")
		return
	}
	rt.serve(w, r)
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, struct {
		Status string `json:"status"`
	}{Status: "ok"})
}

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorBody{Error: errorDetail{Code: code, Message: message}})
}

// writeInternalError logs the cause and answers without it, so no internal
// detail reaches the caller.
func writeInternalError(w http.ResponseWriter, err error) {
	slog.Error("internal error", "error", err)
	writeError(w, http.StatusInternalServerError, "internal_error", "internal error")
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// The status is already sent, so a failed write (the client went away)
	// has nobody left to report to.
	_, _ = w.Write(data)
}
