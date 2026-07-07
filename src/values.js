// values.js
// PHASE 7 — Data Types.
//
// Every runtime value carries an explicit type tag. This is what lets Klang
// tell 5 (int) apart from 5.0 (float) the way Python does, report precise type
// names in error messages, and implement conversions honestly. Values are:
//   { t:'int'|'float'|'bool'|'string'|'none', v: <js value> }
//   { t:'function', ... } { t:'class', ... } { t:'instance', ... }
//   { t:'builtin', ... } { t:'range', items:[...] }

export const mkInt = (n) => ({ t: "int", v: Math.trunc(n) });
export const mkFloat = (n) => ({ t: "float", v: n });
export const mkBool = (b) => ({ t: "bool", v: !!b });
export const mkStr = (s) => ({ t: "string", v: s });
export const NONE = { t: "none", v: null };

export const isNumber = (val) => val.t === "int" || val.t === "float" || val.t === "bool";

// numeric JS value of an int/float/bool (bool counts as 0/1, as in Python)
export const num = (val) => (val.t === "bool" ? (val.v ? 1 : 0) : val.v);

export function typeName(val) {
  return val.t;
}

export function truthy(val) {
  switch (val.t) {
    case "int":
    case "float":
      return val.v !== 0;
    case "bool":
      return val.v;
    case "string":
      return val.v.length > 0;
    case "none":
      return false;
    case "range":
      return val.items.length > 0;
    default:
      return true; // functions, classes, instances are truthy
  }
}

// How a value prints (print / str()).
export function reprString(val) {
  switch (val.t) {
    case "int":
      return String(val.v);
    case "float": {
      // always show a decimal point so floats read as floats
      if (Number.isInteger(val.v)) return val.v.toFixed(1);
      return String(val.v);
    }
    case "bool":
      return val.v ? "True" : "False";
    case "string":
      return val.v;
    case "none":
      return "None";
    case "function":
      return `<function ${val.name}>`;
    case "class":
      return `<class ${val.name}>`;
    case "instance":
      return `<${val.klass.name} object>`;
    case "builtin":
      return `<builtin ${val.name}>`;
    case "range":
      return `range(${val.items.length})`;
    default:
      return "<value>";
  }
}

// Structural equality for == / !=. Different types are never equal, except
// that the numeric family compares by value (1 == 1.0 == True), as in Python.
export function valuesEqual(a, b) {
  if (isNumber(a) && isNumber(b)) return num(a) === num(b);
  if (a.t !== b.t) return false;
  if (a.t === "string") return a.v === b.v;
  if (a.t === "none") return true;
  return a === b; // identity for functions/instances/classes
}
