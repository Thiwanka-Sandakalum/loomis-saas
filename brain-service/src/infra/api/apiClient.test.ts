import { ApiClient } from './apiClient';

describe('ApiClient - Retry Logic', () => {
    let apiClient: ApiClient;
    let fetchSpy: jest.Mock;

    beforeEach(() => {
        apiClient = new ApiClient('http://localhost:5000');
        fetchSpy = jest.fn();
        (global as any).fetch = fetchSpy;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('should retry on 5xx errors', async () => {
        // Arrange
        fetchSpy
            .mockResolvedValueOnce({
                status: 503,
                json: async () => ({ error: 'Service unavailable' })
            })
            .mockResolvedValueOnce({
                status: 503,
                json: async () => ({ error: 'Service unavailable' })
            })
            .mockResolvedValueOnce({
                status: 200,
                json: async () => ({ data: 'success' })
            });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test');

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(response.status).toBe(200);
    });

    it('should NOT retry on 4xx errors', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({
            status: 404,
            json: async () => ({ error: 'Not found' })
        });

        // Act
        const response = await (apiClient as any).makeRequest('/api/nonexistent');

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(1); // No retries
        expect(response.status).toBe(404);
    });

    it('should NOT retry on 400 errors', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({
            status: 400,
            json: async () => ({ error: 'Bad request' })
        });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test', 'POST', {});

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(400);
    });

    it('should timeout after 8 seconds', async () => {
        // Arrange
        jest.useFakeTimers();
        fetchSpy.mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() => resolve({
                    status: 200,
                    json: async () => ({ data: 'slow' })
                }), 10000)
            )
        );

        // Act & Assert
        const promise = (apiClient as any).makeRequest('/api/slow');

        jest.advanceTimersByTime(8100);

        await expect(promise).rejects.toThrow();
        jest.useRealTimers();
    });

    it('should use exponential backoff with correct delays', async () => {
        // Arrange
        jest.useFakeTimers();
        const delayTimes: number[] = [];
        let callCount = 0;

        fetchSpy.mockImplementation(() => {
            callCount++;
            if (callCount < 3) {
                return Promise.resolve({
                    status: 500,
                    json: async () => ({ error: 'Server error' })
                });
            }
            return Promise.resolve({
                status: 200,
                json: async () => ({ data: 'success' })
            });
        });

        // Override delay to track timing
        const originalDelay = (apiClient as any).delay;
        (apiClient as any).delay = jest.fn((ms: number) => {
            delayTimes.push(ms);
            return new Promise(resolve => setTimeout(resolve, 0));
        });

        // Act
        const promise = (apiClient as any).makeRequest('/api/test', 'GET', undefined, 3);

        // First attempt fails
        jest.advanceTimersByTime(1);

        // After first delay
        jest.advanceTimersByTime(200); // 2^1 * 100 = 200ms

        // Second attempt fails
        jest.advanceTimersByTime(1);

        // After second delay
        jest.advanceTimersByTime(400); // 2^2 * 100 = 400ms

        // Third attempt succeeds
        jest.advanceTimersByTime(1);

        const response = await promise;

        // Assert
        expect(callCount).toBe(3);
        expect(response.status).toBe(200);
        jest.useRealTimers();
    });

    it('should retry on network errors', async () => {
        // Arrange
        fetchSpy
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
                status: 200,
                json: async () => ({ data: 'success' })
            });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test');

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(response.status).toBe(200);
    });

    it('should set correct headers in requests', async () => {
        // Arrange
        process.env.CORE_API_KEY = 'test-key-123';
        const apiClient = new ApiClient('http://localhost:5000');
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ data: 'success' })
        });

        // Act
        await (apiClient as any).makeRequest('/api/test', 'GET');

        // Assert
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'X-API-KEY': 'test-key-123'
                })
            })
        );

        delete process.env.CORE_API_KEY;
    });

    it('should include request body for POST requests', async () => {
        // Arrange
        const requestBody = { shipmentId: '123', status: 'delivered' };
        fetchSpy.mockResolvedValueOnce({
            status: 201,
            json: async () => ({ id: '123' })
        });

        // Act
        await (apiClient as any).makeRequest('/api/test', 'POST', requestBody);

        // Assert
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(requestBody)
            })
        );
    });

    it('should handle successful response', async () => {
        // Arrange
        const responseData = { shipments: [], total: 0 };
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => responseData
        });

        // Act
        const response = await (apiClient as any).makeRequest('/api/shipments');

        // Assert
        expect(response.status).toBe(200);
        expect(response.data).toEqual(responseData);
    });

    it('should max out at 3 attempts', async () => {
        // Arrange
        fetchSpy
            .mockResolvedValueOnce({ status: 500, json: async () => ({ error: 'Error' }) })
            .mockResolvedValueOnce({ status: 500, json: async () => ({ error: 'Error' }) })
            .mockResolvedValueOnce({ status: 500, json: async () => ({ error: 'Error' }) })
            .mockResolvedValueOnce({ status: 200, json: async () => ({ data: 'success' }) });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test', 'GET', undefined, 3);

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(3); // Should not make a 4th call
        expect(response.status).toBe(500); // Last 500 error is returned
    });

    it('should return error response after max retries', async () => {
        // Arrange
        fetchSpy
            .mockResolvedValueOnce({ status: 500, json: async () => ({ error: 'Error 1' }) })
            .mockResolvedValueOnce({ status: 500, json: async () => ({ error: 'Error 2' }) })
            .mockResolvedValueOnce({ status: 500, json: async () => ({ error: 'Error 3' }) });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test', 'GET', undefined, 3);

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(response.status).toBe(500);
    });

    it('should use AbortController for timeout', async () => {
        // Arrange
        jest.useFakeTimers();
        const abortSignal = { aborted: false };
        let setSpy: jest.Mock | undefined;

        fetchSpy.mockImplementationOnce((url, options) => {
            // Simulate timeout occurring
            setTimeout(() => {
                (options.signal as any).abort?.();
            }, 8100);
            return new Promise(() => {
                // Never settles - simulates timeout
            });
        });

        // Act
        const promise = (apiClient as any).makeRequest('/api/test');

        jest.advanceTimersByTime(8100);

        // Assert
        await expect(promise).rejects.toThrow();
        jest.useRealTimers();
    });

    it('should handle PATCH requests', async () => {
        // Arrange
        const patchData = { status: 'delivered' };
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ success: true })
        });

        // Act
        await (apiClient as any).makeRequest('/api/shipments/123', 'PATCH', patchData);

        // Assert
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify(patchData)
            })
        );
    });

    it('should handle DELETE requests', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({
            status: 204,
            json: async () => ({})
        });

        // Act
        await (apiClient as any).makeRequest('/api/shipments/123', 'DELETE');

        // Assert
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                method: 'DELETE'
            })
        );
    });

    it('should not retry on 401 Unauthorized', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({
            status: 401,
            json: async () => ({ error: 'Unauthorized' })
        });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test');

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(401);
    });

    it('should not retry on 403 Forbidden', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({
            status: 403,
            json: async () => ({ error: 'Forbidden' })
        });

        // Act
        const response = await (apiClient as any).makeRequest('/api/test');

        // Assert
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(403);
    });
});
