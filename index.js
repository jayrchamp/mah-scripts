#!/usr/bin/env node
const inquirer = require('inquirer')
const _ = require('lodash')
const consola = require('consola')
const chalk = require('chalk')
const bump = require('./actions/bump')
const publishRelease = require('./actions/publishRelease')
const releaseNote = require('./actions/releaseNote')
const manageReleaseAndTags = require('./actions/manageReleaseAndTags')
const { getConfigDeployTmpl, getDeployTemplates, getCurrentVersion, validateMahConfig, br } = require('./helpers')

;(async () => {
  try {
    const isValid = validateMahConfig()
    if (!isValid) return
  
    const currentVersion = getCurrentVersion()
    const ver = currentVersion.split('.').join('')
  
    br()

    const deployTemplates = getDeployTemplates()
    const deployChoices = Object.keys(deployTemplates).map(env => `Deploy: ${env}`)
  
    const QUESTION = [
      {
        name: 'choice',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
          'Bump version + release note + tag',
          'Publish a release note on Github',
          'Generate a release note',
          'Manage releases & tags',
          ...deployChoices
        ]
      }
    ]  
    const answers = await inquirer.prompt(QUESTION)
    switch (answers['choice']) {
      case 'Bump version + release note + tag':
        await bump()
      break
      case 'Publish a release note on Github':
        await publishRelease()
      break
      case 'Generate a release note':
        await releaseNote()
      break
      case 'Manage releases & tags':
        await manageReleaseAndTags()
      break
      default:
        if (answers['choice'].startsWith('Deploy: ')) {
          const env = answers['choice'].replace('Deploy: ', '')
          const deployCmd = getConfigDeployTmpl({ VERSION: ver }, env)
          br()
          br()
          consola.info(chalk.yellow(`Deploy to ${env}`))
          br()
          consola.info(chalk.yellow('Run the following command:'))
          consola.log(chalk.green(`     ${deployCmd}`))
          br()
          br()
        }
      break
    }
  } catch (err) {
    console.log('\n')
    console.log( err )
    console.log('\n')
    consola.error(err)
  }
})()
