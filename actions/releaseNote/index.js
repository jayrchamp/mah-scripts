'use strict'
const fs = require('fs')
const chalk = require('chalk')
const semver = require('semver')
const consola = require('consola')
const cc = require('conventional-changelog')
const inquirer = require('inquirer')
const generateIntervalReleaseNote = require('../../helpers/generateIntervalReleaseNote')
const {
  askFromToVersion,
  askVersion
} = require('../../helpers')

module.exports = async function () {
  // const versions = await askFromToVersion()
  // await generateIntervalReleaseNote(versions.from, versions.to)

  const version = await askVersion('Type the version for which you want to generate a release note (ie: 3.0.0)')
  await generateIntervalReleaseNote(version)
}
