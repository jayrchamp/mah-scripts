'use strict'

jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))
jest.mock(
  require('path').resolve(process.cwd(), 'package.json'),
  () => ({ version: '1.2.0', mah: { repo: 'owner/repo' } }),
  { virtual: true }
)
jest.mock('conventional-recommended-bump', () =>
  jest.fn((opts, cb) => cb(null, { releaseType: 'patch', reason: '', level: 2 }))
)
jest.mock('child_process', () => ({ exec: jest.fn((cmd, cb) => cb(null, '', '')) }))
jest.mock('inquirer', () => ({ prompt: jest.fn() }))

// Mock generateIntervalReleaseNote since it uses git history
jest.mock('../../../helpers/generateIntervalReleaseNote', () => jest.fn().mockResolvedValue())

const inquirer = require('inquirer')
const generateIntervalReleaseNote = require('../../../helpers/generateIntervalReleaseNote')

describe('releaseNote action (actions/releaseNote/index.js)', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls generateIntervalReleaseNote with the version provided by user', async () => {
    inquirer.prompt.mockResolvedValueOnce({ version: '1.2.0' })

    const releaseNote = require('../../../actions/releaseNote/index')
    await releaseNote()

    expect(generateIntervalReleaseNote).toHaveBeenCalledWith('1.2.0')
  })

  it('calls generateIntervalReleaseNote with current version when user skips input', async () => {
    inquirer.prompt.mockResolvedValueOnce({ version: '' })

    jest.resetModules()
    jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))
    jest.mock(
      require('path').resolve(process.cwd(), 'package.json'),
      () => ({ version: '1.2.0', mah: { repo: 'owner/repo' } }),
      { virtual: true }
    )
    jest.mock('conventional-recommended-bump', () =>
      jest.fn((opts, cb) => cb(null, { releaseType: 'patch', reason: '', level: 2 }))
    )
    jest.mock('child_process', () => ({ exec: jest.fn((cmd, cb) => cb(null, '', '')) }))
    const mockGen = jest.fn().mockResolvedValue()
    jest.mock('../../../helpers/generateIntervalReleaseNote', () => mockGen)
    jest.mock('inquirer', () => ({
      prompt: jest.fn().mockResolvedValueOnce({ version: '' })
    }))

    const releaseNote2 = require('../../../actions/releaseNote/index')
    await releaseNote2()

    // When empty, askVersion returns getCurrentVersion() = '1.2.0'
    expect(mockGen).toHaveBeenCalledWith('1.2.0')
  })
})
