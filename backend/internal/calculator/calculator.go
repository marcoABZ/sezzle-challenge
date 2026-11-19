package calculator

import "errors"

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

// Evaluate computes the value of an arithmetic expression.
func Evaluate(expression string) (float64, error) {
	return 0, errors.New("not implemented")
}
