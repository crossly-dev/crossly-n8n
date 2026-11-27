// Generated from the Crossly webhook event catalog: https://crossly.net/docs/api-webhooks#event-catalog
import type { INodePropertyOptions } from 'n8n-workflow';

export const crosslyEvents: INodePropertyOptions[] = [
	{
		name: 'Automation Failed',
		value: 'automation.failed',
		description: 'An automation run failed.',
	},
	{
		name: 'Buyer Address Available',
		value: 'order.address_available',
		description: 'The buyer\'s shipping address arrived after the order was created: name, address and phone, ready to ship.',
	},
	{
		name: 'Connection Lost',
		value: 'connection.disconnected',
		description: 'A platform session died; syncing for it has stopped until you reconnect.',
	},
	{
		name: 'Listing Created',
		value: 'listing.created',
		description: 'A listing was published on a platform.',
	},
	{
		name: 'Listing Delisted',
		value: 'listing.delisted',
		description: 'A platform listing came down, on request or reported gone by the marketplace.',
	},
	{
		name: 'Message Received',
		value: 'message.received',
		description: 'A buyer sent you a message.',
	},
	{
		name: 'Offer Accepted',
		value: 'offer.accepted',
		description: 'An offer was accepted, by you or an auto-respond rule.',
	},
	{
		name: 'Offer Countered',
		value: 'offer.countered',
		description: 'An offer was countered.',
	},
	{
		name: 'Offer Declined',
		value: 'offer.declined',
		description: 'An offer was declined.',
	},
	{
		name: 'Offer Received',
		value: 'offer.received',
		description: 'A buyer made an offer.',
	},
	{
		name: 'Order Cancelled',
		value: 'order.cancelled',
		description: 'An order was cancelled before it shipped.',
	},
	{
		name: 'Order Created',
		value: 'order.created',
		description: 'An order was created from a sale.',
	},
	{
		name: 'Order Delivered',
		value: 'order.delivered',
		description: 'The carrier reports the package delivered.',
	},
	{
		name: 'Order Refunded',
		value: 'order.refunded',
		description: 'An order was refunded, in full or in part: the amount, the running total and whether anything is left.',
	},
	{
		name: 'Order Shipped',
		value: 'order.shipped',
		description: 'The order shipped: marked shipped, or the carrier\'s first in-network scan. Once per order.',
	},
	{
		name: 'Price Changed',
		value: 'listing.price_changed',
		description: 'A listing price changed, from any path: editor, repricer, API or bulk edit.',
	},
	{
		name: 'Refund Issued',
		value: 'refund.issued',
		description: 'A refund was issued on a platform.',
	},
	{
		name: 'Return Requested',
		value: 'return.requested',
		description: 'A Crossly-marketplace buyer asked to return an order: the reason, their note and photos.',
	},
	{
		name: 'Return Resolved',
		value: 'return.resolved',
		description: 'A return request closed: refunded in full or in part, no refund, or withdrawn by the buyer.',
	},
	{
		name: 'Sale Detected',
		value: 'sale.detected',
		description: 'A new sale was detected on any platform.',
	},
	{
		name: 'Stock Changed',
		value: 'inventory.quantity_changed',
		description: 'An item\'s stock changed, from any path (a sale, a cancellation, a return, an edit, the API): the counts after the change, and soldOut when none are left.',
	},
];
