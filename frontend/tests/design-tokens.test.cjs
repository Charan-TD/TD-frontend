const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..", "src");

function loadTokens() {
  const source = fs.readFileSync(path.join(root, "app/theme/tokens.ts"), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", code)(module.exports, module);
  return module.exports;
}

const tokens = loadTokens();
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

/** Effective `:root` custom properties: the LAST declaration wins, as in the browser. */
function effectiveRootVariables(source) {
  const variables = {};
  for (const block of source.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const declaration of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)) {
      variables[declaration[1]] = declaration[2].trim().toLowerCase();
    }
  }
  return variables;
}

test("CSS :root variables match the TypeScript design tokens", () => {
  const variables = effectiveRootVariables(css);
  const mismatches = [];
  for (const [name, expected] of Object.entries(tokens.cssVariableTokens)) {
    const actual = variables[name];
    if (actual !== String(expected).toLowerCase()) {
      mismatches.push(`${name}: css=${actual ?? "(missing)"} tokens=${expected}`);
    }
  }
  assert.deepEqual(mismatches, [], "update globals.css and src/app/theme/tokens.ts together");
});

test("every token colour is a valid hex value", () => {
  for (const group of [tokens.colors, tokens.legacyOranges]) {
    for (const [name, value] of Object.entries(group)) {
      assert.match(value, /^#[0-9a-f]{3}([0-9a-f]{3})?$/i, `${name} is not a hex colour`);
    }
  }
});

test("globals.css only uses breakpoints from the approved scale or the legacy list", () => {
  const allowed = new Set([...Object.values(tokens.breakpoints), ...tokens.legacyBreakpoints]);
  const unknown = new Set();
  for (const query of css.matchAll(/@media[^{]+/g)) {
    for (const width of query[0].matchAll(/(?:min|max)-width:\s*(\d+)px/g)) {
      if (!allowed.has(Number(width[1]))) unknown.add(Number(width[1]));
    }
  }
  assert.deepEqual(
    [...unknown],
    [],
    "new breakpoint values are not allowed: use sm/md/lg/xl from tokens.ts (see `breakpoints`)",
  );
});

test("breakpoint scale is ascending and does not overlap the legacy list", () => {
  const scale = Object.values(tokens.breakpoints);
  assert.deepEqual(scale, [...scale].sort((a, b) => a - b));
  for (const value of scale) {
    assert.ok(!tokens.legacyBreakpoints.includes(value), `${value}px is listed as both scale and legacy`);
  }
});
