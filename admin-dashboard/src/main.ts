import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { provideAuth0 } from '@auth0/auth0-angular';
import { mergeApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { environment } from './environments/environment';
import { App } from './app/app';
import { initializeAuth } from './app/core/auth/auth-initializer';

// Validate Auth0 configuration
if (!environment.auth0.domain || !environment.auth0.clientId) {
  console.error("Auth0 configuration missing. Please check your environment.ts file.");
  console.error("Required environment variables:");
  console.error("- auth0.domain");
  console.error("- auth0.clientId");
  throw new Error("Auth0 domain and client ID must be set in environment.ts file");
}

// Validate domain format
if (!environment.auth0.domain.includes('.auth0.com') &&
  !environment.auth0.domain.includes('.us.auth0.com') &&
  !environment.auth0.domain.includes('.eu.auth0.com') &&
  !environment.auth0.domain.includes('.au.auth0.com')) {
  console.warn("Auth0 domain format might be incorrect. Expected format: your-domain.auth0.com");
}

const auth0Config = mergeApplicationConfig(appConfig, {
  providers: [
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: environment.auth0.redirectUri,
        audience: environment.auth0.audience,
        scope: environment.auth0.scope
      },
      httpInterceptor: {
        allowedList: [
          `${environment.apiUrl}/*`
        ]
      },
      // CRITICAL: Store tokens in localStorage to persist across page reloads
      cacheLocation: 'localstorage',
      // Enable refresh token rotation for better security
      useRefreshTokens: true,
      // Silently check for authentication on app load
      skipRedirectCallback: window.location.pathname === '/login'
    }),
    // Add app initializer to ensure Auth0 is ready before app starts
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true
    }
  ]
});

bootstrapApplication(App, auth0Config).catch((err) =>
  console.error(err)
);
