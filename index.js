#!/usr/bin/env node
const inquirer = require('inquirer')
const _ = require('lodash')
const consola = require('consola')
const chalk = require('chalk')
const bump = require('./actions/bump')
const publishRelease = require('./actions/publishRelease')
const releaseNote = require('./actions/releaseNote')
const manageReleaseAndTags = require('./actions/manageReleaseAndTags')
const { getConfigDeployTmpl, getCurrentVersion, validateMahConfig, br } = require('./helpers')

;(async () => {
  try {
    const isValid = validateMahConfig()
    if (!isValid) return
  
    const currentVersion = getCurrentVersion()
    const ver = currentVersion.split('.').join('')
  
    br()
  
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
          'Deploy to Prod App Engine',
          'Deploy to Staging App Engine'
        ]
      }
    ]  
    const answers = await inquirer.prompt(QUESTION)
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
      case 'Deploy to Prod App Engine':
        const deployProdDefault = `gcloud app deploy --version v${ver} app.yaml --no-promote`
        const deployProdCmd = getConfigDeployTmpl({ VERSION: ver }, 'prod') || deployProdDefault

        br()
        br()
        consola.info(chalk.yellow('1. Ensures to bump version + release note + tag'))
        consola.log(chalk.green('     node ./scripts/index.js'))
        br()
        consola.info(chalk.yellow('2. Ensure to chore:release has been merged into "master" branch'))
        consola.log(chalk.green(`     git checkout master && yarn build`))
        br()
        consola.info(chalk.yellow('3. Ensure to build project from "master" branch'))
        consola.log(chalk.green(`     yarn prod:build`))
        br()
        consola.info(chalk.yellow('4. Run following command line to Deploy to app engine'))
        consola.log(chalk.green(`     ${deployProdCmd}`))
        br()
        br()
      break
      case 'Deploy to Staging App Engine':
      const deployStagingDefault = `gcloud app deploy --version v${ver} staging.yaml --no-promote`
      const deployStagingCmd = getConfigDeployTmpl({ VERSION: ver }, 'staging') || deployStagingDefault
        br()
        br()
        consola.info(chalk.yellow('3. Ensure to build project'))
        consola.log(chalk.green(`     yarn staging:build`))
        br()
        consola.info(chalk.yellow('4. Run following command line to Deploy to app engine'))
        consola.log(chalk.green(`     ${deployStagingCmd}`))
        br()
        br()
      break
    }
  } catch (err) {
    console.log('\n')
    console.log( err )
    console.log('\n')
    consola.error(err)
  }
})()
