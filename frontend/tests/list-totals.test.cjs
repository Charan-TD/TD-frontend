const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/features", relativePath), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency ${name}`);
  }, exports);
  return exports;
}

const { listTotal } = load("admin/api/listTotal.ts");

function endpointsOf(file) {
  let endpoints;
  const baseApi = {
    injectEndpoints({ endpoints: configure }) {
      endpoints = configure({ query: (config) => config, mutation: (config) => config });
      return {};
    },
  };
  load(file, {
    "../../admin/api/baseApi": { baseApi },
    "../../admin/api/apiTypes": {},
    "../../admin/api/listTotal": { listTotal },
  });
  return endpoints;
}

const page = (total) => ({ success: true, data: { pagination: { page: 1, limit: 1, total, totalPages: total } } });

test("listTotal reads the server total, including numeric strings", () => {
  assert.equal(listTotal(page(437)), 437);
  assert.equal(listTotal(page("12")), 12);
  assert.equal(listTotal(page(0)), 0);
});

test("listTotal refuses a response without a usable total instead of returning 0", () => {
  assert.throws(() => listTotal({ data: { restaurants: [] } }));
  assert.throws(() => listTotal(undefined));
  assert.throws(() => listTotal(page(null)));
  assert.throws(() => listTotal(page(-1)));
  assert.throws(() => listTotal(page("abc")));
});

test("restaurant and station counts fetch a single row and use the server total (not the page length)", () => {
  const restaurants = endpointsOf("restaurants/api/restaurantsApi.ts").getRestaurantsTotal;
  const stations = endpointsOf("stations/api/stationsApi.ts").getStationsTotal;

  assert.deepEqual(restaurants.query(), { url: "/restaurants", method: "GET", params: { page: 1, limit: 1 } });
  assert.deepEqual(stations.query(), { url: "/stations", method: "GET", params: { page: 1, limit: 1 } });
  assert.equal(restaurants.transformResponse(page(250)), 250);
  assert.equal(stations.transformResponse(page(130)), 130);
});

test("counts refresh when the matching list is invalidated", () => {
  assert.deepEqual(endpointsOf("restaurants/api/restaurantsApi.ts").getRestaurantsTotal.providesTags, [{ type: "Restaurant", id: "LIST" }]);
  assert.deepEqual(endpointsOf("stations/api/stationsApi.ts").getStationsTotal.providesTags, [{ type: "Station", id: "LIST" }]);
});
