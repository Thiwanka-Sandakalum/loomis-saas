export const environment = {
    production: true,
    apiUrl: 'https://lomis-main-core-905498284628.europe-west1.run.app',
    wsUrl: 'wss://lomis-main-core-905498284628.europe-west1.run.app',
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
