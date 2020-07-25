'use strict'
const fs = require('fs')
const chalk = require('chalk')
// const cc = require('conventional-changelog')
const { getPreset } = require('.')

const {
  executePromise
} = require('./index')

module.exports = function (version) {
  return new Promise(resolve => {
    const dir = './release-notes'

    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    
    const filename = `RELEASE_NOTE${version ? `_${version}` : ``}.md`
    const filepath = `${dir}/${filename}`
    const fileStream = fs.createWriteStream(filepath)

    const vVersion = `v${version}`

    return conventionalChangelog(
      // options
      {
        version: vVersion,
        releaseCount: 1,
        preset: getPreset()
      }
    )
    .pipe(fileStream).on('close', async () => {
      resolve()
    })
  })
}



const addStream = require('add-stream')
const gitRawCommits = require('git-raw-commits')
const conventionalCommitsParser = require('conventional-commits-parser')
const conventionalChangelogWriter = require('conventional-changelog-writer')
const _ = require('lodash')
const stream = require('stream')
const through = require('through2')
const mergeConfig = require('conventional-changelog-core/lib/merge-config')
const conventionalChangelogPresetLoader = require('conventional-changelog-preset-loader')

function conventionalChangelogCore (options, context, gitRawCommitsOpts, parserOpts, writerOpts, gitRawExecOpts) {
  writerOpts = writerOpts || {}

  var readable = new stream.Readable({
    objectMode: writerOpts.includeDetails
  })
  readable._read = function () { }

  mergeConfig(options, context, gitRawCommitsOpts, parserOpts, writerOpts, gitRawExecOpts)
    .then(async function (data) {
      options = data.options
      context = data.context
      gitRawCommitsOpts = data.gitRawCommitsOpts
      parserOpts = data.parserOpts
      writerOpts = data.writerOpts
      gitRawExecOpts = data.gitRawExecOpts

      if (options.version) {
        const tags = context.gitSemverTags.slice(0).reverse()
        const versionTagIndex = tags.indexOf(options.version)

        context.gitSemverTags = [options.version]
        
        if (versionTagIndex >= 0) {
          const previousTag = tags[versionTagIndex - 1]
          if (previousTag) {
            context.gitSemverTags.unshift(previousTag)
          } else {
            context.gitSemverTags.unshift('')
          }
        }
      }

      var reverseTags = context.gitSemverTags.slice(0)

      var commitsErrorThrown = false

      var commitsStream = new stream.Readable({
        objectMode: true
      })
      commitsStream._read = function () { }

      function commitsRange (from, to) {
        return gitRawCommits(_.merge({}, gitRawCommitsOpts, {
          from: from,
          to: to
        }))
          .on('error', function (err) {
            if (!commitsErrorThrown) {
              setImmediate(commitsStream.emit.bind(commitsStream), 'error', err)
              commitsErrorThrown = true
            }
          })
      }

      var streams = reverseTags.map((to, i) => {
        const from = i > 0
          ? reverseTags[i - 1]
          : ''
        return commitsRange(from, to)
      })

      if (gitRawCommitsOpts.from) {
        streams = streams.splice(1)
      }

      if (gitRawCommitsOpts.reverse) {
        streams.reverse()
      }

      streams.reduce((prev, next) => next.pipe(addStream(prev)))
        .on('data', function (data) {
          setImmediate(commitsStream.emit.bind(commitsStream), 'data', data)
        })
        .on('end', function () {
          setImmediate(commitsStream.emit.bind(commitsStream), 'end')
        })

      commitsStream
        .on('error', function (err) {
          err.message = 'Error in git-raw-commits: ' + err.message
          setImmediate(readable.emit.bind(readable), 'error', err)
        })
        .pipe(conventionalCommitsParser(parserOpts))
        .on('error', function (err) {
          err.message = 'Error in conventional-commits-parser: ' + err.message
          setImmediate(readable.emit.bind(readable), 'error', err)
        })
        // it would be better if `gitRawCommits` could spit out better formatted data
        // so we don't need to transform here
        .pipe(through.obj(function (chunk, enc, cb) {
          try {
            options.transform.call(this, chunk, cb)
          } catch (err) {
            cb(err)
          }
        }))
        .on('error', function (err) {
          err.message = 'Error in options.transform: ' + err.message
          setImmediate(readable.emit.bind(readable), 'error', err)
        })
        .pipe(conventionalChangelogWriter(context, writerOpts))
        .on('error', function (err) {
          err.message = 'Error in conventional-changelog-writer: ' + err.message
          setImmediate(readable.emit.bind(readable), 'error', err)
        })
        .pipe(through({
          objectMode: writerOpts.includeDetails
        }, function (chunk, enc, cb) {
          try {
            readable.push(chunk)
          } catch (err) {
            setImmediate(function () {
              throw err
            })
          }

          cb()
        }, function (cb) {
          readable.push(null)

          cb()
        }))
    })
    .catch(function (err) {
      setImmediate(readable.emit.bind(readable), 'error', err)
    })

  return readable
}

function conventionalChangelog (options, context, gitRawCommitsOpts, parserOpts, writerOpts) {
  options.warn = options.warn || function () {}

  if (options.preset) {
    try {
      options.config = conventionalChangelogPresetLoader(options.preset)
    } catch (err) {
      if (typeof options.preset === 'object') {
        options.warn(`Preset: "${options.preset.name}" ${err.message}`)
      } else if (typeof options.preset === 'string') {
        options.warn(`Preset: "${options.preset}" ${err.message}`)
      } else {
        options.warn(`Preset: ${err.message}`)
      }
    }
  }

  return conventionalChangelogCore(options, context, gitRawCommitsOpts, parserOpts, writerOpts)
}
