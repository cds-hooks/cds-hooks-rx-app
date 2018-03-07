import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Modal from 'terra-modal';
import Button from 'terra-button';
import Dialog from 'terra-dialog';
import Spacer from 'terra-spacer';
import Text from 'terra-text';

import styles from './fhir-server-entry.css';
import BaseEntryBody from '../BaseEntryBody/base-entry-body';
import retrieveFhirMetadata from '../../retrieve-data-helpers/fhir-metadata-retrieval';

const propTypes = {
  currentFhirServer: PropTypes.string.isRequired,
  isEntryRequired: PropTypes.bool,
  isOpen: PropTypes.bool,
  resolve: PropTypes.func,
};

export class FhirServerEntry extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: this.props.isOpen,
      userInput: '',
      shouldDisplayError: false,
      errorMessage: '',
    }

    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleResetDefaultServer = this.handleResetDefaultServer.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.isOpen !== nextProps.isOpen) {
      this.setState({ isOpen: nextProps.isOpen });
    }
  }

  handleCloseModal() {
    this.setState({ isOpen: false, shouldDisplayError: false, errorMessage: '' });
  }

  handleChange(e) {
    this.setState({ userInput: e.target.value });
  }

  async handleSubmit() {
    if (this.state.userInput === '' || !this.state.userInput || !this.state.userInput.trim()) {
      return this.setState({ shouldDisplayError: true, errorMessage: 'Enter a valid FHIR server base url' });
    }
    let checkUrl = this.state.userInput.trim();
    if (!/^(https?:)?\/\//i.test(checkUrl)) {
      checkUrl = 'http://' + checkUrl;
      this.setState({
        userInput: checkUrl
      });
    }
    try {
      const checkValidFhirServer = await retrieveFhirMetadata(checkUrl);
    } catch (e) {
      return this.setState({ 
        shouldDisplayError: true, 
        errorMessage: 'Failed to connect to the FHIR server. See console for details.' 
      });
    }
    this.setState({ isOpen: false, shouldDisplayError: false, errorMessage: '' });
    this.props.resolve();
    this.props.closePrompt();
  }

  async handleResetDefaultServer() {
    const retrieval = await retrieveFhirMetadata();
    this.setState({ isOpen: false, shouldDisplayError: false, errorMessage: '' });
  }

  render() {
    const headerContainer = (
      <Text weight={700} fontSize={20}>Change FHIR Server</Text>
    );

    const footerContainer = (<div className={styles['right-align']}>
      {this.props.resolve ? '' : 
      <div className={styles['left-aligned-text']}>
        <Button text="Reset to default FHIR server" 
                variant='de-emphasis' 
                onClick={this.handleResetDefaultServer} />
      </div>}
      <Button text="Next" variant='emphasis' onClick={this.handleSubmit} />
      {this.props.isEntryRequired ? '' : <Spacer marginLeft='small' isInlineBlock={true}>
        <Button text="Cancel" onClick={this.handleCloseModal} />
      </Spacer>}
    </div>);

    return (
      <div>
        <Modal ariaLabel="FHIR Server" 
               isOpen={this.state.isOpen}
               closeOnEsc={!this.props.isEntryRequired}
               closeOnOutsideClick={!this.props.isEntryRequired} 
               onRequestClose={this.handleCloseModal} 
               classNameModal={styles['fixed-size']} >
          <Dialog header={headerContainer} 
                  footer={footerContainer} 
                  onClose={this.props.isEntryRequired ? null : this.handleCloseModal}>
            <BaseEntryBody currentFhirServer={this.props.currentFhirServer} 
                           formFieldLabel='Enter a FHIR Server URL' 
                           shouldDisplayError={this.state.shouldDisplayError} 
                           errorMessage={this.state.errorMessage} 
                           placeholderText={this.props.currentFhirServer} 
                           inputOnChange={this.handleChange} 
                           inputName={'fhir-server-input'} />
          </Dialog>
        </Modal>
      </div>
    );
  }
}

const mapStateToProps = (store) => {
  return {
    currentFhirServer: store.fhirServerState.currentFhirServer
  }
};

export default connect(mapStateToProps)(FhirServerEntry);
