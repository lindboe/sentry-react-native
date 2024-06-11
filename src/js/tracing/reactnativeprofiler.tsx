import { spanToJSON } from '@sentry/core';
import { getClient, Profiler } from '@sentry/react';
import { timestampInSeconds } from '@sentry/utils';

import { createIntegration } from '../integrations/factory';
import { setAppStartEndTimestamp } from '../tracing/integrations/appStart';
import type { ReactNativeTracing } from './reactnativetracing';

const ReactNativeProfilerGlobalState = {
  appStartReported: false,
};

/**
 * Custom profiler for the React Native app root.
 */
export class ReactNativeProfiler extends Profiler {
  public readonly name: string = 'ReactNativeProfiler';

  public constructor(props: ConstructorParameters<typeof Profiler>[0]) {
    const client = getClient();
    const integration = client && client.getIntegrationByName && client.getIntegrationByName<ReactNativeTracing>('ReactNativeTracing');
    integration && integration.setRootComponentFirstConstructorCallTimestampMs(timestampInSeconds() * 1000);
    super(props);
  }

  /**
   * Get the app root mount time.
   */
  public componentDidMount(): void {
    super.componentDidMount();
    if (!ReactNativeProfilerGlobalState.appStartReported) {
      this._reportAppStart();
      ReactNativeProfilerGlobalState.appStartReported = true;
    }
  }

  /**
   * Notifies the Tracing integration that the app start has finished.
   */
  private _reportAppStart(): void {
    const client = getClient();

    if (!client) {
      // We can't use logger here because this will be logged before the `Sentry.init`.
      // eslint-disable-next-line no-console
      __DEV__ && console.warn('App Start Span could not be finished. `Sentry.wrap` was called before `Sentry.init`.');
      return;
    }

    client.addIntegration && client.addIntegration(createIntegration(this.name));

    const endTimestamp = this._mountSpan && typeof spanToJSON(this._mountSpan).timestamp
    typeof endTimestamp === 'number' && setAppStartEndTimestamp(endTimestamp);
  }
}
