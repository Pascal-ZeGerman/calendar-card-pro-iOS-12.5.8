var assert = require('assert');
require('./setup-globals');
var fns = require('../src-lite/calendar-card-pro.js');
var normaliseEntities = fns.normaliseEntities;

/* String entities are accepted */
var result = normaliseEntities(['calendar.home', 'calendar.work']);
assert.strictEqual(result.length, 2, 'two string entities produce two entries');
assert.strictEqual(result[0].entity, 'calendar.home', 'string entity preserved');
assert.strictEqual(result[0].color, null, 'color defaults to null');
assert.strictEqual(result[0].label, null, 'label defaults to null');

/* Object entities with valid .entity property are accepted */
var objResult = normaliseEntities([{ entity: 'calendar.home', color: '#f00', label: 'Home' }]);
assert.strictEqual(objResult.length, 1, 'valid object entity accepted');
assert.strictEqual(objResult[0].entity, 'calendar.home', 'entity field preserved');
assert.strictEqual(objResult[0].color, '#f00', 'color preserved');
assert.strictEqual(objResult[0].label, 'Home', 'label preserved');

/* Object missing .entity is filtered out */
var badObj = normaliseEntities([{ color: '#f00' }]);
assert.strictEqual(badObj.length, 0, 'object without .entity filtered out');

/* Object with non-string .entity is filtered out */
var numEntity = normaliseEntities([{ entity: 42 }]);
assert.strictEqual(numEntity.length, 0, 'non-string entity value filtered out');

/* Empty string entity is filtered out */
var emptyStr = normaliseEntities(['']);
assert.strictEqual(emptyStr.length, 0, 'empty string entity filtered out');

/* Null entries are filtered out */
var withNull = normaliseEntities([null, 'calendar.home']);
assert.strictEqual(withNull.length, 1, 'null entry filtered, valid string kept');
assert.strictEqual(withNull[0].entity, 'calendar.home', 'valid entry survives');

/* Mixed valid and invalid entries */
var mixed = normaliseEntities([
  'calendar.a',
  { entity: 'calendar.b', color: '#00f' },
  { missing: true },
  null,
  ''
]);
assert.strictEqual(mixed.length, 2, 'only valid entries survive mixed array');

/* null/undefined input returns empty array */
assert.deepStrictEqual(normaliseEntities(null), [], 'null input returns []');
assert.deepStrictEqual(normaliseEntities(undefined), [], 'undefined input returns []');

console.log('PASS: all normaliseEntities tests');
