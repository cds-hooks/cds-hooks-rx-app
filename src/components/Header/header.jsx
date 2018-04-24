import React, {Component} from 'react';
import {connect} from 'react-redux';
import cx from 'classnames';
import ApplicationHeaderLayout from 'terra-application-header-layout';
import IconSettings from 'terra-icon/lib/icon/IconSettings';
import IconChevronDown from 'terra-icon/lib/icon/IconChevronDown';
import Menu from 'terra-menu';
import Button from 'terra-button';
import IconLeft from 'terra-icon/lib/icon/IconLeft';
import IconEdit from 'terra-icon/lib/icon/IconEdit';

import ConfigureServices from '../ConfigureServices/configure-services';
import ServicesEntry from '../ServicesEntry/services-entry';
import PatientEntry from '../PatientEntry/patient-entry';
import FhirServerEntry from '../FhirServerEntry/fhir-server-entry';

import retrievePatient from '../../retrieve-data-helpers/patient-retrieval';
import retrieveDiscoveryServices from '../../retrieve-data-helpers/discovery-services-retrieval';
import { setHook } from '../../actions/hook-actions';
import { resetServices } from '../../actions/cds-services-actions';
import { toggleDemoView } from '../../actions/card-demo-actions';
import cdsHooksLogo from '../../assets/cds-hooks-logo.png';
import styles from './header.css';

export class Header extends Component {
  constructor(props) {
    super(props);

    this.state = {
      settingsOpen: false,
      isChangePatientOpen: false,
      isChangeFhirServerOpen: false,
      isAddServicesOpen: false,
      isConfigureServicesOpen: false,
    };

    this.switchHook = this.switchHook.bind(this);
    this.getNavClasses = this.getNavClasses.bind(this);
    this.setSettingsNode = this.setSettingsNode.bind(this);
    this.getSettingsNode = this.getSettingsNode.bind(this);

    this.openSettingsMenu = this.openSettingsMenu.bind(this);
    this.closeSettingsMenu = this.closeSettingsMenu.bind(this);
    this.openAddServices = this.openAddServices.bind(this);
    this.closeAddServices = this.closeAddServices.bind(this);
    this.openChangePatient = this.openChangePatient.bind(this);
    this.closeChangePatient = this.closeChangePatient.bind(this);
    this.openChangeFhirServer = this.openChangeFhirServer.bind(this);
    this.closeChangeFhirServer = this.closeChangeFhirServer.bind(this);
    this.openConfigureServices = this.openConfigureServices.bind(this);
    this.closeConfigureServices = this.closeConfigureServices.bind(this);

    this.resetServices = this.resetServices.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.patientId !== this.props.patientId) return false;
    return true;
  }

  switchHook(hook) { this.props.setHook(hook); }

  setSettingsNode(node) { this.settingsNode = node; }
  getSettingsNode() { return this.settingsNode; }

  openSettingsMenu() { this.setState({ settingsOpen: true }); }
  closeSettingsMenu() { this.setState({ settingsOpen: false }); }

  getNavClasses(hook) {
    return this.props.hook === hook ? cx(styles['nav-links'], styles['active-link']) : styles['nav-links'];
  }

  resetServices() {
    this.props.resetServices();
    retrieveDiscoveryServices();
  }

  openConfigureServices() {
    this.setState({ isConfigureServicesOpen: true });
    if (this.state.settingsOpen) this.closeSettingsMenu();
  }
  closeConfigureServices() { this.setState({ isConfigureServicesOpen: false }); }

  openAddServices() {
    this.setState({ isAddServicesOpen: true });
    if (this.state.settingsOpen) this.closeSettingsMenu();
  }
  closeAddServices() { this.setState({ isAddServicesOpen: false }); }

  async openChangePatient(e, testCurrentPatient) {
    if (testCurrentPatient) {
      try {
        const checkAndStoreValidPatient = await retrievePatient(this.props.patientId);
      } catch(e) {
        this.setState({ isChangePatientOpen: true });
        if (this.state.settingsOpen) this.closeSettingsMenu();
      }
    } else {
      this.setState({ isChangePatientOpen: true });
      if (this.state.settingsOpen) this.closeSettingsMenu();
    }
  }
  closeChangePatient() { this.setState({ isChangePatientOpen: false }); }

  openChangeFhirServer() {
    this.setState({ isChangeFhirServerOpen: true });
    if (this.state.settingsOpen) this.closeSettingsMenu();
  }
  closeChangeFhirServer() { this.setState({ isChangeFhirServerOpen: false }); }

  render() {
    const logo=<div><span><img src={cdsHooksLogo} height='30' width='30' /></span><b className={styles['logo-title']}>CDS Hooks Sandbox</b></div>;
    const changeFhirServer = this.props.isSecuredSandbox ? null : <Menu.Item text="Change FHIR Server" key="change-fhir-server" onClick={this.openChangeFhirServer} />;
    const menuItems = [<Menu.Item text='Add CDS Services' key='add-services' onClick={this.openAddServices} />,
      <Menu.Item text='Reset Default Services' key='reset-services' onClick={this.resetServices} />,
      <Menu.Item text='Configure CDS Services' key='configure-services' onClick={this.openConfigureServices} />,
      <Menu.Divider key="Divider1" />,
      <Menu.Item text='Change Patient' key='change-patient' onClick={this.openChangePatient} />];
    if (!this.props.isSecuredSandbox) {
      menuItems.push(<Menu.Item text="Change FHIR Server" key="change-fhir-server" onClick={this.openChangeFhirServer} />);
    }
    const gearMenu = <Menu isOpen={this.state.settingsOpen}
                           onRequestClose={this.closeSettingsMenu}
                           targetRef={this.getSettingsNode} 
                           isArrowDisplayed >
      {menuItems}
    </Menu>;

    const navigation = <div className={styles['nav-tabs']}>
      <div className={styles['nav-container']}>
        <a className={this.getNavClasses('patient-view')} onClick={() => this.switchHook('patient-view')}>Patient View</a>
        <a className={this.getNavClasses('medication-prescribe')} onClick={() => this.switchHook('medication-prescribe')}>Rx View</a>
      </div>
    </div>;
    const extensions = <div className={styles['extensions']}>
      <Button text={this.props.isCardDemoView ? 'Go Back' : 'Card Demo'}
              isIconOnly={false}
              icon={this.props.isCardDemoView ? <IconLeft /> : <IconEdit />}
              variant={'action'}
              onClick={this.props.toggleCardDemoView} />
    </div>
    const utilities=<div className={styles.icon} onClick={this.openSettingsMenu}>
      <span className={styles['padding-right']}><IconSettings height={'1.2em'} width={'1.2em'} /></span>
      <span className={styles['padding-right']} ref={this.setSettingsNode} ><IconChevronDown height={'1em'} width={'1em'} /></span>
    </div>; 

    return (
      <div>
        <ApplicationHeaderLayout logo={logo} 
                                 navigation={this.props.isCardDemoView ? null : navigation} 
                                 extensions={extensions}
                                 utilities={utilities}
                                 style={{'backgroundColor': '#384e77'}} />
        {gearMenu}
        {this.state.isAddServicesOpen ? <ServicesEntry isOpen={this.state.isAddServicesOpen} 
                                                       closePrompt={this.closeAddServices} /> : null}
        {this.state.isConfigureServicesOpen ? <ConfigureServices isOpen={this.state.isConfigureServicesOpen} 
                                                                 closePrompt={this.closeConfigureServices} /> : null}                                               
        {this.state.isChangePatientOpen ? <PatientEntry isOpen={this.state.isChangePatientOpen} 
                                                        closePrompt={this.closeChangePatient} /> : null}
        {this.state.isChangeFhirServerOpen ? <FhirServerEntry isOpen={this.state.isChangeFhirServerOpen} 
                                                              closePrompt={this.closeChangeFhirServer}
                                                              isEntryRequired={false} 
                                                              resolve={(e) => this.openChangePatient(e, true)} /> : null}
      </div>
    );
  }
}

const mapStateToProps = (store) => {
  return {
    hook: store.hookState.currentHook,
    patientId: store.patientState.currentPatient.id,
    isCardDemoView: store.cardDemoState.isCardDemoView,
    isSecuredSandbox: store.fhirServerState.accessToken,
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    setHook: (hook) => {
      dispatch(setHook(hook));
    },
    resetServices: () => {
      dispatch(resetServices());
    },
    toggleCardDemoView: () => {
      dispatch(toggleDemoView());
    }
  }
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
