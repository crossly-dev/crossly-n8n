// Runs against the compiled output: `npm run build && npm test`.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { verifyCrosslySignature } = require('../dist/nodes/CrosslyTrigger/signature.js');

const secret = 'whsec_test_secret';
const body = '{"id":"9c3e1a2b-4d5f-6789-abcd-ef0123456789","type":"sale.detected","created":"2026-05-22T19:08:42.110Z","data":{"salePrice":84.0}}';
const t = 1779476922;
const sign = (ts, raw, key = secret) => createHmac('sha256', key).update(`${ts}.${raw}`).digest('hex');

test('accepts a genuine delivery', () => {
	assert.deepEqual(verifyCrosslySignature(body, `t=${t},v1=${sign(t, body)}`, secret, t + 10), { valid: true });
});

test('accepts a Buffer body and extra signature versions', () => {
	const header = `t=${t}, v1=${sign(t, body)}, v2=abcdef`;
	assert.equal(verifyCrosslySignature(Buffer.from(body), header, secret, t).valid, true);
});

test('rejects a re-serialised body', () => {
	const reserialised = JSON.stringify(JSON.parse(body));
	assert.notEqual(reserialised, body);
	assert.equal(verifyCrosslySignature(reserialised, `t=${t},v1=${sign(t, body)}`, secret, t).reason, 'bad_signature');
});

test('rejects the wrong secret', () => {
	assert.equal(
		verifyCrosslySignature(body, `t=${t},v1=${sign(t, body, 'other')}`, secret, t).reason,
		'bad_signature',
	);
});

test('rejects a stale timestamp (replay)', () => {
	assert.equal(verifyCrosslySignature(body, `t=${t},v1=${sign(t, body)}`, secret, t + 301).reason, 'stale_timestamp');
});

test('rejects missing and malformed headers', () => {
	assert.equal(verifyCrosslySignature(body, undefined, secret, t).reason, 'missing_header');
	assert.equal(verifyCrosslySignature(body, 'garbage', secret, t).reason, 'malformed_header');
	assert.equal(verifyCrosslySignature(body, `t=${t},v1=zz`, secret, t).reason, 'malformed_header');
	assert.equal(verifyCrosslySignature(body, `t=${t},v1=abcd`, secret, t).reason, 'bad_signature');
});
