package calculator

import (
	"fmt"
	"strconv"
	"unicode/utf8"
)

type tokenKind int

const (
	tokenEnd tokenKind = iota
	tokenNumber
	tokenPlus
	tokenMinus
	tokenStar
	tokenSlash
	tokenCaret
	tokenPercent
	tokenLeftParen
	tokenRightParen
	tokenSqrt
)

type token struct {
	kind tokenKind
	text string
	// pos is the 1-based position of the token's first character. Tokenising
	// stops at the first non-ASCII character, so everything before a token is
	// ASCII and the byte offset is also the character offset.
	pos int
	// value is set only for tokenNumber.
	value float64
}

// String describes the token for error messages.
func (t token) String() string {
	if t.kind == tokenEnd {
		return "end of expression"
	}
	return fmt.Sprintf("%q at position %d", t.text, t.pos)
}

// tokenize splits the expression into tokens. The list always ends with a
// tokenEnd, so the parser can look at the next token without a bounds check.
func tokenize(expression string) ([]token, error) {
	var tokens []token
	i := 0
	for i < len(expression) {
		c := expression[i]
		switch {
		case c == ' ' || c == '\t':
			i++
		case isDigit(c) || c == '.':
			number, err := scanNumber(expression, i)
			if err != nil {
				return nil, err
			}
			tokens = append(tokens, number)
			i += len(number.text)
		case isLetter(c):
			end := i
			for end < len(expression) && isLetter(expression[end]) {
				end++
			}
			name := expression[i:end]
			if name != "sqrt" {
				return nil, fmt.Errorf("%w: unknown name %q at position %d", ErrInvalidExpression, name, i+1)
			}
			tokens = append(tokens, token{kind: tokenSqrt, text: name, pos: i + 1})
			i = end
		default:
			kind, ok := symbolKind(c)
			if !ok {
				r, _ := utf8.DecodeRuneInString(expression[i:])
				return nil, fmt.Errorf("%w: unexpected character %q at position %d", ErrInvalidExpression, r, i+1)
			}
			tokens = append(tokens, token{kind: kind, text: expression[i : i+1], pos: i + 1})
			i++
		}
	}
	return append(tokens, token{kind: tokenEnd, pos: len(expression) + 1}), nil
}

// scanNumber reads the number that starts at start, following the number and
// exponent rules of the grammar. Only text that matches the grammar reaches
// strconv.ParseFloat, which on its own also accepts Inf, NaN and hexadecimal.
func scanNumber(expression string, start int) (token, error) {
	i := skipDigits(expression, start)
	hasDigits := i > start
	if i < len(expression) && expression[i] == '.' {
		fraction := i + 1
		i = skipDigits(expression, fraction)
		hasDigits = hasDigits || i > fraction
	}
	if !hasDigits {
		return token{}, fmt.Errorf("%w: malformed number %q at position %d", ErrInvalidExpression, expression[start:i], start+1)
	}

	if i < len(expression) && (expression[i] == 'e' || expression[i] == 'E') {
		i++
		if i < len(expression) && (expression[i] == '+' || expression[i] == '-') {
			i++
		}
		exponent := i
		i = skipDigits(expression, exponent)
		if i == exponent {
			return token{}, fmt.Errorf("%w: malformed number %q at position %d", ErrInvalidExpression, expression[start:i], start+1)
		}
	}

	text := expression[start:i]
	value, err := strconv.ParseFloat(text, 64)
	if err != nil {
		// text follows the grammar, so the only possible failure is a value
		// too large for a float64. A value too small becomes 0 without error.
		return token{}, fmt.Errorf("%w: number %q at position %d is too large", ErrInvalidExpression, text, start+1)
	}
	return token{kind: tokenNumber, text: text, pos: start + 1, value: value}, nil
}

// skipDigits returns the index of the first byte at or after i that is not
// an ASCII digit.
func skipDigits(s string, i int) int {
	for i < len(s) && isDigit(s[i]) {
		i++
	}
	return i
}

func isDigit(c byte) bool {
	return '0' <= c && c <= '9'
}

func isLetter(c byte) bool {
	return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z')
}

// symbolKind returns the kind of a one-character operator or parenthesis.
func symbolKind(c byte) (tokenKind, bool) {
	switch c {
	case '+':
		return tokenPlus, true
	case '-':
		return tokenMinus, true
	case '*':
		return tokenStar, true
	case '/':
		return tokenSlash, true
	case '^':
		return tokenCaret, true
	case '%':
		return tokenPercent, true
	case '(':
		return tokenLeftParen, true
	case ')':
		return tokenRightParen, true
	}
	return tokenEnd, false
}
