#!/usr/bin/env node
const inquirer = require('inquirer')
const _ = require('lodash')
const consola = require('consola')
const chalk = require('chalk')
const bump = require('./actions/bump')
const publishRelease = require('./actions/publishRelease')
const { getCurrentVersion, validateMahConfig, br } = require('./helpers')

const axios = require('axios')

;(async () => {


//   const token = ''
//   const vVersion = 'v2.0.1'
//   const url = `https://api.github.com/repos/ayourp/app/releases/tags/${vVersion}?access_token=${token}`


//   try {
//     const { data } = await axios.get(url)
//     console.log(
//       data
//     );
    
//   } catch (err) {
//     console.log(
//       err
//     );
    
//     if (err && err.response) {
//       const { status, statusText } = err.response
//       if (status === 404) {
//         console.log('\n')
//         console.log(chalk.red(`${status} ${err.response.data.message}: The following endpoint is not found on Github end.`))
//         console.log(err.response.config.url)
//         console.log('\n')
//       }
//     }
//   }
// return












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
        'Deploy to App Engine',
        // 'Delete tags'
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
    case 'Deploy to App Engine':
      br()
      br()
      consola.info(chalk.yellow('1. Ensures to bump version + release note + tag'))
      consola.log(chalk.green('     node ./scripts/index.js'))
      br()
      consola.info(chalk.yellow('2. Ensure to chore:release has been merged into "master" branch'))
      consola.log(chalk.green(`     git checkout master && yarn build`))
      br()
      consola.info(chalk.yellow('3. Ensure to build project from "master" branch'))
      consola.log(chalk.green(`     yarn build`))
      br()
      consola.info(chalk.yellow('4. Run following command line to Deploy to app engine'))
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