export const environment = {
    production: true,
    apiUrl: 'http://0.0.0.0:8080',
    wsUrl: 'wss://lomis-main-core-905498284628.europe-west1.run.app',
    brainApiUrl: 'http://thiwa-ThinkPad-T460s:8000', // Use proxy to avoid CORS issues
    apiKey: 'cmp_live_680fm01pjn8lcyk2wjkfsk4u39qie79q', // Default tenant API key for sandbox
    auth0: {
        audience: 'https://loomis-main-srv/',
        domain: 'dev-dtn8wjllia6xrmrl.us.auth0.com',
        clientId: 'nbtzmy2WVNIKzQ5oLlDjKvZ5cknwudau',
        redirectUri: window.location.origin,
        scope: 'openid profile email'
    }
};
