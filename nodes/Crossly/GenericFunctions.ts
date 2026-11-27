import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

type CrosslyContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions;

const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_RETRY_AFTER_SECONDS = 60;
const PAGE_LIMIT = 100;

function headerValue(headers: IDataObject | undefined, name: string): string | undefined {
	if (!headers) return undefined;
	const wanted = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === wanted) return Array.isArray(value) ? String(value[0]) : String(value);
	}
	return undefined;
}

/**
 * One authenticated call to the Crossly API.
 *
 * A 429 is retried up to three times after the server's `Retry-After` (capped at
 * 60 s). Any other error is surfaced with Crossly's `{ error: { code, message } }`
 * envelope and the `correlationId` support asks for.
 */
export async function crosslyApiRequest(
	this: CrosslyContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
	extraHeaders?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('crosslyApi');
	const baseUrl = String(credentials.baseUrl || 'https://crossly.net/api').replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
		headers: { Accept: 'application/json', ...(extraHeaders ?? {}) },
	};
	if (qs && Object.keys(qs).length) options.qs = qs;
	if (body !== undefined) options.body = body;

	for (let attempt = 0; ; attempt++) {
		try {
			return await this.helpers.httpRequestWithAuthentication.call(this, 'crosslyApi', options);
		} catch (error) {
			const response = (error as JsonObject).response as IDataObject | undefined;
			const status = Number(
				(error as JsonObject).httpCode ?? response?.status ?? (error as JsonObject).statusCode ?? 0,
			);
			if (status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
				const retryAfter = Number(headerValue(response?.headers as IDataObject, 'retry-after'));
				const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt * 5;
				await sleep(Math.min(waitSeconds, MAX_RETRY_AFTER_SECONDS) * 1000);
				continue;
			}
			const envelope = (response?.body ?? response?.data) as IDataObject | undefined;
			const apiError = envelope?.error as IDataObject | undefined;
			const message = apiError?.message ? String(apiError.message) : undefined;
			const code = apiError?.code ? String(apiError.code) : undefined;
			const correlationId = envelope?.correlationId ? String(envelope.correlationId) : undefined;
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: message ?? undefined,
				description: [code && `Code: ${code}`, correlationId && `Correlation ID: ${correlationId}`]
					.filter(Boolean)
					.join(' · ') || undefined,
			});
		}
	}
}

/**
 * Walks a page/limit list (`{ data, pagination }`) until a short page, or until
 * `max` items are collected. Several Crossly lists omit `total`, so the end is
 * detected by `data.length < limit`, as the pagination docs recommend.
 */
export async function crosslyApiRequestAllItems(
	this: CrosslyContext,
	endpoint: string,
	qs: IDataObject = {},
	max?: number,
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];
	const limit = max !== undefined ? Math.min(PAGE_LIMIT, Math.max(1, max)) : PAGE_LIMIT;
	for (let page = 1; ; page++) {
		const response = (await crosslyApiRequest.call(this, 'GET', endpoint, undefined, {
			...qs,
			page,
			limit,
		})) as IDataObject;
		const data = (response?.data ?? []) as IDataObject[];
		results.push(...data);
		if (max !== undefined && results.length >= max) return results.slice(0, max);
		if (data.length < limit) return results;
	}
}

export function splitList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
	if (typeof value !== 'string') return [];
	return value
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
}

/** Drops keys whose value is an empty string, so optional fields are not sent blank. */
export function compact(fields: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		if (value === '' || value === undefined || value === null) continue;
		out[key] = value;
	}
	return out;
}

export function idempotencyKey(): IDataObject {
	const hex = (n: number) =>
		Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
	return { 'Idempotency-Key': `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}` };
}
