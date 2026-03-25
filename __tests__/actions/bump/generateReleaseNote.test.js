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
const cc = require('conventional-changelog')

// Mock conventional-changelog to avoid real git access
jest.mock('conventional-changelog', () => jest.fn())

describe('generateReleaseNote() (actions/bump)', () => {
  let mkdirSyncMock
  let createWriteStreamMock
  let fakeStream

  beforeEach(() => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    mkdirSyncMock = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {})

    fakeStream = {
      on: jest.fn((event, cb) => {
        if (event === 'close') setImmediate(cb) // trigger close immediately
        return fakeStream
      })
    }
    createWriteStreamMock = jest
      .spyOn(fs, 'createWriteStream')
      .mockReturnValue(fakeStream)

    // conventional-changelog returns an object with .pipe()
    cc.mockReturnValue({ pipe: jest.fn(() => fakeStream) })
  })

  afterEach(() => jest.restoreAllMocks())

  it('creates the release-notes directory when missing', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)

    const generateReleaseNote = require('../../../actions/bump/generateReleaseNote')
    await generateReleaseNote('1.2.0')
    expect(mkdirSyncMock).toHaveBeenCalledWith('./release-notes')
  })

  it('does not create the directory when it already exists', async () => {
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
    jest.mock('inquirer', () => ({ prompt: jest.fn() }))

    const _fs = require('fs')
    jest.spyOn(_fs, 'existsSync').mockReturnValue(true)
    const mkdir2 = jest.spyOn(_fs, 'mkdirSync').mockImplementation(() => {})
    const fakeStr = {
      on: jest.fn((event, cb) => {
        if (event === 'close') setImmediate(cb)
        return fakeStr
      })
    }
    jest.spyOn(_fs, 'createWriteStream').mockReturnValue(fakeStr)

    const _cc = require('conventional-changelog')
    jest.mock('conventional-changelog', () => jest.fn())
    _cc.mockReturnValue({ pipe: jest.fn(() => fakeStr) })

    const gen = require('../../../actions/bump/generateReleaseNote')
    await gen('2.0.0')
    expect(mkdir2).not.toHaveBeenCalled()
  })

  it('creates a write stream with the versioned filename', async () => {
    const generateReleaseNote = require('../../../actions/bump/generateReleaseNote')
    await generateReleaseNote('1.2.0')
    expect(createWriteStreamMock).toHaveBeenCalledWith(
      './release-notes/RELEASE_NOTE_1.2.0.md'
    )
  })

  it('creates a write stream with a fallback filename when no version given', async () => {
    const generateReleaseNote = require('../../../actions/bump/generateReleaseNote')
    await generateReleaseNote(null)
    expect(createWriteStreamMock).toHaveBeenCalledWith('./release-notes/RELEASE_NOTE.md')
  })

  it('resolves after the stream closes', async () => {
    const generateReleaseNote = require('../../../actions/bump/generateReleaseNote')
    await expect(generateReleaseNote('1.0.0')).resolves.toBeUndefined()
  })
})
