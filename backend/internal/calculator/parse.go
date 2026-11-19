package calculator

import "fmt"

// parser builds the syntax tree with one method per rule of the grammar in
// SPEC.md. Each method starts at the current token and stops on the first
// token it doesn't use.
type parser struct {
	tokens []token
	pos    int
}

func parse(tokens []token) (node, error) {
	p := parser{tokens: tokens}
	if p.peek().kind == tokenEnd {
		return nil, fmt.Errorf("%w: the expression is empty", ErrInvalidExpression)
	}
	tree, err := p.expression()
	if err != nil {
		return nil, err
	}
	if t := p.peek(); t.kind != tokenEnd {
		return nil, unexpected(t)
	}
	return tree, nil
}

func (p *parser) peek() token {
	return p.tokens[p.pos]
}

// advance returns the current token and moves past it. It never moves past
// the final tokenEnd.
func (p *parser) advance() token {
	t := p.tokens[p.pos]
	if t.kind != tokenEnd {
		p.pos++
	}
	return t
}

func (p *parser) expect(kind tokenKind, symbol string) error {
	t := p.peek()
	if t.kind != kind {
		return fmt.Errorf("%w: expected %q, found %v", ErrInvalidExpression, symbol, t)
	}
	p.advance()
	return nil
}

func unexpected(t token) error {
	return fmt.Errorf("%w: unexpected %v", ErrInvalidExpression, t)
}

// expression = term { ("+" | "-") term }
func (p *parser) expression() (node, error) {
	left, err := p.term()
	if err != nil {
		return nil, err
	}
	for {
		var apply func(float64, float64) (float64, error)
		switch p.peek().kind {
		case tokenPlus:
			apply = add
		case tokenMinus:
			apply = subtract
		default:
			return left, nil
		}
		p.advance()
		right, err := p.term()
		if err != nil {
			return nil, err
		}
		left = binaryOp{apply: apply, left: left, right: right}
	}
}

// term = unary { ("*" | "/") unary }
func (p *parser) term() (node, error) {
	left, err := p.unary()
	if err != nil {
		return nil, err
	}
	for {
		var apply func(float64, float64) (float64, error)
		switch p.peek().kind {
		case tokenStar:
			apply = multiply
		case tokenSlash:
			apply = divide
		default:
			return left, nil
		}
		p.advance()
		right, err := p.unary()
		if err != nil {
			return nil, err
		}
		left = binaryOp{apply: apply, left: left, right: right}
	}
}

// unary = "-" unary | power
func (p *parser) unary() (node, error) {
	if p.peek().kind != tokenMinus {
		return p.power()
	}
	p.advance()
	operand, err := p.unary()
	if err != nil {
		return nil, err
	}
	return unaryOp{apply: negate, operand: operand}, nil
}

// power = postfix [ "^" unary ]
func (p *parser) power() (node, error) {
	base, err := p.postfix()
	if err != nil {
		return nil, err
	}
	if p.peek().kind != tokenCaret {
		return base, nil
	}
	p.advance()
	exponent, err := p.unary()
	if err != nil {
		return nil, err
	}
	return binaryOp{apply: raise, left: base, right: exponent}, nil
}

// postfix = primary { "%" }
func (p *parser) postfix() (node, error) {
	operand, err := p.primary()
	if err != nil {
		return nil, err
	}
	for p.peek().kind == tokenPercent {
		p.advance()
		operand = unaryOp{apply: percent, operand: operand}
	}
	return operand, nil
}

// primary = number | "(" expression ")" | "sqrt" "(" expression ")"
func (p *parser) primary() (node, error) {
	t := p.advance()
	switch t.kind {
	case tokenNumber:
		return literal(t.value), nil
	case tokenLeftParen:
		return p.group()
	case tokenSqrt:
		if err := p.expect(tokenLeftParen, "("); err != nil {
			return nil, err
		}
		operand, err := p.group()
		if err != nil {
			return nil, err
		}
		return unaryOp{apply: squareRoot, operand: operand}, nil
	default:
		return nil, unexpected(t)
	}
}

// group parses the expression and the ")" that follow an opening
// parenthesis.
func (p *parser) group() (node, error) {
	inner, err := p.expression()
	if err != nil {
		return nil, err
	}
	if err := p.expect(tokenRightParen, ")"); err != nil {
		return nil, err
	}
	return inner, nil
}
