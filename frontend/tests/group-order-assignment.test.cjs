const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(relative, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features', relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => { if (name in deps) return deps[name]; throw new Error(name); }, exports);
  return exports;
}
const ids = load('restaurants/api/restaurantId.ts');
let endpoints;
const baseApi = { injectEndpoints({ endpoints: configure }) { endpoints = configure({ query: c => c, mutation: c => c }); return {}; } };
const api = load('orders/api/groupOrdersApi.ts', { '../../admin/api/baseApi': { baseApi }, '../../restaurants/api/restaurantId': ids });
const uuid = '516f39ed-c2b0-4520-a716-d2da934a70e3';
const assignment = endpoints.assignGroupOrderRestaurant;
test('updated admin response preserves the display number and posts its public grp_ord_id', async () => {
  const response = { success: true, data: { group_orders: [{
    id: '8a0e3d08-30cd-485f-a97e-3ec1676026c0', grp_ord_id: 'GRP-D299KB',
    contact_name: 'Test customer', group_size: 100, order_details: 'Lunch for 100',
    status: 'PENDING', restaurant_id: null, created_at: '2026-10-27T11:14:16.523Z',
  }] } };
  const order = api.normalizeGroupOrders(response)[0];
  assert.equal(order.requestNumber, 'GRP-D299KB');
  assert.equal(order.uuid, response.data.group_orders[0].id);
  assert.equal(order.restaurantId, null);
  let posted;
  await assignment.queryFn({ grpOrdId: order.requestNumber, restaurantId: 'CHAR-91HKOM' }, {}, {}, async args => { posted = args; return { data: { success: true } }; });
  assert.equal(posted.url, '/orders/group-orders/GRP-D299KB/restaurant');
  assert.deepEqual(posted.body, { restaurant_id: 'CHAR-91HKOM' });
});
test('normalizes backend UUID fields without confusing restaurant IDs or display keys', () => {
  for (const field of ['uuid', 'id', 'group_order_id']) {
    const row = api.normalizeGroupOrders({ data: { group_orders: [{ [field]: uuid, restaurant_id: 'CHAR-91HKOM' }] } })[0];
    assert.equal(row.uuid, uuid); assert.equal(row.key, uuid);
  }
  assert.equal(api.normalizeGroupOrders({ data: [{ group_order_id: 'GROUP123', restaurant_id: 'CHAR-91HKOM' }] })[0].uuid, null);
});
test('assignment posts public grp_ord_id in URL and public restaurant ID in body', async () => {
  const calls = [];
  const result = await assignment.queryFn({ grpOrdId: 'GRP-D299KB', restaurantId: 'CHAR-91HKOM' }, {}, {}, async args => { calls.push(args); return { data: { success: true } }; });
  assert(!result.error);
  assert.deepEqual(calls, [{ url: '/orders/group-orders/GRP-D299KB/restaurant', method: 'POST', body: { restaurant_id: 'CHAR-91HKOM' } }]);
  assert.deepEqual(assignment.invalidatesTags(undefined, undefined), [{ type: 'Order', id: 'GROUP_LIST' }]);
});
test('rejects swapped identifier types without calling the backend', async () => {
  let calls = 0;
  const result = await assignment.queryFn({ grpOrdId: uuid, restaurantId: 'CHAR-91HKOM' }, {}, {}, async () => { calls++; });
  assert.equal(result.error.status, 'CUSTOM_ERROR'); assert.equal(calls, 0);
});
test('propagates failed assignments and does not invalidate successful records on errors', async () => {
  const args = { grpOrdId: 'GRP-D299KB', restaurantId: 'CHAR-91HKOM' };
  const error = { status: 400, data: { message: 'Invalid restaurant' } };
  assert.deepEqual((await assignment.queryFn(args, {}, {}, async () => ({ error }))).error, error);
  const rejected = await assignment.queryFn(args, {}, {}, async () => ({ data: { success: false, message: 'Already assigned' } }));
  assert.equal(rejected.error.error, 'Already assigned');
  assert.deepEqual(assignment.invalidatesTags(undefined, error), []);
});

test('assignment sends selected menu items as restaurant_menu_items_id', async () => {
  const calls = [];
  const menuItemId = '550e8400-e29b-41d4-a716-446655440000';
  await assignment.queryFn({ grpOrdId: 'GRP-D299KB', restaurantId: 'CHAR-91HKOM', items: [{ menuItemId, quantity: 4 }] }, {}, {}, async args => { calls.push(args); return { data: { success: true } }; });
  assert.deepEqual(calls[0].body, { restaurant_id: 'CHAR-91HKOM', restaurant_menu_items_id: [{ restaurant_menu_item_id: menuItemId, quantity: 4 }] });
});
test('assignment refuses invalid menu item IDs or quantities', async () => {
  let calls = 0;
  for (const items of [[{ menuItemId: 'not-a-uuid', quantity: 1 }], [{ menuItemId: '550e8400-e29b-41d4-a716-446655440000', quantity: 0 }]]) {
    const result = await assignment.queryFn({ grpOrdId: 'GRP-D299KB', restaurantId: 'CHAR-91HKOM', items }, {}, {}, async () => { calls++; });
    assert.ok(result.error);
  }
  assert.equal(calls, 0);
});
