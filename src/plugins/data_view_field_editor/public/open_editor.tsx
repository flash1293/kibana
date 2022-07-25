/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldEditorLoader } from './components/field_editor_loader';
import { euiFlyoutClassname } from './constants';
import type { ApiService } from './lib/api';
import type {
  DataPublicPluginStart,
  DataView,
  DataViewField,
  DataViewsPublicPluginStart,
  FieldFormatsStart,
  RuntimeType,
  UsageCollectionStart,
} from './shared_imports';
import { createKibanaReactContext, toMountPoint } from './shared_imports';
import type { CloseEditor, Field, InternalFieldType, PluginStart } from './types';

/**
 * Options for opening the field editor
 * @public
 */
export interface OpenFieldEditorOptions {
  /**
   * context containing the data view the field belongs to
   */
  ctx: {
    dataView: DataView;
  };
  /**
   * action to take after field is saved
   */
  onSave?: (field: DataViewField) => void;
  /**
   * field to edit, for existing field
   */
  fieldName?: string;
  /**
   * pre-selectable options for new field creation
   */
  fieldToCreate?: Field;
}

interface Dependencies {
  core: CoreStart;
  /** The search service from the data plugin */
  search: DataPublicPluginStart['search'];
  dataViews: DataViewsPublicPluginStart;
  apiService: ApiService;
  fieldFormats: FieldFormatsStart;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  usageCollection: UsageCollectionStart;
}

export const getFieldEditorOpener =
  ({
    core,
    dataViews,
    fieldFormats,
    fieldFormatEditors,
    search,
    usageCollection,
    apiService,
  }: Dependencies) =>
  (options: OpenFieldEditorOptions): CloseEditor => {
    const { uiSettings, overlays, docLinks, notifications } = core;
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings,
      docLinks,
      http: core.http,
    });

    let overlayRef: OverlayRef | null = null;
    const canCloseValidator = {
      current: () => true,
    };

    const onMounted = (args: { canCloseValidator: () => boolean }) => {
      canCloseValidator.current = args.canCloseValidator;
    };

    const openEditor = ({
      onSave,
      fieldName: fieldNameToEdit,
      fieldToCreate,
      ctx: { dataView },
    }: OpenFieldEditorOptions): CloseEditor => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveField = (updatedField: DataViewField) => {
        closeEditor();

        if (onSave) {
          onSave(updatedField);
        }
      };

      const fieldToEdit = fieldNameToEdit ? dataView.getFieldByName(fieldNameToEdit) : undefined;

      if (fieldNameToEdit && !fieldToEdit) {
        const err = i18n.translate('indexPatternFieldEditor.noSuchFieldName', {
          defaultMessage: "Field named '{fieldName}' not found on index pattern",
          values: { fieldName: fieldNameToEdit },
        });
        notifications.toasts.addDanger(err);
        return closeEditor;
      }

      const isNewRuntimeField = !fieldNameToEdit;
      const isExistingRuntimeField =
        fieldToEdit &&
        fieldToEdit.runtimeField &&
        !fieldToEdit.isMapped &&
        // treat composite field instances as mapped fields for field editing purposes
        fieldToEdit.runtimeField.type !== ('composite' as RuntimeType);
      const fieldTypeToProcess: InternalFieldType =
        isNewRuntimeField || isExistingRuntimeField ? 'runtime' : 'concrete';

      overlayRef = overlays.openFlyout(
        toMountPoint(
          <KibanaReactContextProvider>
            <FieldEditorLoader
              onSave={onSaveField}
              onCancel={closeEditor}
              onMounted={onMounted}
              docLinks={docLinks}
              fieldToEdit={fieldToEdit}
              fieldToCreate={fieldToCreate}
              fieldTypeToProcess={fieldTypeToProcess}
              dataView={dataView}
              search={search}
              dataViews={dataViews}
              notifications={notifications}
              usageCollection={usageCollection}
              apiService={apiService}
              fieldFormatEditors={fieldFormatEditors}
              fieldFormats={fieldFormats}
              uiSettings={uiSettings}
            />
          </KibanaReactContextProvider>,
          { theme$: core.theme.theme$ }
        ),
        {
          className: euiFlyoutClassname,
          maxWidth: 708,
          size: 'l',
          ownFocus: true,
          hideCloseButton: true,
          'aria-label': isNewRuntimeField
            ? i18n.translate('indexPatternFieldEditor.createField.flyoutAriaLabel', {
                defaultMessage: 'Create field',
              })
            : i18n.translate('indexPatternFieldEditor.editField.flyoutAriaLabel', {
                defaultMessage: 'Edit {fieldName} field',
                values: {
                  fieldName: fieldNameToEdit,
                },
              }),
          onClose: (flyout) => {
            const canClose = canCloseValidator.current();
            if (canClose) {
              flyout.close();
            }
          },
          maskProps: {
            className: 'indexPatternFieldEditorMaskOverlay',
          },
        }
      );

      return closeEditor;
    };

    return openEditor(options);
  };
