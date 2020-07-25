const exec = require('child_process').exec
const readlineSync = require('readline-sync')
const chalk = require('chalk')
const _ = require('lodash')
const axios = require('axios');

// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

const {
  // getRecommandedBump,
  // getCurrentVersion,
  // checkIfExists,
  getMahConfig,
  // getContent,
  // getPreset,
  // executePromise,
  // br,
  // sleep,
  // getCurrentGitBranch,
  getAccessToken
  // publish
} = require('../../helpers')

const config = getMahConfig()
const repo = _.get(config, 'repo')
const _repo = _.split(repo, '/')

const repoOwner = _repo[0]
const repoName = _repo[1]

module.exports = async () => {
    try {
        const token = await getAccessToken()

        const choice = await askChoices('What do you want to do?', [
            'List all tags',
            'List all releases',
            'Delete a tag',
            'Delete all tags',
            'Delete a release',
            'Delete all releases'
        ])
        switch (choice) {
            case 'List all tags':
                await listTags(token)
                break

            case 'List all releases':
                await listReleases(token)
                break
                askQuestion

            case 'Delete a tag':
                const tagRef = await askQuestion(`Enter tag ref: `)
                if (tagRef) {
                    await deleteTag(token, tagRef)
                }
                break

            case 'Delete all tags':
                const deleteAllTags = await askBoolean(`Delete all tags?`)
                if (deleteAllTags) {
                    await deleteTags(token)
                }
                break

            case 'Delete a release':
                const releaseId = await askQuestion(`Enter release id: `)
                if (releaseId) {
                    await deleteRelease(token, releaseId)
                }
                break

            case 'Delete all releases':
                const deleteAllReleases = await askBoolean(`Delete all releases?`)
                if (deleteAllReleases) {
                    await deleteReleases(token)
                }
                break
        }

        // rl.close()
    } catch (error) {
      console.log(error);
        // rl.close()
    }
}

/*
|--------------------------------------------------------------------------
|   Delete all tags
|--------------------------------------------------------------------------
*/
async function deleteTag (token, tagRef) {
    return await del(`https://api.github.com/repos/${repoOwner}/${repoName}/git/${tagRef}`, tagRef, 'Tag', token)
}
async function deleteTags (token) {
    return axios
        .get(
          `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/tags`,
          {
            headers: {
              'Authorization': `token ${token}`
            }
          }
        )
        .then(async({ data }) => {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const tag = data[key]
                    await del(`https://api.github.com/repos/${repoOwner}/${repoName}/git/${tag.ref}`, tag.ref, 'Tag', token)
                }
            }
        })
        .catch(err => console.log(err))
}
async function listTags (token) {
    return axios
        .get(
          `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/tags`,
          {
            headers: {
              'Authorization': `token ${token}`
            }
          }
        )
        .then(async({ data }) => {
            console.log('\n')
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const tag = data[key]
                    console.log(`id: ${tag.ref}`)
                }
            }
            console.log('\n')
        })
        .catch(err => console.log(err))
}

/*
|--------------------------------------------------------------------------
|   Delete all releases
|--------------------------------------------------------------------------
*/
async function deleteRelease (token, releaseId) {
    return await del(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/${releaseId}`, releaseId, 'Release', token)
}
async function deleteReleases (token) {
    return axios
        .get(
          `https://api.github.com/repos/${repoOwner}/${repoName}/releases`,
          {
            headers: {
              'Authorization': `token ${token}`
            }
          }
        )
        .then(async({ data }) => {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const release = data[key]
                    return await del(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/${release.id}`, release.id, 'Release', token)
                }
            }
        })
        .catch(err => console.log(err))
}
async function listReleases (token) {
    return axios
        .get(
          `https://api.github.com/repos/${repoOwner}/${repoName}/releases`,
          {
            headers: {
              'Authorization': `token ${token}`
            }
          }
        )
        .then(async({ data }) => {
            console.log('\n')
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const release = data[key]
                    console.log(`${release.name} id: ${release.id}`)
                }
            }
            console.log('\n')
        })
        .catch(err => console.log(err))
}

/*
|--------------------------------------------------------------------------
|   Helper functions
|--------------------------------------------------------------------------
*/
async function del (baseUrl, id, type, token) {
    return axios
        .delete(
          baseUrl,
          {
            headers: {
              'Authorization': `token ${token}`
            }
          }
        )
        .then(({ data: releases }) => {
            console.log('\n')
            console.log(chalk.green(`Resource ${id} deleted successfully`))
            console.log('\n')
        })
        .catch(err => {
            if (err && err.response) {
                const { status, statusText } = err.response
                if (status === 404) {
                    console.log('\n')
                    console.log(chalk.red(`${status} ${err.response.data.message}: The following endpoint is not found on Github end.`))
                    console.log(err.response.config.url)
                    console.log('\n')
                }
            }
        })
}
async function askQuestion (question) {
    return new Promise((resolve) => {
        console.log('\r')
        const answer = readlineSync.question(question)
        return resolve(answer)
    })
}
async function askBoolean (question) {
    return new Promise((resolve) => {
        console.log('\r')
        if (readlineSync.keyInYN(question)) {
            return resolve(true)
        } else {
            return resolve(false)
        }
    })
}
async function askChoices (question, choices) {
    return new Promise((resolve) => {
        const index = readlineSync.keyInSelect(choices, question)
        resolve(choices[index])
    })
}
