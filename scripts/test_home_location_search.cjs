const { test } = require('node:test');
const assert = require('node:assert/strict');
const { filterProviders, coordinates, distance } = require('../theme-dawn-export/assets/home-location-search.js');
const origin = { mode: 'address', latitude: -6.77, longitude: -79.84 };
const provider = (name, latitude, city = 'Chiclayo') => ({ name, latitude, longitude: -79.84, address: `Calle 1, ${city}, Lambayeque, Perú` });

test('city search handles accents and exact city boundaries without requiring GPS', () => {
  const rows = [provider('A', null), provider('B', -6.77, 'Chiclayo Nuevo'), { ...provider('C', 0), address: 'Chiclayo, España' }];
  assert.deepEqual(filterProviders(rows, { mode: 'city', city: ' CHÍCLAYO ' }, 10).map(p => p.name), ['A']);
});
test('nearby search orders by distance and excludes unknown, invalid and distant coordinates', () => {
  const rows = [provider('Far', -7), provider('Second', -6.78), provider('Unknown', null), provider('Invalid', 100), provider('First', -6.77)];
  assert.deepEqual(filterProviders(rows, origin, 10).map(p => p.name), ['First', 'Second']);
});
test('coordinate validation accepts zero and rejects missing or invalid values', () => {
  assert.equal(coordinates(0, 0), true);
  for (const value of ['', null, undefined, 'bad', Infinity, 91]) assert.equal(coordinates(value, 0), false);
});
test('great-circle distance and radius boundary', () => {
  assert.equal(distance(origin, origin), 0);
  assert.ok(Math.abs(distance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111.195) < 0.01);
  assert.deepEqual(filterProviders([], origin, 10), []);
});
