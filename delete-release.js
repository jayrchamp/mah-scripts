const exec = require('child_process').exec
const readlineSync = require('readline-sync')
const chalk = require('chalk')
const axios = require('axios');

// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

(async () => {
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
        // rl.close()
    }
})()

// rl.question(`\r\nDelete all tags? y/n  `, async (answer) => {
//     try {
//         const token = await getAccessToken()

//         if (answer === 'y') {
//             await deleteTags(token)
//         }

//         rl.question(`Delete all releases? y/n  `, async (answer) => {
//             if (answer === 'y') {
//                 await deleteReleases(token)
//             }
//             rl.close()
//         })
//     } catch (error) {
//         console.log(error)
//     }
// })

/*
|--------------------------------------------------------------------------
|   Delete all tags
|--------------------------------------------------------------------------
*/
async function deleteTag (token, tagRef) {
    return await del(`https://api.github.com/repos/ayourp/app/git/${tagRef}?access_token=${token}`, tagRef, 'Tag')
}
async function deleteTags (token) {
    return axios
        .get(`https://api.github.com/repos/ayourp/app/git/refs/tags?access_token=${token}`)
        .then(async({ data }) => {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const tag = data[key]
                    await del(`https://api.github.com/repos/ayourp/app/git/${tag.ref}?access_token=${token}`, tag.ref, 'Tag')
                }
            }
        })
        .catch(err => console.log(err))
}
async function listTags (token) {
    return axios
        .get(`https://api.github.com/repos/ayourp/app/git/refs/tags?access_token=${token}`)
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
    return await del(`https://api.github.com/repos/ayourp/app/releases/${releaseId}?access_token=${token}`, releaseId, 'Release')
}
async function deleteReleases (token) {
    return axios
        .get(`https://api.github.com/repos/ayourp/app/releases?access_token=${token}`)
        .then(async({ data }) => {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const release = data[key]
                    return await del(`https://api.github.com/repos/ayourp/app/releases/${release.id}?access_token=${token}`, release.id, 'Release')
                }
            }
        })
        .catch(err => console.log(err))
}
async function listReleases (token) {
    return axios
        .get(`https://api.github.com/repos/ayourp/app/releases?access_token=${token}`)
        .then(async({ data }) => {
            console.log('\n')
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const release = data[key]
                    console.log(`id: ${release.id}`)
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
async function del (baseUrl, id, type) {
    return axios
        .delete(baseUrl)
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

function execute (command, callback) {
    exec(command, function (error, stdout, stderr) { callback(stdout) })
};
async function getAccessToken () {
    return new Promise((resolve) => {
        execute('git config --get github.token', function (token) {
            resolve(token)
        })
    })
};
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
