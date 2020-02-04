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

  getCurrentGitBranch,
  getAccessToken,
  publish
} = require('../../helpers')


module.exports = async function () {
  const version = getCurrentVersion()
  const vVersion = `v${version}`

  // const ver = version.split('.').join('')
  
  const filename = `RELEASE_NOTE${version ? `_${version}` : ``}.md`
  const path = `${process.cwd()}/release-notes/${filename}`
  
  const config = getMahConfig()
  const repo = _.get(config, 'repo')
  const _repo = _.split(repo, '/')
  const repoOwner = _repo[0]
  const repoName = _repo[1]

  const token = await getAccessToken()
  const branch = await getCurrentGitBranch()
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/releases?access_token=${token}`

  br()
  console.log(`${chalk.yellow('Publishing release to Github!')}`)
  br()
  console.log(`Currently on branch: ${chalk.green(branch)}`)
  console.log(`Release name: ${chalk.green(vVersion)}`)
  console.log(`Token: ${chalk.green(token)}`)
  console.log(`Release Note: ${chalk.green(filename)}`)
  console.log(`Repository: ${chalk.green(repo)}`)
  console.log(`Url: ${chalk.green(url)}`)
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
   * 
   */
  // spinner = ora(`committing chore(release): v${newVersion} on ${branch}`).start()
  // spinner.color = 'yellow';
  await executePromise('git push --follow-tags')
  // spinner.succeed('')


  try {
    await axios.post(url, {
      name: vVersion,
      tag_name: vVersion,
      target_commitish: branch,
      body: content,
      draft: false,
      prerelease: false,
      version
    })
    console.log('\n')
    console.log(chalk.green(`Release ${vVersion} for tag ${vVersion} successfully published to Github`))
    console.log('\n')  
  } catch (err) {
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

  consola.info("Done!")
  br()
}