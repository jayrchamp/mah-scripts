'use strict'
const consola = require('consola')
const logger = consola.withScope('helpers')

const _ = require('lodash')
const exec = require('child_process').exec
const path = require('path')
const chalk = require('chalk')

const fs = require('fs')
const findUp = require('find-up')
const semver = require('semver')
const conventionalRecommendedBump = require(`conventional-recommended-bump`)

const root = path.resolve(__dirname, '..')

const pkgPath = path.resolve(process.cwd(), 'package.json')
let pkg = {version: null}
pkg = require(pkgPath)
if (!pkg.version) throw new Error(`Probleme with package.json, can't retrieve version.`)

const configPath = findUp.sync(['.versionrc', '.version.json'])
let { types = {} } = configPath ? JSON.parse(fs.readFileSync(configPath)) : {}


const getPreset = function () {
  return {
    name: 'conventionalcommits',
    types,
    preMajor: false,
    commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
    compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
    issueUrlFormat: '{{host}}/{{owner}}/{{repository}}/issues/{{id}}',
    userUrlFormat: '{{host}}/{{user}}',
    releaseCommitMessageFormat: 'chore(release): {{currentTag}}'
  }
}

const getCurrentVersion = function () {
  return pkg.version
}

const getMahConfig = function () {
  return pkg.mah
}

/**
 * getRecommandedBump
 *
 * @return {object} recommandedBump
 * @return {string} recommandedBump.currentVersion
 * @return {string} recommandedBump.newVersion
 * @return {integer} recommandedBump.level
 * @return {string} recommandedBump.reason
 * @return {string} recommandedBump.releaseType
 */
const getRecommandedBump = function () {
  const noVersionRcProvided = _.isEmpty(types)
  if (noVersionRcProvided) {
    logger.warn('Not found ".versionrc" on project root. Fallback on default.')
    const defaultVersionRcPath = root + '/.versionrc'
    const defaultVersionRc= JSON.parse(fs.readFileSync(defaultVersionRcPath))
    types = defaultVersionRc.types
  }

  return new Promise(resolve => {
    return conventionalRecommendedBump(
      {
        preset: getPreset(),
      }, async (error, recommendation) => {
        if (error) {
          logger.error(error)
          process.exit(1)
        }
        resolve({
          currentVersion: getCurrentVersion(),
          newVersion: semver.inc(pkg.version, recommendation.releaseType),
          ...recommendation
        })
      }
    )
  })
  .catch(error => {
    logger.error(error)
    process.exit(1)
  })
}

const execute = function (command, callback) {
  exec(command, function (error, stdout, stderr) { callback(stdout) })
}

const executePromise = function (command) {
  return new Promise((resolve) => {
    execute(command, function (i) {
      resolve(i)
    })
  })
}

const sleep = function (time) {
  return new Promise ((resolve) => setTimeout(() => resolve(), time))
}

const checkIfExists = function (path) {
  return new Promise((resolve) => {
      fs.access(path, fs.F_OK, (err) => {
          if (err) {
              console.log('\n')
              console.log(chalk.red(`File doesn't exists at`))
              console.log(chalk.red(path))
              console.log('\n')
              resolve(false)
              return
          }
          resolve(true)
      })
  })
}

const getContent = function (file) {
  return new Promise((resolve) => {
      fs.readFile(file, 'utf8', function (err, content) {
          content = content.trim()
          content = content.split('\n')
          content.splice(0, 1)
          content = content.join('\n')
          resolve(content)
      })
  })
}

const validateMahConfig = function (file) {
  br()
  const config = getMahConfig()
  if (!config) {
    console.log(chalk.red('Ensure that mahScript config is set in your package.json'))
    console.log(chalk.red('Like so:'))
    console.log(chalk.red(`
    {
      ...

      "mah": {
        "repo": "ayourp/app"
      }

      ...
    }
      `))
      br()
      return false
  }
  return true
}

const br = () => console.log('')


/**
 * Git helpers
 */
const getCurrentGitBranch = function () {
  return new Promise((resolve) => {
    execute('git rev-parse --abbrev-ref HEAD', function (branch) {
      resolve(branch.trim())
    })
  })
}

const getAccessToken = function () {
  return new Promise((resolve, reject) => {
      execute('git config --get github.token', function (token) {
          if (!token) {
              console.log('\n')
              console.log(chalk.red(`Access token not found. Set it using "git config --global github.token [MY_TOKEN]"`))
              console.log('\n')
              reject()
              return
          }
          resolve(token.replace(/(\r\n|\n|\r)/gm, ""))
      })
  })
}

module.exports = {
  getRecommandedBump,
  validateMahConfig,
  executePromise,
  checkIfExists,
  getMahConfig,
  getContent,
  getPreset,
  execute,
  sleep,
  br,


  getCurrentGitBranch,
  getCurrentVersion,
  getAccessToken
}
