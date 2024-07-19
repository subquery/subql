/* eslint-disable */
import { JsonRpcBatchProvider } from './json-rpc-batch-provider';
import { ConnectionInfo } from './web';

describe('JsonRpcBatchProvider', () => {
  let batchProvider: JsonRpcBatchProvider;
  let fetchJsonMock: jest.SpyInstance;

  beforeEach(() => {
    // Create a new instance of the JsonRpcBatchProvider before each test
    batchProvider = new JsonRpcBatchProvider('http://localhost:8545');

    // Mock the fetchJson function from the ethers package to simulate server responses
    fetchJsonMock = jest.spyOn(require('./web'), 'fetchJson');
  });

  afterEach(() => {
    // Reset the fetchJson mock after each test
    fetchJsonMock.mockRestore();
  });

  test('adjustBatchSize properly adjusts batch size based on success rate', async () => {
    // Mock fetchJson to return a successful response
    fetchJsonMock.mockImplementation(
      async (connection: ConnectionInfo, payload: string) => {
        const requests = JSON.parse(payload);
        return requests.map((request: any) => ({
          id: request.id,
          jsonrpc: '2.0',
          result: '0x1',
        }));
      },
    );

    // Execute the send method multiple times to simulate successful requests
    const requestCount = 20;
    const promises: Promise<any>[] = [];
    for (let i = 0; i < requestCount; i++) {
      const promise = batchProvider.send('eth_call', []);
      promises.push(promise);
    }
    await Promise.all(promises);

    // Check if the batch size has increased due to the success rate
    expect(batchProvider['batchSize']).toBeGreaterThan(1);

    // Now, mock fetchJson to return an error response
    fetchJsonMock.mockImplementation(
      async (connection: ConnectionInfo, payload: string) => {
        const requests = JSON.parse(payload);
        return requests.map((request: any) => ({
          id: request.id,
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Batch size limit exceeded' },
        }));
      },
    );

    // Execute the send method multiple times to simulate failed requests
    const failedPromises: Promise<any>[] = [];
    for (let i = 0; i < requestCount + 10; i++) {
      const failedPromise = batchProvider.send('eth_call', []);
      failedPromises.push(failedPromise);
    }

    try {
      await Promise.all(failedPromises);
    } catch {
      // ignore error
    }

    // Check if the batch size has decreased due to the failure rate
    expect(batchProvider['batchSize']).toBeLessThan(2);
  });
});
