/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { shallowWithIntl, nextTick, mountWithIntl } from 'test_utils/enzyme_helpers';
import { SecurityNavControl } from './nav_control_component';
import { AuthenticatedUser } from '../../common/model';
import { EuiPopover, EuiHeaderSectionItemButton } from '@elastic/eui';
import { findTestSubject } from 'test_utils/find_test_subject';

describe('SecurityNavControl', () => {
  it(`renders a loading spinner when the user promise hasn't resolved yet.`, async () => {
    const props = {
      user: new Promise(() => {}) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
      userMenuLinks$: new BehaviorSubject([]),
    };

    const wrapper = shallowWithIntl(<SecurityNavControl {...props} />);
    const { button } = wrapper.find(EuiPopover).props();
    expect(button).toMatchInlineSnapshot(`
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={false}
        aria-haspopup="true"
        aria-label="Account menu"
        data-test-subj="userMenuButton"
        onClick={[Function]}
      >
        <EuiLoadingSpinner
          size="m"
        />
      </EuiHeaderSectionItemButton>
    `);
  });

  it(`renders an avatar after the user promise resolves.`, async () => {
    const props = {
      user: Promise.resolve({ full_name: 'foo' }) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
      userMenuLinks$: new BehaviorSubject([]),
    };

    const wrapper = shallowWithIntl(<SecurityNavControl {...props} />);
    await nextTick();
    wrapper.update();
    const { button } = wrapper.find(EuiPopover).props();
    expect(button).toMatchInlineSnapshot(`
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={false}
        aria-haspopup="true"
        aria-label="Account menu"
        data-test-subj="userMenuButton"
        onClick={[Function]}
      >
        <EuiAvatar
          name="foo"
          size="s"
        />
      </EuiHeaderSectionItemButton>
    `);
  });

  it(`doesn't render the popover when the user hasn't been loaded yet`, async () => {
    const props = {
      user: Promise.resolve({ full_name: 'foo' }) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
      userMenuLinks$: new BehaviorSubject([]),
    };

    const wrapper = mountWithIntl(<SecurityNavControl {...props} />);
    // not awaiting the user promise

    expect(findTestSubject(wrapper, 'userMenu')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'profileLink')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'logoutLink')).toHaveLength(0);

    wrapper.find(EuiHeaderSectionItemButton).simulate('click');

    expect(findTestSubject(wrapper, 'userMenu')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'profileLink')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'logoutLink')).toHaveLength(0);
  });

  it('renders a popover when the avatar is clicked.', async () => {
    const props = {
      user: Promise.resolve({ full_name: 'foo' }) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
      userMenuLinks$: new BehaviorSubject([]),
    };

    const wrapper = mountWithIntl(<SecurityNavControl {...props} />);
    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'userMenu')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'profileLink')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'logoutLink')).toHaveLength(0);

    wrapper.find(EuiHeaderSectionItemButton).simulate('click');

    expect(findTestSubject(wrapper, 'userMenu')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'profileLink')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'logoutLink')).toHaveLength(1);
  });

  it('renders a popover with additional user menu links registered by other plugins', async () => {
    const props = {
      user: Promise.resolve({ full_name: 'foo' }) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
      userMenuLinks$: new BehaviorSubject([
        { label: 'link1', href: 'path-to-link-1', iconType: 'empty', order: 1 },
        { label: 'link2', href: 'path-to-link-2', iconType: 'empty', order: 2 },
        { label: 'link3', href: 'path-to-link-3', iconType: 'empty', order: 3 },
      ]),
    };

    const wrapper = mountWithIntl(<SecurityNavControl {...props} />);
    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'userMenu')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'profileLink')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'userMenuLink__link1')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'userMenuLink__link2')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'userMenuLink__link3')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'logoutLink')).toHaveLength(0);

    wrapper.find(EuiHeaderSectionItemButton).simulate('click');

    expect(findTestSubject(wrapper, 'userMenu')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'profileLink')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'userMenuLink__link1')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'userMenuLink__link2')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'userMenuLink__link3')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'logoutLink')).toHaveLength(1);
  });
});
