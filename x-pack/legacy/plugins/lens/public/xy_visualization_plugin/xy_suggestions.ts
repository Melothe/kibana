/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import {
  SuggestionRequest,
  VisualizationSuggestion,
  TableSuggestionColumn,
  TableSuggestion,
} from '../types';
import { State } from './types';
import { generateId } from '../id_generator';
import { buildExpression } from './to_expression';

const columnSortOrder = {
  date: 0,
  string: 1,
  boolean: 2,
  number: 3,
};

/**
 * Generate suggestions for the xy chart.
 *
 * @param opts
 */
export function getSuggestions(
  opts: SuggestionRequest<State>
): Array<VisualizationSuggestion<State>> {
  return opts.tables
    .filter(
      ({ isMultiRow, columns }) =>
        // We only render line charts for multi-row queries. We require at least
        // two columns: one for x and at least one for y, and y columns must be numeric.
        // We reject any datasource suggestions which have a column of an unknown type.
        isMultiRow &&
        columns.length > 1 &&
        columns.some(col => col.operation.dataType === 'number') &&
        !columns.some(col => !columnSortOrder.hasOwnProperty(col.operation.dataType))
    )
    .map(table => getSuggestionForColumns(table, opts.state));
}

function getSuggestionForColumns(
  table: TableSuggestion,
  currentState?: State
): VisualizationSuggestion<State> {
  const [buckets, values] = partition(
    prioritizeColumns(table.columns),
    col => col.operation.isBucketed
  );

  if (buckets.length >= 1) {
    const [x, splitBy] = buckets;
    return getSuggestion(
      table.datasourceSuggestionId,
      table.layerId,
      x,
      values,
      splitBy,
      currentState
    );
  } else {
    const [x, ...yValues] = values;
    return getSuggestion(
      table.datasourceSuggestionId,
      table.layerId,
      x,
      yValues,
      undefined,
      currentState
    );
  }
}

// This shuffles columns around so that the left-most column defualts to:
// date, string, boolean, then number, in that priority. We then use this
// order to pluck out the x column, and the split / stack column.
function prioritizeColumns(columns: TableSuggestionColumn[]) {
  return [...columns].sort(
    (a, b) => columnSortOrder[a.operation.dataType] - columnSortOrder[b.operation.dataType]
  );
}

function getSuggestion(
  datasourceSuggestionId: number,
  layerId: string,
  xValue: TableSuggestionColumn,
  yValues: TableSuggestionColumn[],
  splitBy?: TableSuggestionColumn,
  currentState?: State
): VisualizationSuggestion<State> {
  const yTitle = yValues.map(col => col.operation.label).join(' & ');
  const xTitle = xValue.operation.label;
  const isDate = xValue.operation.dataType === 'date';

  // TODO: Localize the title, label, etc
  const preposition = isDate ? 'over' : 'of';
  const title = `${yTitle} ${preposition} ${xTitle}`;
  const state: State = {
    legend: currentState ? currentState.legend : { isVisible: true, position: Position.Right },
    layers: [
      ...(currentState ? currentState.layers.filter(layer => layer.layerId !== layerId) : []),
      {
        layerId,
        xAccessor: xValue.columnId,
        seriesType: splitBy && isDate ? 'line' : 'bar',
        splitAccessor: splitBy && isDate ? splitBy.columnId : generateId(),
        accessors: yValues.map(col => col.columnId),
        position: Position.Left,
        showGridlines: false,
        title: yTitle,
      },
    ],
  };

  return {
    title,
    score: 1,
    datasourceSuggestionId,
    state,
    previewIcon: isDate ? 'visLine' : 'visBar',
    previewExpression: buildExpression(
      {
        ...state,
        layers: state.layers.map(layer => ({ ...layer, hide: true })),
        legend: {
          ...state.legend,
          isVisible: false,
        },
      },
      { xTitle, yTitle }
    ),
  };
}