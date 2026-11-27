import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

// Marketplace ids as the Crossly API spells them (SDK `Platform` type and the
// spec's taxonomy enum). Free text is accepted too, for marketplaces added later.
export const platformOptions: INodePropertyOptions[] = [
	{ name: 'Amazon', value: 'amazon' },
	{ name: 'Curtsy', value: 'curtsy' },
	{ name: 'Depop', value: 'depop' },
	{ name: 'eBay', value: 'ebay' },
	{ name: 'Etsy', value: 'etsy' },
	{ name: 'Facebook Marketplace', value: 'facebook' },
	{ name: 'Grailed', value: 'grailed' },
	{ name: 'Mercari', value: 'mercari' },
	{ name: 'OfferUp', value: 'offerup' },
	{ name: 'Poshmark', value: 'poshmark' },
	{ name: 'Shopify', value: 'shopify' },
	{ name: 'Vestiaire Collective', value: 'vestiaire' },
	{ name: 'Vinted', value: 'vinted' },
	{ name: 'Walmart', value: 'walmart' },
	{ name: 'Whatnot', value: 'whatnot' },
];

const conditionOptions: INodePropertyOptions[] = [
	{ name: 'Fair', value: 'fair' },
	{ name: 'Good (Used)', value: 'good_used' },
	{ name: 'Like New', value: 'like_new' },
	{ name: 'New With Tags', value: 'new_with_tags' },
	{ name: 'New Without Tags', value: 'new_without_tags' },
];

const show = (resource: string, operation: string[]) => ({
	displayOptions: { show: { resource: [resource], operation } },
});

const returnAllAndLimit = (resource: string): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		...show(resource, ['getAll']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: [resource], operation: ['getAll'], returnAll: [false] } },
	},
];

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Account', value: 'account' },
		{ name: 'Inventory Item', value: 'inventoryItem' },
		{ name: 'Listing', value: 'listing' },
		{ name: 'Offer', value: 'offer' },
		{ name: 'Order', value: 'order' },
		{ name: 'Sale', value: 'sale' },
	],
	default: 'listing',
};

const operationProperty = (resource: string, options: INodePropertyOptions[], def: string): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [resource] } },
	options,
	default: def,
});

// ── Account ──────────────────────────────────────────────────────────────
export const accountProperties: INodeProperties[] = [
	operationProperty(
		'account',
		[
			{
				name: 'Get',
				value: 'get',
				description: 'Get the authenticated account, its plan and the token scopes',
				action: 'Get the account',
			},
		],
		'get',
	),
];

// ── Listing ──────────────────────────────────────────────────────────────
const listingFields = (): INodeProperties[] => [
	{ displayName: 'Brand', name: 'brand', type: 'string', default: '' },
	{
		displayName: 'Condition',
		name: 'condition',
		type: 'options',
		options: conditionOptions,
		default: 'good_used',
	},
	{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 4 }, default: '' },
	{
		displayName: 'Image URLs',
		name: 'images',
		type: 'string',
		default: '',
		description: 'Comma-separated HTTPS image URLs. The first is the primary photo.',
	},
	{ displayName: 'Price', name: 'price', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
	{ displayName: 'Size', name: 'size', type: 'string', default: '' },
	{ displayName: 'SKU', name: 'sku', type: 'string', default: '' },
	{ displayName: 'Title', name: 'title', type: 'string', default: '' },
	{ displayName: 'Weight (Lb)', name: 'weightLb', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
	{ displayName: 'Weight (Oz)', name: 'weightOz', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
];

export const listingProperties: INodeProperties[] = [
	operationProperty(
		'listing',
		[
			{
				name: 'Create',
				value: 'create',
				description: 'Create a listing and crosspost it to marketplaces',
				action: 'Create a listing',
			},
			{
				name: 'Delist',
				value: 'delist',
				description: 'Take a listing down everywhere, or only on some marketplaces',
				action: 'Delist a listing',
			},
			{ name: 'Get', value: 'get', description: 'Get a listing with its marketplace copies', action: 'Get a listing' },
			{ name: 'Get Many', value: 'getAll', description: 'List listings', action: 'Get many listings' },
			{
				name: 'Update',
				value: 'update',
				description: 'Edit a listing and push the change to its live marketplace copies',
				action: 'Update a listing',
			},
		],
		'getAll',
	),
	{
		displayName: 'Listing ID',
		name: 'listingId',
		type: 'string',
		required: true,
		default: '',
		...show('listing', ['get', 'update', 'delist']),
	},
	{
		displayName: 'Marketplace Names or IDs',
		name: 'platforms',
		type: 'multiOptions',
		options: platformOptions,
		required: true,
		default: [],
		description: 'Marketplaces to crosspost to (1–15)',
		...show('listing', ['create']),
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		...show('listing', ['create']),
	},
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
		typeOptions: { minValue: 0 },
		required: true,
		default: 0,
		description: 'Listing price in dollars',
		...show('listing', ['create']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		...show('listing', ['create']),
		options: [
			...listingFields().filter((f) => f.name !== 'title' && f.name !== 'price'),
			{
				displayName: 'Client Reference ID',
				name: 'clientReferenceId',
				type: 'string',
				default: '',
				description:
					'Your own ID for this listing (≤100 chars). Repeating it returns the listing already made instead of a duplicate.',
			},
			{
				displayName: 'Create Inventory Item',
				name: 'createInventoryItem',
				type: 'boolean',
				default: false,
				description: 'Whether to also create the inventory item from these fields when no inventory item ID is given',
			},
			{
				displayName: 'Inventory Item ID',
				name: 'inventoryItemId',
				type: 'string',
				default: '',
				description: 'The inventory item this listing sells. Recommended, so a sale can find the listing.',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		...show('listing', ['update']),
		options: listingFields(),
	},
	{
		displayName: 'Only On Marketplace Names or IDs',
		name: 'onlyPlatforms',
		type: 'multiOptions',
		options: platformOptions,
		default: [],
		description: 'Limit the change to these marketplaces. Leave empty for every marketplace the listing is live on.',
		...show('listing', ['update', 'delist']),
	},
	...returnAllAndLimit('listing'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		...show('listing', ['getAll']),
		options: [
			{ displayName: 'Marketplace', name: 'platform', type: 'options', options: platformOptions, default: 'ebay' },
			{ displayName: 'SKU', name: 'sku', type: 'string', default: '', description: 'Exact SKU match' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', placeholder: 'active' },
			{
				displayName: 'Still Live',
				name: 'stillLive',
				type: 'boolean',
				default: true,
				description: 'Whether to return only listings still active on at least one marketplace',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Only listings carrying any of these comma-separated tags',
			},
			{
				displayName: 'Updated Since',
				name: 'updatedSince',
				type: 'dateTime',
				default: '',
				description: 'Only rows created or changed at or after this time, oldest change first',
			},
		],
	},
];

// ── Inventory item ───────────────────────────────────────────────────────
const inventoryFields = (): INodeProperties[] => [
	{ displayName: 'Brand', name: 'brand', type: 'string', default: '' },
	{
		displayName: 'Colours',
		name: 'colours',
		type: 'string',
		default: '',
		description: 'Comma-separated colours, e.g. black, navy',
	},
	{
		displayName: 'Condition',
		name: 'condition',
		type: 'options',
		options: conditionOptions,
		default: 'good_used',
	},
	{
		displayName: 'Description',
		name: 'defaultDescription',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
	},
	{
		displayName: 'Image URLs',
		name: 'images',
		type: 'string',
		default: '',
		description: 'Comma-separated HTTPS image URLs. The first is the primary photo.',
	},
	{ displayName: 'Notes', name: 'notes', type: 'string', default: '', description: 'Private notes, never crossposted' },
	{
		displayName: 'Original Price',
		name: 'originalPrice',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'MSRP / compare-at price in dollars',
	},
	{ displayName: 'Price', name: 'defaultPrice', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
	{ displayName: 'Quantity', name: 'quantity', type: 'number', typeOptions: { minValue: 0 }, default: 1 },
	{ displayName: 'Size', name: 'size', type: 'string', default: '' },
	{ displayName: 'SKU', name: 'sku', type: 'string', default: '' },
	{ displayName: 'Tags', name: 'tags', type: 'string', default: '', description: 'Comma-separated search tags' },
	{ displayName: 'Title', name: 'defaultTitle', type: 'string', default: '' },
];

export const inventoryProperties: INodeProperties[] = [
	operationProperty(
		'inventoryItem',
		[
			{ name: 'Create', value: 'create', description: 'Create an inventory item', action: 'Create an inventory item' },
			{ name: 'Get', value: 'get', description: 'Get an inventory item', action: 'Get an inventory item' },
			{ name: 'Get Many', value: 'getAll', description: 'List inventory items', action: 'Get many inventory items' },
			{
				name: 'Set Stock',
				value: 'setStock',
				description: 'Set, increase or decrease available stock; live listings follow',
				action: 'Set stock on inventory items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an inventory item (does not push to live listings)',
				action: 'Update an inventory item',
			},
		],
		'getAll',
	),
	{
		displayName: 'Inventory Item ID',
		name: 'inventoryItemId',
		type: 'string',
		required: true,
		default: '',
		...show('inventoryItem', ['get', 'update']),
	},
	{
		displayName: 'Title',
		name: 'defaultTitle',
		type: 'string',
		required: true,
		default: '',
		description: 'Item title (1–140 characters)',
		...show('inventoryItem', ['create']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		...show('inventoryItem', ['create']),
		options: inventoryFields().filter((f) => f.name !== 'defaultTitle'),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		...show('inventoryItem', ['update']),
		options: inventoryFields(),
	},
	{
		displayName: 'Inventory Item IDs',
		name: 'inventoryItemIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated inventory item IDs',
		...show('inventoryItem', ['setStock']),
	},
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		options: [
			{ name: 'Decrease', value: 'decrease' },
			{ name: 'Increase', value: 'increase' },
			{ name: 'Set', value: 'set' },
		],
		default: 'set',
		...show('inventoryItem', ['setStock']),
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'number',
		typeOptions: { minValue: 0 },
		required: true,
		default: 0,
		description: 'Available stock to set, add or subtract (reserved units of open orders are kept)',
		...show('inventoryItem', ['setStock']),
	},
	...returnAllAndLimit('inventoryItem'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		...show('inventoryItem', ['getAll']),
		options: [
			{
				displayName: 'Marketplace Mode',
				name: 'platformMode',
				type: 'options',
				options: [
					{ name: 'Listed', value: 'listed' },
					{ name: 'Not Listed', value: 'not_listed' },
				],
				default: 'listed',
				description: 'Not Listed inverts the marketplace filter: items live on none of them',
			},
			{
				displayName: 'Marketplace Names or IDs',
				name: 'platforms',
				type: 'multiOptions',
				options: platformOptions,
				default: [],
				description: 'Items live on any of these marketplaces',
			},
			{ displayName: 'SKU', name: 'sku', type: 'string', default: '', description: 'Exact SKU match' },
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Sold', value: 'sold' },
				],
				default: 'active',
			},
			{
				displayName: 'Updated Since',
				name: 'updatedSince',
				type: 'dateTime',
				default: '',
				description: 'Only rows created or changed at or after this time, oldest change first',
			},
		],
	},
];

// ── Order ────────────────────────────────────────────────────────────────
export const orderProperties: INodeProperties[] = [
	operationProperty(
		'order',
		[
			{
				name: 'Add Tracking',
				value: 'addTracking',
				description: 'Submit a tracking number and notify the marketplace',
				action: 'Add tracking to an order',
			},
			{ name: 'Get', value: 'get', description: 'Get an order', action: 'Get an order' },
			{ name: 'Get Many', value: 'getAll', description: 'List orders', action: 'Get many orders' },
			{ name: 'Update', value: 'update', description: 'Update an order status or notes', action: 'Update an order' },
		],
		'getAll',
	),
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		default: '',
		...show('order', ['get', 'update', 'addTracking']),
	},
	{
		displayName: 'Tracking Number',
		name: 'trackingNumber',
		type: 'string',
		required: true,
		default: '',
		...show('order', ['addTracking']),
	},
	{
		displayName: 'Carrier',
		name: 'carrier',
		type: 'string',
		default: '',
		placeholder: 'usps',
		description: 'Carrier code, e.g. usps, ups, fedex',
		...show('order', ['addTracking']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		...show('order', ['addTracking']),
		options: [{ displayName: 'Tracking URL', name: 'trackingUrl', type: 'string', default: '' }],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		...show('order', ['update']),
		options: [
			{ displayName: 'Notes', name: 'notes', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', placeholder: 'shipped' },
		],
	},
	...returnAllAndLimit('order'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		...show('order', ['getAll']),
		options: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				options: [
					{ name: 'Auction', value: 'auction' },
					{ name: 'Live', value: 'live' },
					{ name: 'POS', value: 'pos' },
					{ name: 'Rental', value: 'rental' },
					{ name: 'Retail', value: 'retail' },
					{ name: 'Wholesale', value: 'wholesale' },
					{ name: 'World', value: 'world' },
				],
				default: 'retail',
			},
			{ displayName: 'Marketplace', name: 'platform', type: 'options', options: platformOptions, default: 'ebay' },
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				placeholder: 'needs_fulfillment',
				description: 'Exact match, e.g. needs_fulfillment, shipped, delivered, refunded, disputed',
			},
			{
				displayName: 'Updated Since',
				name: 'updatedSince',
				type: 'dateTime',
				default: '',
				description: 'Only orders created or changed at or after this time',
			},
		],
	},
];

// ── Sale ─────────────────────────────────────────────────────────────────
export const saleProperties: INodeProperties[] = [
	operationProperty(
		'sale',
		[{ name: 'Get Many', value: 'getAll', description: 'List sales, newest first', action: 'Get many sales' }],
		'getAll',
	),
	...returnAllAndLimit('sale'),
];

// ── Offer ────────────────────────────────────────────────────────────────
export const offerProperties: INodeProperties[] = [
	operationProperty(
		'offer',
		[
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List buyer offers on your Crossly marketplace listings',
				action: 'Get many offers',
			},
			{
				name: 'Respond',
				value: 'respond',
				description: 'Accept, decline or counter a Crossly marketplace offer',
				action: 'Respond to an offer',
			},
		],
		'getAll',
	),
	{
		displayName: 'Offer ID',
		name: 'offerId',
		type: 'string',
		required: true,
		default: '',
		...show('offer', ['respond']),
	},
	{
		displayName: 'Response',
		name: 'action',
		type: 'options',
		options: [
			{ name: 'Accept', value: 'accept' },
			{ name: 'Counter', value: 'counter' },
			{ name: 'Decline', value: 'decline' },
		],
		default: 'accept',
		...show('offer', ['respond']),
	},
	{
		displayName: 'Counter Amount (Cents)',
		name: 'counterCents',
		type: 'number',
		typeOptions: { minValue: 1 },
		required: true,
		default: 0,
		description: 'Your counter offer in cents, e.g. 8900 for $89.00',
		displayOptions: { show: { resource: ['offer'], operation: ['respond'], action: ['counter'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		...show('offer', ['getAll']),
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		...show('offer', ['getAll']),
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Accepted', value: 'accepted' },
					{ name: 'Countered', value: 'countered' },
					{ name: 'Declined', value: 'declined' },
					{ name: 'Expired', value: 'expired' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Withdrawn', value: 'withdrawn' },
				],
				default: 'pending',
			},
		],
	},
];
