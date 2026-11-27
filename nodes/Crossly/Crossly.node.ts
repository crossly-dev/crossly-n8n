import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	accountProperties,
	inventoryProperties,
	listingProperties,
	offerProperties,
	orderProperties,
	resourceProperty,
	saleProperties,
} from './descriptions';
import {
	compact,
	crosslyApiRequest,
	crosslyApiRequestAllItems,
	idempotencyKey,
	splitList,
} from './GenericFunctions';

const LIST_FIELDS = new Set(['images', 'colors', 'tags']);
// n8n reserves the parameter name `color` for colour pickers; the API field is `color`.
const RENAMED_FIELDS: Record<string, string> = { colors: 'color' };

function toBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [key, value] of Object.entries(compact(fields))) {
		body[RENAMED_FIELDS[key] ?? key] = LIST_FIELDS.has(key) ? splitList(value) : value;
	}
	return body;
}

function toQuery(filters: IDataObject): IDataObject {
	const qs: IDataObject = {};
	for (const [key, value] of Object.entries(compact(filters))) {
		qs[key] = Array.isArray(value) ? value.join(',') : value;
	}
	return qs;
}

const enc = encodeURIComponent;

export class Crossly implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crossly',
		name: 'crossly',
		icon: { light: 'file:../../icons/crossly.svg', dark: 'file:../../icons/crossly.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Crosspost listings, sync inventory and handle orders and offers with Crossly',
		defaults: { name: 'Crossly' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'crosslyApi', required: true }],
		properties: [
			resourceProperty,
			...accountProperties,
			...inventoryProperties,
			...listingProperties,
			...offerProperties,
			...orderProperties,
			...saleProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let response: IDataObject | IDataObject[];

				const getMany = async (endpoint: string, qs: IDataObject) => {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const max = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);
					return crosslyApiRequestAllItems.call(this, endpoint, qs, max);
				};

				if (resource === 'account') {
					response = await crosslyApiRequest.call(this, 'GET', '/v1/me');
				} else if (resource === 'listing') {
					if (operation === 'get') {
						const id = this.getNodeParameter('listingId', i) as string;
						response = await crosslyApiRequest.call(this, 'GET', `/v1/listings/${enc(id)}`);
					} else if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						response = await getMany('/v1/listings', toQuery(filters));
					} else if (operation === 'create') {
						const platforms = this.getNodeParameter('platforms', i) as string[];
						if (!platforms.length) {
							throw new NodeOperationError(this.getNode(), 'Pick at least one marketplace', {
								itemIndex: i,
							});
						}
						const extra = { ...(this.getNodeParameter('additionalFields', i) as IDataObject) };
						const top: IDataObject = {};
						for (const key of ['inventoryItemId', 'createInventoryItem', 'clientReferenceId']) {
							if (extra[key] !== undefined && extra[key] !== '') top[key] = extra[key];
							delete extra[key];
						}
						const data = toBody({
							...extra,
							title: this.getNodeParameter('title', i) as string,
							price: this.getNodeParameter('price', i) as number,
						});
						response = await crosslyApiRequest.call(
							this,
							'POST',
							'/v1/listings',
							{ platforms, data, ...top },
							undefined,
							idempotencyKey(),
						);
					} else if (operation === 'update') {
						const id = this.getNodeParameter('listingId', i) as string;
						const changes = toBody(this.getNodeParameter('updateFields', i) as IDataObject);
						if (!Object.keys(changes).length) {
							throw new NodeOperationError(this.getNode(), 'Add at least one field to update', {
								itemIndex: i,
							});
						}
						const platforms = this.getNodeParameter('onlyPlatforms', i) as string[];
						const body: IDataObject = { changes };
						if (platforms.length) body.platforms = platforms;
						response = await crosslyApiRequest.call(this, 'PATCH', `/v1/listings/${enc(id)}`, body);
					} else if (operation === 'delist') {
						const id = this.getNodeParameter('listingId', i) as string;
						const platforms = this.getNodeParameter('onlyPlatforms', i) as string[];
						const qs: IDataObject = platforms.length ? { platforms: platforms.join(',') } : {};
						response = await crosslyApiRequest.call(this, 'DELETE', `/v1/listings/${enc(id)}`, undefined, qs);
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
					}
				} else if (resource === 'inventoryItem') {
					if (operation === 'get') {
						const id = this.getNodeParameter('inventoryItemId', i) as string;
						response = await crosslyApiRequest.call(this, 'GET', `/v1/inventory/${enc(id)}`);
					} else if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						response = await getMany('/v1/inventory', toQuery(filters));
					} else if (operation === 'create') {
						const body = toBody({
							...(this.getNodeParameter('additionalFields', i) as IDataObject),
							defaultTitle: this.getNodeParameter('defaultTitle', i) as string,
						});
						response = await crosslyApiRequest.call(
							this,
							'POST',
							'/v1/inventory',
							body,
							undefined,
							idempotencyKey(),
						);
					} else if (operation === 'update') {
						const id = this.getNodeParameter('inventoryItemId', i) as string;
						const body = toBody(this.getNodeParameter('updateFields', i) as IDataObject);
						if (!Object.keys(body).length) {
							throw new NodeOperationError(this.getNode(), 'Add at least one field to update', {
								itemIndex: i,
							});
						}
						response = await crosslyApiRequest.call(this, 'PATCH', `/v1/inventory/${enc(id)}`, body);
					} else if (operation === 'setStock') {
						const ids = splitList(this.getNodeParameter('inventoryItemIds', i));
						if (!ids.length) {
							throw new NodeOperationError(this.getNode(), 'Give at least one inventory item ID', {
								itemIndex: i,
							});
						}
						response = await crosslyApiRequest.call(this, 'POST', '/v1/inventory/bulk-quantity', {
							ids,
							mode: this.getNodeParameter('mode', i) as string,
							value: this.getNodeParameter('value', i) as number,
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
					}
				} else if (resource === 'order') {
					if (operation === 'get') {
						const id = this.getNodeParameter('orderId', i) as string;
						response = await crosslyApiRequest.call(this, 'GET', `/v1/orders/${enc(id)}`);
					} else if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						response = await getMany('/v1/orders', toQuery(filters));
					} else if (operation === 'update') {
						const id = this.getNodeParameter('orderId', i) as string;
						const body = compact(this.getNodeParameter('updateFields', i) as IDataObject);
						if (!Object.keys(body).length) {
							throw new NodeOperationError(this.getNode(), 'Add at least one field to update', {
								itemIndex: i,
							});
						}
						response = await crosslyApiRequest.call(this, 'PATCH', `/v1/orders/${enc(id)}`, body);
					} else if (operation === 'addTracking') {
						const id = this.getNodeParameter('orderId', i) as string;
						const body = compact({
							trackingNumber: this.getNodeParameter('trackingNumber', i) as string,
							carrier: this.getNodeParameter('carrier', i) as string,
							...(this.getNodeParameter('additionalFields', i) as IDataObject),
						});
						response = await crosslyApiRequest.call(this, 'POST', `/v1/orders/${enc(id)}/tracking`, body);
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
					}
				} else if (resource === 'sale') {
					response = await getMany('/v1/sales', {});
				} else if (resource === 'offer') {
					if (operation === 'getAll') {
						const qs = toQuery(this.getNodeParameter('filters', i) as IDataObject);
						qs.limit = this.getNodeParameter('limit', i) as number;
						const result = (await crosslyApiRequest.call(this, 'GET', '/v1/offers', undefined, qs)) as IDataObject;
						response = (result.offers ?? []) as IDataObject[];
					} else if (operation === 'respond') {
						const id = this.getNodeParameter('offerId', i) as string;
						const action = this.getNodeParameter('action', i) as string;
						const body: IDataObject = { action };
						if (action === 'counter') body.counterCents = this.getNodeParameter('counterCents', i) as number;
						response = await crosslyApiRequest.call(this, 'POST', `/v1/offers/${enc(id)}/respond`, body);
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError || error instanceof NodeOperationError) throw error;
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
