/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './xy_suggestions';
import { TableSuggestionColumn, VisualizationSuggestion, DataType } from '../types';
import { State, XYState } from './types';
import { generateId } from '../id_generator';
import { Ast } from '@kbn/interpreter/target/common';

jest.mock('../id_generator');

describe('xy_suggestions', () => {
  function numCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Avg ${columnId}`,
        isBucketed: false,
        scale: 'ratio',
      },
    };
  }

  function strCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'string',
        label: `Top 5 ${columnId}`,
        isBucketed: true,
        scale: 'ordinal',
      },
    };
  }

  function dateCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'date',
        isBucketed: true,
        label: `${columnId} histogram`,
        scale: 'interval',
      },
    };
  }

  // Helper that plucks out the important part of a suggestion for
  // most test assertions
  function suggestionSubset(suggestion: VisualizationSuggestion<State>) {
    return suggestion.state.layers.map(({ seriesType, splitAccessor, xAccessor, accessors }) => ({
      seriesType,
      splitAccessor,
      x: xAccessor,
      y: accessors,
    }));
  }

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' as DataType } };
    };

    expect(
      getSuggestions({
        tables: [
          {
            datasourceSuggestionId: 0,
            isMultiRow: true,
            columns: [dateCol('a')],
            layerId: 'first',
            changeType: 'unchanged',
          },
          {
            datasourceSuggestionId: 1,
            isMultiRow: true,
            columns: [strCol('foo'), strCol('bar')],
            layerId: 'first',
            changeType: 'unchanged',
          },
          {
            datasourceSuggestionId: 2,
            isMultiRow: false,
            columns: [strCol('foo'), numCol('bar')],
            layerId: 'first',
            changeType: 'unchanged',
          },
          {
            datasourceSuggestionId: 3,
            isMultiRow: true,
            columns: [unknownCol(), numCol('bar')],
            layerId: 'first',
            changeType: 'unchanged',
          },
        ],
      })
    ).toEqual([]);
  });

  test('suggests a basic x y chart with date on x', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('bytes'), dateCol('date')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "bar",
                      "splitAccessor": "aaa",
                      "x": "date",
                      "y": Array [
                        "bytes",
                      ],
                    },
                  ]
            `);
  });

  test('does not suggest multiple splits', () => {
    const suggestions = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [
            numCol('price'),
            numCol('quantity'),
            dateCol('date'),
            strCol('product'),
            strCol('city'),
          ],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    expect(suggestions).toHaveLength(0);
  });

  test('suggests a split x y chart with date on x', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "line",
                      "splitAccessor": "product",
                      "x": "date",
                      "y": Array [
                        "price",
                        "quantity",
                      ],
                    },
                  ]
            `);
  });

  test('uses datasource provided title if available', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
          layerId: 'first',
          changeType: 'unchanged',
          label: 'Datasource title',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.title).toEqual('Datasource title');
  });

  test('hides reduced suggestions if there is a current state', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
          layerId: 'first',
          changeType: 'reduced',
        },
      ],
      state: {
        isHorizontal: false,
        legend: { isVisible: true, position: 'bottom' },
        preferredSeriesType: 'bar',
        layers: [
          {
            accessors: ['price', 'quantity'],
            layerId: 'first',
            seriesType: 'bar',
            splitAccessor: 'product',
            xAccessor: 'date',
            title: '',
          },
        ],
      },
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeTruthy();
  });

  test('does not hide reduced suggestions if xy visualization is not active', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
          layerId: 'first',
          changeType: 'reduced',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeFalsy();
  });

  test('suggests an area chart for unchanged table and existing bar chart on non-ordinal x axis', () => {
    const currentState: XYState = {
      isHorizontal: false,
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'product',
          xAccessor: 'date',
          title: '',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
      state: currentState,
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'area',
      layers: [{ ...currentState.layers[0], seriesType: 'area' }],
    });
    expect(suggestion.previewIcon).toEqual('visArea');
    expect(suggestion.title).toEqual('Area chart');
  });

  test('suggests a flipped chart for unchanged table and existing bar chart on ordinal x axis', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      isHorizontal: false,
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
          title: '',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), strCol('product')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
      state: currentState,
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      isHorizontal: true,
    });
    expect(suggestion.title).toEqual('Flip');
  });

  test('supports multiple suggestions', () => {
    (generateId as jest.Mock).mockReturnValueOnce('bbb').mockReturnValueOnce('ccc');
    const [s1, s2, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('price'), dateCol('date')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('count'), strCol('country')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect([suggestionSubset(s1), suggestionSubset(s2)]).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      Object {
                        "seriesType": "bar",
                        "splitAccessor": "bbb",
                        "x": "date",
                        "y": Array [
                          "price",
                        ],
                      },
                    ],
                    Array [
                      Object {
                        "seriesType": "bar",
                        "splitAccessor": "ccc",
                        "x": "country",
                        "y": Array [
                          "count",
                        ],
                      },
                    ],
                  ]
            `);
  });

  test('handles two numeric values', () => {
    (generateId as jest.Mock).mockReturnValueOnce('ddd');
    const [suggestion] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('quantity'), numCol('price')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "bar",
                      "splitAccessor": "ddd",
                      "x": "quantity",
                      "y": Array [
                        "price",
                      ],
                    },
                  ]
            `);
  });

  test('handles unbucketed suggestions', () => {
    (generateId as jest.Mock).mockReturnValueOnce('eee');
    const [suggestion] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [
            numCol('num votes'),
            {
              columnId: 'mybool',
              operation: {
                dataType: 'boolean',
                isBucketed: false,
                label: 'Yes / No',
              },
            },
          ],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "bar",
                      "splitAccessor": "eee",
                      "x": "mybool",
                      "y": Array [
                        "num votes",
                      ],
                    },
                  ]
            `);
  });

  test('adds a preview expression with disabled axes and legend', () => {
    const [suggestion] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('bytes'), dateCol('date')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ],
    });

    const expression = suggestion.previewExpression! as Ast;

    expect(
      (expression.chain[0].arguments.legend[0] as Ast).chain[0].arguments.isVisible[0]
    ).toBeFalsy();
    expect(
      (expression.chain[0].arguments.layers[0] as Ast).chain[0].arguments.hide[0]
    ).toBeTruthy();
  });
});
