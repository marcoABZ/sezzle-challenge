package calculator_test

import (
	"errors"
	"math"
	"strings"
	"testing"

	"github.com/marcoABZ/calculator/backend/internal/calculator"
)

// evalCase is one case from part 1 of TEST_CASES.md. A case expects either
// a value (want) or an error (wantErr), never both.
type evalCase struct {
	// name is set only when expr is not readable as a test name; it then
	// follows the notation used in TEST_CASES.md.
	name    string
	expr    string
	want    float64
	wantErr error
}

func runEvalCases(t *testing.T, cases []evalCase) {
	t.Helper()
	for _, c := range cases {
		name := c.name
		if name == "" {
			name = c.expr
		}
		t.Run(name, func(t *testing.T) {
			got, err := calculator.Evaluate(c.expr)
			if c.wantErr != nil {
				if !errors.Is(err, c.wantErr) {
					t.Fatalf("got (%v, %v), want error %v", got, err, c.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("got error %v, want %v", err, c.want)
			}
			// == alone treats -0 and 0 as equal, and rule 14 says the result
			// is never negative zero.
			if got != c.want || math.Signbit(got) != math.Signbit(c.want) {
				t.Fatalf("got %v, want %v", got, c.want)
			}
		})
	}
}

// 1.1 Stages and error precedence (rules 1, 12).
func TestEvaluateStagesAndErrorPrecedence(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "1 / 0 +", wantErr: calculator.ErrInvalidExpression},
		{expr: "1 / 0 * (2", wantErr: calculator.ErrInvalidExpression},
		{expr: "sqrt(-1) / 0 +", wantErr: calculator.ErrInvalidExpression},
		{expr: "1 / 0 + sqrt(-1)", wantErr: calculator.ErrDivisionByZero},
		{expr: "sqrt(-1) + 1 / 0", wantErr: calculator.ErrNegativeSquareRoot},
		{expr: "(-8) ^ 0.5 * 1 / 0", wantErr: calculator.ErrUndefinedResult},
		{expr: "1e308 * 10 + 1 / 0", wantErr: calculator.ErrResultOutOfRange},
	})
}

// 1.2 Length limit (rule 2).
func TestEvaluateLengthLimit(t *testing.T) {
	runEvalCases(t, []evalCase{
		{
			name: `"1" + " + 1" × 249 + "   " (1,000 chars)`,
			expr: "1" + strings.Repeat(" + 1", 249) + "   ",
			want: 250,
		},
		{
			name:    `"1" + " + 1" × 250 (1,001 chars)`,
			expr:    "1" + strings.Repeat(" + 1", 250),
			wantErr: calculator.ErrInvalidExpression,
		},
		{
			name:    `"1 / 0" + 996 spaces (1,001 chars)`,
			expr:    "1 / 0" + strings.Repeat(" ", 996),
			wantErr: calculator.ErrInvalidExpression,
		},
		{
			name: `"(" × 499 + "1" + ")" × 499 + " " (1,000 chars)`,
			expr: strings.Repeat("(", 499) + "1" + strings.Repeat(")", 499) + " ",
			want: 1,
		},
		{
			name:    `"(" × 500 + "1" + ")" × 500 (1,001 chars)`,
			expr:    strings.Repeat("(", 500) + "1" + strings.Repeat(")", 500),
			wantErr: calculator.ErrInvalidExpression,
		},
	})
}

// 1.3 Empty and blank input (rule 3).
func TestEvaluateEmptyAndBlankInput(t *testing.T) {
	runEvalCases(t, []evalCase{
		{name: `""`, expr: "", wantErr: calculator.ErrInvalidExpression},
		{name: `" \t "`, expr: " \t ", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.4 Whitespace and characters outside the grammar (rule 6).
func TestEvaluateWhitespaceAndCharacters(t *testing.T) {
	runEvalCases(t, []evalCase{
		{name: `"2\t+\t3"`, expr: "2\t+\t3", want: 5},
		{expr: "  2 + 3  ", want: 5},
		{expr: "sqrt (16)", want: 4},
		{name: `"2 +\n3"`, expr: "2 +\n3", wantErr: calculator.ErrInvalidExpression},
		{name: `"2 + 3" (no-break space)`, expr: "2 + 3", wantErr: calculator.ErrInvalidExpression},
		{name: `"2 − 3" (U+2212 minus)`, expr: "2 − 3", wantErr: calculator.ErrInvalidExpression},
		{name: `"2 × 3" (U+00D7)`, expr: "2 × 3", wantErr: calculator.ErrInvalidExpression},
		{name: `"2 ÷ 4" (U+00F7)`, expr: "2 ÷ 4", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 $ 3", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 ** 3", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.5 Names (rule 5).
func TestEvaluateNames(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "SQRT(16)", wantErr: calculator.ErrInvalidExpression},
		{expr: "sqrt 16", wantErr: calculator.ErrInvalidExpression},
		{expr: "sqrt16", wantErr: calculator.ErrInvalidExpression},
		{expr: "sqrtx(4)", wantErr: calculator.ErrInvalidExpression},
		{expr: "pi", wantErr: calculator.ErrInvalidExpression},
		{expr: "e", wantErr: calculator.ErrInvalidExpression},
		{expr: "abs(-2)", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.6 Numbers (rule 4; grammar number and exponent).
func TestEvaluateNumbers(t *testing.T) {
	runEvalCases(t, []evalCase{
		// Accepted forms.
		{expr: "12", want: 12},
		{expr: "12.5", want: 12.5},
		{expr: "5.", want: 5},
		{expr: ".5", want: 0.5},
		{expr: "5.e3", want: 5000},
		{expr: ".5e2", want: 50},
		{expr: "1e3", want: 1000},
		{expr: "2.5E-3", want: 0.0025},
		{expr: "1e+21", want: 1e21},
		{expr: "007", want: 7},

		// Rejected forms.
		{expr: ".", wantErr: calculator.ErrInvalidExpression},
		{expr: "..5", wantErr: calculator.ErrInvalidExpression},
		{expr: "1.2.3", wantErr: calculator.ErrInvalidExpression},
		{expr: "e3", wantErr: calculator.ErrInvalidExpression},
		{expr: "1e", wantErr: calculator.ErrInvalidExpression},
		{expr: "1e+", wantErr: calculator.ErrInvalidExpression},
		{expr: "1e 3", wantErr: calculator.ErrInvalidExpression},
		{expr: "0x1F", wantErr: calculator.ErrInvalidExpression},
		{expr: "0b101", wantErr: calculator.ErrInvalidExpression},
		{expr: "Inf", wantErr: calculator.ErrInvalidExpression},
		{expr: "NaN", wantErr: calculator.ErrInvalidExpression},
		{expr: "1_000", wantErr: calculator.ErrInvalidExpression},
		{expr: "1,5", wantErr: calculator.ErrInvalidExpression},
		{expr: "1 000", wantErr: calculator.ErrInvalidExpression},
		{expr: "+1", wantErr: calculator.ErrInvalidExpression},
		{name: `"２" (full-width two)`, expr: "２", wantErr: calculator.ErrInvalidExpression},
		{expr: "1e309", wantErr: calculator.ErrInvalidExpression},
		{expr: "1e400 / 0", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.7 Grammar: expression and term (the + - and * / chains).
func TestEvaluateExpressionAndTerm(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "2 + 3", want: 5},
		{expr: "2 - 3", want: -1},
		{expr: "2 * 3", want: 6},
		{expr: "2 / 4", want: 0.5},
		{expr: "2 +", wantErr: calculator.ErrInvalidExpression},
		{expr: "* 2", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 + * 3", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.8 Grammar: unary = "-" unary | power.
func TestEvaluateUnary(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "-2", want: -2},
		{expr: "-(2 + 3)", want: -5},
		{expr: "-sqrt(16)", want: -4},
		{expr: "-", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.9 Grammar: power = postfix [ "^" unary ].
func TestEvaluatePower(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "2 ^ 3", want: 8},
		{expr: "2 ^", wantErr: calculator.ErrInvalidExpression},
		{expr: "^ 2", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 ^ +3", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.10 Grammar: postfix = primary { "%" }, and percent (rule 11).
func TestEvaluatePercent(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "50%", want: 0.5},
		{expr: "50%%", want: 0.005},
		{expr: "50 %", want: 0.5},
		{expr: "200 * 15%", want: 30},
		{expr: "%", wantErr: calculator.ErrInvalidExpression},
		{expr: "5 % 3", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.11 Grammar: primary and parentheses.
func TestEvaluatePrimaryAndParentheses(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "((1 + 2) * (3 + 4))", want: 21},
		{expr: "((2))", want: 2},
		{expr: "()", wantErr: calculator.ErrInvalidExpression},
		{expr: "(())", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 * ()", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 + 3)", wantErr: calculator.ErrInvalidExpression},
		{expr: "(2 + 3", wantErr: calculator.ErrInvalidExpression},
		{expr: "((2)", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.12 Leftover input (rule 7).
func TestEvaluateLeftoverInput(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "2 3", wantErr: calculator.ErrInvalidExpression},
		{expr: "2(3)", wantErr: calculator.ErrInvalidExpression},
		{expr: "(2)(3)", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 sqrt(4)", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.13 Order of operations, neighbouring levels in both orders.
func TestEvaluateOrderOfOperations(t *testing.T) {
	runEvalCases(t, []evalCase{
		// Parentheses/sqrt and %, % and ^.
		{expr: "(2 + 3)%", want: 0.05},
		{expr: "2 + 3%", want: 2.03},
		{expr: "50% ^ 2", want: 0.25},
		{expr: "2 ^ 50%", want: 1.4142135623731},

		// Percent with addition, both orders.
		{expr: "200 + 10%", want: 200.1},
		{expr: "10% + 200", want: 200.1},

		// ^ and unary minus, and ^ with *, both orders.
		{expr: "-2 ^ 2", want: -4},
		{expr: "3 * 2 ^ 2", want: 12},
		{expr: "2 ^ 2 * 3", want: 12},
		{expr: "2 * -3 ^ 2", want: -18},

		// Unary minus and addition.
		{expr: "-2 + 3", want: 1},

		// * / and + -, both orders.
		{expr: "2 + 3 * 4", want: 14},
		{expr: "2 * 3 + 4", want: 10},
		{expr: "1 - 6 / 3", want: -1},
		{expr: "6 / 3 - 1", want: 1},
	})
}

// 1.14 Associativity: three operands at each level that has it.
func TestEvaluateAssociativity(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "10 - 4 - 3", want: 3},
		{expr: "1 - 2 + 3", want: 2},
		{expr: "12 / 3 / 2", want: 2},
		{expr: "8 / 4 * 2", want: 4},
		{expr: "2 ^ 3 ^ 2", want: 512},
		{expr: "2 ^ 2 ^ -1", want: 1.4142135623731},
	})
}

// 1.15 Minus sign positions.
func TestEvaluateMinusSignPositions(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "2 * -3", want: -6},
		{expr: "2 - -3", want: 5},
		{expr: "(-3)", want: -3},
		{expr: "2 ^ -1", want: 0.5},
		{expr: "1e-3", want: 0.001},
		{expr: "--2", want: 2},
		{expr: "---2", want: -2},
		{expr: "2 -- 3", want: 5},
		{expr: "2 * - - 3", want: 6},
		{expr: "2 * -", wantErr: calculator.ErrInvalidExpression},
		{expr: "+2", wantErr: calculator.ErrInvalidExpression},
		{expr: "2 * +3", wantErr: calculator.ErrInvalidExpression},
	})
}

// 1.16 Division by zero (rule 8).
func TestEvaluateDivisionByZero(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "1 / 0", wantErr: calculator.ErrDivisionByZero},
		{expr: "1 / -0", wantErr: calculator.ErrDivisionByZero},
		{expr: "0 / 0", wantErr: calculator.ErrDivisionByZero},
		{expr: "2 * (1 / 0)", wantErr: calculator.ErrDivisionByZero},
		{expr: "1 / (2 - 2)", wantErr: calculator.ErrDivisionByZero},
		// Open question Q11 in TEST_CASES.md.
		{expr: "1 / (1e-200 * 1e-200)", wantErr: calculator.ErrDivisionByZero},
	})
}

// 1.17 Power special cases (rule 9).
func TestEvaluatePowerSpecialCases(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "0 ^ 0", want: 1},
		{expr: "0 ^ 0.5", want: 0},
		{expr: "0 ^ -0", want: 1},
		{expr: "0 ^ -1", wantErr: calculator.ErrDivisionByZero},
		{expr: "2 + (0 ^ -1)", wantErr: calculator.ErrDivisionByZero},
		{expr: "0 ^ -0.5", wantErr: calculator.ErrDivisionByZero},
	})
}

// 1.18 Square root (rule 10; grammar sqrt).
func TestEvaluateSquareRoot(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "sqrt(16)", want: 4},
		{expr: "sqrt(sqrt(16))", want: 2},
		{expr: "sqrt()", wantErr: calculator.ErrInvalidExpression},
		{expr: "sqrt(16", wantErr: calculator.ErrInvalidExpression},
		{expr: "sqrt(-1)", wantErr: calculator.ErrNegativeSquareRoot},
		{expr: "2 * (sqrt(-1))", wantErr: calculator.ErrNegativeSquareRoot},
		{expr: "sqrt(1 - 2)", wantErr: calculator.ErrNegativeSquareRoot},
		{expr: "sqrt(-0.0001)", wantErr: calculator.ErrNegativeSquareRoot},
		// Open question Q14 in TEST_CASES.md.
		{expr: "sqrt(-0)", want: 0},
	})
}

// 1.19 Undefined and out-of-range steps (rule 13).
func TestEvaluateUndefinedAndOutOfRangeSteps(t *testing.T) {
	runEvalCases(t, []evalCase{
		{expr: "(-8) ^ 0.5", wantErr: calculator.ErrUndefinedResult},
		{expr: "2 + ((-8) ^ 0.5)", wantErr: calculator.ErrUndefinedResult},
		{expr: "(-8) ^ 0.5 * 0", wantErr: calculator.ErrUndefinedResult},
		{expr: "1e308 * 10", wantErr: calculator.ErrResultOutOfRange},
		{expr: "(1e308 * 10) / 2", wantErr: calculator.ErrResultOutOfRange},
		{expr: "1e308 * 10 * 0", wantErr: calculator.ErrResultOutOfRange},
		{expr: "1 / (1e308 * 10)", wantErr: calculator.ErrResultOutOfRange},
		{expr: "1e308 / 0.1", wantErr: calculator.ErrResultOutOfRange},
		{expr: "-1e308 * 10", wantErr: calculator.ErrResultOutOfRange},
		{expr: "10 ^ 309", wantErr: calculator.ErrResultOutOfRange},
	})
}

// 1.20 Final result policy (rule 14).
func TestEvaluateFinalResultPolicy(t *testing.T) {
	runEvalCases(t, []evalCase{
		// Decimal noise.
		{expr: "0.1 + 0.2", want: 0.3},
		{expr: "sqrt(2) ^ 2", want: 2},
		{expr: "1 / 3", want: 0.333333333333333},
		{expr: "1 / 3 * 3", want: 1},

		// The 15-digit limit.
		{expr: "1234567890123456 + 1", want: 1234567890123460},
		{expr: "123456789012345678", want: 123456789012346000},
		{expr: "0.1234567890123456", want: 0.123456789012346},

		// Negative zero.
		{expr: "-0", want: 0},
		{expr: "0 * -1", want: 0},
		{expr: "-0.0000000000000001", want: -0.0000000000000001},

		// Underflow (not an error).
		{expr: "1e-300 / 1e300", want: 0},
		{expr: "10 ^ -400", want: 0},

		// Largest representable number.
		{expr: "1.79769313486231e308", want: 1.79769313486231e308},
		{expr: "1.7976931348623157e308", wantErr: calculator.ErrResultOutOfRange},
		{expr: "1.79769313486232e308", wantErr: calculator.ErrInvalidExpression},
	})
}
