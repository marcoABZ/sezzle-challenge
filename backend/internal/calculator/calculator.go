package calculator

import (
	"errors"
	"fmt"
	"strconv"
	"unicode/utf8"
)

var (
	// ErrInvalidExpression reports an expression that is too long, empty or
	// not valid under the grammar.
	ErrInvalidExpression = errors.New("invalid expression")
	// ErrDivisionByZero reports a zero divisor, or zero raised to a negative
	// exponent.
	ErrDivisionByZero = errors.New("cannot divide by zero")
	// ErrNegativeSquareRoot reports the square root of a negative value.
	ErrNegativeSquareRoot = errors.New("cannot take the square root of a negative number")
	// ErrUndefinedResult reports an operation whose result is NaN.
	ErrUndefinedResult = errors.New("result is not a real number")
	// ErrResultOutOfRange reports a result that is positive or negative
	// infinity.
	ErrResultOutOfRange = errors.New("result is out of range")
)

const (
	maxLength         = 1000
	significantDigits = 15
)

// Evaluate computes the value of an arithmetic expression.
//
// It tokenises, parses and only then evaluates, so a syntax error always wins
// over an arithmetic one. Errors match one of the Err values above with
// errors.Is.
func Evaluate(expression string) (float64, error) {
	if utf8.RuneCountInString(expression) > maxLength {
		return 0, fmt.Errorf("%w: longer than %d characters", ErrInvalidExpression, maxLength)
	}
	tokens, err := tokenize(expression)
	if err != nil {
		return 0, err
	}
	tree, err := parse(tokens)
	if err != nil {
		return 0, err
	}
	value, err := tree.eval()
	if err != nil {
		return 0, err
	}
	return finalResult(value)
}

// finalResult applies the result policy to the value of the whole expression.
func finalResult(value float64) (float64, error) {
	// Formatting rounds the exact binary value in decimal. Scaling by powers
	// of ten instead would add rounding errors of its own.
	text := strconv.FormatFloat(value, 'g', significantDigits, 64)
	rounded, err := strconv.ParseFloat(text, 64)
	if err != nil {
		// text is always a valid number, so the only possible failure is a
		// value that rounded up past the largest float64 and became infinite.
		return 0, ErrResultOutOfRange
	}
	if rounded == 0 {
		// Negative zero compares equal to zero, so this turns it into zero.
		return 0, nil
	}
	return rounded, nil
}
