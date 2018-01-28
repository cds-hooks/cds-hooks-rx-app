import axios from 'axios'
import ActionTypes from '../actions/ActionTypes'
import defaultHooks from './HookStore.defaults'
import MedicationPrescribeStore from './MedicationPrescribeStore'
import PatientViewStore from './PatientViewStore'
import FhirServerStore from './FhirServerStore'
import HookStore from './HookStore'
import moment from 'moment'
import { getIn, paramsToJson } from '../../../mock-cds-backend/utils.js'
import CDS_SMART_OBJ from '../../smart_authentication';
import $ from 'jquery';
import queryString from 'query-string';
import clientId from '../../sandbox-client-id';

var AppDispatcher = require('../dispatcher/AppDispatcher')
var JWT = require('jsrsasign');
var EventEmitter = require('events').EventEmitter
var assign = require('object-assign')
var Immutable = require('immutable')
var DELAY = 0; // no delay to apply hooks
const uuidv4 = require('uuid/v4');

HookStore.addChangeListener(_hooksChanged)
FhirServerStore.addChangeListener(_hooksChanged)

var CHANGE_EVENT = 'change'
var state = Immutable.fromJS({
  calling: false,
  cards: [],
  services: Immutable.Map(),
  cardLinkInvoked: false
})

function getFhirContext() {
  var c = FhirServerStore.getState().get('context');
  return c.set('Patient.id', c.get('patient')).toJS()
}

function fillTemplate(template, context) {
  var flat = template.replace(/{{\s*Patient\.id\s*}}/g, context["Patient.id"]).toString();
  if (flat.split('?').length > 1) {
    var splitUrl = flat.split('?');
    var queryParams = queryString.parse(splitUrl[1]);
    Object.keys(queryParams).forEach((key) => {
      queryParams[key] = encodeURIComponent(queryParams[key]);
    });
    splitUrl[1] = queryString.stringify(queryParams, { encode: false });
    return splitUrl.join('?');
  }
  return flat;
}

function _externalAppReturned() {
  console.log("Handling external return by re-running hooks")
  callHooks(state)
}
function _hooksChanged() {
  var context = getFhirContext()
  var newHooks = HookStore.getState().get('hooks');
  if (!state.get('hooks')) {
    state = state.set('hooks', newHooks);
  }
  var hooks = newHooks.filter((v,k) => v.get('enabled'));
  var patient = FhirServerStore.getState().getIn(['context', 'patient']);

  var samePatient = patient === state.get('patient')
  var sameHooks = hooks.equals(state.get('hooks'))

  if (samePatient && sameHooks) {
    return;
  } else {
    state = state.set('services', hooks);
  }

  state = state.set('cards', Immutable.fromJS([]));
  state = state.set('hooks', hooks);
  state = state.set('patient', patient)

  var response = (url, r) => [
    url,
    {
      resource: r.data,
      response: {
        status: r.status + (r.statusText ? (" " + r.statusText) : "")
      }
    }
  ]

  var headerForPrefetch;
  if (CDS_SMART_OBJ.accessToken && CDS_SMART_OBJ.accessToken.access_token) {
    headerForPrefetch = {
      'Authorization': 'Bearer ' + CDS_SMART_OBJ.accessToken.access_token,
      'Accept': 'application/json+fhir'
    }
  } else {
    headerForPrefetch = {
      'Accept': 'application/json+fhir'
    }
  }

  var prefetch = hooks
    .reduce((coll, v)=> coll.union(
      v.get('prefetch', Immutable.Map())
        .valueSeq()),
      Immutable.Set())
    .map(url => [
      url,
      axios({
        url: context.baseUrl + '/' + fillTemplate(url, context),
        headers: headerForPrefetch,
        method: 'get'
      })
    ])
    .map(([url, p]) => p
      .then(r => response(url, r))
      .catch(r => response(url, r)))

  state = state.set('prefetch', Promise
    .all(prefetch)
    .then(Immutable.Map))

  callHooks(state);
}


var _hookUuid = uuidv4();

var idService = {
  createIds() {
    return {
      hookInstance: _hookUuid
    }
  }
}

var _base = window.location.protocol + "//" + window.location.host + window.location.pathname;
if (!_base.match(/.*\//)) {
  _base += "/";
}

function hookBody(h, fhir, prefetch) {
  var ids = idService.createIds();
  var serviceId = h.get('id')
  var ret = {
    hook: h.get('hook'),
    hookInstance: uuidv4(),
    fhirServer: FhirServerStore.getState().getIn(['context', 'baseUrl']),
    redirect: _base + "service-done.html",
    user: FhirServerStore.getState().getIn(['context', 'user']) || "Practitioner/example",
    patient: state.get('patient'),
    context: {
      patientId: state.get('patient'),
    },
    prefetch: h.get('prefetch', Immutable.Map())
               .map(v => prefetch.get(v))
  };
  if (CDS_SMART_OBJ.accessToken) {
    ret.fhirAuthorization = {
      scope: CDS_SMART_OBJ.accessToken.scope,
      token_type: 'Bearer',
      expires_in: CDS_SMART_OBJ.accessToken.expires_in,
      access_token: CDS_SMART_OBJ.accessToken.access_token,
      subject: clientId
    }
  }
  if (fhir) {
    Object.keys(state.get('fhir')).forEach((key) => {
      ret.context[key] = state.get('fhir')[key];
    });
  }

  var serviceRequest = Immutable.fromJS({
    request: Immutable.fromJS(ret),
    hook: h.get('hook')
  });

  state = state.setIn(['services', serviceId], serviceRequest);
  var servicesForHook = state.get('services').filter((service) => {
    return service.get('hook') === state.get('hook')
  });

  if (servicesForHook.get(state.get('serviceSelected'))) {
    state = state.set('serviceRequestBody', servicesForHook.get(state.get('serviceSelected')).get('request'));
  } else {
    state = state.set('serviceRequestBody', servicesForHook.first().get('request'));
  }
  return ret;
}

var cardKey = 0
function addCardsFrom(callCount, hookUrl, result) {
  if (!result.data) {
    return;
  }
  if (state.get('callCount') !== callCount) {
    return;
  }

  state = state.set('calling', false)
  var result = result.data;

  var decisions = result.decisions;
  if (decisions && decisions.length > 0) {
    AppDispatcher.dispatch({
      type: ActionTypes.TAKE_SUGGESTION,
      suggestion: {
        create: decisions[0].create
      }
    })
  } else {
    result.decisions = [];
  }

  var cards = result.cards || [];
  cards = Immutable.fromJS(cards)
             .map((v, k) => v.set('key', v.get('key') || cardKey++)
                             .set('suggestions', v.get('suggestions', []).map(s => s
                                 .set("key", s.get('key') || cardKey++)
                                 .set("suggestionUrl", hookUrl + "/analytics/" + s.get("uuid"))))
                             .set('links', v.get('links', []).map(s => s
                                 .set("key", s.get('key') || cardKey++))
                              )).toJS();

  var newCards = state.get('cards').push(...cards);
  state = state.set('cards', newCards);

  result.cards = cards;
  var insertResponse = Immutable.fromJS({
    response: result
  });
  state = state.mergeIn(['services', hookUrl], insertResponse);

  var servicesForHook = state.get('services').filter((service) => {
    return service.get('hook') === state.get('hook')
  });

  if (servicesForHook.get(state.get('serviceSelected'))) {
    state = state.set('serviceResponseBody', servicesForHook.get(state.get('serviceSelected')).get('response'));
  } else {
    state = state.set('serviceResponseBody', servicesForHook.first().get('response'));
  }
  DecisionStore.emitChange();
}

var callCount = 0;
function callHooks(localState) {
  var myCallCount = callCount++;
  state = state.set('cards', Immutable.fromJS([]));
  state = state.set('callCount', myCallCount)
  state = state.set('calling', true)

  var applicableServices = localState
  .get('hooks')
  .filter((h, hookUrl) => h.get('hook') === localState.get('hook'))

  if (applicableServices.count() == 0) {
    state = state.set('calling', false)
  }

  var ret = $.Deferred();

  function generateJwt(hookUrl, buildJwt) {
    if (window.sessionStorage['privatePem']) {
      return ret.resolve(buildJwt(hookUrl, window.sessionStorage['privatePem']));
    } else {
      $.ajax({
        url: 'https://raw.githubusercontent.com/cerner/cds-hooks-sandbox/master/ecprivatekey.pem',
        success: function(data) {
          window.sessionStorage['privatePem'] = data;
          return ret.resolve(buildJwt(hookUrl, data))
        }
      });
    }
  }


  function buildJwt(hookUrl, data) {
    var payload = JSON.stringify({
      iss: `${window.location.protocol}//sandbox.cds-hooks.org`,
      aud: hookUrl,
      exp: Math.round((Date.now() / 1000) + 3600),
      iat: Math.round((Date.now() / 1000)),
      jti: uuidv4(),
    });
    var header = JSON.stringify({
      alg: 'ES256',
      typ: 'JWT',
      kid: '9b4f5be8-055a-408d-9e1a-1af98dcf2509',
    });
    return JWT.jws.JWS.sign(null, header, payload, data);
  }

  function jwtPromise(hookUrl, buildJwt) {
    generateJwt(hookUrl, buildJwt);
    return ret.promise();
  }

  localState.get('prefetch')
    .then((prefetch) => {
      var results = applicableServices.map((h, hookUrl) => {
        ret = $.Deferred();
        return jwtPromise(h.get('url'), buildJwt).then(
          (val) => {
            return axios({
              url: h.get('url'),
              method: 'post',
              data: hookBody(h,
                localState.get('fhir'),
                prefetch),
              headers: {
                'Authorization': 'Bearer ' + val,
                'Content-Type': 'application/json'
              }
            });
          }
        )
      }
      ).forEach((p, hookUrl) => p.then((result) => {
        if (typeof result === 'string' || result instanceof String) { result = {}; }
        addCardsFrom(myCallCount, hookUrl, result);
        state = state.set('')
      }, () => {
        var invalidResponse = {
          cards: [],
          decisions: []
        };
        console.log("Failed CDS Service response", result);
        state = state.set('cards', invalidResponse);
        state.set('serviceResponseBody', invalidResponse);
      }));

    })
  DecisionStore.emitChange()
}


var DecisionStore = assign({}, EventEmitter.prototype, {

  getState: function() {
    return state
  },

  setActivity: function(hook) {
    console.log("Set hook", hook)
    state = state.merge(_stores[hook].getState());
    state.get('hookStore').processChange();
    DecisionStore.emitChange();
  },

  setActivityState: function(hook, resource) {
    if (hook !== state.get('hook')) {
      return;
    }

    if (!Immutable.is(resource, state.get('fhir'))) {
      state = state.set('serviceRequestBody', state.get('serviceRequestBody') || resource);
      if (hook === 'medication-prescribe') {
        state = state.set('fhir', {
          medications: [ resource.toJS() ]
        });
      } else {
        state = state.set('fhir', resource);
      }
      state = state.set('cards', Immutable.List())
      if (CDS_SMART_OBJ.processedContext) {
        setTimeout(() => callHooks(state), DELAY)
      }
    }
  },

  setService: function(id) {
    if (state.getIn(['services', id]).get('request') &&
      state.getIn(['services', id]).get('response')) {
      // Set the request and response for newly selected service from dropdown
      state = state.set('serviceSelected', id);
      state = state.set('serviceRequestBody', state.getIn(['services', id]).get('request'));
      state = state.set('serviceResponseBody', state.getIn(['services', id]).get('response'));
    }
    DecisionStore.emitChange();
  },

  setUserJsonValue: function(val) {
    state = state.set('tempUserJson', val);
    DecisionStore.emitChange()
  },

  getTestCard: function(testResult) {
    var cardKey = 0;
    var card = testResult ? Immutable.fromJS(testResult)
      .map((v, k) => v.set('key', cardKey++)
        .set('suggestions', v.get('suggestions', []).map(s => s
          .set("key", cardKey++)))
        .set('links', v.get('links', []).map(s => s
          .set("key", cardKey++))
        )).toJS() : [];
    state = state.set('tempCard', card);
    DecisionStore.emitChange();
  },

  cardLinkClick: function() {
    state = state.set('cardLinkInvoked', true);
    DecisionStore.emitChange();
  },

  getStateToPublish: function() {
    return {
      hook: state.get("hook")
    }
  },

  emitChange: function() {
    this.emit(CHANGE_EVENT)
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback)
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback)
  }


})

DecisionStore.dispatchToken = AppDispatcher.register(function(action) {

  switch (action.type) {

      case ActionTypes.EXTERNAL_APP_RETURNED:
          _externalAppReturned()
          break

      case ActionTypes.TAKE_SUGGESTION:
          if (action.suggestion.uuid){
            axios({
              url: action.suggestion.suggestionUrl,
              method: 'post'
            })
          }
          break

      case ActionTypes.INVOKE_CARD_LINK:
          DecisionStore.cardLinkClick();
          break;

      case ActionTypes.LOADED:
          break

      case ActionTypes.SET_ACTIVITY:
          DecisionStore.setActivity(action.hook)
          break

      case ActionTypes.NEW_HASH_STATE:
          var hash = action.hash;
          DecisionStore.setActivity(hash.hook || 'patient-view')
          break
      case ActionTypes.SET_SERVICE:
          DecisionStore.setService(action.service);
          break;
      case ActionTypes.UPDATE_TEMP_CARD:
          var arrayTemp = [];
          if (Array.isArray(action.result)) {
            arrayTemp.push(action.result[0]);
          } else {
            arrayTemp.push(action.result);
          }
          DecisionStore.getTestCard(arrayTemp);
          break;
      case ActionTypes.SAVE_USER_JSON:
          DecisionStore.setUserJsonValue(action.value);
          break;
      default:
          // do nothing
  }

})

var _stores = {
  'medication-prescribe': MedicationPrescribeStore.register(DecisionStore),
  'patient-view': PatientViewStore.register(DecisionStore)
};

module.exports = DecisionStore
