'use strict'
const fs = require('fs')
const chalk = require('chalk')
const cc = require('conventional-changelog')
const { getPreset } = require('../../helpers')

module.exports = function (newVersion) {
  return new Promise(resolve => {
    const dir = './release-notes'

    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }

    const filename = `RELEASE_NOTE${newVersion ? `_${newVersion}` : ``}.md`
    const filepath = `${dir}/${filename}`
    const fileStream = fs.createWriteStream(filepath)
    return cc({
      preset: getPreset()
      // pkg: {
      //   transform (pkg) {
      //     pkg.version = `v${newVersion}`
      //     return pkg
      //   }
      // }
    })
    .pipe(fileStream).on('close', async () => {
      resolve()
    })
  })
}
