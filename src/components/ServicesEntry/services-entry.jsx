import React, {Component} from 'react';
import PropTypes from 'prop-types';

import Modal from 'terra-modal';
import Button from 'terra-button';
import Dialog from 'terra-dialog';
import Spacer from 'terra-spacer';
import Text from 'terra-text';

import styles from './services-entry.css';
import BaseEntryBody from '../BaseEntryBody/base-entry-body';
import retrieveDiscoveryServices from '../../retrieve-data-helpers/discovery-services-retrieval';

const propTypes = {
  isOpen: PropTypes.bool,
  closePrompt: PropTypes.func,
};

export class ServicesEntry extends Component {
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
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.isOpen !== nextProps.isOpen) {
      this.setState({ isOpen: nextProps.isOpen });
    }
  }

  handleCloseModal() {
    this.setState({ isOpen: false, shouldDisplayError: false, errorMessage: '' });
    if (this.props.closePrompt) this.props.closePrompt();
  }

  handleChange(e) {
    this.setState({ userInput: e.target.value });
  }

  async handleSubmit() {
    if (this.state.userInput === '' || !this.state.userInput || !this.state.userInput.trim()) {
      return this.setState({ shouldDisplayError: true, errorMessage: 'Enter a valid discovery endpoint' });
    }
    let checkUrl = this.state.userInput.trim();
    if (!/^(https?:)?\/\//i.test(checkUrl)) {
      checkUrl = 'http://' + checkUrl;
      this.setState({
        userInput: checkUrl
      });
    }
    try {
      const checkValidFhirServer = await retrieveDiscoveryServices(checkUrl).then(() => {
        this.handleCloseModal();
      });
    } catch (e) {
      return this.setState({ 
        shouldDisplayError: true, 
        errorMessage: 'Failed to connect to the discovery endpoint. See console for details.' 
      });
    }
  }

  render() {
    const headerContainer = (
      <Text weight={700} fontSize={20}>Add CDS Services</Text>
    );

    const footerContainer = (<div className={styles['right-align']}>
      <Button text="Save" variant='emphasis' onClick={this.handleSubmit} />
      <Spacer marginLeft='small' isInlineBlock={true}>
        <Button text="Cancel" onClick={this.handleCloseModal} />
      </Spacer>
    </div>);

    return (
      <div>
        <Modal ariaLabel="CDS Services" 
               isOpen={this.state.isOpen}
               closeOnEsc={true}
               closeOnOutsideClick={true} 
               onRequestClose={this.handleCloseModal} 
               classNameModal={styles['fixed-size']} >
          <Dialog header={headerContainer} 
                  footer={footerContainer} 
                  onClose={this.handleCloseModal}>
            <BaseEntryBody formFieldLabel="Enter Discovery Endpoint URL" 
                           shouldDisplayError={this.state.shouldDisplayError} 
                           errorMessage={this.state.errorMessage} 
                           placeholderText={"https://example-services.com/cds-services"} 
                           inputOnChange={this.handleChange} 
                           inputName={'discovery-endpoint-input'} />
            <Text isItalic={true}>Note: See <a href="http://cds-hooks.org/specification/1.0/#discovery" target="_blank">documentation</a>&nbsp;for more details regarding the Discovery endpoint.</Text>
          </Dialog>
        </Modal>
      </div>
    );
  }
}

export default ServicesEntry;