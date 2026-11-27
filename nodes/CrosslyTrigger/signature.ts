import { createHmac, timingSafeEqual } from 'crypto';

/** Five minutes, as the Crossly webhook docs recommend. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

export type SignatureCheck =
	| { valid: true }
	| { valid: false; reason: 'missing_header' | 'malformed_header' | 'stale_timestamp' | 'bad_signature' };

/**
 * Verifies `Crossly-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "t.rawBody">`.
 *
 * `rawBody` must be the exact bytes received: a parsed-then-restringified body
 * does not round-trip and will not verify. The header is parsed field by field
 * so a future `v2=` next to `v1=` keeps working.
 */
export function verifyCrosslySignature(
	rawBody: string | Buffer,
	header: string | undefined,
	secret: string,
	nowSeconds: number = Math.floor(Date.now() / 1000),
	toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): SignatureCheck {
	if (!header) return { valid: false, reason: 'missing_header' };

	let t: number | undefined;
	let v1: string | undefined;
	for (const part of header.split(',')) {
		const eq = part.indexOf('=');
		if (eq === -1) continue;
		const key = part.slice(0, eq).trim();
		const value = part.slice(eq + 1).trim();
		if (key === 't' && /^\d+$/.test(value)) t = Number(value);
		else if (key === 'v1' && /^[0-9a-f]+$/i.test(value)) v1 = value.toLowerCase();
	}
	if (t === undefined || !v1) return { valid: false, reason: 'malformed_header' };
	if (Math.abs(nowSeconds - t) > toleranceSeconds) return { valid: false, reason: 'stale_timestamp' };

	const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
	const expected = createHmac('sha256', secret)
		.update(Buffer.concat([Buffer.from(`${t}.`, 'utf8'), body]))
		.digest();
	const given = Buffer.from(v1, 'hex');
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
		return { valid: false, reason: 'bad_signature' };
	}
	return { valid: true };
}
