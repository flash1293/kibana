/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from 'target/types/server';

export interface Document {
  id?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  activeDatasourceId: string;
  // The state is saved as a JSON string for now
  state: {
    datasourceStates: Record<string, unknown>;
    // datasource: unknown;
    visualization: unknown;
  };
}

const DOC_TYPE = 'lens';

interface SavedObjectClient {
  create: (type: string, object: SavedObjectAttributes) => Promise<{ id: string }>;
  update: (type: string, id: string, object: SavedObjectAttributes) => Promise<{ id: string }>;
  get: (
    type: string,
    id: string
  ) => Promise<{
    id: string;
    type: string;
    attributes: SavedObjectAttributes;
    error?: { message: string };
  }>;
}

export interface DocumentSaver {
  save: (vis: Document) => Promise<{ id: string }>;
}

export interface DocumentLoader {
  load: (id: string) => Promise<Document>;
}

export type SavedObjectStore = DocumentLoader & DocumentSaver;

export class SavedObjectIndexStore implements SavedObjectStore {
  private client: SavedObjectClient;

  constructor(client: SavedObjectClient) {
    this.client = client;
  }

  async save(vis: Document) {
    const { id, type, ...rest } = vis;
    const attributes = {
      ...rest,
      state: JSON.stringify(rest.state),
    };
    const result = await (id
      ? this.client.update(DOC_TYPE, id, attributes)
      : this.client.create(DOC_TYPE, attributes));

    return {
      ...vis,
      id: result.id,
    };
  }

  async load(id: string): Promise<Document> {
    const { type, attributes, error } = await this.client.get(DOC_TYPE, id);

    if (error) {
      throw error;
    }

    return {
      ...attributes,
      id,
      type,
      state: JSON.parse(((attributes as unknown) as { state: string }).state as string),
    } as Document;
  }
}
