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
const inquirer = require('inquirer')
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

const getConfig = function (path) {
  return _.get(pkg, `mah.${path}`)
}

const getConfigDefaultBranch = function () {
  return _.get(pkg, 'mah.default-branch', 'master')
}

const getConfigDeployTmpl = function (args, type) {
  const tmpl = _.get(pkg, `mah.deploy-tmpl-${type}`) || _.get(pkg, 'mah.deploy-tmpl')
  if (!tmpl) return ''
  try {
    const template = _.template(tmpl, {
      interpolate: /{([\s\S]+?)}/g
    });
    const result = template(args);
    return result
  } catch (error) {
    if (error.message.includes('is not defined')) {
      const variable = error.message.split(' ')[0]
      logger.error(`[@jayrchamp/mah-scripts] Variable "${variable}" is not defined in mah.deploy-tmpl of package.json`)
      return
    }
    throw error
  }
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

const askVersion = async function (message = '') {
  let version = getCurrentVersion()
  
  const askFor = await inquirer.prompt([
    {
      name: 'version',
      type: 'input',
      message: message || `Type a version, or press enter for current (${version})`
    }
  ])
  
  if (askFor.version) {
    version = askFor.version
  }

  if (!semver.valid(version)) {
    logger.error(`Version "${version}" is not valid`)
    return await askVersion()
  }

  return semver.clean(version)
}

// const askFromToVersion = async function () {
//   const from = await askForVersion(`From which version?`)
//   const to = await askForVersion(`To which version?`)
//   return {
//     from,
//     to
//   }
// }


// const askForVersion = async function (message) {  
//   const askFor = await inquirer.prompt([
//     {
//       name: 'version',
//       type: 'input',
//       message
//     }
//   ])
//   if (!semver.valid(askFor.version)) {
//     logger.error(`Version "${askFor.version}" is not valid`)
//     return await askForVersion()
//   }
//   return semver.clean(askFor.version)
// }




module.exports = {
  getRecommandedBump,
  validateMahConfig,
  executePromise,
  checkIfExists,
  getMahConfig,
  getContent,
  askVersion,
  getPreset,
  execute,
  sleep,
  br,

  getConfig,
  getCurrentGitBranch,
  getCurrentVersion,
  getAccessToken,
  getConfigDefaultBranch,
  getConfigDeployTmpl
}
