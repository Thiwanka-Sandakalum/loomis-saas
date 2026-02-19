export const environment = {
    production: true,
    apiUrl: 'http://localhost:5246',
    wsUrl: 'ws://localhost:5246',
    auth0: {
        audience: 'https://loomis-main-srv/',
        domain: 'dev-dtn8wjllia6xrmrl.us.auth0.com',
        clientId: 'nbtzmy2WVNIKzQ5oLlDjKvZ5cknwudau',
        redirectUri: window.location.origin,
        scope: 'openid profile email'
    }
}
