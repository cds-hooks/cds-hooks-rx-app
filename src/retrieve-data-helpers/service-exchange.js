import axios from 'axios';
import queryString from 'query-string';
import store from '../store/store';
import { storeExchange } from '../actions/service-exchange-actions';
import generateJWT from './jwt-generator';

const uuidv4 = require('uuid/v4');

/**
 * Encode each query parameter value for the query string of a prefetch condition
 * @param template - String URL to URI encode query parameters for
 * @returns {*} - String URL with its query parameters URI encoded if necessary
 */
function encodeUriParameters(template) {
  if (template && template.split('?').length > 1) {
    const splitUrl = template.split('?');
    const queryParams = queryString.parse(splitUrl[1]);
    Object.keys(queryParams).forEach((param) => {
      const val = queryParams[param];
      queryParams[param] = encodeURIComponent(val);
    });
    splitUrl[1] = queryString.stringify(queryParams, { encode: false });
    return splitUrl.join('?');
  }
  return template;
}

/**
 * Replace prefetch templates in the query parameters with the Patient ID and/or User ID in context
 * @param prefetch - Prefetch key/value pair from a CDS Service definition
 * @returns {*} - New prefetch key/value pair Object with prefetch template filled out
 */
function completePrefetchTemplate(prefetch) {
  const state = store.getState();
  const patient = state.patientState.currentPatient.id;
  const user = state.patientState.defaultUserId;
  const prefetchRequests = Object.assign({}, prefetch);
  Object.keys(prefetchRequests).forEach((prefetchKey) => {
    let prefetchTemplate = prefetchRequests[prefetchKey];
    prefetchTemplate = prefetchTemplate.replace(/{{\s*Patient\.id\s*}}/g, patient);
    prefetchTemplate = prefetchTemplate.replace(/{{\s*User\.id\s*}}/g, user);
    prefetchRequests[prefetchKey] = encodeUriParameters(prefetchTemplate);
  });
  return prefetchRequests;
}

/**
 * Fetch data from FHIR server for each prefetch request and return a Promise with the data resolved eventually
 * @param baseUrl - FHIR server base URL to prefetch data from
 * @param prefetch - Prefetch templates from a CDS Service definition filled out
 * @returns {Promise} - Promise object to eventually fetch data
 */
function prefetchDataPromises(baseUrl, prefetch) {
  const resultingPrefetch = {};
  const prefetchRequests = Object.assign({}, completePrefetchTemplate(prefetch));
  return new Promise((resolve) => {
    const prefetchKeys = Object.keys(prefetchRequests);
    const headers = { Accept: 'application/json+fhir' };
    const accessTokenProperty = store.getState().fhirServerState.accessToken;
    if (accessTokenProperty && accessTokenProperty.access_token) {
      headers.Authorization = `Bearer ${accessTokenProperty.access_token}`;
    }
    for (let i = 0; i < prefetchKeys.length; i += 1) {
      const prefetchValue = prefetchRequests[prefetchKeys[i]];
      axios({
        method: 'get',
        url: `${baseUrl}/${prefetchValue}`,
        headers,
      }).then((result) => {
        if (result.data && Object.keys(result.data).length) {
          resultingPrefetch[prefetchKeys[i]] = {
            response: { status: result.status },
            resource: result.data,
          };
        }
        if (i === prefetchKeys.length - 1) {
          resolve(resultingPrefetch);
        }
      }).catch((err) => {
        if (i === prefetchKeys.length - 1) {
          resolve(resultingPrefetch);
        }
        console.log(`Unable to prefetch data for ${baseUrl}/${prefetchValue}`, err);
      });
    }
  });
}

/**
 * Create a request payload to send to a specified CDS Service endpoint. Data filled out will be based
 * on the current state of config stored. Send the request to specified CDS Service and store the
 * request and response accordingly.
 * @param url - CDS Service Endpoint to construct request payload for
 * @param context - Any context to relay to the CDS Service in the request via the context parameter
 */
function callServices(url, context) {
  const state = store.getState();
  const hook = state.hookState.currentHook;
  const fhirServer = state.fhirServerState.currentFhirServer;
  const user = state.patientState.defaultUserId;

  const patient = state.patientState.currentPatient.id;
  const activityContext = context || {};
  activityContext.patientId = patient;

  const hookInstance = uuidv4();
  const request = {
    hookInstance,
    hook,
    fhirServer,
    user,
    patient,
    context: activityContext,
  };

  const serviceDefinition = state.cdsServicesState.configuredServices[url];

  if (serviceDefinition.prefetch) {
    const fulFilled = prefetchDataPromises(fhirServer, serviceDefinition.prefetch);
    return fulFilled.then((prefetch) => {
      if (prefetch && Object.keys(prefetch).length) {
        request.prefetch = prefetch;
      }

      return axios({
        method: 'post',
        url,
        data: request,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${generateJWT(url)}`,
        },
      }).then((result) => {
        if (result.data && Object.keys(result.data).length) {
          store.dispatch(storeExchange(url, request, result.data, result.status));
          return;
        }
        store.dispatch(storeExchange(url, request, 'No response returned. ' +
          'Check developer tools for more details.'));
      }).catch((err) => {
        console.error(`Could not POST data to CDS Service ${url}`, err);
        store.dispatch(storeExchange(url, request, 'Could not get a response from the CDS Service. ' +
          'See developer tools for more details'));
      });
    });
  }
  return axios({
    method: 'post',
    url,
    data: request,
    headers: { Accept: 'application/json' },
  }).then((result) => {
    if (result.data && Object.keys(result.data).length) {
      store.dispatch(storeExchange(url, request, result.data, result.status));
      return;
    }
    store.dispatch(storeExchange(url, request, 'No response returned. ' +
      'Check developer tools for more details.'));
  }).catch((err) => {
    console.error(`Could not POST data to CDS Service ${url}`, err);
    store.dispatch(storeExchange(url, request, 'Could not get a response from the CDS Service. ' +
      'See developer tools for more details'));
  });
}

export default callServices;
