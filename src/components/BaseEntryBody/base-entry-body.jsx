import React, {Component} from 'react';
import Text from 'terra-text';
import Field from 'terra-form-field';
import Input from 'terra-form-input';

import styles from './base-entry-body.css';

const BaseEntryBody = ({currentFhirServer, formFieldLabel, shouldDisplayError, 
  errorMessage, placeholderText, inputOnChange, inputName}) => {

  let fhirServerDisplay;  
  if (currentFhirServer) {
    fhirServerDisplay = (
      <div>
        <Text weight={400} fontSize={16}>Current FHIR server</Text><br />
        <Text weight={200} fontSize={14}>{currentFhirServer}</Text>
      </div>
    );
  }  
  
  return (
    <div className={styles['container']}>
      {fhirServerDisplay}
      <div className={styles['vertical-separation']}>
        <Field label={formFieldLabel} 
               error='This field is required'
               isInvalid={shouldDisplayError}
               error={errorMessage}
               required >
          <Input name={inputName}
                 placeholder={placeholderText} 
                 onChange={inputOnChange}
                 required />
        </Field>
      </div>
    </div>
  );
};

export default BaseEntryBody;