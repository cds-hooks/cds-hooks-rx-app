var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var Immutable = require('immutable');
var JWT = require('jsrsasign');
import axios from 'axios'
import ActionTypes from '../actions/ActionTypes'
import defaultHooks from './HookStore.defaults'
import { schema, paramsToJson } from '../../../mock-cds-backend/utils.js'
import CDS_SMART_OBJ from '../../smart_authentication';
import $ from 'jquery';

const uuidv4 = require('uuid/v4');

var CHANGE_EVENT = 'change';
var state = Immutable.fromJS({
  editing: null,
  hooks: restoreHooks()
});

function saveHooks() {
  window.localStorage["cdsServices"] = JSON.stringify(state.get('hooks'));
  console.log("cdsServices saved. To reset, run resetHooks()")
}

window.saveHooks = saveHooks
window.resetHooks = resetHooks

function restoreHooks() {
  console.log("REstoring", defaultHooks)
  try {
    var hooks = JSON.parse(window.localStorage["cdsServices"]);
    return Immutable.fromJS(hooks);
  } catch (e) {
    console.log("restore hooks from defaults", defaultHooks);
    return Immutable.fromJS(defaultHooks);
  }
}

function resetHooks() {
  delete window.localStorage.cdsServices;
  state = state.set('hooks', restoreHooks());
}

function getJWT(hookUrl) {
  var ret = $.Deferred();

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

  function generateJwt(hookUrl) {
    if (window.sessionStorage['privatePem']) {
      return ret.resolve(buildJwt(hookUrl, window.sessionStorage['privatePem']));
    } else {
      $.ajax({
        url: 'https://raw.githubusercontent.com/cds-hooks/sandbox/master/ecprivatekey.pem',
        success: function(data) {
          window.sessionStorage['privatePem'] = data;
          return ret.resolve(buildJwt(hookUrl, data))
        }
      });
    }
  }

  generateJwt(hookUrl);
  return ret.promise();
}

var HookStore = assign({}, EventEmitter.prototype, {
  getState: function() {
    return state
  },

  emitChange: function() {
    saveHooks()
    this.emit(CHANGE_EVENT);
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  quickAddHook: function(url, result) {
    if (result && result.hasOwnProperty('data') && result.data.hasOwnProperty('services')) {
      var services = result.data.services;
      var generated = services.map(service => ({
        id: url + "/" + service.id,
        url: url + "/"+ service.id,
        enabled: true,
        hook: service.hook,
        title: service.title || '',
        prefetch: service.prefetch || {}
      }));

      generated.forEach(h => {
        AppDispatcher.dispatch({
          type: ActionTypes.SAVE_HOOK,
          id: h.url,
          value: h
        })
      });
      HookStore.emitChange();
    }
  },

  checkAndStoreValidService: function(serviceUrl, dfd) {
    getJWT(serviceUrl).then((data) => {
      axios({
        url: serviceUrl,
        method: 'get',
        headers: {
          'Authorization': `Bearer ${data}`,
          'Content-Type': 'application/json'
        }
      }).then(function (result) {
        if(result.status === 200) {
          if (result.hasOwnProperty('data') && result.data.hasOwnProperty('services')) {
            var services = result.data.services;
            if (services.length !== 0) {
              this.quickAddHook(serviceUrl, result);
            }
          }
        }
        return dfd.resolve(result);
      }.bind(this)).catch(function (result) {
        console.log("Error connecting to CDS Service", result);
        return dfd.resolve(result);
      });
    }, () => {
      console.error("Could not create a JWT for this call. Try adding your service again to the Sandbox");
      return dfd.reject();
    });
    return dfd.promise();
  }
});

HookStore.dispatchToken = AppDispatcher.register(function(action) {

  switch (action.type) {
    case ActionTypes.RESET_HOOKS:
        resetHooks()
        HookStore.emitChange()
        break;
    case ActionTypes.NEW_HOOK:
      state = state.set('editing', true)
      state = state.set('current', null)
      HookStore.emitChange();
      break;

    case ActionTypes.EDIT_HOOK:
      state = state.set('editing', true)
      state = state.set('current', action.id)
      HookStore.emitChange();
      break;

    case ActionTypes.TOGGLE_ENABLED:
      var current = state.getIn(['hooks', action.id, 'enabled'])
      state = state.setIn(['hooks', action.id, 'enabled'], !current)
      HookStore.emitChange();
      break;

    case ActionTypes.SAVE_HOOK:
      if (!action.discard) {
        state = state.setIn(['hooks', action.value.id], Immutable.fromJS(action.value));
        if (action.id !== action.value.id) {
          state = state.deleteIn(['hooks', action.id]);
        }
      } else {
        state = state.set('editing', false);
      }
      break;

    case ActionTypes.DELETE_HOOK:
      state = state.deleteIn(['hooks', action.id]);
      HookStore.emitChange();
      break;

    default:
  // do nothing
  }

});

module.exports = HookStore;
