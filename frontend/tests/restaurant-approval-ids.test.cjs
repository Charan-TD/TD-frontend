const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadApi(filename, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/features/restaurants/api", filename), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency ${name}`);
  }, exports);
  return exports;
}
const ids = loadApi("restaurantId.ts");
let endpoints;
const baseApi = { injectEndpoints({ endpoints: configure }) {
  endpoints = configure({ query: (config) => config, mutation: (config) => config });
  return {};
} };
loadApi("registrationRequestsApi.ts", { "./restaurantId": ids, "../../admin/api/baseApi": { baseApi } });
const registration = endpoints;
loadApi("profileEditRequestsApi.ts", { "./restaurantId": ids, "../../admin/api/baseApi": { baseApi } });
const profile = endpoints;
const uuid = "516f39ed-c2b0-4520-a716-d2da934a70e3";

test("approvals use the joined public ID instead of an internal UUID", () => {
  const row = { request_id: uuid, restaurant_id: uuid, restaurant: { id: uuid, restaurant_id: "SPIC-AB12CD", name: "Spice Hub" } };
  const result = registration.getRegistrationRequests.transformResponse({ data: [row] })[0];
  assert.equal(result.restaurantId, "SPIC-AB12CD");
  assert.equal(result.requestId, uuid, "approval decisions must retain their request UUID");
  assert.equal(profile.getProfileEditRequests.transformResponse({ data: [row] })[0].restaurantId, "SPIC-AB12CD");
});
test("ID normalization handles public ID variants and rejects UUID-only records", () => {
  assert.equal(ids.restaurantIdFromRequest({ restaurant_id: " spic-ab12cd " }), "SPIC-AB12CD");
  assert.equal(ids.restaurantIdFromRequest({ restaurant_id: uuid, public_restaurant_id: "SPIC-AB12CD" }), "SPIC-AB12CD");
  assert.equal(ids.restaurantIdFromRequest({ restaurant: { id: "SPIC-AB12CD" } }), "SPIC-AB12CD");
  assert.equal(ids.restaurantIdFromRequest({ restaurant_id: uuid, restaurant: { id: uuid } }), "");
});
test("details query sends only public IDs and never makes UUID-based requests", async () => {
  const requests = [];
  const baseQuery = async (url) => { requests.push(url); return { data: { data: { id: uuid, name: "Spice Hub" } } }; };
  const query = registration.getRestaurantReview.queryFn;
  const result = await query(" spic-ab12cd ", {}, {}, baseQuery);
  assert.equal(result.data.name, "Spice Hub");
  assert.deepEqual(requests, ["/restaurants/SPIC-AB12CD"]);
  const invalid = await query(uuid, {}, {}, baseQuery);
  assert.equal(invalid.error.status, "CUSTOM_ERROR");
  assert.equal(requests.length, 1);
});
