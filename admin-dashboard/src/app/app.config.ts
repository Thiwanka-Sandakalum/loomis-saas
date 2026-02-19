import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { authHttpInterceptorFn } from '@auth0/auth0-angular';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error-handler';
import { provideApi } from './core/api-client/provide-api';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        loggingInterceptor,    // Log all requests/responses
        authHttpInterceptorFn, // Auth0 JWT injection
        errorInterceptor       // Error handling with retry
      ])
    ),
    provideOAuthClient(),
    provideApi(environment.apiUrl),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};
