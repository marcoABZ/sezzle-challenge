package httpapi_test

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/marcoABZ/calculator/backend/internal/httpapi"
)

const (
	calculations = "/api/v1/calculations"
	health       = "/api/v1/health"
	contentJSON  = "Content-Type: application/json"
)

// httpCase is one case from part 2 of TEST_CASES.md. Each case sets exactly
// one of noBody, code, result and jsonBody, plus the extra checks it names.
type httpCase struct {
	// name is set only when the request is not readable as a test name; it
	// then follows the notation used in TEST_CASES.md.
	name   string
	method string
	path   string
	header []string // "Key: value", in the order TEST_CASES.md lists them
	body   string

	status   int
	noBody   bool
	code     string   // error.code
	result   *float64 // result, compared by value
	jsonBody string   // the whole body, compared as JSON values

	allow        string // a method the Allow header must include
	allowMethods string // a method Access-Control-Allow-Methods must include
	allowHeaders string // the exact Access-Control-Allow-Headers value

	message         string // exact error.message
	messagePrefix   string
	messageExcludes string
}

func (c httpCase) caseName() string {
	if c.name != "" {
		return c.name
	}
	parts := []string{c.method, c.path}
	if len(c.header) > 0 {
		parts = append(parts, "["+strings.Join(c.header, "; ")+"]")
	}
	if c.body != "" {
		parts = append(parts, c.body)
	}
	return strings.Join(parts, " ")
}

func number(v float64) *float64 { return &v }

func runHTTPCases(t *testing.T, cases []httpCase) {
	t.Helper()
	for _, c := range cases {
		t.Run(c.caseName(), func(t *testing.T) {
			req := httptest.NewRequest(c.method, c.path, strings.NewReader(c.body))
			for _, h := range c.header {
				key, value, _ := strings.Cut(h, ": ")
				req.Header.Set(key, value)
			}
			rec := httptest.NewRecorder()
			httpapi.NewHandler().ServeHTTP(rec, req)
			res := rec.Result()
			defer func() { _ = res.Body.Close() }()

			if res.StatusCode != c.status {
				t.Fatalf("status %d, want %d", res.StatusCode, c.status)
			}
			checkHeaders(t, c, res.Header)
			checkBody(t, c, rec.Body.Bytes())
		})
	}
}

func checkHeaders(t *testing.T, c httpCase, h http.Header) {
	t.Helper()
	if got := h.Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin %q, want %q", got, "*")
	}
	if !c.noBody {
		if got := h.Get("Content-Type"); got != "application/json" {
			t.Errorf("Content-Type %q, want %q", got, "application/json")
		}
	}
	if c.allow != "" && !listIncludes(h.Values("Allow"), c.allow) {
		t.Errorf("Allow %q, want it to include %s", h.Values("Allow"), c.allow)
	}
	if c.allowMethods != "" && !listIncludes(h.Values("Access-Control-Allow-Methods"), c.allowMethods) {
		t.Errorf("Access-Control-Allow-Methods %q, want it to include %s",
			h.Values("Access-Control-Allow-Methods"), c.allowMethods)
	}
	if c.allowHeaders != "" {
		if got := h.Get("Access-Control-Allow-Headers"); got != c.allowHeaders {
			t.Errorf("Access-Control-Allow-Headers %q, want %q", got, c.allowHeaders)
		}
	}
}

// listIncludes reports whether a comma-separated header such as Allow lists
// item, whether the list comes in one header line or in several.
func listIncludes(values []string, item string) bool {
	for _, v := range values {
		for part := range strings.SplitSeq(v, ",") {
			if strings.TrimSpace(part) == item {
				return true
			}
		}
	}
	return false
}

func checkBody(t *testing.T, c httpCase, body []byte) {
	t.Helper()
	switch {
	case c.noBody:
		if len(body) != 0 {
			t.Errorf("body %q, want none", body)
		}
	case c.code != "":
		checkError(t, c, body)
	case c.result != nil:
		var got struct {
			Result *float64 `json:"result"`
		}
		if err := json.Unmarshal(body, &got); err != nil || got.Result == nil {
			t.Fatalf("body %q, want a result", body)
		}
		if !sameNumber(*got.Result, *c.result) {
			t.Errorf("result %v, want %v", *got.Result, *c.result)
		}
	case c.jsonBody != "":
		var got, want any
		if err := json.Unmarshal(body, &got); err != nil {
			t.Fatalf("body %q is not JSON: %v", body, err)
		}
		if err := json.Unmarshal([]byte(c.jsonBody), &want); err != nil {
			t.Fatalf("bad case: %v", err)
		}
		if !sameJSON(got, want) {
			t.Errorf("body %s, want %s", body, c.jsonBody)
		}
	}
}

func checkError(t *testing.T, c httpCase, body []byte) {
	t.Helper()
	var got struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatalf("body %q is not an error response: %v", body, err)
	}
	if got.Error.Code != c.code {
		t.Errorf("code %q, want %q", got.Error.Code, c.code)
	}
	msg := got.Error.Message
	if c.message != "" && msg != c.message {
		t.Errorf("message %q, want %q", msg, c.message)
	}
	if c.messagePrefix != "" && !strings.HasPrefix(msg, c.messagePrefix) {
		t.Errorf("message %q, want it to start with %q", msg, c.messagePrefix)
	}
	if c.messageExcludes != "" && strings.Contains(msg, c.messageExcludes) {
		t.Errorf("message %q contains %q", msg, c.messageExcludes)
	}
}

// sameNumber compares by value. == alone treats -0 and 0 as equal, and the
// API never returns negative zero.
func sameNumber(got, want float64) bool {
	return got == want && math.Signbit(got) == math.Signbit(want)
}

// sameJSON reports whether two decoded JSON values are equal, comparing
// numbers with sameNumber.
func sameJSON(got, want any) bool {
	switch want := want.(type) {
	case float64:
		got, ok := got.(float64)
		return ok && sameNumber(got, want)
	case map[string]any:
		got, ok := got.(map[string]any)
		if !ok || len(got) != len(want) {
			return false
		}
		for key, w := range want {
			g, found := got[key]
			if !found || !sameJSON(g, w) {
				return false
			}
		}
		return true
	default:
		return reflect.DeepEqual(got, want)
	}
}

// bodyOfSize returns {"expression":"1"} padded with spaces after the "{" so
// that it is exactly size bytes long.
func bodyOfSize(size int) string {
	const rest = `"expression":"1"}`
	return "{" + strings.Repeat(" ", size-1-len(rest)) + rest
}

// 2.1 Routing: undefined path is 404, wrong method on a defined path is 405
// with Allow (rule 2).
func TestHandlerRouting(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{method: http.MethodGet, path: "/api/v1/nope", status: http.StatusNotFound, code: "not_found"},
		{method: http.MethodGet, path: "/api/v1", status: http.StatusNotFound, code: "not_found"},
		{method: http.MethodGet, path: "/api/v2/health", status: http.StatusNotFound, code: "not_found"},
		{method: http.MethodGet, path: "/api/v1/Health", status: http.StatusNotFound, code: "not_found"},
		{
			method: http.MethodGet, path: calculations,
			status: http.StatusMethodNotAllowed, code: "method_not_allowed", allow: http.MethodPost,
		},
		{
			method: http.MethodPost, path: health,
			status: http.StatusMethodNotAllowed, code: "method_not_allowed", allow: http.MethodGet,
		},
		{
			method: http.MethodDelete, path: health,
			status: http.StatusMethodNotAllowed, code: "method_not_allowed", allow: http.MethodGet,
		},
	})
}

// 2.2 CORS and OPTIONS (rule 3).
func TestHandlerCORS(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodOptions, path: calculations,
			header: []string{
				"Origin: https://example.com",
				"Access-Control-Request-Method: POST",
				"Access-Control-Request-Headers: Content-Type",
			},
			status: http.StatusNoContent, noBody: true,
			allowMethods: http.MethodPost, allowHeaders: "Content-Type",
		},
		{
			method: http.MethodOptions, path: health,
			header: []string{"Origin: https://example.com", "Access-Control-Request-Method: GET"},
			status: http.StatusNoContent, noBody: true, allowMethods: http.MethodGet,
		},
		{method: http.MethodOptions, path: "/api/v1/nope", status: http.StatusNoContent, noBody: true},
		{
			method: http.MethodPost, path: calculations,
			header: []string{"Origin: https://example.com", contentJSON},
			body:   `{"expression":"1 / 0"}`,
			status: http.StatusUnprocessableEntity, code: "division_by_zero",
		},
	})
}

// 2.3 Content type (rule 4).
func TestHandlerContentType(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPost, path: calculations,
			header: []string{"Content-Type: Application/JSON; charset=UTF-8"},
			body:   `{"expression":"1 + 1"}`,
			status: http.StatusOK, result: number(2),
		},
		{
			method: http.MethodPost, path: calculations,
			header: []string{"Content-Type: text/plain"},
			body:   `{"expression":"1 + 1"}`,
			status: http.StatusUnsupportedMediaType, code: "unsupported_media_type",
		},
		{
			name:   `POST /api/v1/calculations [no Content-Type] {"expression":"1 + 1"}`,
			method: http.MethodPost, path: calculations,
			body:   `{"expression":"1 + 1"}`,
			status: http.StatusUnsupportedMediaType, code: "unsupported_media_type",
		},
		{
			method: http.MethodPost, path: calculations,
			header: []string{"Content-Type: application/jsonx"},
			body:   `{"expression":"1 + 1"}`,
			status: http.StatusUnsupportedMediaType, code: "unsupported_media_type",
		},
	})
}

// 2.4 Strict decoding (rule 5).
func TestHandlerStrictDecoding(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":null}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 + 1","x":1}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"Expression":"1 + 1"}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 + 1"}{}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 + 1"}x`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 + 1"`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			name:   "POST /api/v1/calculations [Content-Type: application/json] (empty body)",
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			status: http.StatusBadRequest, code: "invalid_request",
		},
	})
}

// 2.5 Body size (rule 6).
func TestHandlerBodySize(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			name:   "POST /api/v1/calculations [Content-Type: application/json], body exactly 1,048,576 bytes",
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   bodyOfSize(1_048_576),
			status: http.StatusOK, result: number(1),
		},
		{
			name:   "POST /api/v1/calculations [Content-Type: application/json], body exactly 1,048,577 bytes",
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   bodyOfSize(1_048_577),
			status: http.StatusBadRequest, code: "invalid_request",
		},
	})
}

// 2.6 Shape versus value (rule 7).
func TestHandlerShapeVersusValue(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":""}`,
			status: http.StatusUnprocessableEntity, code: "invalid_expression",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":5}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `[]`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `"1 + 1"`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `null`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"2 + 3"}`,
			status: http.StatusOK, result: number(5),
		},
	})
}

// 2.7 Domain errors mapped to status and code (rule 8; api.md Errors).
func TestHandlerDomainErrors(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"2 +"}`,
			status: http.StatusUnprocessableEntity, code: "invalid_expression",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 / 0"}`,
			status: http.StatusUnprocessableEntity, code: "division_by_zero",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"sqrt(-1)"}`,
			status: http.StatusUnprocessableEntity, code: "negative_square_root",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"(-8) ^ 0.5"}`,
			status: http.StatusUnprocessableEntity, code: "undefined_result",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 / (1e308 * 10)"}`,
			status: http.StatusUnprocessableEntity, code: "result_out_of_range",
		},
		{
			name:   `POST /api/v1/calculations [Content-Type: application/json] {"expression":"1" + " + 1" × 250} (1,001 chars)`,
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1` + strings.Repeat(" + 1", 250) + `"}`,
			status: http.StatusUnprocessableEntity, code: "invalid_expression",
		},
		{
			name:   `POST /api/v1/calculations [Content-Type: application/json] {"expression":"1" + " + 1" × 249 + "   "} (1,000 chars)`,
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1` + strings.Repeat(" + 1", 249) + `   "}`,
			status: http.StatusOK, result: number(250),
		},
	})
}

// 2.8 Messages (rule 9).
func TestHandlerMessages(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 / 0"}`,
			status: http.StatusUnprocessableEntity, code: "division_by_zero",
			message: "cannot divide by zero",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"2 +"}`,
			status: http.StatusUnprocessableEntity, code: "invalid_expression",
			messagePrefix: "invalid expression",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1 + 1","secret":"XYZ123"}`,
			status: http.StatusBadRequest, code: "invalid_request",
			messageExcludes: "XYZ123",
		},
		{
			name:   "POST /api/v1/calculations [Content-Type: application/json] XYZ123 (raw body, not JSON)",
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   "XYZ123",
			status: http.StatusBadRequest, code: "invalid_request",
			messageExcludes: "XYZ123",
		},
	})
}

// 2.9 Unexpected failures (rule 10): no case, see Q1 in TEST_CASES.md.

// 2.10 Successful responses and health (api.md).
func TestHandlerSuccessAndHealth(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"2 + 3 * 4"}`,
			status: http.StatusOK, jsonBody: `{"result":14}`,
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"0.1 + 0.2"}`,
			status: http.StatusOK, jsonBody: `{"result":0.3}`,
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"-0"}`,
			status: http.StatusOK, jsonBody: `{"result":0}`,
		},
		{method: http.MethodGet, path: health, status: http.StatusOK, jsonBody: `{"status":"ok"}`},
	})
}

// 2.11 Order of checks (api.md: path and method, content type, shape,
// syntax, evaluation).
func TestHandlerOrderOfChecks(t *testing.T) {
	runHTTPCases(t, []httpCase{
		{
			method: http.MethodPut, path: calculations,
			header: []string{"Content-Type: text/plain"},
			body:   `{"expression":"1 + 1"}`,
			status: http.StatusMethodNotAllowed, code: "method_not_allowed", allow: http.MethodPost,
		},
		{
			method: http.MethodPost, path: "/api/v1/nope",
			header: []string{"Content-Type: text/plain"},
			body:   `{"expression":"1 + 1"}`,
			status: http.StatusNotFound, code: "not_found",
		},
		{
			method: http.MethodPost, path: calculations,
			header: []string{"Content-Type: text/plain"},
			body:   `{"expression":"2 +"}`,
			status: http.StatusUnsupportedMediaType, code: "unsupported_media_type",
		},
		{
			name:   "POST /api/v1/calculations [no Content-Type] (empty body)",
			method: http.MethodPost, path: calculations,
			status: http.StatusUnsupportedMediaType, code: "unsupported_media_type",
		},
		{
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"2 +","x":1}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
		{
			name:   `POST /api/v1/calculations [Content-Type: application/json] {"expression":"<1,001 chars>","x":1}`,
			method: http.MethodPost, path: calculations, header: []string{contentJSON},
			body:   `{"expression":"1` + strings.Repeat(" + 1", 250) + `","x":1}`,
			status: http.StatusBadRequest, code: "invalid_request",
		},
	})
}
