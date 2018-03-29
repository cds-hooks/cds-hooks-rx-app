import React from 'react';
import { shallow, mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import * as types from '../../../src/actions/action-types';

import { setHook } from '../../../src/actions/hook-actions';
import ConnectedView, { Header } from '../../../src/components/Header/header';

describe('Header component', () => {
  let storeState;
  let wrapper;
  let mountedWrapper;
  let pureComponent;
  let shallowedComponent;
  let mockStore;
  let mockStoreWrapper = configureStore([]);

  beforeEach(() => {
    storeState = { 
      hookState: { currentHook: 'patient-view' },
      patientState: { currentPatient: { id: 'patient-123' } }
    };
    mockStore = mockStoreWrapper(storeState);
    let component = <ConnectedView store={mockStore} />;
    wrapper = shallow(component);
    mountedWrapper = mount(component);
    pureComponent = wrapper.find(Header);
    shallowedComponent = pureComponent.shallow();
  });

  it('matches props passed down from Redux decorator', () => {
    expect(pureComponent.prop('hook')).toEqual(storeState.hookState.currentHook);
    expect(pureComponent.prop('setHook')).toBeDefined();
  });

  it('should only contain active links on the current hook/view', () => {
    expect(shallowedComponent.childAt(0).dive().find('.active-link').text()).toEqual('Patient View');
    expect(shallowedComponent.childAt(0).dive().find('.nav-links').not('.active-link').text()).toEqual('Rx View');
  });

  it('dispatches to switch hooks in app state if another view tab is clicked', () => {
    shallowedComponent.childAt(0).dive().find('.nav-links').not('.active-link').simulate('click');
    const medHookAction = { type: types.SET_HOOK, hook: 'medication-prescribe' };
    expect(mockStore.getActions()).toEqual([medHookAction]);
    shallowedComponent.childAt(0).dive().find('.active-link').simulate('click');
    const patientHookAction = { type: types.SET_HOOK, hook: 'patient-view' };
    expect(mockStore.getActions()).toEqual([medHookAction, patientHookAction]);
  });

  it('should set open status for settings menu accordingly', async () => {
    expect(shallowedComponent.state('settingsOpen')).toBeFalsy();
    shallowedComponent.childAt(0).dive().find('.icon').first().simulate('click');
    expect(shallowedComponent.state('settingsOpen')).toBeTruthy();
    shallowedComponent.find('Menu').childAt(0).simulate('click');
    expect(shallowedComponent.state('settingsOpen')).toBeFalsy();
  });

  describe('Change Patient', () => {
    beforeEach(() => {
      shallowedComponent.childAt(0).dive().find('.icon').first().simulate('click');
    });

    it('should open the modal to change a patient if the Change Patient option is clicked directly', () => {
      shallowedComponent.find('Menu').childAt(1).simulate('click');
      expect(shallowedComponent.state('isChangePatientOpen')).toBeTruthy();
      expect(shallowedComponent.state('settingsOpen')).toBeFalsy();
      expect(shallowedComponent.find('Connect(PatientEntry)').length).toEqual(1);
    });
  });

  describe('Change FHIR Server', () => {
    beforeEach(() => {
      shallowedComponent.childAt(0).dive().find('.icon').first().simulate('click');
    });

    it('should open the modal to change the FHIR server if the Change FHIR Server option is clicked directly', () => {
      shallowedComponent.find('Menu').childAt(2).simulate('click');
      expect(shallowedComponent.state('isChangeFhirServerOpen')).toBeTruthy();
      expect(shallowedComponent.state('settingsOpen')).toBeFalsy();
      expect(shallowedComponent.find('Connect(FhirServerEntry)').length).toEqual(1);
    });
  });

  describe('Add Services', () => {
    beforeEach(() => {
      shallowedComponent.childAt(0).dive().find('.icon').first().simulate('click');
    });

    it('should open the modal to add CDS Services if the Add Services option is clicked directly', () => {
      shallowedComponent.find('Menu').childAt(0).simulate('click');
      expect(shallowedComponent.state('isAddServicesOpen')).toBeTruthy();
      expect(shallowedComponent.state('settingsOpen')).toBeFalsy();
      expect(shallowedComponent.find('ServicesEntry').length).toEqual(1);
    });
  });
});
