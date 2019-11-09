import { assert } from "./debug";

const enum CharacterCodes {
    nullCharacter = 0,
    maxAsciiCharacter = 0x7f,

    lineFeed = 0x0a, // \n
    carriageReturn = 0x0d, // \r
    lineSeparator = 0x2028,
    paragraphSeparator = 0x2029,
    nextLine = 0x0085,

    space = 0x0020, // " "
    nonBreakingSpace = 0x00a0, //
    enQuad = 0x2000,
    emQuad = 0x2001,
    enSpace = 0x2002,
    emSpace = 0x2003,
    threePerEmSpace = 0x2004,
    fourPerEmSpace = 0x2005,
    sixPerEmSpace = 0x2006,
    figureSpace = 0x2007,
    punctuationSpace = 0x2008,
    thinSpace = 0x2009,
    hairSpace = 0x200a,
    zeroWidthSpace = 0x200b,
    narrowNoBreakSpace = 0x202f,
    ideographicSpace = 0x3000,
    mathematicalSpace = 0x205f,
    ogham = 0x1680,

    _ = 0x5f,
    $ = 0x24,

    _0 = 0x30,
    _1 = 0x31,
    _2 = 0x32,
    _3 = 0x33,
    _4 = 0x34,
    _5 = 0x35,
    _6 = 0x36,
    _7 = 0x37,
    _8 = 0x38,
    _9 = 0x39,

    a = 0x61,
    b = 0x62,
    c = 0x63,
    d = 0x64,
    e = 0x65,
    f = 0x66,
    g = 0x67,
    h = 0x68,
    i = 0x69,
    j = 0x6a,
    k = 0x6b,
    l = 0x6c,
    m = 0x6d,
    n = 0x6e,
    o = 0x6f,
    p = 0x70,
    q = 0x71,
    r = 0x72,
    s = 0x73,
    t = 0x74,
    u = 0x75,
    v = 0x76,
    w = 0x77,
    x = 0x78,
    y = 0x79,
    z = 0x7a,

    A = 0x41,
    B = 0x42,
    C = 0x43,
    D = 0x44,
    E = 0x45,
    F = 0x46,
    G = 0x47,
    H = 0x48,
    I = 0x49,
    J = 0x4a,
    K = 0x4b,
    L = 0x4c,
    M = 0x4d,
    N = 0x4e,
    O = 0x4f,
    P = 0x50,
    Q = 0x51,
    R = 0x52,
    S = 0x53,
    T = 0x54,
    U = 0x55,
    V = 0x56,
    W = 0x57,
    X = 0x58,
    Y = 0x59,
    Z = 0x5a,

    ampersand = 0x26, // &
    asterisk = 0x2a, // *
    at = 0x40, // @
    backslash = 0x5c, // \
    backtick = 0x60, // `
    bar = 0x7c, // |
    caret = 0x5e, // ^
    closeBrace = 0x7d, // }
    closeBracket = 0x5d, // ]
    closeParen = 0x29, // )
    colon = 0x3a, // :
    comma = 0x2c, // ,
    dot = 0x2e, // .
    doubleQuote = 0x22, // "
    equals = 0x3d, // =
    exclamation = 0x21, // !
    greaterThan = 0x3e, // >
    hash = 0x23, // #
    lessThan = 0x3c, // <
    minus = 0x2d, // -
    openBrace = 0x7b, // {
    openBracket = 0x5b, // [
    openParen = 0x28, // (
    percent = 0x25, // %
    plus = 0x2b, // +
    question = 0x3f, // ?
    semicolon = 0x3b, // ;
    singleQuote = 0x27, // '
    slash = 0x2f, // /
    tilde = 0x7e, // ~

    backspace = 0x08, // \b
    formFeed = 0x0c, // \f
    byteOrderMark = 0xfeff,
    tab = 0x09, // \t
    verticalTab = 0x0b // \v
}

export enum SyntaxKind {
    Unknown,
    EndOfInputToken,
    NumberLiteral,
    StringLiteral,
    TrueKeyword,
    FalseKeyword,
    Identifier,
    AsteriskToken,
    CaretToken,
    PlusToken,
    MinusToken,
    DotToken,
    LessThanToken,
    GreaterThanToken,
    LessThanEqualsToken,
    GreaterThanEqualsToken,
    EqualsToken,
    NotEqualsToken,
    OpenParenToken,
    CloseParenToken,
    CommaToken,
    SlashToken
}

function isDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

function isIdentifierStart(ch: number): boolean {
    return (
        (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) ||
        (ch >= CharacterCodes.a && ch <= CharacterCodes.z) ||
        ch === CharacterCodes.$ ||
        ch === CharacterCodes._
    );
}

function isIdentifierPart(ch: number): boolean {
    return (
        (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) ||
        (ch >= CharacterCodes.a && ch <= CharacterCodes.z) ||
        (ch >= CharacterCodes._0 && ch <= CharacterCodes._9) ||
        ch === CharacterCodes.$ ||
        ch === CharacterCodes._ ||
        ch === CharacterCodes.colon ||
        ch > CharacterCodes.maxAsciiCharacter
    );
}

function isWhitespaceChar(ch: number): boolean {
    return (
        ch === CharacterCodes.space ||
        ch === CharacterCodes.tab ||
        ch === CharacterCodes.verticalTab ||
        ch === CharacterCodes.formFeed ||
        ch === CharacterCodes.nonBreakingSpace ||
        ch === CharacterCodes.nextLine ||
        ch === CharacterCodes.ogham ||
        (ch >= CharacterCodes.enQuad && ch <= CharacterCodes.zeroWidthSpace) ||
        ch === CharacterCodes.narrowNoBreakSpace ||
        ch === CharacterCodes.mathematicalSpace ||
        ch === CharacterCodes.ideographicSpace ||
        ch === CharacterCodes.byteOrderMark
    );
}

const keywords: Record<string, SyntaxKind> = {
    true: SyntaxKind.TrueKeyword,
    false: SyntaxKind.FalseKeyword,
    TRUE: SyntaxKind.TrueKeyword,
    FALSE: SyntaxKind.FalseKeyword
};

const enum TokenFlags {
    None = 0,
    Unterminated = 1 << 0,
    Quoted = 1 << 1,
}


interface Scanner {
    freshenContext: (onError: (message: string, start: number, end: number) => void, text: string) => void;
    getToken: () => SyntaxKind;
    getTokenValue: () => string;
    getWSTokenPos: () => number;
    getTokenPos: () => number;
    getTextPos: () => number;
    getTokenFlags: () => TokenFlags;
    scan: () => SyntaxKind;
}

function createScanner(onError: (message: string, start: number, end: number) => void, initialText: string): Scanner {
    let text = initialText;
    let token: SyntaxKind = SyntaxKind.Unknown;
    let tokenValue: string = "";
    let tokenFlags: TokenFlags = TokenFlags.None;
    let pos = 0;
    let tokenPos = 0;
    let wsTokenPos = 0;
    let end = text.length;
    let onScanError = onError;

    function freshenContext(onError: (message: string, start: number, end: number) => void, newText: string) {
        text = newText;
        token = SyntaxKind.Unknown;
        tokenValue = "";
        tokenFlags = TokenFlags.None;
        pos = 0;
        tokenPos = 0;
        wsTokenPos = 0;
        end = newText.length;
        onScanError = onError;
    }

    function scan(): SyntaxKind {
        wsTokenPos = pos;
        tokenFlags = TokenFlags.None;
        while (true) {
            tokenPos = pos;
            if (pos >= end) {
                return (token = SyntaxKind.EndOfInputToken);
            }
            const ch = text.charCodeAt(pos);
            if (isWhitespaceChar(ch)) {
                pos += 1;
                continue;
            }
            switch (ch) {
                case CharacterCodes.lineFeed:
                case CharacterCodes.carriageReturn:
                    pos += 1;
                    continue;

                case CharacterCodes.asterisk:
                    pos += 1;
                    return (token = SyntaxKind.AsteriskToken);
                case CharacterCodes.caret:
                    pos += 1;
                    return (token = SyntaxKind.CaretToken);
                case CharacterCodes.minus:
                    pos += 1;
                    return (token = SyntaxKind.MinusToken);
                case CharacterCodes.plus:
                    pos += 1;
                    return (token = SyntaxKind.PlusToken);
                case CharacterCodes.dot:
                    pos += 1;
                    return (token = SyntaxKind.DotToken);
                case CharacterCodes.slash:
                    pos += 1;
                    return (token = SyntaxKind.SlashToken);
                case CharacterCodes.comma:
                    pos += 1;
                    return (token = SyntaxKind.CommaToken);

                case CharacterCodes.equals:
                    pos += 1;
                    return (token = SyntaxKind.EqualsToken);
                case CharacterCodes.lessThan:
                    pos += 1;
                    if (text.charCodeAt(pos) === CharacterCodes.equals) {
                        pos += 1;
                        return (token = SyntaxKind.LessThanEqualsToken);
                    }
                    if (text.charCodeAt(pos) === CharacterCodes.greaterThan) {
                        pos += 1;
                        return (token = SyntaxKind.NotEqualsToken);
                    }
                    return (token = SyntaxKind.LessThanToken);
                case CharacterCodes.greaterThan:
                    pos += 1;
                    if (text.charCodeAt(pos) === CharacterCodes.equals) {
                        pos += 1;
                        return (token = SyntaxKind.GreaterThanEqualsToken);
                    }
                    return (token = SyntaxKind.GreaterThanToken);
                case CharacterCodes.openParen:
                    pos += 1;
                    return (token = SyntaxKind.OpenParenToken);
                case CharacterCodes.closeParen:
                    pos += 1;
                    return (token = SyntaxKind.CloseParenToken);

                case CharacterCodes.openBrace:
                    tokenValue = scanString(CharacterCodes.closeBrace);
                    tokenFlags |= TokenFlags.Quoted;
                    return (token = SyntaxKind.Identifier);

                case CharacterCodes.doubleQuote:
                case CharacterCodes.singleQuote:
                    tokenValue = scanString(ch);
                    return (token = SyntaxKind.StringLiteral);

                case CharacterCodes._0:
                case CharacterCodes._1:
                case CharacterCodes._2:
                case CharacterCodes._3:
                case CharacterCodes._4:
                case CharacterCodes._5:
                case CharacterCodes._6:
                case CharacterCodes._7:
                case CharacterCodes._8:
                case CharacterCodes._9:
                    ({ type: token, value: tokenValue } = scanNumber());
                    return token;

                default:
                    if (isIdentifierStart(ch)) {
                        ({ type: token, value: tokenValue } = scanIdentifier());
                        return token;
                    }
                    onScanError("Unknown Character", pos, pos);
                    pos += 1;
                    return (token = SyntaxKind.Unknown);
            }
        }
    }

    function scanIdentifier() {
        const start = pos;
        while (pos < end) {
            const ch = text.charCodeAt(pos);
            if (isIdentifierPart(ch)) {
                pos += 1;
                continue;
            }
            break;
        }
        const value = text.substring(start, pos);
        if (keywords.hasOwnProperty(value)) {
            return { type: keywords[value], value };
        }
        const type = SyntaxKind.Identifier;
        return { type, value };
    }

    function scanEscape(): string {
        // `pos` points to backslash
        pos += 1;
        if (pos >= end) {
            onScanError("Unexpected end", pos, pos);
            return "";
        }
        const ch = text.charCodeAt(pos);
        pos += 1;
        switch (ch) {
            case CharacterCodes.t:
                return "\t";
            case CharacterCodes.n:
                return "\n";
            case CharacterCodes.r:
                return "\r";
            case CharacterCodes.singleQuote:
                return "\'";
            case CharacterCodes.doubleQuote:
                return "\"";
            default:
                return String.fromCharCode(ch);
        }
    }

    function scanString(endQuote: number): string {
        pos += 1;
        let result = "";
        let start = pos;
        while (true) {
            if (pos >= end) {
                result += text.substring(start, pos);
                tokenFlags |= TokenFlags.Unterminated;
                onScanError("Unterminated string literal", start, pos);
                break;
            }
            const ch = text.charCodeAt(pos);
            if (ch === endQuote) {
                result += text.substring(start, pos);
                pos += 1;
                break;
            }
            if (ch === CharacterCodes.backslash) {
                result += text.substring(start, pos);
                result += scanEscape();
                start = pos;
                continue;
            }
            pos += 1;
        }
        return result;
    }

    function scanNumber(): { type: SyntaxKind; value: string } {
        const start = pos;
        scanNumberFragment();
        let decimalFragment: string | undefined;
        if (text.charCodeAt(pos) === CharacterCodes.dot) {
            pos += 1;
            decimalFragment = scanNumberFragment();
        }
        const textPart = text.substring(start, pos);
        const result = decimalFragment !== undefined ? "" + +textPart : textPart;
        return {
            type: SyntaxKind.NumberLiteral,
            value: result
        };
    }

    function scanNumberFragment(): string {
        let start = pos;
        let result = "";
        while (true) {
            const ch = text.charCodeAt(pos);
            if (isDigit(ch)) {
                pos += 1;
                continue;
            }
            break;
        }
        return result + text.substring(start, pos);
    }

    return {
        freshenContext,
        getToken: () => token,
        getTokenValue: () => tokenValue,
        getWSTokenPos: () => wsTokenPos,
        getTokenPos: () => tokenPos,
        getTextPos: () => pos,
        getTokenFlags: () => tokenFlags,
        scan
    };
}

export interface ParserErrorHandler<E> {
    errors: () => E;
    reset: () => void;
    onError: (message: string, start: number, end: number) => void;
}

export interface ParserSink<R> {
    lit: (value: boolean | number | string, start: number, end: number) => R;
    ident: (id: string, kind: TokenFlags, fieldAccess: boolean, start: number, end: number) => R;
    paren: (expr: R, start: number, end: number) => R;
    app: (head: R, args: R[], start: number, end: number) => R;
    dot: (left: R, right: R, start: number, end: number) => R;
    binOp: (op: BinaryOperatorToken, left: R, right: R, start: number, end: number) => R;
    unaryOp: (op: UnaryOperatorToken, expr: R, start: number, end: number) => R;
    missing: (position: number) => R;
}

export type Diagnostic = [string, number, number];

export interface Parser<E, R> {
    (input: string): [E, R];
}

function operatorPrecedence(kind: SyntaxKind): number {
    switch (kind) {
        case SyntaxKind.EqualsToken:
        case SyntaxKind.LessThanToken:
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.LessThanEqualsToken:
        case SyntaxKind.GreaterThanEqualsToken:
        case SyntaxKind.NotEqualsToken:
            return 1;
        case SyntaxKind.PlusToken:
        case SyntaxKind.MinusToken:
            return 2;
        case SyntaxKind.AsteriskToken:
        case SyntaxKind.SlashToken:
            return 3;
    }
    return -1;
}

function isStartOfExpression(kind: SyntaxKind): boolean {
    switch (kind) {
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.Identifier:
        case SyntaxKind.OpenParenToken:
        // These cases are for error handling so that we look ahead
        // and create the binOp node with missing children.
        case SyntaxKind.PlusToken:
        case SyntaxKind.MinusToken:
        case SyntaxKind.AsteriskToken:
        case SyntaxKind.SlashToken:
        case SyntaxKind.EqualsToken:
        case SyntaxKind.LessThanToken:
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.LessThanEqualsToken:
        case SyntaxKind.GreaterThanEqualsToken:
        case SyntaxKind.NotEqualsToken:
            return true;
        default:
            return false;
    }
}

export type BinaryOperatorToken =
    | SyntaxKind.EqualsToken
    | SyntaxKind.LessThanToken
    | SyntaxKind.GreaterThanToken
    | SyntaxKind.LessThanEqualsToken
    | SyntaxKind.GreaterThanEqualsToken
    | SyntaxKind.NotEqualsToken
    | SyntaxKind.PlusToken
    | SyntaxKind.MinusToken
    | SyntaxKind.AsteriskToken
    | SyntaxKind.SlashToken;

export type UnaryOperatorToken = SyntaxKind.PlusToken | SyntaxKind.MinusToken;

export const createDiagnosticErrorHandler: () => ParserErrorHandler<Diagnostic[]> = () => {
    let errors: Diagnostic[] = [];
    return {
        errors: () => errors,
        reset: () => { errors = []; return },
        onError: (message, start, end) => { errors.push([message, start, end]); return }
    }
}

export const createBooleanErrorHandler: () => ParserErrorHandler<boolean> = () => {
    let errors = false;
    return {
        errors: () => errors,
        reset: () => { errors = false; return },
        onError: () => { errors = true; return }
    }
}

export const createParser = <R, E>(sink: ParserSink<R>, handler: ParserErrorHandler<E>) => {
    const scanner = createScanner(handler.onError, "");
    let currentToken: SyntaxKind;

    type ExpressionConstructor = (lhs: R, start: number, token: BinaryOperatorToken, precedence: number) => R;
    const binOpMap: Partial<Record<BinaryOperatorToken, ExpressionConstructor>> = {
        [SyntaxKind.EqualsToken]: parseBinOp,
        [SyntaxKind.LessThanToken]: parseBinOp,
        [SyntaxKind.GreaterThanToken]: parseBinOp,
        [SyntaxKind.LessThanEqualsToken]: parseBinOp,
        [SyntaxKind.GreaterThanEqualsToken]: parseBinOp,
        [SyntaxKind.NotEqualsToken]: parseBinOp,
        [SyntaxKind.PlusToken]: parseBinOp,
        [SyntaxKind.MinusToken]: parseBinOp,
        [SyntaxKind.AsteriskToken]: parseBinOp,
        [SyntaxKind.SlashToken]: parseBinOp,
    };

    const dotAppMap = {
        [SyntaxKind.OpenParenToken]: (lhs: R, start: number) => {
            return sink.app(lhs, parseArgumentList(), start, scanner.getWSTokenPos());
        },
        [SyntaxKind.DotToken]: (lhs: R, start: number) => {
            return sink.dot(lhs, parseField(), start, scanner.getWSTokenPos());
        }
    } as const;

    const parseExpression = () => parseExpr(/* precedence */ 0);

    const parse = (input: string): [E, R] => {
        freshenContext(input);
        nextToken();
        const exp = parseExpression();
        parseExpected(SyntaxKind.EndOfInputToken);
        return [handler.errors(), exp];
    };

    return parse;

    function freshenContext(input: string) {
        scanner.freshenContext(handler.onError, input);
        handler.reset();
        currentToken = SyntaxKind.Unknown;
    }

    function nextToken() {
        return (currentToken = scanner.scan());
    }

    function parseExpected(kind: SyntaxKind): boolean {
        if (currentToken === kind) {
            nextToken();
            return true;
        }
        handler.onError(`Expected: ${kind}`, scanner.getTokenPos(), scanner.getTextPos());
        return false;
    }

    function parseOptional(kind: SyntaxKind): boolean {
        if (currentToken === kind) {
            nextToken();
            return true;
        }
        return false;
    }

    function parseIdentifer(fieldAccess: boolean): R {
        const start = scanner.getWSTokenPos();
        const tokenValue = scanner.getTokenValue();
        const flags = scanner.getTokenFlags();
        nextToken();
        return sink.ident(tokenValue, flags, fieldAccess, start, scanner.getWSTokenPos());
    }

    function parseLiteral(value: boolean | number | string): R {
        const start = scanner.getWSTokenPos();
        nextToken();
        return sink.lit(value, start, scanner.getWSTokenPos());
    }

    function parseField(): R {
        // TODO: Review whether we need this, or whether we can just try and parse ident.
        if (currentToken === SyntaxKind.Identifier) {
            return parseIdentifer(/*fieldAccess */ true);
        }
        return sink.missing(scanner.getWSTokenPos());
    }

    function parseBinOp(lhs: R, start: number, token: BinaryOperatorToken, precedence: number) {
        return sink.binOp(token, lhs, parseExpr(precedence), start, scanner.getWSTokenPos());
    }

    function isListEnd() {
        return currentToken === SyntaxKind.CloseParenToken || currentToken === SyntaxKind.EndOfInputToken;
    }

    function parseArgumentList(): R[] {
        const list: R[] = [];
        let nextArgPos = scanner.getWSTokenPos();
        let freshArgument = true;
        while (true) {
            if (isStartOfExpression(currentToken)) {
                // Only parse out an expected comma when we have
                // already parsed an expression for this argument
                // position and we come across another expression.
                // This assumes that a comma is not a valid start of
                // expression.
                if (!freshArgument) {
                    parseExpected(SyntaxKind.CommaToken);
                }
                list.push(parseExpression());
                freshArgument = parseOptional(SyntaxKind.CommaToken);
                if (freshArgument) {
                    nextArgPos = scanner.getWSTokenPos();
                }
                continue;
            }
            if (isListEnd()) {
                break;
            }
            if (parseOptional(SyntaxKind.CommaToken)) {
                if (freshArgument) {
                    list.push(sink.missing(nextArgPos));
                }
                freshArgument = true;
                nextArgPos = scanner.getWSTokenPos();
                continue;
            }
            nextToken();
        }
        if (freshArgument && list.length > 0) {
            list.push(sink.missing(nextArgPos));
        }
        parseExpected(SyntaxKind.CloseParenToken);
        return list;
    }

    function parseExpr(precedence: number): R {
        const start = scanner.getWSTokenPos();
        let expression = parsePrefixUnary();
        while (true) {
            const token = currentToken;
            const newPrecedence = operatorPrecedence(token);
            if (newPrecedence <= precedence) {
                break;
            }
            nextToken();
            const makeTerm = binOpMap[token as BinaryOperatorToken];
            assert(makeTerm !== undefined);
            expression = makeTerm!(expression, start, token as BinaryOperatorToken, newPrecedence);
        }
        return expression;
    }

    function parsePrefixUnary(): R {
        const token = currentToken;
        switch (token) {
            case SyntaxKind.PlusToken:
            case SyntaxKind.MinusToken:
                const start = scanner.getWSTokenPos();
                nextToken();
                return sink.unaryOp(token, parsePrefixUnary(), start, scanner.getWSTokenPos());
            default:
                return parseDotOrApp();
        }
    }

    function parseDotOrApp(): R {
        const start = scanner.getWSTokenPos();
        let expression = parsePrimary();
        while (true) {
            const token = currentToken;
            switch (token) {
                case SyntaxKind.OpenParenToken:
                case SyntaxKind.DotToken:
                    nextToken();
                    expression = dotAppMap[token](expression, start);
                    continue;
                default:
                    return expression;
            }
        }
    }

    function parsePrimary(): R {
        switch (currentToken) {
            case SyntaxKind.NumberLiteral:
                return parseLiteral(Number(scanner.getTokenValue()));

            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
                return parseLiteral(currentToken === SyntaxKind.TrueKeyword);

            case SyntaxKind.StringLiteral:
                return parseLiteral(JSON.stringify(scanner.getTokenValue()).slice(1, -1));

            case SyntaxKind.Identifier:
                return parseIdentifer(/* fieldAccess */ false);

            case SyntaxKind.OpenParenToken:
                const start = scanner.getWSTokenPos();
                nextToken();
                const expr = parseExpression();
                parseExpected(SyntaxKind.CloseParenToken);
                return sink.paren(expr, start, scanner.getWSTokenPos());

            default:
                return sink.missing(scanner.getWSTokenPos());
        }
    }
};
