'use strict'

// ---------------------------------------------------------------------------
// Mocks required before any require() of helpers or actions
// ---------------------------------------------------------------------------
jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))
jest.mock(
  require('path').resolve(process.cwd(), 'package.json'),
  () => ({ version: '1.2.0', mah: { repo: 'owner/repo', 'default-branch': 'master' } }),
  { virtual: true }
)
jest.mock('conventional-recommended-bump', () =>
  jest.fn((opts, cb) =>
    cb(null, { releaseType: 'patch', reason: 'fix commits found', level: 2 })
  )
)
jest.mock('child_process', () => ({ exec: jest.fn((cmd, cb) => cb(null, 'main\n', '')) }))
jest.mock('inquirer', () => ({ prompt: jest.fn() }))
jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    color: ''
  }))
)
jest.mock('../../../actions/bump/bumpVersion', () => jest.fn().mockResolvedValue())
jest.mock('../../../actions/bump/generateReleaseNote', () => jest.fn().mockResolvedValue())

// Patch sleep to be instant so the tests don't wait 2s per spinner call
jest.mock('../../../helpers', () => {
  const actual = jest.requireActual('../../../helpers')
  return { ...actual, sleep: jest.fn().mockResolvedValue() }
})

const inquirer = require('inquirer')
const bumpVersion = require('../../../actions/bump/bumpVersion')
const generateReleaseNote = require('../../../actions/bump/generateReleaseNote')

describe('bump action (actions/bump/index.js)', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns early when user refuses to proceed', async () => {
    inquirer.prompt.mockResolvedValue({ bump: false })

    const bump = require('../../../actions/bump/index')
    await bump()

    expect(bumpVersion).not.toHaveBeenCalled()
    expect(generateReleaseNote).not.toHaveBeenCalled()
  })

  it('calls bumpVersion and generateReleaseNote when user confirms', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ bump: true })
      .mockResolvedValueOnce({ merge: false })
      .mockResolvedValueOnce({ merge: false })
      .mockResolvedValueOnce({ merge: false })
      .mockResolvedValueOnce({ merge: false })

    const bump = require('../../../actions/bump/index')
    await bump()

    expect(bumpVersion).toHaveBeenCalled()
    expect(generateReleaseNote).toHaveBeenCalled()
  })

  it('executes git checkout, merge, and push commands when user confirms all steps', async () => {
    const { exec } = require('child_process')
    inquirer.prompt
      .mockResolvedValueOnce({ bump: true })
      .mockResolvedValueOnce({ merge: true })  // merge into default branch
      .mockResolvedValueOnce({ merge: true })  // push default branch
      .mockResolvedValueOnce({ merge: true })  // push develop
      .mockResolvedValueOnce({ merge: true })  // push tag

    const bump = require('../../../actions/bump/index')
    await bump()

    const cmds = exec.mock.calls.map(([cmd]) => cmd)
    // git checkout master (defaultBranch from mock pkg)
    expect(cmds).toContain('git checkout master')
    // git merge main --ff-only (current branch = 'main' from exec mock)
    expect(cmds.some(c => c.includes('git merge') && c.includes('--ff-only'))).toBe(true)
    // git push origin master:master
    expect(cmds.some(c => c.includes('git push origin master:master'))).toBe(true)
    // git push origin develop:develop
    expect(cmds.some(c => c.includes('git push origin develop:develop'))).toBe(true)
    // git push origin tag vX.X.X
    expect(cmds.some(c => c.startsWith('git push origin v'))).toBe(true)
  })
})
