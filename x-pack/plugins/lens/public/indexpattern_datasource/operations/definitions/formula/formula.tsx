/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { TinymathAST, TinymathVariable, TinymathLocation } from '@kbn/tinymath';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiText,
  EuiSpacer,
  EuiModal,
  EuiModalHeader,
  EuiPopover,
} from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import {
  CodeEditor,
  CodeEditorProps,
  Markdown,
} from '../../../../../../../../src/plugins/kibana_react/public';
import {
  OperationDefinition,
  GenericOperationDefinition,
  IndexPatternColumn,
  ParamEditorProps,
} from '../index';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern, IndexPatternLayer } from '../../../types';
import { getColumnOrder, getManagedColumnsFrom } from '../../layer_helpers';
import { mathOperation } from './math';
import { documentField } from '../../../document_field';
import { ErrorWrapper, runASTValidation, shouldHaveFieldArgument, tryToParse } from './validation';
import {
  extractParamsForFormula,
  findVariables,
  getOperationParams,
  getSafeFieldName,
  groupArgsByType,
  hasMathNode,
  isSupportedFieldType,
  tinymathFunctions,
} from './util';
import { useDebounceWithOptions } from '../helpers';
import {
  LensMathSuggestion,
  SUGGESTION_TYPE,
  suggest,
  getSuggestion,
  getPossibleFunctions,
  getSignatureHelp,
  getHover,
  offsetToRowColumn,
} from './math_completion';
import { LANGUAGE_ID } from './math_tokenization';

import './formula.scss';

const defaultLabel = i18n.translate('xpack.lens.indexPattern.formulaLabel', {
  defaultMessage: 'Formula',
});

export interface FormulaIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'formula';
  params: {
    formula?: string;
    isFormulaBroken?: boolean;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const formulaOperation: OperationDefinition<
  FormulaIndexPatternColumn,
  'managedReference'
> = {
  type: 'formula',
  displayName: defaultLabel,
  getDefaultLabel: (column, indexPattern) => defaultLabel,
  input: 'managedReference',
  hidden: true,
  getDisabledStatus(indexPattern: IndexPattern) {
    return undefined;
  },
  getErrorMessage(layer, columnId, indexPattern, operationDefinitionMap) {
    const column = layer.columns[columnId] as FormulaIndexPatternColumn;
    if (!column.params.formula || !operationDefinitionMap) {
      return;
    }
    const { root, error } = tryToParse(column.params.formula);
    if (error || !root) {
      return [error!.message];
    }

    const errors = runASTValidation(root, layer, indexPattern, operationDefinitionMap);
    return errors.length ? errors.map(({ message }) => message) : undefined;
  },
  getPossibleOperation() {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  toExpression: (layer, columnId) => {
    const currentColumn = layer.columns[columnId] as FormulaIndexPatternColumn;
    const params = currentColumn.params;
    // TODO: improve this logic
    const useDisplayLabel = currentColumn.label !== defaultLabel;
    const label = !params?.isFormulaBroken
      ? useDisplayLabel
        ? currentColumn.label
        : params?.formula
      : '';

    return currentColumn.references.length
      ? [
          {
            type: 'function',
            function: 'mapColumn',
            arguments: {
              id: [columnId],
              name: [label || ''],
              exp: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'math',
                      arguments: {
                        expression: [`${currentColumn.references[0]}`],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ]
      : [];
  },
  buildColumn({ previousColumn, layer, indexPattern }, _, operationDefinitionMap) {
    let previousFormula = '';
    if (previousColumn) {
      if ('references' in previousColumn) {
        const metric = layer.columns[previousColumn.references[0]];
        if (metric && 'sourceField' in metric && metric.dataType === 'number') {
          const fieldName = getSafeFieldName(metric.sourceField);
          // TODO need to check the input type from the definition
          previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName})`;
        }
      } else {
        if (
          previousColumn &&
          'sourceField' in previousColumn &&
          previousColumn.dataType === 'number'
        ) {
          previousFormula += `${previousColumn.operationType}(${getSafeFieldName(
            previousColumn?.sourceField
          )}`;
        }
      }
      const formulaNamedArgs = extractParamsForFormula(previousColumn, operationDefinitionMap);
      if (formulaNamedArgs.length) {
        previousFormula +=
          ', ' + formulaNamedArgs.map(({ name, value }) => `${name}=${value}`).join(', ');
      }
      if (previousFormula) {
        // close the formula at the end
        previousFormula += ')';
      }
    }
    // carry over the format settings from previous operation for seamless transfer
    // NOTE: this works only for non-default formatters set in Lens
    let prevFormat = {};
    if (previousColumn?.params && 'format' in previousColumn.params) {
      prevFormat = { format: previousColumn.params.format };
    }
    return {
      label: 'Formula',
      dataType: 'number',
      operationType: 'formula',
      isBucketed: false,
      scale: 'ratio',
      params: previousFormula
        ? { formula: previousFormula, isFormulaBroken: false, ...prevFormat }
        : { ...prevFormat },
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern, operationDefinitionMap) => {
    // Basic idea: if it has any math operation in it, probably it cannot be transferable
    const { root, error } = tryToParse(column.params.formula || '');
    if (!root) return true;
    return Boolean(!error && !hasMathNode(root));
  },

  paramEditor: FormulaEditor,
};

function FormulaEditor({
  layer,
  updateLayer,
  currentColumn,
  columnId,
  indexPattern,
  operationDefinitionMap,
  data,
}: ParamEditorProps<FormulaIndexPatternColumn>) {
  const [text, setText] = useState(currentColumn.params.formula);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const editorModel = React.useRef<monaco.editor.ITextModel>(
    monaco.editor.createModel(text ?? '', LANGUAGE_ID)
  );
  const overflowDiv1 = React.useRef<HTMLElement>();
  const overflowDiv2 = React.useRef<HTMLElement>();

  // The Monaco editor needs to have the overflowDiv in the first render. Using an effect
  // requires a second render to work, so we are using an if statement to guarantee it happens
  // on first render
  if (!overflowDiv1?.current) {
    const node1 = (overflowDiv1.current = document.createElement('div'));
    node1.setAttribute('data-test-subj', 'lnsFormulaWidget');
    // Monaco CSS is targeted on the monaco-editor class
    node1.classList.add('lnsFormulaOverflow', 'monaco-editor');
    document.body.appendChild(node1);

    const node2 = (overflowDiv2.current = document.createElement('div'));
    node2.setAttribute('data-test-subj', 'lnsFormulaWidget');
    // Monaco CSS is targeted on the monaco-editor class
    node2.classList.add('lnsFormulaOverflow', 'monaco-editor');
    document.body.appendChild(node2);
  }

  // Clean up the monaco editor and DOM on unmount
  useEffect(() => {
    const model = editorModel.current;
    return () => {
      model.dispose();
      overflowDiv1.current?.parentNode?.removeChild(overflowDiv1.current);
      overflowDiv2.current?.parentNode?.removeChild(overflowDiv2.current);
    };
  }, []);

  useDebounceWithOptions(
    () => {
      if (!editorModel.current) return;

      if (!text) {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);
        return;
      }

      let errors: ErrorWrapper[] = [];

      const { root, error } = tryToParse(text);
      if (!root) return;
      if (error) {
        errors = [error];
      } else {
        const validationErrors = runASTValidation(
          root,
          layer,
          indexPattern,
          operationDefinitionMap
        );
        if (validationErrors.length) {
          errors = validationErrors;
        }
      }

      if (errors.length) {
        monaco.editor.setModelMarkers(
          editorModel.current,
          'LENS',
          errors.flatMap((innerError) =>
            innerError.locations.map((location) => {
              const startPosition = offsetToRowColumn(text, location.min);
              const endPosition = offsetToRowColumn(text, location.max);
              return {
                message: innerError.message,
                startColumn: startPosition.column + 1,
                startLineNumber: startPosition.lineNumber,
                endColumn: endPosition.column + 1,
                endLineNumber: endPosition.lineNumber,
                severity:
                  innerError.severity === 'warning'
                    ? monaco.MarkerSeverity.Warning
                    : monaco.MarkerSeverity.Error,
              };
            })
          )
        );
      } else {
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', []);

        // Only submit if valid
        const { newLayer, locations } = regenerateLayerFromAst(
          text || '',
          layer,
          columnId,
          currentColumn,
          indexPattern,
          operationDefinitionMap
        );
        updateLayer(newLayer);

        const managedColumns = getManagedColumnsFrom(columnId, newLayer.columns);
        const markers: monaco.editor.IMarkerData[] = managedColumns
          .flatMap(([id, column]) => {
            if (locations[id]) {
              const def = operationDefinitionMap[column.operationType];
              if (def.getErrorMessage) {
                const messages = def.getErrorMessage(
                  newLayer,
                  id,
                  indexPattern,
                  operationDefinitionMap
                );
                if (messages) {
                  const startPosition = offsetToRowColumn(text, locations[id].min);
                  const endPosition = offsetToRowColumn(text, locations[id].max);
                  return [
                    {
                      message: messages.join(', '),
                      startColumn: startPosition.column + 1,
                      startLineNumber: startPosition.lineNumber,
                      endColumn: endPosition.column + 1,
                      endLineNumber: endPosition.lineNumber,
                      severity: monaco.MarkerSeverity.Warning,
                    },
                  ];
                }
              }
            }
            return [];
          })
          .filter((marker) => marker);
        monaco.editor.setModelMarkers(editorModel.current, 'LENS', markers);
      }
    },
    // Make it validate on flyout open in case of a broken formula left over
    // from a previous edit
    { skipFirstRender: text == null },
    256,
    [text]
  );

  /**
   * The way that Monaco requests autocompletion is not intuitive, but the way we use it
   * we fetch new suggestions in these scenarios:
   *
   * - If the user types one of the trigger characters, suggestions are always fetched
   * - When the user selects the kql= suggestion, we tell Monaco to trigger new suggestions after
   * - When the user types the first character into an empty text box, Monaco requests suggestions
   *
   * Monaco also triggers suggestions automatically when there are no suggestions being displayed
   * and the user types a non-whitespace character.
   *
   * While suggestions are being displayed, Monaco uses an in-memory cache of the last known suggestions.
   */
  const provideCompletionItems = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      context: monaco.languages.CompletionContext
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();
      let wordRange: monaco.Range;
      let aSuggestions: { list: LensMathSuggestion[]; type: SUGGESTION_TYPE } = {
        list: [],
        type: SUGGESTION_TYPE.FIELD,
      };

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });

      if (context.triggerCharacter === '(') {
        const wordUntil = model.getWordAtPosition(position.delta(0, -3));
        if (wordUntil) {
          wordRange = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          );

          // Retrieve suggestions for subexpressions
          // TODO: make this work for expressions nested more than one level deep
          aSuggestions = await suggest({
            expression: innerText.substring(0, innerText.length - lengthAfterPosition) + ')',
            position: innerText.length - lengthAfterPosition,
            context,
            indexPattern,
            operationDefinitionMap,
            data,
          });
        }
      } else {
        aSuggestions = await suggest({
          expression: innerText,
          position: innerText.length - lengthAfterPosition,
          context,
          indexPattern,
          operationDefinitionMap,
          data,
        });
      }

      return {
        suggestions: aSuggestions.list.map((s) =>
          getSuggestion(s, aSuggestions.type, wordRange, operationDefinitionMap)
        ),
      };
    },
    [indexPattern, operationDefinitionMap, data]
  );

  const provideSignatureHelp = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken,
      context: monaco.languages.SignatureHelpContext
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });
      return getSignatureHelp(
        model.getValue(),
        innerText.length - lengthAfterPosition,
        operationDefinitionMap
      );
    },
    [operationDefinitionMap]
  );

  const provideHover = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });
      return getHover(
        model.getValue(),
        innerText.length - lengthAfterPosition,
        operationDefinitionMap
      );
    },
    [operationDefinitionMap]
  );

  const codeEditorOptions: CodeEditorProps = {
    languageId: LANGUAGE_ID,
    value: text ?? '',
    onChange: setText,
    options: {
      automaticLayout: false,
      fontSize: 14,
      folding: false,
      lineNumbers: 'off',
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      wordWrap: 'on',
      // Disable suggestions that appear when we don't provide a default suggestion
      wordBasedSuggestions: false,
      dimension: { width: 290, height: 280 },
      fixedOverflowWidgets: true,
    },
  };

  useEffect(() => {
    // Because the monaco model is owned by Lens, we need to manually attach and remove handlers
    const { dispose: dispose1 } = monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
      triggerCharacters: ['.', ',', '(', '=', ' ', ':', `'`],
      provideCompletionItems,
    });
    const { dispose: dispose2 } = monaco.languages.registerSignatureHelpProvider(LANGUAGE_ID, {
      signatureHelpTriggerCharacters: ['(', ',', '='],
      provideSignatureHelp,
    });
    const { dispose: dispose3 } = monaco.languages.registerHoverProvider(LANGUAGE_ID, {
      provideHover,
    });
    return () => {
      dispose1();
      dispose2();
      dispose3();
    };
  }, [provideCompletionItems, provideSignatureHelp, provideHover]);

  const helpComponent = (
    <div style={{ height: 250, overflow: 'auto' }}>
      <EuiText size="s">
        <Markdown
          markdown={i18n.translate('xpack.lens.formulaDocumentation', {
            defaultMessage: `
## How it works

Lens formulas let you do math using a combination of Elasticsearch aggregations and
math functions. There are three main types of functions:

* Elasticsearch metrics, like sum(bytes)
* Time series functions use Elasticsearch metrics as input, like cumulative_sum()
* Math functions like round()

An example formula that uses all of these:

round(100 * moving_average(avg(cpu.load.pct), window=10))

Elasticsearch functions take a field name, which can be in quotes. sum(bytes) is the same
as sum("bytes").

Some functions take named arguments, like moving_average(count(), window=5)

Math functions can take positional arguments, like pow(count(), 3) is the same as count() * count() * count()

### Basic math

Use the symbols +, -, /, and * to perform basic math.
                  `,
            description:
              'Text is in markdown. Do not translate function names or field names like sum(bytes)',
          })}
        />

        <EuiDescriptionList
          compressed
          listItems={getPossibleFunctions(indexPattern)
            .filter((key) => key in tinymathFunctions)
            .map((key) => ({
              title: `${key}`,
              description: <Markdown markdown={tinymathFunctions[key].help} />,
            }))}
        />
      </EuiText>

      <EuiSpacer />

      <EuiText>
        {i18n.translate('xpack.lens.formula.elasticsearchFunctions', {
          defaultMessage: 'Elasticsearch aggregations',
          description: 'Do not translate Elasticsearch',
        })}
      </EuiText>
      <EuiDescriptionList
        compressed
        listItems={getPossibleFunctions(indexPattern)
          .filter((key) => key in operationDefinitionMap)
          .map((key) => ({
            title: `${key}: ${operationDefinitionMap[key].displayName}`,
            description: getHelpText(key, operationDefinitionMap),
          }))}
      />
    </div>
  );

  // The Monaco editor will lazily load Monaco, which takes a render cycle to trigger. This can cause differences
  // in the behavior of Monaco when it's first loaded and then reloaded.
  return (
    <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
      <CodeEditor
        {...codeEditorOptions}
        height={50}
        width={'100%'}
        options={{
          ...codeEditorOptions.options,
          // Shared model and overflow node
          overflowWidgetsDomNode: overflowDiv1.current,
          model: editorModel.current,
        }}
      />
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPopover
            isOpen={isHelpOpen}
            closePopover={() => setIsHelpOpen(false)}
            button={
              <EuiButton onClick={() => setIsHelpOpen(!isHelpOpen)} iconType="help" size="s">
                {i18n.translate('xpack.lens.formula.functionReferenceEditorLabel', {
                  defaultMessage: 'Function reference',
                })}
              </EuiButton>
            }
          >
            {helpComponent}
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiButton onClick={() => setIsOpen(!isOpen)} iconType="expand" size="s">
            {i18n.translate('xpack.lens.formula.fullScreenEditorLabel', {
              defaultMessage: 'Full screen',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isOpen ? (
        <EuiModal
          onClose={() => {
            setIsOpen(false);
            setText(currentColumn.params.formula);
          }}
        >
          <EuiModalHeader>
            <h1>
              {i18n.translate('xpack.lens.formula.formulaEditorLabel', {
                defaultMessage: 'Formula editor',
              })}
            </h1>
          </EuiModalHeader>
          <EuiFlexGroup>
            <EuiFlexItem>
              <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
                <CodeEditor
                  {...codeEditorOptions}
                  height={280}
                  width={400}
                  options={{
                    ...codeEditorOptions.options,
                    // Shared model and overflow node
                    overflowWidgetsDomNode: overflowDiv2.current,
                    model: editorModel?.current,
                  }}
                />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
                <EuiText>
                  {i18n.translate('xpack.lens.formula.functionReferenceLabel', {
                    defaultMessage: 'Function reference',
                  })}
                </EuiText>
                <EuiSpacer size="s" />
                {helpComponent}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
          {/* <EuiModalFooter>
            <EuiButton
              color="text"
              onClick={() => {
                setIsOpen(false);
                setText(currentColumn.params.formula);
              }}
              iconType="cross"
            >
              {i18n.translate('xpack.lens.indexPattern.formulaCancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButton>
          </EuiModalFooter> */}
        </EuiModal>
      ) : null}
    </div>
  );
}

function parseAndExtract(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { root, error } = tryToParse(text);
  if (error || !root) {
    return { extracted: [], isValid: false };
  }
  // before extracting the data run the validation task and throw if invalid
  const errors = runASTValidation(root, layer, indexPattern, operationDefinitionMap);
  if (errors.length) {
    return { extracted: [], isValid: false };
  }
  /*
    { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
    */
  const extracted = extractColumns(columnId, operationDefinitionMap, root, layer, indexPattern);
  return { extracted, isValid: true };
}

export function regenerateLayerFromAst(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  currentColumn: FormulaIndexPatternColumn,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { extracted, isValid } = parseAndExtract(
    text,
    layer,
    columnId,
    indexPattern,
    operationDefinitionMap
  );

  const columns = {
    ...layer.columns,
  };

  const locations: Record<string, TinymathLocation> = {};

  Object.keys(columns).forEach((k) => {
    if (k.startsWith(columnId)) {
      delete columns[k];
    }
  });

  extracted.forEach(({ column, location }, index) => {
    columns[`${columnId}X${index}`] = column;
    if (location) locations[`${columnId}X${index}`] = location;
  });

  columns[columnId] = {
    ...currentColumn,
    params: {
      ...currentColumn.params,
      formula: text,
      isFormulaBroken: !isValid,
    },
    references: !isValid ? [] : [`${columnId}X${extracted.length - 1}`],
  };

  return {
    newLayer: {
      ...layer,
      columns,
      columnOrder: getColumnOrder({
        ...layer,
        columns,
      }),
    },
    locations,
  };

  // TODO
  // turn ast into referenced columns
  // set state
}

function extractColumns(
  idPrefix: string,
  operations: Record<string, GenericOperationDefinition>,
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
): Array<{ column: IndexPatternColumn; location?: TinymathLocation }> {
  const columns: Array<{ column: IndexPatternColumn; location?: TinymathLocation }> = [];

  function parseNode(node: TinymathAST) {
    if (typeof node === 'number' || node.type !== 'function') {
      // leaf node
      return node;
    }

    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      // it's a regular math node
      const consumedArgs = node.args.map(parseNode).filter(Boolean) as Array<
        number | TinymathVariable
      >;
      return {
        ...node,
        args: consumedArgs,
      };
    }

    // split the args into types for better TS experience
    const { namedArguments, variables, functions } = groupArgsByType(node.args);

    // operation node
    if (nodeOperation.input === 'field') {
      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      // a validation task passed before executing this and checked already there's a field
      const field = shouldHaveFieldArgument(node)
        ? indexPattern.getFieldByName(fieldName.value)!
        : documentField;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);

      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'field'
      >).buildColumn(
        {
          layer,
          indexPattern,
          field,
        },
        mappedParams
      );
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'fullReference') {
      const [referencedOp] = functions;
      const consumedParam = parseNode(referencedOp);

      const subNodeVariables = consumedParam ? findVariables(consumedParam) : [];
      const mathColumn = mathOperation.buildColumn({
        layer,
        indexPattern,
      });
      mathColumn.references = subNodeVariables.map(({ value }) => value);
      mathColumn.params.tinymathAst = consumedParam!;
      columns.push({ column: mathColumn });
      mathColumn.customLabel = true;
      mathColumn.label = `${idPrefix}X${columns.length - 1}`;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);
      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'fullReference'
      >).buildColumn(
        {
          layer,
          indexPattern,
          referenceIds: [`${idPrefix}X${columns.length - 1}`],
        },
        mappedParams
      );
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }
  }
  const root = parseNode(ast);
  if (root === undefined) {
    return [];
  }
  const variables = findVariables(root);
  const mathColumn = mathOperation.buildColumn({
    layer,
    indexPattern,
  });
  mathColumn.references = variables.map(({ value }) => value);
  mathColumn.params.tinymathAst = root!;
  const newColId = `${idPrefix}X${columns.length}`;
  mathColumn.customLabel = true;
  mathColumn.label = newColId;
  columns.push({ column: mathColumn });
  return columns;
}

// TODO: i18n this whole thing, or move examples into the operation definitions with i18n
function getHelpText(
  type: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap']
) {
  const definition = operationDefinitionMap[type];

  if (type === 'count') {
    return (
      <EuiText size="s">
        <p>Example: count()</p>
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      {definition.input === 'field' ? <p>Example: {type}(bytes)</p> : null}
      {definition.input === 'fullReference' && !('operationParams' in definition) ? (
        <p>Example: {type}(sum(bytes))</p>
      ) : null}

      {'operationParams' in definition && definition.operationParams ? (
        <p>
          <p>
            Example: {type}(sum(bytes),{' '}
            {definition.operationParams.map((p) => `${p.name}=5`).join(', ')})
          </p>
        </p>
      ) : null}
    </EuiText>
  );
}
