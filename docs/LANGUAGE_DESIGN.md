# Klang Language Design

Phase 1 of the course spec (language design) plus the full syntax reference and
draft answers to the required Q&A. Everything here describes what the code in
`src/` actually does, not an idealized version of it.

## 1. Purpose

Klang is a small, Python-like scripting language built to make a compiler
pipeline observable. The language itself is intentionally modest: it is meant to
be implemented completely and correctly in the available time, and to be easy to
lex, parse, and interpret, so that attention can go to the thing that makes the
project distinct, which is turning each pipeline stage into something you can
watch and hear. The language is the substrate; the pipeline is the point.

Design priorities, in order: familiar (anyone who knows Python can read it),
small (four data types, one number tower, no imports or generics), and
transparent (every stage produces an inspectable artifact).

## 2. Syntax style

Klang borrows Python's surface almost exactly:

- Blocks are defined by indentation, not braces. A colon opens a block and the
  indented lines under it form the body.
- Comments start with `#` and run to end of line.
- Statements end at the newline; there are no semicolons.
- `True`, `False`, and `None` are capitalized literals, as in Python.
- Variables are declared by assignment. There is no `let` or `var` keyword.

A short program:

```klang
def greet(name):
    if len(name) > 0:
        print("hi " + name)
    else:
        print("hi stranger")

greet("David")
```

## 3. Program structure

A program is a sequence of statements at the top (module) level. Statements are
either simple (one line: assignment, expression, `return`, `break`, `continue`,
`global`) or compound (a header line ending in `:` followed by an indented
block: `if` / `elif` / `else`, `while`, `for`, `def`, `class`).

Execution is top to bottom. Function and class bodies run only when called or
instantiated.

## 4. Lexical grammar (tokens)

The four token categories the spec asks for, plus the structural tokens an
indentation-based language needs:

| Category | Examples |
|---|---|
| Keyword | `def return if elif else while for in break continue class and or not global print` |
| Identifier | `name`, `_balance`, `x2` (letters/underscore, then letters/digits/underscore) |
| Literal | `42` (int), `3.5` (float), `"hi"` / `'hi'` (string), `True` `False` (bool), `None` |
| Operator | `+ - * / % // ** == != < <= > >= = .` |
| Punctuation / structure | `( ) : ,` and the emitted `NEWLINE` / `INDENT` / `DEDENT` |

## 5. Syntax grammar (structure)

Informal EBNF for the parser:

```
program    = { NEWLINE | statement } EOF
statement  = compound | simple NEWLINE
compound   = ifStmt | whileStmt | forStmt | funcDef | classDef
simple     = assignment | exprStmt | "return" [expr] | "break" | "continue"
           | "global" IDENT {"," IDENT}
block      = NEWLINE INDENT statement { statement } DEDENT

ifStmt     = "if" expr ":" block { "elif" expr ":" block } [ "else" ":" block ]
whileStmt  = "while" expr ":" block
forStmt    = "for" IDENT "in" expr ":" block
funcDef    = "def" IDENT "(" [ IDENT {"," IDENT} ] ")" ":" block
classDef   = "class" IDENT ":" NEWLINE INDENT funcDef { funcDef } DEDENT

expr       = orExpr
orExpr     = andExpr { "or" andExpr }
andExpr    = notExpr { "and" notExpr }
notExpr    = "not" notExpr | comparison
comparison = sum { ("==" | "!=" | "<" | "<=" | ">" | ">=") sum }
sum        = term { ("+" | "-") term }
term       = factor { ("*" | "/" | "%" | "//") factor }
factor     = ("-" | "+") factor | power
power      = postfix [ "**" factor ]
postfix    = primary { call | attribute }
call       = "(" [ expr {"," expr} ] ")"
attribute  = "." IDENT
primary    = INT | FLOAT | STRING | BOOL | NONE | IDENT | "(" expr ")"
```

Operator precedence runs low to high: `or`, `and`, `not`, comparisons, `+ -`,
`* / % //`, unary sign, `**` (right associative), then calls and attribute
access. This is the standard Python ordering.

## 6. Names, scope, and binding

- Only functions and the module create a scope. `if`, `while`, and `for` do not,
  so a variable first assigned inside a loop is visible after the loop.
- Assigning to a name inside a function makes it local to that whole function,
  unless `global name` is declared, in which case the assignment writes to the
  module scope.
- Name lookup is Local, then Enclosing function(s), then Global, then Builtin
  (LEGB). Closures work because a function captures the environment it was
  defined in.
- Class bodies are skipped during free-name lookup: a method resolves its free
  names against the module, and reaches instance state only through `self`.

## 7. Type system

Four value types plus `None`: `int`, `float`, `bool`, `string`. For arithmetic,
`int`, `float`, and `bool` form one numeric family (a bool counts as 0 or 1, as
in Python). Rules:

- `+` adds two numbers or concatenates two strings; any other mix is an error.
- `- * / % // **` require two numbers. `/` always produces a float; `//` floors.
- Ordered comparisons (`< <= > >=`) need two numbers or two strings. Equality
  (`== !=`) works on any pair and returns a bool.
- Conversions are explicit through `int()`, `float()`, `str()`, `bool()`.

Type checking is gradual. The semantic pass infers a type wherever it can and
reports a definite conflict before the program runs; where a type cannot be
known statically (a function's return value, an attribute read) it defers to the
runtime, which enforces the same rules. This is why `"a" + True` is caught
before execution but a value that only turns out wrong at run time is caught by
the interpreter with the same style of message.

## 8. Draft answers to the required Q&A

**What is the purpose of your designed programming language?**
Klang is a compact, Python-like teaching language whose whole compiler pipeline
is observable in real time, visually and audibly. The language is kept small on
purpose so the interesting work is making tokenization, scope resolution,
semantic checking, and execution into things a person can watch and hear rather
than infer from a final result.

**How does your lexical analyzer identify tokens?**
It scans the source line by line, left to right. Leading whitespace on each
logical line is measured and compared against an indentation stack to emit
`INDENT` and `DEDENT` tokens, which is how a brace-free language marks block
boundaries. Within a line it recognizes strings by their quotes, numbers as
digit runs (with a fractional part making them floats), and identifier-like runs
which are then classified as a literal word (`True`/`False`/`None`), a reserved
keyword, or a plain identifier. Operators are matched longest-first so `==` is
never read as two `=`. Every token records its type, value, line, and column.

**What grammar rules did you define for syntax analysis?**
A recursive-descent grammar (see section 5). Statements split into simple and
compound forms; compound statements use a colon plus an indented block. The
expression grammar is a precedence ladder from `or` down to primary expressions,
with calls and attribute access as postfix operators. Malformed input raises a
syntax error naming what was expected and where, instead of crashing.

**How does your system handle scope and binding?**
With LEGB lexical scoping (section 6). A static resolver pass runs before
execution: it hoists the names each scope binds and verifies every referenced
name resolves to a local, an enclosing function, a global, or a builtin,
reporting undeclared variables before anything runs. At runtime, environments
form a parent-linked chain; functions capture their defining environment so
closures behave correctly, and `global` redirects assignments to the module
scope.

**What semantic checks are implemented in your language?**
Two kinds. Declaration checking (undeclared variable use) comes from the
resolver. Type checking comes from a gradual semantic pass that catches
definite type errors before execution: incompatible operands (`"a" + True`),
invalid comparisons (number versus string), unary sign on non-numbers, and
non-integer arguments to `range()`. Cases that cannot be decided statically are
enforced at runtime with matching messages.

**What control flow structures are supported?**
`if` / `elif` / `else`, `while` loops, and `for` loops over `range(...)` or over
the characters of a string, with `break` and `continue` inside loops. Functions
support `return` and recursion.

**What data types are supported and how are they used?**
`int`, `float`, `bool`, `string`, and `None`. Integers and floats share a
numeric tower (mixed arithmetic promotes to float; `/` always yields a float).
Strings support concatenation, comparison, `len()`, and iteration. Booleans
double as 0/1 in arithmetic. Conversions between types are explicit via `int()`,
`float()`, `str()`, and `bool()`.
