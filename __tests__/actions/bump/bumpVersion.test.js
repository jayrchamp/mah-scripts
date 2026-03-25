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
jest.mock('inquirer', () => ({ prompt: jest.fn() }))

const { exec } = require('child_process')
jest.mock('child_process', () => ({ exec: jest.fn() }))

const bumpVersion = require('../../../actions/bump/bumpVersion')

describe('bumpVersion()', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls yarn version with the given new version', async () => {
    exec.mockImplementationOnce((cmd, cb) => cb(null, '', ''))
    await bumpVersion('2.0.0')
    expect(exec).toHaveBeenCalledWith(
      'yarn version --new-version 2.0.0 --no-git-tag-version',
      expect.any(Function)
    )
  })

  it('resolves with the stdout from yarn', async () => {
    exec.mockImplementationOnce((cmd, cb) => cb(null, 'success output', ''))
    const result = await bumpVersion('1.3.0')
    expect(result).toBe('success output')
  })

  it('resolves even when stdout is empty', async () => {
    exec.mockImplementationOnce((cmd, cb) => cb(null, '', ''))
    await expect(bumpVersion('1.0.1')).resolves.not.toThrow()
  })
})
