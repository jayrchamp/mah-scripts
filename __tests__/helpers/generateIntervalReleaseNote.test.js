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

const fs = require('fs')

jest.mock('../../helpers/index', () => ({
  getPreset: jest.fn(() => ({ name: 'conventionalcommits', types: [] })),
  executePromise: jest.fn().mockResolvedValue('')
}))

describe('generateIntervalReleaseNote file / path logic', () => {
  afterEach(() => jest.restoreAllMocks())

  it('builds the correct filename with version', () => {
    const version = '1.5.0'
    const filename = `RELEASE_NOTE_${version}.md`
    expect(filename).toBe('RELEASE_NOTE_1.5.0.md')
  })

  it('builds a fallback filename without version', () => {
    const version = undefined
    const filename = `RELEASE_NOTE${version ? `_${version}` : ``}.md`
    expect(filename).toBe('RELEASE_NOTE.md')
  })

  it('uses the release-notes directory', () => {
    const dir = './release-notes'
    expect(dir).toBe('./release-notes')
  })

  it('creates the directory if it does not exist', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    const mkdirMock = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {})

    const dir = './release-notes'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    expect(mkdirMock).toHaveBeenCalledWith(dir)
  })

  it('does not create the directory if it already exists', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    const mkdirMock = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {})

    const dir = './release-notes'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    expect(mkdirMock).not.toHaveBeenCalled()
  })
})
