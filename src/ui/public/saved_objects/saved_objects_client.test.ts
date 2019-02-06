/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/kfetch', () => ({}));

// @ts-ignore
import expect from 'expect.js';
import * as sinon from 'sinon';
import { FindOptions } from '../../../server/saved_objects/service';
import { RawSavedObject } from './raw_saved_object';
import { SavedObjectsClient } from './saved_objects_client';

describe.only('SavedObjectsClient', () => {
  const doc = {
    id: 'AVwSwFxtcMV38qjDZoQg',
    type: 'config',
    attributes: { title: 'Example title' },
    version: 'foo',
  };

  let kfetchStub: sinon.SinonStub;
  let savedObjectsClient: SavedObjectsClient;
  beforeEach(() => {
    kfetchStub = sinon.stub();
    require('ui/kfetch').kfetch = async (...args: any[]) => {
      return kfetchStub(...args);
    };
    savedObjectsClient = new SavedObjectsClient();
  });

  describe('#get', () => {
    beforeEach(() => {
      kfetchStub
        .withArgs({
          method: 'POST',
          pathname: `/api/saved_objects/_bulk_get`,
          query: undefined,
          body: sinon.match.any,
        })
        .returns(Promise.resolve({ saved_objects: [doc] }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.get('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.get(undefined as any, undefined as any);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('requires id', async () => {
      try {
        await savedObjectsClient.get('index-pattern', undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('resolves with instantiated SavedObject', async () => {
      const response = await savedObjectsClient.get(doc.type, doc.id);
      expect(response).to.be.a(RawSavedObject);
      expect(response.type).to.eql('config');
      expect(response.get('title')).to.eql('Example title');
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.get(doc.type, doc.id);
      sinon.assert.calledOnce(kfetchStub);
    });

    test('handles HTTP call when it fails', async () => {
      kfetchStub
        .withArgs({
          method: 'POST',
          pathname: `/api/saved_objects/_bulk_get`,
          query: undefined,
          body: sinon.match.any,
        })
        .rejects(new Error('Request failed'));
      try {
        await savedObjectsClient.get(doc.type, doc.id);
        throw new Error('should have error');
      } catch (e) {
        expect(e.message).to.be('Request failed');
      }
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      kfetchStub
        .withArgs({
          method: 'DELETE',
          pathname: `/api/saved_objects/index-pattern/logstash-*`,
          query: undefined,
          body: undefined,
        })
        .returns(Promise.resolve({}));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.delete('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.delete(undefined as any, undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('requires id', async () => {
      try {
        await savedObjectsClient.delete('index-pattern', undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('makes HTTP call', () => {
      savedObjectsClient.delete('index-pattern', 'logstash-*');
      sinon.assert.calledOnce(kfetchStub);
    });
  });

  describe('#update', () => {
    const requireMessage = 'requires type, id and attributes';

    beforeEach(() => {
      kfetchStub
        .withArgs({
          method: 'PUT',
          pathname: `/api/saved_objects/index-pattern/logstash-*`,
          query: undefined,
          body: sinon.match.any,
        })
        .returns(Promise.resolve({ data: 'api-response' }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.update('index-pattern', 'logstash-*', {})).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.update(undefined as any, undefined as any, undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('requires id', async () => {
      try {
        await savedObjectsClient.update('index-pattern', undefined as any, undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('requires attributes', async () => {
      try {
        await savedObjectsClient.update('index-pattern', 'logstash-*', undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      const body = { attributes, version: 'foo' };
      const options = { version: 'foo' };

      savedObjectsClient.update('index-pattern', 'logstash-*', attributes, options);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(
        kfetchStub,
        sinon.match({
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('#create', () => {
    const requireMessage = 'requires type and attributes';

    beforeEach(() => {
      kfetchStub
        .withArgs({
          method: 'POST',
          pathname: `/api/saved_objects/index-pattern`,
          query: undefined,
          body: sinon.match.any,
        })
        .returns(Promise.resolve({}));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.create('index-pattern', {})).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.create(undefined as any, undefined as any);
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('allows for id to be provided', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      const path = `/api/saved_objects/index-pattern/myId`;
      kfetchStub
        .withArgs({
          method: 'POST',
          pathname: path,
          query: undefined,
          body: sinon.match.any,
        })
        .returns(Promise.resolve({}));

      savedObjectsClient.create('index-pattern', attributes, { id: 'myId' });

      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(
        kfetchStub,
        sinon.match({
          pathname: path,
        })
      );
    });

    test('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      savedObjectsClient.create('index-pattern', attributes);

      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(
        kfetchStub,
        sinon.match({
          pathname: sinon.match.string,
          body: JSON.stringify({ attributes }),
        })
      );
    });
  });

  describe('#bulk_create', () => {
    beforeEach(() => {
      kfetchStub
        .withArgs({
          method: 'POST',
          pathname: `/api/saved_objects/_bulk_create`,
          query: sinon.match.any,
          body: sinon.match.any,
        })
        .returns(Promise.resolve({ saved_objects: [doc] }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.bulkCreate([doc], {})).to.be.a(Promise);
    });

    test('resolves with instantiated SavedObjects', async () => {
      const response = await savedObjectsClient.bulkCreate([doc], {});
      expect(response).to.have.property('savedObjects');
      expect(response.savedObjects.length).to.eql(1);
      expect(response.savedObjects[0]).to.be.a(RawSavedObject);
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.bulkCreate([doc], {});
      sinon.assert.calledOnce(kfetchStub);
    });
  });

  describe('#find', () => {
    const object = { id: 'logstash-*', type: 'index-pattern', title: 'Test' };

    beforeEach(() => {
      kfetchStub.returns(Promise.resolve({ saved_objects: [object] }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.find()).to.be.a(Promise);
    });

    test('accepts type', () => {
      const body = { type: 'index-pattern', invalid: true };

      savedObjectsClient.find(body);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(
        kfetchStub,
        sinon.match({
          pathname: `/api/saved_objects/_find`,
          query: { type: 'index-pattern', invalid: true },
        })
      );
    });

    test('accepts fields', () => {
      const body = { fields: ['title', 'description'] };

      savedObjectsClient.find(body);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(
        kfetchStub,
        sinon.match({
          pathname: `/api/saved_objects/_find`,
          query: { fields: ['title', 'description'] },
        })
      );
    });

    test.only('accepts pagination params', () => {
      const options: FindOptions = { perPage: 10, page: 6 };

      savedObjectsClient.find(options);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.alwaysCalledWith(
        kfetchStub,
        sinon.match({
          pathname: `/api/saved_objects/_find`,
          query: { per_page: 10, page: 6 },
        })
      );
    });
  });
});
