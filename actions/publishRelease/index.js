const inquirer = require('inquirer')
const _ = require('lodash')
const ora = require('ora')
const consola = require('consola')
const chalk = require('chalk')
const axios = require('axios')

const {
  getRecommandedBump,
  getCurrentVersion,
  checkIfExists,
  getMahConfig,
  getContent,
  getPreset,
  executePromise,
  br,
  sleep,
  getCurrentGitBranch,
  getAccessToken,
  publish
} = require('../../helpers')


module.exports = async function () {
  let version = getCurrentVersion()
  let vVersion = `v${version}`
  let prerelease = false
  let draft = false
  let targetCommitish = 'master'

  /**
   * Change version
   */
  const isAnotherVersion = await inquirer.prompt([
    {
      name: 'version',
      type: 'input',
      message: `Type a version, or press enter for current (${version})`
    }
  ])
  if (isAnotherVersion.version) {
    version = isAnotherVersion.version
    vVersion = `v${version}`
  }

  /**
   * Draft, Pre-release
   * @source https://developer.github.com/v3/repos/releases/#input
   */
  const publishOptions = await inquirer.prompt([
    {
      name: 'prerelease',
      type: 'checkbox',
      message: `It is a Pre-release`,
      choices: [
        'Is Draft',
        'Is Pre-release'
      ]
    }
  ])
  if (_.indexOf(publishOptions.prerelease, 'Is Draft') >= 0) {
    draft = true
  }
  if (_.indexOf(publishOptions.prerelease, 'Is Pre-release') >= 0) {
    prerelease = true
  }
  
  /**
   *  Target commitish branch
   * @source https://developer.github.com/v3/repos/releases/#input
   */
  const branches = await executePromise('git branch')
  const cleanBranches = _
    .chain(_.trim(_.toString(branches)))
    .split('\n')
    .map(b => _.trim(b))
    .map(b => _.replace(b, '* ', ''))
    .filter(b => b !== 'master')
    .value()
  const targetCommitishBranch = await inquirer.prompt([
    {
      name: 'branch',
      type: 'rawlist',
      message: `Target commitish branch`,
      choices: [
        `${targetCommitish} (default)`,
        ...cleanBranches
      ]
    }
  ])
  if (targetCommitishBranch.branch) {
    targetCommitish = _.trim(_.replace(targetCommitishBranch.branch, ' (default)', ''))
  }

  
  const filename = `RELEASE_NOTE${version ? `_${version}` : ``}.md`
  const path = `${process.cwd()}/release-notes/${filename}`
  
  const config = getMahConfig()
  const repo = _.get(config, 'repo')
  const _repo = _.split(repo, '/')
  const repoOwner = _repo[0]
  const repoName = _repo[1]

  const token = await getAccessToken()
  const branch = await getCurrentGitBranch()
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`

  br()
  console.log(`${chalk.yellow('Publishing release to Github!')}`)
  br()
  console.log(`Target Commitish branch: ${chalk.green(targetCommitish)}`)
  console.log(`Release name: ${chalk.green(vVersion)}`)
  console.log(`Release Note: ${chalk.green(filename)}`)
  console.log(`Github Token: ${chalk.green(token)}`)
  console.log(`Repository: ${chalk.green(repo)}`)
  console.log(`Endpoint: ${chalk.green(url)}`)
  console.log(`Headers: ${chalk.green(`Authorization: token ${token}`)}`)
  
  br()
  
  const QUESTION = [
    {
      name: 'confirm',
      type: 'confirm',
      message: `Do you want to proceed`
    }
  ]  
  const answers = await inquirer.prompt(QUESTION)
  if (!answers.confirm) return

  const exists = await checkIfExists(path)
  if (!exists) return
  
  const content = await getContent(path)

  /**
   * Pushing version is now done during bump version
   */
  // spinner = ora(`Pushing tag ${vVersion} to origin`).start()
  // spinner.color = 'yellow'
  // await sleep(2000)
  // await executePromise(`git push origin ${vVersion}`)
  // spinner.succeed('')

  spinner = ora(`Publishing release ${vVersion}...`).start()
  spinner.color = 'yellow'
  try {
    await axios.post(
      url, 
      {
        name: vVersion,
        tag_name: vVersion,
        // target_commitish: branch,
        body: content,
        draft,
        prerelease,
        version
      },
      {
        headers: {
          'Authorization': `token ${token}`
        }
      }
    )
    spinner.succeed(`Release ${vVersion} for tag ${vVersion} successfully published to Github`)
    consola.info("Done!")
    br()
  } catch (err) {
    if (err.message) {
      spinner.fail(err.message)
    } else if (err.code) {
      spinner.fail(err.code)
    }
    if (err && err.response) {
      const { status, statusText } = err.response
      if (status === 404) {
        console.log('\n')
        console.log(chalk.red(`${status} ${err.response.data.message}: The following endpoint is not found on Github end.`))
        console.log(err.response.config.url)
        console.log('\n')
      }
    }
  }


}