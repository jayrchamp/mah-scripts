#!/usr/bin/env node
const inquirer = require('inquirer')
const _ = require('lodash')
const consola = require('consola')
const chalk = require('chalk')
const bump = require('./actions/bump')
const publishRelease = require('./actions/publishRelease')
const { getCurrentVersion, validateMahConfig, br } = require('./helpers')


;(async () => {
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
        'Publish a version on Github',
        'Help Deploy to App Engine',
        // 'Delete tags'
      ]
    }
  ]  
  const answers = await inquirer.prompt(QUESTION)
  switch (answers['choice']) {
    case 'Bump version + release note + tag':
      await bump()
    break
    case 'Publish a version on Github':
      await publishRelease()
    break
    case 'Deploy to App Engine':
      br()
      br()
      consola.info('1. Bump version + release note + tag')
      consola.log(chalk.green('     node ./scripts/index.js'))
      br()
      consola.info('2. Merge on Master')
      // consola.log('node ./scripts/index.js')
      br()
      consola.info('3. Build project')
      consola.log(chalk.green(`     yarn build`))
      br()
      consola.info('4. Deploy to app engine')
      consola.log(chalk.green(`     gcloud app deploy --version v${ver} app.yaml --no-promote`))
      br()
      br()
    break


    // case 'Delete tags':
    //   console.log('Deleting tags..');
    //     // await deleteRelease()
    //   break
  }
  process.exit(1)















    

  

})()