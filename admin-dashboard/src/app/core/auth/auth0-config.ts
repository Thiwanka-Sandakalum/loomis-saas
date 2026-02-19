export const auth0Config = {
    domain: 'your-tenant.auth0.com', // Replace with your Auth0 domain
    clientId: 'your-client-id', // Replace with your Auth0 client ID
    redirectUri: window.location.origin + '/dashboard',
    audience: 'https://your-api-identifier', // Replace with your API identifier
    scope: 'openid profile email',
    responseType: 'code',
    logoutUrl: window.location.origin + '/onboarding'
};