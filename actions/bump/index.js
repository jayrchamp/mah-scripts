const ora = require('ora')
const consola = require('consola')
const inquirer = require('inquirer')
const chalk = require('chalk')
const generateReleaseNote = require('./generateReleaseNote')
const bump = require('./bumpVersion')
const {
  getCurrentVersion,
  getRecommandedBump,
  getConfig,
  getPreset,
  getCurrentGitBranch,
  executePromise,
  sleep,
  br
} = require('../../helpers')

module.exports = async function () {
  let spinner

  const defaultBranch = getConfig('default-branch') || 'master'
  // const defaultBranchOrigin = getConfig('default-branch-origin') || 'master'

  /**
   * Get recommanded bump version based on semantic commit messages
   */
  const { newVersion, reason, releaseType } = await getRecommandedBump()
  const vNewVersion = `v${newVersion}`
  const releaseNoteFilename = `RELEASE_NOTE${newVersion ? `_${newVersion}` : ``}.md`
  const branch = await getCurrentGitBranch()


  br()
  console.log(`${chalk.yellow('Bumping version!')}`)
  br()
  console.log(`Currently on branch: ${chalk.green(branch)}`)
  br()
  console.log(`Version ${chalk.green(getCurrentVersion())} to ${chalk.green(newVersion)}`)
  console.log(`${reason}`)
  console.log(`Release type: ${chalk.green(releaseType)}`)
  br()
  console.log('This process will:')
  console.log(` 1. Bump version ${newVersion} to package.json`)
  console.log(` 2. Create a ${chalk.green(`RELEASE_NOTE_${newVersion}.md`)} file`)
  console.log(` 3. Commit ${chalk.green(`chore(release): ${vNewVersion}`)}`)
  console.log(` 4. Create a tag ${chalk.green(`v${newVersion}`)}`)
  br()
  
  const QUESTION = [
    {
      name: 'bump',
      type: 'confirm',
      message: `Do you want to proceed`,
    }
  ]  
  const answers = await inquirer.prompt(QUESTION)
  if (!answers.bump) return 

  br()
  
  /**
   * Save new version in package.json
   */
  spinner = ora(`Bumping package.json version to ${newVersion}...`).start()
  spinner.color = 'yellow';
  await sleep(2000)
  await bump(newVersion)
  spinner.succeed('')

  /**
   * Generate release note list of commit included in new version
   */
  spinner = ora(`Creating release note to ${releaseNoteFilename}...`).start()
  spinner.color = 'yellow';
  await sleep(2000)
  await generateReleaseNote(newVersion)
  spinner.succeed('')

  /**
   * 
   */
  spinner = ora(`Committing chore(release): ${vNewVersion} on ${branch}...`).start()
  spinner.color = 'yellow';
  await sleep(2000)
  await executePromise('git add -A')
  const commit = await executePromise(`git commit -m "chore(release): ${vNewVersion}"`)
  spinner.succeed('')

  /**
   * 
   */
  spinner = ora(`Creating tag ${vNewVersion}"...`).start()
  spinner.color = 'yellow';
  await sleep(2000)
  await executePromise(`git tag "${vNewVersion}"`)
  spinner.succeed('')

  consola.info("Done!")
  br()


  /**
   * Should it merge {branch} into main?
   */
  const shouldMergerIntoMaster = await inquirer.prompt([
    {
      name: 'merge',
      type: 'confirm',
      message: `Do you want to merge "${branch}" into "${defaultBranch}" --ff-only`,
    }
  ])
  if (shouldMergerIntoMaster.merge) {
    spinner = ora(`Checking Out "${defaultBranch}"`).start()
    spinner.color = 'yellow';
    await sleep(2000)
    await executePromise(`git checkout ${defaultBranch}`)
    spinner.succeed('')

    spinner = ora(`Merging branch "${branch}" into "${defaultBranch}" --ff-only...`).start()
    spinner.color = 'yellow';
    await sleep(2000)
    await executePromise(`git merge ${branch} --ff-only`)
    spinner.succeed('')
    consola.info("Done!")
    br()
  }

  /**
   * Push main to origin
   */
  const shouldPushMasterToOrigin = await inquirer.prompt([
    {
      name: 'merge',
      type: 'confirm',
      message: `Do you want to push "${defaultBranch}" to origin`,
    }
  ])
  if (shouldPushMasterToOrigin.merge) {
    spinner = ora(`Pushing "${defaultBranch}" to origin...`).start()
    spinner.color = 'yellow';
    await sleep(2000)
    await executePromise(`git push origin ${defaultBranch}:${defaultBranch}`)
    spinner.succeed('')
    consola.info("Done!")
    br()
  }

  /**
   * Push develop to origin
   */
  const shouldPushDevelopToOrigin = await inquirer.prompt([
    {
      name: 'merge',
      type: 'confirm',
      message: `Do you want to push "develop" to origin`,
    }
  ])
  if (shouldPushDevelopToOrigin.merge) {
    spinner = ora(`Pushing "develop" to origin...`).start()
    spinner.color = 'yellow';
    await sleep(2000)
    await executePromise(`git push origin develop:develop`)
    spinner.succeed('')
    consola.info("Done!")
    br()
  }

  /**
   * Push tag to origin
   */
  const shouldPushTagToOrigin = await inquirer.prompt([
    {
      name: 'merge',
      type: 'confirm',
      message: `Do you want to push tag "${vNewVersion}" to origin`,
    }
  ])
  if (shouldPushTagToOrigin.merge) {
    spinner = ora(`Pushing tag ${vNewVersion} to origin`).start()
    spinner.color = 'yellow'
    await sleep(2000)
    await executePromise(`git push origin ${vNewVersion}`)
    spinner.succeed('')


    // spinner = ora(`Pushing "develop" to origin...`).start()
    // spinner.color = 'yellow';
    // await sleep(2000)
    // await executePromise(`git push origin develop:develop`)
    // spinner.succeed('')
    // consola.info("Done!")
    br()
  }
}