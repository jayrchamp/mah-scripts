const axios = require('axios')
const chalk = require('chalk')
var pck = require('../package.json')
const fs = require('fs')
const { readFile } = fs
var exec = require('child_process').exec
const readline = require('readline')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const version = pck.version
const args = process.argv.slice(2);


rl.question(`\r\nPublish version ${version}? y/n  `, async (answer) => {

    if (args.length <= 0 || args.length > 0 && args[0] === '') {
        console.log('\n')
        console.log('You must pass your repo name as an argument');
        console.log('\n')
        console.log('ex.: node ./scripts/publish-release.js app');
        console.log('\n')
        rl.close()
    }

    const repoName = args[0]

    try {
        const branchName = await getBranchName()
        const token = await getAccessToken()

        if (answer === 'y') {
            const filename = `RELEASE_NOTE${version ? `_${version}` : ``}.md`
            const file = `./release-notes/${filename}`

            let content = await getContent(file)

            await publish({
                name: `v${version}`,
                tag_name: `v${version}`,
                target_commitish: `${branchName.trim()}`,
                body: content,
                draft: false,
                prerelease: false,
                token,
                version,
                repoName
            })
            rl.close()
        } else if (answer === 'n') {
            rl.question(`\r\nWhich version ? (current: ${version})  `, async (givenVersion) => {
                const filename = `RELEASE_NOTE${givenVersion ? `_${givenVersion}` : ``}.md`
                const path = `./release-notes/${filename}`
                const exists = await checkIfExists(path, filename)

                if (exists) {
                    let content = await getContent(path)

                    const name = await askQuestion(`What is the release title name (skip use v${givenVersion}):`)
                    const tagName = await askQuestion(`Which tag this release should be attached to (skip use v${givenVersion}):`)

                    await publish({
                        name: name || `v${givenVersion}`,
                        tag_name: tagName || `v${givenVersion}`,
                        target_commitish: `${branchName.trim()}`,
                        body: content,
                        draft: false,
                        prerelease: false,
                        token,
                        version,
                        repoName
                    })
                }

                rl.close()
            })
        }
    } catch (error) {
        rl.close()
    }
})

async function getContent (file) {
    return new Promise((resolve) => {
        readFile(file, 'utf8', function (err, content) {
            content = content.trim()
            content = content.split('\n')
            content.splice(0, 1)
            content = content.join('\n')
            resolve(content)
        })
    })
}

function execute (command, callback) {
    exec(command, function (error, stdout, stderr) { callback(stdout) })
};

// async function getRepoName () {
//     return new Promise((resolve) => {
//         execute('git config --get remote.origin.url', function (url) {
//             let parts = url.replace(/(\r\n|\n|\r)/gm, "").split('.git').join('').split('/')
//             const length = parts.length
//             const position = url.indexOf('.git')



//             console.log(

//                 parts
//                 // .splice(position, length)
//             );


//             resolve()
//         })
//     })
// };

async function getBranchName () {
    return new Promise((resolve) => {
        execute('git rev-parse --abbrev-ref HEAD', function (branch) {
            resolve(branch)
        })
    })
};

async function getAccessToken () {
    return new Promise((resolve, reject) => {
        execute('git config --get github.token', function (token) {
            if (!token) {
                console.log('\n')
                console.log(chalk.red(`Access token not found. Set it using "git config --global github.token [MY_TOKEN]"`))
                console.log('\n')
                reject()
                return
            }
            resolve(token.replace(/(\r\n|\n|\r)/gm, ""))
        })
    })
};

async function checkIfExists (path, file) {
    return new Promise((resolve) => {
        fs.access(path, fs.F_OK, (err) => {
            if (err) {
                console.log('\n')
                console.log(chalk.red(`File "${file}" doesn't exists`))
                console.log('\n')
                resolve(false)
                return
            }
            resolve(true)
        })
    })
}

async function publish (options) {
    return new Promise((resolve, reject) => {
        let { token, repoName, ...apiOptions } = options
        axios
            .post(`https://api.github.com/repos/ayourp/${repoName}/releases?access_token=${token}`, apiOptions)
            .then(async({ data }) => {
                console.log('\n')
                console.log(chalk.green(`Release ${apiOptions.name} for tag ${apiOptions.tag_name} successfully published to Github`))
                console.log('\n')
                resolve()
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
                reject()
            })
    })
}

async function askQuestion (question) {
    return new Promise((resolve) => {
        rl.question(`${question} `, async (answer) => {
            resolve(answer)
        })
    })
}
