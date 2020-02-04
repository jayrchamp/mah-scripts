'use strict'
const chalk = require('chalk')
const { execute } = require('../../helpers')

module.exports = function (newVersion) {
  return new Promise((resolve) => {
    return execute(`yarn version --new-version ${newVersion} --no-git-tag-version`, function (branch) {
      resolve(branch)
    })
  })
}