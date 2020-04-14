/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiListGroup,
  EuiPanel,
  EuiIcon,
  EuiComboBox,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiListGroupItem,
  EuiIconTip,
} from '@elastic/eui';
import { connect } from 'react-redux';
import { GraphState, metaDataSelector, selectedFieldsSelector } from '../../state_management';
import { SignificantSearchBar } from './significant_search_bar';
import { EditNodesPanel, NodeIcon } from '../edit_nodes_panel';
import { WorkspaceField } from '../../types';
import { iconChoices } from '../../helpers/style_choices';

function AddDataPanelComponent(props: any) {
  const workspace = props.clientWorkspace;

  const [significantVertices, setSignificantVertices] = useState<any[]>([]);
  const [query, setQuery] = useState<any>(undefined);
  const [selectedField, setSelectedField] = useState<WorkspaceField | undefined>(undefined);
  const [terms, setTerms] = useState<any[]>([]);
  const [freeField, setFreeField] = useState<string>('');
  const [freeTerm, setFreeTerm] = useState<string>('');

  useEffect(() => {
    if (!workspace) return;
    if (!selectedField) {
      setTerms([]);
      return;
    }
    workspace.getTermsForField(res => {
      setTerms(res);
    }, selectedField.name);
  }, [selectedField, props.filter]);

  async function loadInterestingNodes(workspace: any) {
    if (!workspace) return;
    const activeFields = props.fields.filter(field => field.hopSize > 0);
    if (activeFields.length == 0) return;
    const result = await workspace.getInterestingNodes(query, activeFields);
    setSignificantVertices(result.nodes);
  }
  const selectedNodesId = (props.selectedNodes || []).map(node => node.id).join(',');
  const activeFields = (props.fields || [])
    .filter(field => field.hopSize > 0)
    .map(field => field.name)
    .join(',');

  useEffect(() => {
    // reset query when user interacts with graph
    setQuery(undefined);
  }, [selectedNodesId]);

  useEffect(() => {
    loadInterestingNodes(workspace);
  }, [workspace, query, selectedNodesId, props.filter, activeFields]);

  if (!workspace || !props.fields || props.fields.length === 0) return null;
  if (props.mode === 'edit') {
    return <EditNodesPanel {...props} />;
  }
  const significantVerticesNodesList = significantVertices.filter(
    // filter out all vertices already added
    vertex =>
      !workspace.nodes ||
      !workspace.nodes.some(
        (workspaceNode: any) =>
          workspaceNode.data.term === vertex.term && workspaceNode.data.field === vertex.field
      )
  );

  return (
    <EuiFlexItem className="gphGraphSidebar" grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <div className="gphGraphSidebar__header">
          <EuiTitle size="xs" className="gphGraphSidebar__title">
            <h2>Add Data</h2>
          </EuiTitle>

          <EuiButtonIcon
            className="gphGraphSidebar__toggleIcon"
            iconType="menuRight"
            color="text"
            onClick={() => {
              props.setSidebarOpen(false);
            }}
          />
        </div>
        <div className="gphGraphSidebar__body">
          <div className="gphGraphSidebar__bodyOverflow">
            {workspace && (
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiAccordion
                      initialIsOpen={true}
                      buttonContent={
                        <EuiTitle size="xs" className="gphGraphSidebar__panelTitle">
                          <h4>
                            Add Significant vertices
                            <EuiIconTip
                              content="Add vertices which show significant connections to your current selection or search. This list will update automatically if you change your selection."
                              position="right"
                            />
                          </h4>
                        </EuiTitle>
                      }
                    >
                      <EuiSpacer size="s" />
                      {(query || !props.selectedNodes || !props.selectedNodes.length > 0) && (
                        <>
                          <SignificantSearchBar
                            {...props}
                            onQuerySubmit={(query: any) => {
                              setQuery(query);
                            }}
                          />
                          <EuiSpacer size="m" />
                        </>
                      )}

                      {query ? (
                        <p>
                          Based on current search query{' '}
                          <EuiButtonIcon
                            iconType="trash"
                            aria-label="remove"
                            onClick={() => setQuery(undefined)}
                            color="danger"
                          />
                        </p>
                      ) : props.selectedNodes && props.selectedNodes.length > 0 ? (
                        <>
                          <EuiText>
                            <p>
                              Based on current selection of {props.selectedNodes.length} vertices:
                            </p>
                          </EuiText>
                          {/* <div className="gphAddData__selectedNodesArea">
                            {props.selectedNodes.map(node => (
                              <EuiToolTip
                                position="top"
                                className="gphAddData__selectedNodesArea__icon"
                                content={`${node.data.field}: ${node.data.term}`}
                              >
                                <NodeIcon node={node} />
                              </EuiToolTip>
                            ))}
                            <EuiButtonIcon
                              className="gphAddData__selectedNodesArea__delete"
                              aria-label="remove"
                              iconType="trash"
                              color="danger"
                              onClick={() => {
                                workspace.selectNone();
                                props.notifyAngular();
                              }}
                            />
                          </div> */}
                        </>
                      ) : (
                        <EuiText size="m">
                          <p>Based on vertices in the workspace</p>
                        </EuiText>
                      )}

                      <EuiSpacer size="xs" />

                      {significantVerticesNodesList.length > 0 ? (
                        <EuiListGroup className="gphAddData__nodesAddList">
                          {significantVerticesNodesList.map(vertex => (
                            <EuiListGroupItem
                              key={`${vertex.field}-${vertex.term}`}
                              className="gphAddData__nodesAddList__item"
                              onClick={async () => {
                                await workspace.addNodes([vertex]);
                                await loadInterestingNodes(workspace);
                              }}
                              label={
                                <>
                                  <NodeIcon node={vertex} />
                                  <EuiText size="s" className="gphAddData__nodesAddList__itemText">
                                    <span>{`${vertex.field}: ${vertex.term}`}</span>
                                  </EuiText>
                                  <EuiIcon
                                    type="plusInCircleFilled"
                                    className="gphAddData__nodesAddList__itemIcon"
                                  />
                                </>
                              }
                            />
                          ))}
                        </EuiListGroup>
                      ) : (
                        <div className="gphAddData__nodesAddList">No vertices to add</div>
                      )}

                      <EuiSpacer size="s" />

                      <EuiTextAlign textAlign="center">
                        <EuiButtonEmpty
                          disabled={significantVerticesNodesList.length < 1}
                          iconType="plusInCircleFilled"
                          className="gphAddData__ce"
                          onClick={async () => {
                            await workspace.addNodes(significantVertices);
                            await loadInterestingNodes(workspace);
                          }}
                        >
                          Add all
                        </EuiButtonEmpty>
                      </EuiTextAlign>
                    </EuiAccordion>
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiAccordion
                      initialIsOpen={false}
                      buttonContent={
                        <EuiTitle size="xs" className="gphGraphSidebar__panelTitle">
                          <h4>
                            Vertices by field
                            <EuiIconTip
                              content="Add vertices by selecting one of your exploration fields and seeing a list of the most common terms."
                              position="right"
                            />
                          </h4>
                        </EuiTitle>
                      }
                    >
                      <EuiSpacer size="s" />
                      <EuiComboBox
                        placeholder="Select a single option"
                        singleSelection={{ asPlainText: true }}
                        options={props.fields.map(field => ({ label: field.name }))}
                        selectedOptions={selectedField ? [{ label: selectedField.name }] : []}
                        onChange={choices => {
                          setSelectedField(
                            props.fields.find(field => field.name === choices[0].label)
                          );
                        }}
                        isClearable={false}
                      />
                      {selectedField && (
                        <>
                          <EuiListGroup
                            flush
                            className="gphAddData__nodesAddList"
                            listItems={terms
                              .filter(
                                // filter out all vertices already added
                                vertex =>
                                  !workspace.nodes ||
                                  !workspace.nodes.some(
                                    (workspaceNode: any) =>
                                      workspaceNode.data.term === vertex.term &&
                                      workspaceNode.data.field === vertex.field
                                  )
                              )
                              .map(vertex => ({
                                label: `${vertex.field}: ${vertex.term}`,
                                icon: <NodeIcon node={vertex} />,
                                size: 's',
                                onClick: async () => {
                                  await workspace.addNodes([vertex]);
                                  workspace.getTermsForField(res => {
                                    setTerms(res);
                                  }, selectedField.name);
                                },
                              }))}
                          />

                          <EuiButtonEmpty
                            className="gphAddData__ce"
                            iconType="plusInCircleFilled"
                            onClick={async () => {
                              await workspace.addNodes(terms);
                              workspace.getTermsForField(res => {
                                setTerms(res);
                              }, selectedField.name);
                            }}
                          >
                            Add all
                          </EuiButtonEmpty>
                        </>
                      )}
                    </EuiAccordion>
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiAccordion
                      initialIsOpen={false}
                      buttonContent={
                        <EuiTitle size="xs" className="gphGraphSidebar__panelTitle">
                          <h4>
                            Free vertex
                            <EuiIconTip
                              content="Add a vertex by freely specifying a field and the respective term."
                              position="right"
                            />
                          </h4>
                        </EuiTitle>
                      }
                    >
                      <EuiSpacer size="s" />
                      <EuiFieldText
                        placeholder="Field"
                        value={freeField}
                        onChange={e => {
                          setFreeField(e.target.value);
                        }}
                      />{' '}
                      ={' '}
                      <EuiFieldText
                        placeholder="Term"
                        value={freeTerm}
                        onChange={e => {
                          setFreeTerm(e.target.value);
                        }}
                      />
                      <EuiButtonEmpty
                        disabled={!freeField || !freeTerm}
                        className="gphAddData__ce"
                        iconType="plusInCircleFilled"
                        onClick={async () => {
                          await workspace.addNodes([
                            {
                              color: '#aaa',
                              icon: iconChoices[0],
                              field: freeField,
                              term: freeTerm,
                              alwaysKeep: true,
                            },
                          ]);
                        }}
                      >
                        Add
                      </EuiButtonEmpty>
                    </EuiAccordion>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        </div>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

export const AddDataPanel = connect(
  (state: GraphState) => {
    return {
      mode: metaDataSelector(state).mode,
      fields: selectedFieldsSelector(state),
      // hasDatasource: hasDatasourceSelector(state),
      // hasFields: hasFieldsSelector(state),
    };
  },
  dispatch => ({
    // onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => {
    //   dispatch(
    //     requestDatasource({
    //       type: 'indexpattern',
    //       id: indexPattern.id,
    //       title: indexPattern.attributes.title,
    //     })
    //   );
    // },
    // onFillWorkspace: () => {
    //   dispatch(fillWorkspace());
    // },
  })
)(AddDataPanelComponent);
