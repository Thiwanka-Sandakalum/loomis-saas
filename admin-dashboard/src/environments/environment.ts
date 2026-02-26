export const environment = {
    production: true,
    apiUrl: 'http://0.0.0.0:8080',
    wsUrl: 'ws://0.0.0.0:8080',
    brainApiUrl: 'https://brain-service-905498284628.us-central1.run.app', // Use proxy to avoid CORS issues
    apiKey: 'cmp_live_680fm01pjn8lcyk2wjkfsk4u39qie79q', // Default tenant API key for sandbox
    auth0: {
        audience: 'https://loomis-main-srv/',
        domain: 'dev-dtn8wjllia6xrmrl.us.auth0.com',
        clientId: 'nbtzmy2WVNIKzQ5oLlDjKvZ5cknwudau',
        redirectUri: window.location.origin,
        scope: 'openid profile email'
    }
};
