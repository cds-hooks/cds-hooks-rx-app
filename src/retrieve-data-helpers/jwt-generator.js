import privKey from '../../keys/ecprivkey.pem';
import { productionClientId } from '../config/client-id';

const JWT = require('jsrsasign');
const uuid = require('uuid/v4');

function generateJWT(audience) {
  const jwtPayload = JSON.stringify({
    iss: 'https://sandbox.cds-hooks.org',
    sub: productionClientId,
    aud: audience,
    exp: Math.round((Date.now() / 1000) + 3600),
    iat: Math.round((Date.now() / 1000)),
    jti: uuid(),
  });

  const jwtHeader = JSON.stringify({
    alg: 'ES256',
    typ: 'JWT',
    kid: 'd9cd3c4f-eb08-4304-b973-44f352fd2ca2',
    jku: 'https://sandbox.cds-hooks.org/.well-known/jwks.json',
  });

  return JWT.jws.JWS.sign(null, jwtHeader, jwtPayload, privKey);
}

export default generateJWT;
