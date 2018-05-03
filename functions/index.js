const functions = require('firebase-functions')
const crypto = require('crypto')
const safeCompare = require('safe-compare')

const SECRET = functions.config().github.secret

function IsPayloadFromGithub(request) {
  const theirHash = request.get('X-Hub-Signature')
  const ourHash =
    'sha1=' +
    crypto
      .createHmac('sha1', SECRET)
      .update(JSON.stringify(request.body))
      .digest('hex')

  const IshashEqual = safeCompare(ourHash, theirHash)

  return IshashEqual
}

exports.webhook = functions.https.onRequest((request, response) => {
  if (!IsPayloadFromGithub(request)) {
    return response.status(403).send('Payload validation unsuccessful')
  }

  return response.send('OK!')
})
