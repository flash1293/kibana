/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PaletteDefinition, PaletteOutput } from 'src/plugins/charts/public';
import { EuiColorPalettePicker } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../native_renderer';

export function PalettePicker({
  palettes,
  activePalette,
  setPalette,
}: {
  palettes: Record<string, PaletteDefinition>;
  activePalette?: PaletteOutput;
  setPalette: (palette: PaletteOutput) => void;
}) {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.palettePicker.label', {
        defaultMessage: 'Color palette',
      })}
    >
      <>
        <EuiColorPalettePicker
          palettes={Object.entries(palettes)
            .filter(([, { internal }]) => !internal)
            .map(([id, palette]) => {
              return {
                value: id,
                title: palette.title,
                type: 'fixed',
                palette: palette.getColors(
                  10,
                  id === activePalette?.name ? activePalette?.params : undefined
                ),
              };
            })}
          onChange={(newPalette) => {
            setPalette({
              type: 'palette',
              name: newPalette,
            });
          }}
          valueOfSelected={activePalette?.name || 'default'}
          selectionDisplay={'palette'}
        />
        {activePalette && palettes[activePalette.name].renderEditor && (
          <NativeRenderer
            render={palettes[activePalette.name].renderEditor!}
            nativeProps={{
              state: activePalette.params,
              setState: (updater) => {
                setPalette({
                  type: 'palette',
                  name: activePalette.name,
                  params: updater(activePalette.params),
                });
              },
            }}
          />
        )}
      </>
    </EuiFormRow>
  );
}
