import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { crosslyApiRequest } from '../Crossly/GenericFunctions';
import { crosslyEvents } from './events';
import { verifyCrosslySignature } from './signature';

interface CrosslyWebhookRow {
	id: string;
	url: string;
}

export class CrosslyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crossly Trigger',
		name: 'crosslyTrigger',
		icon: { light: 'file:../../icons/crossly.svg', dark: 'file:../../icons/crossly.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Crossly sends a webhook event (sales, orders, offers, listings, stock)',
		defaults: { name: 'Crossly Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'crosslyApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: crosslyEvents,
				required: true,
				default: [],
				description: 'The Crossly events to listen to',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Output Data Only',
						name: 'dataOnly',
						type: 'boolean',
						default: false,
						description:
							'Whether to output only the event payload (data) instead of the whole envelope (ID, type, created, data)',
					},
					{
						displayName: 'Verify Signature',
						name: 'verifySignature',
						type: 'boolean',
						default: true,
						description:
							'Whether to reject deliveries whose Crossly-Signature does not match the secret Crossly returned when this trigger subscribed',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return false;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const response = (await crosslyApiRequest.call(this, 'GET', '/v1/webhooks')) as IDataObject;
				const rows = ((response.data ?? response.webhooks ?? []) as unknown) as CrosslyWebhookRow[];
				const found = rows.some((row) => row.id === staticData.webhookId && row.url === webhookUrl);
				if (!found) {
					delete staticData.webhookId;
					delete staticData.webhookSecret;
				}
				return found;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const response = (await crosslyApiRequest.call(this, 'POST', '/v1/webhooks', {
					url: webhookUrl,
					events,
					description: `n8n workflow ${this.getWorkflow().id ?? ''}`.trim(),
				})) as IDataObject;
				if (!response.id) return false;
				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = response.id;
				staticData.webhookSecret = response.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.webhookId) {
					try {
						await crosslyApiRequest.call(this, 'DELETE', `/v1/webhooks/${encodeURIComponent(String(staticData.webhookId))}`);
					} catch (error) {
						this.logger.warn(`Crossly Trigger: could not delete webhook ${String(staticData.webhookId)}: ${(error as Error).message}`);
						return false;
					}
					delete staticData.webhookId;
					delete staticData.webhookSecret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const req = this.getRequestObject();
		const body = this.getBodyData() as IDataObject;
		const staticData = this.getWorkflowStaticData('node');
		const secret = staticData.webhookSecret as string | undefined;

		if (options.verifySignature !== false && secret) {
			const headers = this.getHeaderData() as IDataObject;
			const raw = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(body));
			const check = verifyCrosslySignature(raw, headers['crossly-signature'] as string | undefined, secret);
			if (!check.valid) {
				const res = this.getResponseObject();
				res.status(401).json({ error: { code: 'invalid_signature', message: check.reason } });
				return { noWebhookResponse: true };
			}
		}

		const events = this.getNodeParameter('events') as string[];
		// test.ping reaches every endpoint whatever it subscribes to: ignore any event
		// that is not selected, so a test ping never starts the workflow.
		if (body.type && events.length && !events.includes(String(body.type))) {
			return { webhookResponse: 'ignored' };
		}

		const output = options.dataOnly ? ((body.data ?? {}) as IDataObject) : body;
		return { workflowData: [this.helpers.returnJsonArray(output)] };
	}
}
