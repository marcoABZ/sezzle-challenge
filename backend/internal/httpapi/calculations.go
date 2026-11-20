package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/marcoABZ/calculator/backend/internal/calculator"
)

const maxBodyBytes = 1 << 20

// Reasons for invalid_request. They are the message sent to the caller, so
// none of them repeats anything from the request body.
var (
	errBodyTooLarge   = errors.New("request body is larger than 1 MiB")
	errBodyUnreadable = errors.New("request body could not be read")
	errBodyNotJSON    = errors.New("request body is not valid JSON")
	errBodyShape      = errors.New(`request body must be a JSON object with a string "expression" and no other fields`)
)

type resultBody struct {
	Result float64 `json:"result"`
}

func calculate(w http.ResponseWriter, r *http.Request) {
	if !isJSON(r.Header.Get("Content-Type")) {
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json")
		return
	}
	expression, err := readExpression(w, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	result, err := calculator.Evaluate(expression)
	if err != nil {
		writeCalculatorError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resultBody{Result: result})
}

// isJSON reports whether a Content-Type header names application/json. The
// media type is case-insensitive and parameters such as charset don't
// matter.
func isJSON(contentType string) bool {
	mediaType, _, _ := strings.Cut(contentType, ";")
	return strings.EqualFold(strings.TrimSpace(mediaType), "application/json")
}

func readExpression(w http.ResponseWriter, r *http.Request) (string, error) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	var tooLarge *http.MaxBytesError
	switch {
	case errors.As(err, &tooLarge):
		return "", errBodyTooLarge
	case err != nil:
		return "", errBodyUnreadable
	}
	return decodeExpression(body)
}

// decodeExpression accepts exactly one JSON object with a single string field
// named "expression". Whitespace around the object is part of valid JSON, so
// it is allowed.
func decodeExpression(body []byte) (string, error) {
	// json.Unmarshal checks this too, but checking first separates "not
	// JSON" from "wrong shape" in the message.
	if !json.Valid(body) {
		return "", errBodyNotJSON
	}
	// A map keeps each key exactly as sent. Decoding into a struct would
	// accept "Expression", because encoding/json matches struct fields
	// case-insensitively.
	var fields map[string]json.RawMessage
	err := json.Unmarshal(body, &fields)
	raw, found := fields["expression"]
	if err != nil || !found || len(fields) != 1 {
		return "", errBodyShape
	}
	// A pointer tells null apart from a string: null into a plain string
	// leaves it empty without an error.
	var expression *string
	if err := json.Unmarshal(raw, &expression); err != nil || expression == nil {
		return "", errBodyShape
	}
	return *expression, nil
}

// writeCalculatorError is the only place that maps a calculator error to a
// status and code.
func writeCalculatorError(w http.ResponseWriter, err error) {
	var code string
	switch {
	case errors.Is(err, calculator.ErrInvalidExpression):
		code = "invalid_expression"
	case errors.Is(err, calculator.ErrDivisionByZero):
		code = "division_by_zero"
	case errors.Is(err, calculator.ErrNegativeSquareRoot):
		code = "negative_square_root"
	case errors.Is(err, calculator.ErrUndefinedResult):
		code = "undefined_result"
	case errors.Is(err, calculator.ErrResultOutOfRange):
		code = "result_out_of_range"
	default:
		writeInternalError(w, err)
		return
	}
	writeError(w, http.StatusUnprocessableEntity, code, err.Error())
}
