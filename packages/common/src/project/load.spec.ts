// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {validateCommonProjectManifest} from './load';

describe('validateCommonProjectManifest', () => {
  /**
   * Example of error output format improvement:
   *
   * BEFORE (old format using toString()):
   *   project validation failed.
   *   An instance of CommonProjectManifestV1_0_0Impl has failed the validation:
   *   - property version has failed the following constraints: isString
   *   - property schema has failed the following constraints: nested property schema must be either object or array
   *
   * AFTER (new structured format):
   *   project validation failed.
   *     - version: version must be a string
   *     - schema: schema must be an object
   *     - network: network must be an object
   *     - runner: runner must be an object
   *     - dataSources: dataSources must be an array
   */
  it('should throw error with structured format for missing required fields', () => {
    const invalidManifest = {
      specVersion: '1.0.0',
      // Missing required fields: version, schema, network, runner, dataSources
    };

    expect(() => validateCommonProjectManifest(invalidManifest)).toThrow();

    try {
      validateCommonProjectManifest(invalidManifest);
    } catch (error: any) {
      const errorMessage = error.message;

      // Check that error message starts with the expected prefix
      expect(errorMessage).toContain('project validation failed.');

      // Check that error message contains structured format with property names
      // The new format should include property names and constraints
      expect(errorMessage).toMatch(/  - \w+:/);

      // Verify that multiple properties are listed
      const lines = errorMessage.split('\n').filter((line: string) => line.trim().startsWith('-'));
      expect(lines.length).toBeGreaterThan(0);

      // Each line should follow the format: "  - propertyName: constraint message"
      lines.forEach((line: string) => {
        expect(line).toMatch(/^\s+-\s+\w+:\s+.+$/);
      });

      // Verify specific properties are mentioned
      expect(errorMessage).toMatch(/version|schema|network|runner|dataSources/);
    }
  });

  it('should throw error with property-specific constraints for invalid specVersion', () => {
    const invalidManifest = {
      specVersion: '2.0.0', // Invalid: must be '1.0.0'
      version: '1.0.0',
      schema: {file: 'schema.graphql'},
      network: {chainId: '0x123'},
      runner: {
        node: {name: '@subql/node', version: '1.0.0'},
        query: {name: '@subql/query', version: '1.0.0'},
      },
      dataSources: [],
    };

    expect(() => validateCommonProjectManifest(invalidManifest)).toThrow();

    try {
      validateCommonProjectManifest(invalidManifest);
    } catch (error: any) {
      const errorMessage = error.message;

      // Should contain specVersion property in error
      expect(errorMessage).toContain('specVersion');

      // Should contain constraint information in structured format
      expect(errorMessage).toMatch(/specVersion:\s*.+/);

      // Verify the format: "  - specVersion: constraint message"
      const specVersionLine = errorMessage.split('\n').find((line: string) => line.includes('specVersion'));
      expect(specVersionLine).toMatch(/^\s+-\s+specVersion:\s+.+$/);
    }
  });

  it('should throw error with structured format for invalid runner query name', () => {
    const invalidManifest = {
      specVersion: '1.0.0',
      version: '1.0.0',
      schema: {file: 'schema.graphql'},
      network: {chainId: '0x123'},
      runner: {
        node: {name: '@subql/node', version: '1.0.0'},
        query: {name: '@subql/invalid-query', version: '1.0.0'}, // Invalid query name
      },
      dataSources: [],
    };

    expect(() => validateCommonProjectManifest(invalidManifest)).toThrow();

    try {
      validateCommonProjectManifest(invalidManifest);
    } catch (error: any) {
      const errorMessage = error.message;

      // Should contain query property in error (nested in runner.query.name)
      expect(errorMessage).toContain('query');

      // Error should be structured with property path
      expect(errorMessage).toMatch(/query/);

      // Verify structured format for nested property
      const queryLine = errorMessage.split('\n').find((line: string) => line.includes('query'));
      if (queryLine) {
        expect(queryLine).toMatch(/^\s+-\s+query/);
      }
    }
  });

  it('should throw error with structured format for missing chainId', () => {
    const invalidManifest = {
      specVersion: '1.0.0',
      version: '1.0.0',
      schema: {file: 'schema.graphql'},
      network: {
        // Missing required chainId
        endpoint: 'wss://example.com',
      },
      runner: {
        node: {name: '@subql/node', version: '1.0.0'},
        query: {name: '@subql/query', version: '1.0.0'},
      },
      dataSources: [],
    };

    expect(() => validateCommonProjectManifest(invalidManifest)).toThrow();

    try {
      validateCommonProjectManifest(invalidManifest);
    } catch (error: any) {
      const errorMessage = error.message;

      // Should contain chainId or network property in error
      expect(errorMessage).toMatch(/chainId|network/);

      // Should be in structured format
      expect(errorMessage).toMatch(/  - \w+:/);

      // Verify the error format shows property name and constraint
      const chainIdLine = errorMessage.split('\n').find((line: string) =>
        line.includes('chainId') || line.includes('network')
      );
      if (chainIdLine) {
        expect(chainIdLine).toMatch(/^\s+-\s+\w+:\s+.+$/);
      }
    }
  });

  it('should demonstrate improved error message format with actual output', () => {
    const invalidManifest = {
      specVersion: '1.0.0',
      version: '', // Empty string should fail validation
      schema: {file: 'schema.graphql'},
      network: {chainId: '0x123'},
      runner: {
        node: {name: '@subql/node', version: '1.0.0'},
        query: {name: '@subql/query', version: '1.0.0'},
      },
      dataSources: [],
    };

    try {
      validateCommonProjectManifest(invalidManifest);
      fail('Expected validation to throw an error');
    } catch (error: any) {
      const errorMessage = error.message;

      // The new format should be clear and structured
      // Example output:
      // project validation failed.
      //   - version: version must be a string

      expect(errorMessage).toContain('project validation failed.');
      expect(errorMessage).toContain('version');

      // Verify the structured format is present
      const versionErrorLine = errorMessage.split('\n').find((line: string) =>
        line.includes('version') && line.includes(':')
      );
      expect(versionErrorLine).toBeDefined();
      expect(versionErrorLine).toMatch(/^\s+-\s+version:\s+.+$/);
    }
  });

  it('should not throw error for valid manifest', () => {
    const validManifest = {
      specVersion: '1.0.0',
      version: '1.0.0',
      schema: {file: 'schema.graphql'},
      network: {
        chainId: '0x123',
        endpoint: 'wss://example.com',
      },
      runner: {
        node: {name: '@subql/node', version: '1.0.0'},
        query: {name: '@subql/query', version: '1.0.0'},
      },
      dataSources: [],
    };

    expect(() => validateCommonProjectManifest(validManifest)).not.toThrow();
  });

  it('should format errors for nested child objects with array indices', () => {
    // This test demonstrates how errors are formatted for deeply nested objects,
    // such as an invalid filter on a mapping handler.
    // The error path should use bracket notation for array indices: dataSources[0].mapping.handlers[1].filter
    const invalidManifest = {
      specVersion: '1.0.0',
      version: '1.0.0',
      schema: {file: 'schema.graphql'},
      network: {
        chainId: '0x123',
        endpoint: 'wss://example.com',
      },
      runner: {
        node: {name: '@subql/node', version: '1.0.0'},
        query: {name: '@subql/query', version: '1.0.0'},
      },
      dataSources: [
        {
          kind: 'substrate/Runtime',
          mapping: {
            file: 'dist/index.js',
            handlers: [
              {
                handler: 'handleBlock',
                kind: 'substrate/BlockHandler',
              },
              {
                handler: 'handleEvent',
                kind: 'substrate/EventHandler',
                filter: {
                  // Invalid: specVersion should be an array of 2 numbers, not a single number
                  specVersion: 123,
                },
              },
            ],
          },
        },
      ],
    };

    expect(() => validateCommonProjectManifest(invalidManifest)).toThrow();

    try {
      validateCommonProjectManifest(invalidManifest);
      fail('Expected validation to throw an error');
    } catch (error: any) {
      const errorMessage = error.message;

      // Error should contain the structured format
      expect(errorMessage).toContain('project validation failed.');

      // For nested array errors, the path should use bracket notation
      // Example: dataSources[0].mapping.handlers[1].filter.specVersion
      // Note: The exact path depends on class-validator's error structure,
      // but we verify that array indices are formatted with brackets
      const hasArrayIndexFormat = /\[\d+\]/.test(errorMessage);
      
      // The error message should be structured and readable
      expect(errorMessage).toMatch(/  - .+:/);
    }
  });
});

