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

import { CoreSetup } from 'kibana/public';
import { useRef, useEffect } from 'react';
import React from 'react';

import { fromExpression, Ast } from '@kbn/interpreter/common';

// this type import and the types below them should be switched to the types of
// the interpreter plugin itself once they are ready
import { RunPipelineHandlers } from 'ui/visualize/loader/pipeline_helpers/run_pipeline';
import { Registry } from '@kbn/interpreter/common';
import { RequestAdapter, DataAdapter } from 'ui/inspector/adapters';

type Context = object;
type Handlers = RunPipelineHandlers;
export interface Result {
  type: string;
  as?: string;
  value?: unknown;
}

interface RenderHandlers {
  done: () => void;
  onDestroy: (fn: () => void) => void;
}

export interface RenderFunction {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: unknown, handlers: RenderHandlers) => void;
}

export type RenderFunctionsRegistry = Registry<unknown, RenderFunction>;

export interface Interpreter {
  interpretAst(ast: Ast, context: Context, handlers: Handlers): Promise<Result>;
}

export interface ExpressionExecutorSetupPlugins {
  interpreter: {
    renderersRegistry: RenderFunctionsRegistry;
    getInterpreter: () => Promise<{ interpreter: Interpreter }>;
  };
}

async function runFn(
  expressionOrAst: string | Ast,
  element: Element,
  renderersRegistry: RenderFunctionsRegistry,
  interpreter: Interpreter
) {
  const ast =
    typeof expressionOrAst === 'string' ? fromExpression(expressionOrAst) : expressionOrAst;
  const response = await interpreter.interpretAst(
    ast,
    { type: 'null' },
    {
      getInitialContext: () => ({}),
      inspectorAdapters: {
        // TODO connect real adapters
        requests: new RequestAdapter(),
        data: new DataAdapter(),
      },
    }
  );

  if (response.type === 'render' && response.as) {
    renderersRegistry.get(response.as).render(element, response.value, {
      onDestroy: fn => {
        // TODO implement
      },
      done: () => {
        // TODO implement
      },
    });
  } else {
    // eslint-disable-next-line no-console
    console.log('Unexpected result of expression', response);
  }

  return response;
}

/**
 * Expression Executor Service
 * @internal
 */
export class ExpressionExecutorService {
  private interpreterInstance: Interpreter | null = null;

  // TODO core won't ever be null once this is switched to the new platform
  public setup(_core: CoreSetup | null, plugins: ExpressionExecutorSetupPlugins) {
    /**
     * **experimential** This API is experimential and might be removed in the future
     * without notice
     *
     * Executes the given expression string or ast and renders the result into the
     * given DOM element.
     *
     *
     * @param expressionOrAst
     * @param element
     */
    const run = async (expressionOrAst: string | Ast, element: Element) => {
      if (!this.interpreterInstance) {
        this.interpreterInstance = (await plugins.interpreter.getInterpreter()).interpreter;
      }
      return await runFn(
        expressionOrAst,
        element,
        plugins.interpreter.renderersRegistry,
        this.interpreterInstance
      );
    };
    return {
      run,
      /**
       * **experimential** This API is experimential and might be removed in the future
       * without notice
       *
       * Component which executes and renders the given expression in a div element.
       * The expression is re-executed on updating the props.
       *
       * This is a React bridge of the `run` method
       * @param props
       */
      ExpressionRenderer({ expression }: { expression: string }) {
        const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);

        useEffect(
          () => {
            if (mountpoint.current) {
              run(expression, mountpoint.current);
            }
          },
          [expression, mountpoint.current]
        );

        return (
          <div
            ref={el => {
              mountpoint.current = el;
            }}
          />
        );
      },
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type ExpressionExecutorSetup = ReturnType<ExpressionExecutorService['setup']>;
