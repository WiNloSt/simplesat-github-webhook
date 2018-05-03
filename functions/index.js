const crypto = require('crypto')
const { execSync } = require('child_process')

const functions = require('firebase-functions')
const safeCompare = require('safe-compare')
const axios = require('axios')

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

function isPullRequest(payload) {
  return Boolean(payload.issue.pull_request)
}

function deployStyleGuide(prNumber) {
  const deployUrl = `pr-${prNumber}-simplesat-styleguide.surge.sh`
  const circleCiToken = functions.config().circleci.token
  const githubToken = functions.config().github.token
  const url =
    'https://circleci.com/api/v1.1/project/github/prontotools/simplesat/tree/pull%2F' + prNumber
  const authQuery = '?circle-token=' + circleCiToken
  axios
    .get('https://api.github.com/repos/prontotools/simplesat/pulls/' + prNumber, {
      headers: {
        Authorization: 'token ' + githubToken
      }
    })
    .then(res => {
      const currentCommit = res.data.head.sha
      return axios.post(url + authQuery, {
        revision: currentCommit,
        build_parameters: {
          CIRCLE_JOB: 'simplesat_styleguide_deployment',
          CIRCLE_PR_NUMBER: prNumber
        }
      })
    })
    .catch(console.error)
}

function processPullRequestComment(comment, prNumber) {
  const isDeployStyleguide = /deploy +styleguide/i.test(comment)
  if (isDeployStyleguide) {
    deployStyleGuide(prNumber)
  }
}

exports.webhook = functions.https.onRequest((request, response) => {
  if (!IsPayloadFromGithub(request)) {
    return response.status(403).send('Payload validation unsuccessful')
  }

  const payload = request.body
  console.log(payload)

  if (isPullRequest(payload)) {
    if (payload.action === 'created') {
      processPullRequestComment(payload.comment.body, payload.issue.number)
    }
  }

  return response.send('OK!')
})
