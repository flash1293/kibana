/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import { EuiScreenReaderOnly, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type Dragging =
  | (Record<string, unknown> & {
      id: string;
    })
  | undefined;

export type DropTargetIdentifier = Record<string, unknown> & { name?: string };

/**
 * The shape of the drag / drop context.
 */
export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging: Dragging;

  /**
   * Set the item being dragged.
   */
  setDragging: (dragging: Dragging) => void;

  activeDropTarget?: {
    activeDropTarget?: DropTargetIdentifier;
    dropTargetsByOrder: Record<
      string,
      { dropTarget: DropTargetIdentifier; canDrop?: (dragging: unknown) => boolean } | undefined
    >;
  };

  setActiveDropTarget: (newTarget?: DropTargetIdentifier) => void;

  registerDropTarget: (
    order: number[],
    dropTarget?: DropTargetIdentifier,
    canDrop?: (dragging: unknown) => boolean
  ) => void;
}

/**
 * The drag / drop context singleton, used like so:
 *
 * const { dragging, setDragging } = useContext(DragContext);
 */
export const DragContext = React.createContext<DragContextState>({
  dragging: undefined,
  setDragging: () => {},
  activeDropTarget: undefined,
  setActiveDropTarget: () => {},
  registerDropTarget: () => {},
});

/**
 * The argument to DragDropProvider.
 */
export interface ProviderProps {
  /**
   * The item being dragged. If unspecified, the provider will
   * behave as if it is the root provider.
   */
  dragging: Dragging;

  /**
   * Sets the item being dragged. If unspecified, the provider
   * will behave as if it is the root provider.
   */
  setDragging: (dragging: Dragging) => void;

  activeDropTarget?: {
    activeDropTarget?: DropTargetIdentifier;
    dropTargetsByOrder: Record<
      string,
      { dropTarget: DropTargetIdentifier; canDrop?: (dragging: unknown) => boolean } | undefined
    >;
  };

  setActiveDropTarget: (newTarget?: DropTargetIdentifier) => void;

  registerDropTarget: (
    order: number[],
    dropTarget?: DropTargetIdentifier,
    canDrop?: (dragging: unknown) => boolean
  ) => void;

  /**
   * The React children.
   */
  children: React.ReactNode;
}

/**
 * A React provider that tracks the dragging state. This should
 * be placed at the root of any React application that supports
 * drag / drop.
 *
 * @param props
 */
export function RootDragDropProvider({ children }: { children: React.ReactNode }) {
  const [draggingState, setDraggingState] = useState<{ dragging: Dragging }>({
    dragging: undefined,
  });
  const [activeDropTargetState, setActiveDropTargetState] = useState<{
    activeDropTarget?: DropTargetIdentifier;
    dropTargetsByOrder: Record<
      string,
      { dropTarget: DropTargetIdentifier; canDrop?: (dragging: unknown) => boolean } | undefined
    >;
  }>({
    activeDropTarget: undefined,
    dropTargetsByOrder: {},
  });
  const setDragging = useMemo(() => (dragging: Dragging) => setDraggingState({ dragging }), [
    setDraggingState,
  ]);
  const setActiveDropTarget = useMemo(
    () => (activeDropTarget?: DropTargetIdentifier) =>
      setActiveDropTargetState((s) => ({ ...s, activeDropTarget })),
    [setActiveDropTargetState]
  );

  const registerDropTarget = useMemo(
    () => (
      order: number[],
      dropTarget?: DropTargetIdentifier,
      canDrop?: (dragging: unknown) => boolean
    ) =>
      setActiveDropTargetState((s) => ({
        ...s,
        dropTargetsByOrder: {
          ...s.dropTargetsByOrder,
          [order.join(',')]: dropTarget ? { dropTarget, canDrop } : undefined,
        },
      })),
    [setActiveDropTargetState]
  );

  return (
    <ChildDragDropProvider
      dragging={draggingState.dragging}
      setDragging={setDragging}
      activeDropTarget={activeDropTargetState}
      setActiveDropTarget={setActiveDropTarget}
      registerDropTarget={registerDropTarget}
    >
      {children}
    </ChildDragDropProvider>
  );
}

export function nextValidDropTarget(
  dropTargetsByOrder: Record<
    string,
    { dropTarget: DropTargetIdentifier; canDrop?: (dragging: unknown) => boolean } | undefined
  >,
  dragging: unknown,
  currentlyActiveDropTargetOrder?: number[]
) {
  const nextDropTarget = Object.entries(dropTargetsByOrder)
    .filter(([, target]) => target?.canDrop && target.canDrop(dragging))
    .sort(([orderA], [orderB]) => {
      const parsedOrderA = orderA.split(',').map((v) => Number(v));
      const parsedOrderB = orderB.split(',').map((v) => Number(v));

      const relevantLevel = parsedOrderA.findIndex((v, i) => parsedOrderA[i] !== parsedOrderB[i]);
      return parsedOrderA[relevantLevel] - parsedOrderB[relevantLevel];
    })
    .find(([targetOrder, target]) => {
      const parsedOrder = targetOrder.split(',').map((v) => Number(v));

      const relevantLevel = parsedOrder.findIndex(
        (v, i) =>
          parsedOrder[i] !==
          (currentlyActiveDropTargetOrder ? currentlyActiveDropTargetOrder[i] : 0)
      );
      return (
        parsedOrder[relevantLevel] -
        (currentlyActiveDropTargetOrder ? currentlyActiveDropTargetOrder[relevantLevel] : 0)
      );
    });

  if (nextDropTarget) {
    return nextDropTarget[1]?.dropTarget;
  }
}

/**
 * A React drag / drop provider that derives its state from a RootDragDropProvider. If
 * part of a React application is rendered separately from the root, this provider can
 * be used to enable drag / drop functionality within the disconnected part.
 *
 * @param props
 */
export function ChildDragDropProvider({
  dragging,
  setDragging,
  activeDropTarget,
  setActiveDropTarget,
  registerDropTarget,
  children,
}: ProviderProps) {
  const value = useMemo(
    () => ({ dragging, setDragging, activeDropTarget, setActiveDropTarget, registerDropTarget }),
    [setDragging, dragging, activeDropTarget, setActiveDropTarget, registerDropTarget]
  );
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export interface ReorderState {
  /**
   * Ids of the elements that are translated up or down
   */
  reorderedItems: string[];

  /**
   * Direction of the move of dragged element in the reordered list
   */
  direction: '-' | '+';
  /**
   * height of the dragged element
   */
  draggingHeight: number;
  /**
   * indicates that user is in keyboard mode
   */
  isReorderOn: boolean;
  /**
   * aria-live message for changes in reordering
   */
  keyboardReorderMessage: string;
  /**
   * aria-live message to use once the current action is comitted
   */
  pendingActionSuccessMessage?: string;
  /**
   * reorder group needed for screen reader aria-described-by attribute
   */
  groupId: string;
}

type SetReorderStateDispatch = (prevState: ReorderState) => ReorderState;

export interface ReorderContextState {
  reorderState: ReorderState;
  setReorderState: (dispatch: SetReorderStateDispatch) => void;
}

export const ReorderContext = React.createContext<ReorderContextState>({
  reorderState: {
    reorderedItems: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    keyboardReorderMessage: '',
    groupId: '',
  },
  setReorderState: () => () => {},
});

export function ReorderProvider({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<ReorderContextState['reorderState']>({
    reorderedItems: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    keyboardReorderMessage: '',
    groupId: id,
  });

  const setReorderState = useMemo(() => (dispatch: SetReorderStateDispatch) => setState(dispatch), [
    setState,
  ]);

  return (
    <div className={classNames(className, { 'lnsDragDrop-isActiveGroup': state.isReorderOn })}>
      <ReorderContext.Provider value={{ reorderState: state, setReorderState }}>
        {children}
      </ReorderContext.Provider>
      <EuiPortal>
        <EuiScreenReaderOnly>
          <div>
            <p id="lnsDragDrop-reorderAnnouncement" aria-live="assertive" aria-atomic={true}>
              {state.keyboardReorderMessage}
            </p>
            <p id={`lnsDragDrop-reorderInstructions-${id}`}>
              {i18n.translate('xpack.lens.dragDrop.reorderInstructions', {
                defaultMessage: `Press space bar to start reordering the dimension group. When dragging, use arrow keys to reorder. Press space bar again to finish.`,
              })}
            </p>
            <p id={`lnsDragDrop-groupMovementInstructions-${id}`}>
              {i18n.translate('xpack.lens.dragDrop.groupMovementInstructions', {
                defaultMessage: `Use right arrow key to move dimension to next group.`,
              })}
            </p>
          </div>
        </EuiScreenReaderOnly>
      </EuiPortal>
    </div>
  );
}
