// SPDX-License-Identifier: Apache-2.0

import {credentials} from '@grpc/grpc-js';
import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-grpc';
import {Resource} from '@opentelemetry/resources';
import {NodeSDK} from '@opentelemetry/sdk-node';
import {SemanticResourceAttributes} from '@opentelemetry/semantic-conventions';

const {OPEN_TELEMETRY_COLLECTOR_URL, OPEN_TELEMETRY_SERVICE_NAME} = process.env;

export let telemetry: NodeSDK | undefined;
if (!!OPEN_TELEMETRY_SERVICE_NAME && !!OPEN_TELEMETRY_COLLECTOR_URL) {
  // configure the SDK to export telemetry data to the console
  // enable all auto-instrumentations from the meta package
  const exporterOptions = {
    url: OPEN_TELEMETRY_COLLECTOR_URL,
    credentials: credentials.createInsecure(),
  };
  const traceExporter = new OTLPTraceExporter(exporterOptions);
  telemetry = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: OPEN_TELEMETRY_SERVICE_NAME,
    }),
  });

  // initialize the SDK and register with the OpenTelemetry API
  // this enables the API to record telemetry
  // telemetry.start()
  //   .then(() => console.log('Tracing initialized'))
  //   .catch((error) => console.log('Error initializing tracing', error));

  // gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
    telemetry
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error: Error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
