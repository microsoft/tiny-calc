import { error } from "./debug";

export const enum CharacterCodes {
    nullCharacter = 0,
    maxAsciiCharacter = 0x7f,

    lineFeed = 0x0a, // \n
    carriageReturn = 0x0d, // \r
    lineSeparator = 0x2028,
    paragraphSeparator = 0x2029,
    nextLine = 0x0085,

    // Unicode 3.0 space characters
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
    Void,
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
    LessThanOrEqualToken,
    GreaterThanOrEqualToken,
    EqualsToken,
    NotEqualsToken,
    OpenParenToken,
    CloseParenToken,
    CommaToken,
    SlashToken,
    EndOfInputToken
}

interface Scanner {
    getToken: () => SyntaxKind;
    getTokenValue: () => string;
    scan: () => SyntaxKind;
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
        ch > CharacterCodes.maxAsciiCharacter
    );
}

function isWhitespaceChar(ch: number): boolean {
    switch (ch) {
        case CharacterCodes.tab:
        case CharacterCodes.verticalTab:
        case CharacterCodes.formFeed:
        case CharacterCodes.space:
        case CharacterCodes.nonBreakingSpace:
        case CharacterCodes.ogham:
        case CharacterCodes.enQuad:
        case CharacterCodes.emQuad:
        case CharacterCodes.enSpace:
        case CharacterCodes.emSpace:
        case CharacterCodes.threePerEmSpace:
        case CharacterCodes.fourPerEmSpace:
        case CharacterCodes.sixPerEmSpace:
        case CharacterCodes.figureSpace:
        case CharacterCodes.punctuationSpace:
        case CharacterCodes.thinSpace:
        case CharacterCodes.hairSpace:
        case CharacterCodes.zeroWidthSpace:
        case CharacterCodes.narrowNoBreakSpace:
        case CharacterCodes.mathematicalSpace:
        case CharacterCodes.ideographicSpace:
        case CharacterCodes.byteOrderMark:
            return true;
    }
    return false;
}

const keywords: Record<string, SyntaxKind> = {
    true: SyntaxKind.TrueKeyword,
    false: SyntaxKind.FalseKeyword
};

function createScanner(textInput: string): Scanner {
    const text = textInput;
    let token: SyntaxKind = SyntaxKind.Void;
    let tokenValue: string = "";
    let pos = 0;
    const end = text.length;

    function scan(): SyntaxKind {
        while (true) {
            if (pos >= end) {
                return token = SyntaxKind.EndOfInputToken;
            }
            const ch = text.charCodeAt(pos);
            if (isWhitespaceChar(ch)) {
                pos += 1;
                continue;
            }
            switch (ch) {
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
                        return (token = SyntaxKind.LessThanOrEqualToken);
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
                        return (token = SyntaxKind.GreaterThanOrEqualToken);
                    }
                    return (token = SyntaxKind.GreaterThanToken);
                case CharacterCodes.openParen:
                    pos += 1;
                    return (token = SyntaxKind.OpenParenToken);
                case CharacterCodes.closeParen:
                    pos += 1;
                    return (token = SyntaxKind.CloseParenToken);

                case CharacterCodes.doubleQuote:
                case CharacterCodes.singleQuote:
                    tokenValue = scanString();
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
                    return (token = SyntaxKind.Void);
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
        const asKeyword = keywords[value];
        if (asKeyword !== undefined) {
            return { type: asKeyword, value };
        }
        const type = SyntaxKind.Identifier;
        return { type, value };
    }

    function scanString(): string {
        const quote = text.charCodeAt(pos);
        pos++;
        let result = "";
        let start = pos;
        while (true) {
            if (pos >= end) {
                result += text.substring(start, pos);
                error("Unterminated string literal");
                break;
            }
            const ch = text.charCodeAt(pos);
            if (ch === quote) {
                result += text.substring(start, pos);
                pos++;
                break;
            }
            pos++;
        }
        return result;
    }

    function scanNumber(): { type: SyntaxKind; value: string } {
        const start = pos;
        scanNumberFragment();
        let decimalFragment: string | undefined;
        if (text.charCodeAt(pos) === CharacterCodes.dot) {
            pos++;
            decimalFragment = scanNumberFragment();
        }
        const textPart = text.substring(start, pos);
        const result: string = decimalFragment !== undefined ? "" + +textPart : textPart;
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
        getToken: () => token,
        getTokenValue: () => tokenValue,
        scan
    };
}

export type Op =
    | SyntaxKind.PlusToken
    | SyntaxKind.MinusToken
    | SyntaxKind.AsteriskToken
    | SyntaxKind.SlashToken
    | SyntaxKind.EqualsToken
    | SyntaxKind.LessThanToken
    | SyntaxKind.GreaterThanToken
    | SyntaxKind.LessThanOrEqualToken
    | SyntaxKind.GreaterThanOrEqualToken
    | SyntaxKind.NotEqualsToken;

export interface ParserSink<R> {
    lit: (value: number | string | boolean) => R;
    ident: (id: string, quoted: boolean) => R;
    fun: (identifer: string[], body: R) => R;
    app: (head: R, args: R[]) => R;
    dot: (left: R, right: R) => R;
    binOp: (op: Op, left: R, right: R) => R;
}

export interface Parser {
    <R>(input: string, sink: ParserSink<R>): R;
}

export const runParser: Parser = <R>(input: string, sink: ParserSink<R>) => {
    const scanner = createScanner(input);
    let currentToken: SyntaxKind;
    nextToken();
    return parseFormula();

    function nextToken() {
        return (currentToken = scanner.scan());
    }

    function parseOptional(k: SyntaxKind): boolean {
        if (currentToken === k) {
            nextToken();
            return true;
        }
        return false;
    }

    function parseIdentifer() {
        const tokenValue = scanner.getTokenValue();
        nextToken();
        return sink.ident(tokenValue, false);
    }

    function parseField() {
        // Most likely wrong.
        const tokenValue = scanner.getTokenValue();
        nextToken();
        return sink.lit(tokenValue);
    }

    function parseNumber(): R {
        const tokenValue = scanner.getTokenValue();
        nextToken();
        return sink.lit(Number(tokenValue));
    }

    function parseBoolean(): R {
        const tokenValue = scanner.getTokenValue();
        nextToken();
        const value = tokenValue === "true";
        return sink.lit(value);
    }

    function parseString(): R {
        const tokenValue = scanner.getTokenValue();
        nextToken();
        return sink.lit(JSON.stringify(tokenValue).slice(1, -1));
    }

    // relational
    function parseFormula(): R {
        let formula = parseAddition();
        while (true) {
            const token = currentToken;
            switch (token) {
                case SyntaxKind.EqualsToken:
                case SyntaxKind.LessThanToken:
                case SyntaxKind.GreaterThanToken:
                case SyntaxKind.LessThanOrEqualToken:
                case SyntaxKind.GreaterThanOrEqualToken:
                case SyntaxKind.NotEqualsToken:
                case SyntaxKind.EqualsToken:
                    nextToken();
                    formula = sink.binOp(token, formula, parseAddition());
                    continue;
                default:
                    return formula;
            }
        }
    }
    
    // + and -
    function parseAddition(): R {
        let formula = parseMultiplication();
        while (true) {
            const token = currentToken;
            switch (token) {
                case SyntaxKind.PlusToken:
                case SyntaxKind.MinusToken:
                    nextToken();
                    formula = sink.binOp(token, formula, parseMultiplication());
                    continue;
                default:
                    return formula;
            }
        }
    }

    // * and /
    function parseMultiplication(): R {
        let formula = parseDot();
        while (true) {
            const token = currentToken;
            switch (token) {
                case SyntaxKind.AsteriskToken:
                case SyntaxKind.SlashToken:
                    nextToken();
                    formula = sink.binOp(token, formula, parseDot());
                    continue;
                default:
                    return formula;
            }
        }
    }

    // dot
    function parseDot(): R {
        let formula = parseApplication();
        while (true) {
            if (parseOptional(SyntaxKind.DotToken)) {
                formula = sink.dot(formula, parseField());
            } else {
                break;
            }
        }
        return formula;
    }

    function parseApplication(): R {
        let formula = parsePrimary();
        while (parseOptional(SyntaxKind.OpenParenToken)) {
            formula = sink.app(formula, parseArgumentList());
        }
        return formula;
    }

    function parseArgumentList(): R[] {
        const list: R[] = [];
        if (currentToken !== SyntaxKind.CloseParenToken) {
            do {
                list.push(parseFormula());                
            } while (parseOptional(SyntaxKind.CommaToken));
        }
        if (parseOptional(SyntaxKind.CloseParenToken)) {
            return list;
        }
        return error("Missing Close paren in argument list" + input);
    }
  
    // keywords/idents/brackes
    function parsePrimary(): R {
        const token = currentToken;
        switch (token) {
            case SyntaxKind.NumberLiteral:
                return parseNumber();

            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
                return parseBoolean();

            case SyntaxKind.StringLiteral:
                return parseString();

            case SyntaxKind.Identifier:
                return parseIdentifer();

            case SyntaxKind.OpenParenToken:
                nextToken();
                const m = parseFormula();
                return parseOptional(SyntaxKind.CloseParenToken) ? m : error("Unclosed paren");

            default:
                return error("Parse Failure " + input + " " + token);
        }
    }
};
