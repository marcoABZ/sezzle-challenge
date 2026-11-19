package calculator

import "math"

// node is a number or an operation in the syntax tree.
type node interface {
	eval() (float64, error)
}

type literal float64

func (l literal) eval() (float64, error) {
	return float64(l), nil
}

type unaryOp struct {
	apply   func(float64) (float64, error)
	operand node
}

func (u unaryOp) eval() (float64, error) {
	x, err := u.operand.eval()
	if err != nil {
		return 0, err
	}
	result, err := u.apply(x)
	if err != nil {
		return 0, err
	}
	return checkStep(result)
}

type binaryOp struct {
	apply       func(float64, float64) (float64, error)
	left, right node
}

// eval evaluates the left operand, then the right one, then applies the
// operator, so the error reported is the first one from left to right.
func (b binaryOp) eval() (float64, error) {
	left, err := b.left.eval()
	if err != nil {
		return 0, err
	}
	right, err := b.right.eval()
	if err != nil {
		return 0, err
	}
	result, err := b.apply(left, right)
	if err != nil {
		return 0, err
	}
	return checkStep(result)
}

// checkStep rejects the result of a single operation if it isn't finite.
// Checking every step stops a later operation from hiding the problem, as
// multiplying by zero would in 1e308 * 10 * 0.
func checkStep(result float64) (float64, error) {
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrResultOutOfRange
	}
	return result, nil
}

func add(a, b float64) (float64, error) {
	return a + b, nil
}

func subtract(a, b float64) (float64, error) {
	return a - b, nil
}

func multiply(a, b float64) (float64, error) {
	return a * b, nil
}

func divide(a, b float64) (float64, error) {
	// -0 == 0 is true, so a negative zero divisor is caught too.
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

func raise(base, exponent float64) (float64, error) {
	// -0 < 0 is false, so 0 ^ -0 goes to math.Pow, which returns 1 for any
	// zero exponent.
	if base == 0 && exponent < 0 {
		return 0, ErrDivisionByZero
	}
	return math.Pow(base, exponent), nil
}

func negate(x float64) (float64, error) {
	return -x, nil
}

func percent(x float64) (float64, error) {
	return x / 100, nil
}

func squareRoot(x float64) (float64, error) {
	// -0 < 0 is false, so sqrt(-0) is allowed. It returns -0, which the final
	// result policy turns into 0.
	if x < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return math.Sqrt(x), nil
}
