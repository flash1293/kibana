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

import { i18n } from '@kbn/i18n';
import { Container, ContainerInput } from '../containers';
import { Embeddable } from '../embeddables';
import { APPLY_FILTER_TRIGGER, triggerRegistry } from '../triggers';
import { Filter } from '../types';
import { Action } from './action';
import { actionRegistry } from './action_registry';
import { IncompatibleActionError } from './incompatible_action_error';

interface ApplyFilterContainerInput extends ContainerInput {
  filters: Filter[];
}

const APPLY_FILTER_ACTION_ID = 'APPLY_FILTER_ACTION_ID';

function containerAcceptsFilterInput(
  container: Embeddable | Container | Container<any, ApplyFilterContainerInput>
): container is Container<any, ApplyFilterContainerInput> {
  return (container as Container<any, ApplyFilterContainerInput>).getInput().filters !== undefined;
}

export class ApplyFilterAction extends Action<Embeddable, Container, { filters: Filter[] }> {
  constructor() {
    super(APPLY_FILTER_ACTION_ID);
  }

  public getTitle() {
    return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
      defaultMessage: 'Apply filter to current view',
    });
  }

  public isCompatible(context: { embeddable: Embeddable }) {
    let root: Embeddable | Container = context.embeddable;
    while (root.parent) {
      root = root.parent;
    }

    return Promise.resolve(containerAcceptsFilterInput(root));
  }

  public execute({
    embeddable,
    triggerContext,
  }: {
    embeddable: Embeddable;
    triggerContext?: { filters: Filter[] };
  }) {
    if (!triggerContext) {
      throw new Error('Applying a filter requires a filter as context');
    }
    let root: Embeddable | Container = embeddable;
    while (root.parent) {
      root = root.parent;
    }

    if (!containerAcceptsFilterInput(root)) {
      throw new IncompatibleActionError();
    }

    root.updateInput({
      filters: triggerContext.filters,
    });
  }
}

const applyFilterAction = new ApplyFilterAction();
if (!actionRegistry.getAction(applyFilterAction.id)) {
  actionRegistry.addAction(new ApplyFilterAction());
}

triggerRegistry.attachAction({
  triggerId: APPLY_FILTER_TRIGGER,
  actionId: APPLY_FILTER_ACTION_ID,
});
