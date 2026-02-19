import {
    HttpInterceptorFn,
    HttpHeaders
} from '@angular/common/http';
import { finalize } from 'rxjs/operators';

let requestCount = 0;

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
    const requestId = ++requestCount;
    const startTime = Date.now();

    console.log(`[HTTP ${requestId}] ${req.method} ${req.url}`, {
        headers: sanitizeHeaders(req.headers),
        body: req.body
    });

    return next(req).pipe(
        finalize(() => {
            const duration = Date.now() - startTime;
            console.log(`[HTTP ${requestId}] Completed in ${duration}ms`);
        })
    );
};

function sanitizeHeaders(headers: HttpHeaders): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'x-api-key'];

    headers.keys().forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveHeaders.includes(lowerKey)) {
            sanitized[key] = '[REDACTED]';
        } else {
            sanitized[key] = headers.get(key) || '';
        }
    });

    return sanitized;
}
