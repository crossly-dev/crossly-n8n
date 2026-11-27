import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CrosslyApi implements ICredentialType {
	name = 'crosslyApi';

	displayName = 'Crossly API';

	icon: Icon = { light: 'file:../icons/crossly.svg', dark: 'file:../icons/crossly.dark.svg' };

	documentationUrl = 'https://crossly.net/docs/api-authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'crossly_pat_live_…',
			description:
				'A Crossly personal access token (Settings → API & webhooks). Grant the scopes your workflows need, e.g. listings:write, inventory:write, orders:write, webhooks:write.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://crossly.net/api',
			description: 'The Crossly API base URL. Leave the default unless Crossly support tells you otherwise.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/me',
		},
	};
}
