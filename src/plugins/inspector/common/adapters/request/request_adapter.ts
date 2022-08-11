/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';
import uuid from 'uuid/v4';
import { RequestResponder } from './request_responder';
import { Request, RequestParams, RequestStatus, ResponseWarning } from './types';

/**
 * An generic inspector adapter to log requests.
 * These can be presented in the inspector using the requests view.
 * The adapter is not coupled to a specific implementation or even Elasticsearch
 * instead it offers a generic API to log requests of any kind.
 * @extends EventEmitter
 */
export class RequestAdapter extends EventEmitter {
  private requests: Map<string, Request>;

  constructor() {
    super();
    this.requests = new Map();
  }

  /**
   * Start logging a new request into this request adapter. The new request will
   * by default be in a processing state unless you explicitly finish it via
   * {@link RequestResponder#finish}, {@link RequestResponder#ok} or
   * {@link RequestResponder#error}.
   *
   * @param  {string} name The name of this request as it should be shown in the UI.
   * @param  {RequestParams} params Additional arguments for the request.
   * @param  {number} [startTime] Set an optional start time for the request
   * @return {RequestResponder} An instance to add information to the request and finish it.
   */
  public start(
    name: string,
    params: RequestParams = {},
    startTime: number = Date.now()
  ): RequestResponder {
    const req: Request = {
      ...params,
      name,
      startTime,
      status: RequestStatus.PENDING,
      id: params.id ?? uuid(),
    };
    this.requests.set(req.id, req);
    this._onChange();
    return new RequestResponder(req, () => this._onChange());
  }

  public reset(): void {
    this.requests = new Map();
    this._onChange();
  }

  public resetRequest(id: string): void {
    this.requests.delete(id);
    this._onChange();
  }

  public getRequests(): Request[] {
    return Array.from(this.requests.values());
  }

  /**
   * Extract a string warning field from the json object
   */
  public extractWarnings(): ResponseWarning[] | undefined {
    const response = Array.from(this.requests.values())
      .filter((req) => {
        const warning = (req.response?.json as { warning: string } | undefined)?.warning;
        return warning != null;
      })
      .map((req) => {
        return {
          title: i18n.translate('inspector.responseWarningTitle', {
            defaultMessage: 'Warning',
          }),
          text: (req.response?.json as { warning: string } | undefined)?.warning,
        };
      });

    return response;
  }

  private _onChange(): void {
    this.emit('change');
  }
}
