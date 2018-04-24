import React, {Component} from 'react';
import { connect } from 'react-redux';
import LoadingOverlay from 'terra-overlay/lib/LoadingOverlay';

import smartLaunchPromise from '../../retrieve-data-helpers/smart-launch';
import retrieveFhirMetadata from '../../retrieve-data-helpers/fhir-metadata-retrieval';
import retrievePatient from '../../retrieve-data-helpers/patient-retrieval';
import retrieveDiscoveryServices from '../../retrieve-data-helpers/discovery-services-retrieval';
import store from '../../store/store';

import styles from './main-view.css';
import Header from '../Header/header';
import PatientView from '../PatientView/patient-view';
import RxView from '../RxView/rx-view';
import ContextView from '../ContextView/context-view';
import FhirServerEntry from '../FhirServerEntry/fhir-server-entry';
import PatientEntry from '../PatientEntry/patient-entry';
import CardDemo from '../CardDemo/card-demo';
import { setLoadingStatus } from '../../actions/ui-actions';
import { setHook } from '../../actions/hook-actions';

export class MainView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fhirServerPrompt: false,
      fhirServerPromptHold: null,
      patientPrompt: false,
      patientPromptHold: null,
    };

    this.closeFhirServerPrompt = this.closeFhirServerPrompt.bind(this);
    this.closePatientPrompt = this.closePatientPrompt.bind(this);
  }

  /**
   * TODO: Grab the following pieces of data (w/ face-up loading spinner) before displaying the EHR-view:
   *       1. Initiate SMART App launch (if applicable)
   *       2. Retrieve FHIR server in context (default configured)
   *       3. Retrieve Patient in context (default configured)
   *       4. Retrieve CDS Services in context (default configured)
   *       Finally, load the application UI
   *
   *       ERROR scenarios: If any errors occur, display an input box for the user to specify FHIR server or
   *       patient in context.
   */
  async componentDidMount()  {
    this.props.setLoader(true);
    this.props.setHook(localStorage.getItem('PERSISTED_hook') || 'patient-view');
    const smartLaunch = await smartLaunchPromise().catch(async () => {
      const persistedFhirServer = localStorage.getItem('PERSISTED_fhirServer');
      const getFhirServer = await retrieveFhirMetadata(persistedFhirServer).catch(() => {
        return new Promise((resolve) => {
          this.setState({ 
            fhirServerPrompt: true,
            fhirServerPromptHold: resolve, 
          });
        });
      });
    });
    if (this.state.fhirServerPrompt) this.setState({ fhirServerPrompt: false });
    const persistedPatientId = localStorage.getItem('PERSISTED_patientId');
    const getPatient = await retrievePatient(persistedPatientId).catch(() => {
      return new Promise((resolve) => {
        this.setState({
          patientPrompt: true,
          patientPromptHold: resolve,
        });
      });
    });
    if (this.state.patientPrompt) this.setState({ patientPrompt: false });
    const persistedServices = localStorage.getItem('PERSISTED_cdsServices');
    if (persistedServices) {
      const parsedServices = JSON.parse(persistedServices);
      if (parsedServices && parsedServices.length) {
        await parsedServices.forEach(async (discoveryEndpoint) => {
          await retrieveDiscoveryServices(discoveryEndpoint);
        });
      }
    }
    const getServiceDefinitions = await retrieveDiscoveryServices().catch(() => {
      this.props.setLoader(false);
    });
    this.props.setLoader(false);
  }

  closeFhirServerPrompt() {
    this.setState({ fhirServerPrompt: false });
  }

  closePatientPrompt() {
    this.setState({ patientPrompt: false });
  }

  render() {
    const hookView = this.props.hook === 'patient-view' ? <PatientView /> : <RxView />;
    const container = !this.props.isCardDemoView ? <div className={styles.container}>
      {hookView}
      <ContextView />
    </div> : <div className={styles.container}><CardDemo /></div>;

    return (
      <div>
        <LoadingOverlay isOpen={this.props.isLoadingData} isAnimated />
        <div className={styles.pin}><Header /></div>
        {this.state.fhirServerPrompt ? <FhirServerEntry isOpen={this.state.fhirServerPrompt} 
                        isEntryRequired={true}
                        closePrompt={this.closeFhirServerPrompt}
                        resolve={this.state.fhirServerPromptHold} /> : null}
        {this.state.patientPrompt ? <PatientEntry isOpen={this.state.patientPrompt} 
                      isEntryRequired={true}
                      closePrompt={this.closePatientPrompt}
                      resolve={this.state.patientPromptHold} /> : null}
        {this.props.isLoadingData ? '' : container}
      </div>
    );
  }
}

const mapStateToProps = (store) => {
  return {
    hook: store.hookState.currentHook,
    isLoadingData: store.hookState.isLoadingData,
    isCardDemoView: store.cardDemoState.isCardDemoView,
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    setLoader: (status) => {
      dispatch(setLoadingStatus(status));
    },
    setHook: (hook) => {
      dispatch(setHook(hook));
    },
  }
};

export default connect(mapStateToProps, mapDispatchToProps)(MainView);
