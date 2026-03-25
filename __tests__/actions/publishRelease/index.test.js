'use strict'

jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))
jest.mock(
  require('path').resolve(process.cwd(), 'package.json'),
  () => ({ version: '1.2.0', mah: { repo: 'owner/repo', 'default-branch': 'master' } }),
  { virtual: true }
)
jest.mock('conventional-recommended-bump', () =>
  jest.fn((opts, cb) => cb(null, { releaseType: 'patch', reason: '', level: 2 }))
)
jest.mock('child_process', () => ({ exec: jest.fn() }))
jest.mock('inquirer', () => ({ prompt: jest.fn() }))
jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    color: ''
  }))
)
jest.mock('axios', () => ({ post: jest.fn() }))

const { exec } = require('child_process')
const inquirer = require('inquirer')
const axios = require('axios')
const fs = require('fs')
const ora = require('ora')

const publishRelease = require('../../../actions/publishRelease/index')

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------
function setupGitExec() {
  exec.mockImplementation((cmd, cb) => {
    if (cmd.includes('github.token')) return cb(null, 'ghp_token\n', '')
    if (cmd.includes('git branch')) return cb(null, 'master\n  develop\n', '')
    cb(null, 'main\n', '')
  })
}

// Queue the four sequential inquirer.prompt calls that publishRelease makes
function queuePrompts({ version = '1.2.0', prerelease = [], confirm = true } = {}) {
  inquirer.prompt
    .mockResolvedValueOnce({ version })
    .mockResolvedValueOnce({ prerelease })
    .mockResolvedValueOnce({ branch: 'master (default)' })
    .mockResolvedValueOnce({ confirm })
}

describe('publishRelease action (actions/publishRelease/index.js)', () => {
  let fsAccessSpy

  beforeEach(() => {
    setupGitExec()
    fsAccessSpy = jest.spyOn(fs, 'access').mockImplementation((p, mode, cb) => cb(null))
    jest.spyOn(fs, 'readFile').mockImplementation((f, enc, cb) =>
      cb(null, '## Changelog\n\nsome content')
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  // ── Confirm / decline ────────────────────────────────────────────────────

  it('does not call axios.post when user declines confirmation', async () => {
    queuePrompts({ confirm: false })
    await publishRelease()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('does not call axios.post when the release note file does not exist', async () => {
    queuePrompts()
    fsAccessSpy.mockImplementation((p, mode, cb) => cb(new Error('ENOENT')))
    jest.spyOn(console, 'log').mockImplementation(() => {})
    await publishRelease()
    expect(axios.post).not.toHaveBeenCalled()
  })

  // ── HTTP endpoint & auth ─────────────────────────────────────────────────

  it('posts to the correct GitHub releases endpoint', async () => {
    queuePrompts()
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/releases',
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('sends the Authorization header with the git-stored token', async () => {
    queuePrompts()
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ headers: { Authorization: 'token ghp_token' } })
    )
  })

  // ── POST body contracts ──────────────────────────────────────────────────

  it('posts the correct release name and tag_name', async () => {
    queuePrompts()
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: 'v1.2.0', tag_name: 'v1.2.0' }),
      expect.any(Object)
    )
  })

  it('sends draft: false and prerelease: false by default', async () => {
    queuePrompts()
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ draft: false, prerelease: false }),
      expect.any(Object)
    )
  })

  it('sends draft: true when "Is Draft" is checked', async () => {
    queuePrompts({ prerelease: ['Is Draft'] })
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ draft: true, prerelease: false }),
      expect.any(Object)
    )
  })

  it('sends prerelease: true when "Is Pre-release" is checked', async () => {
    queuePrompts({ prerelease: ['Is Pre-release'] })
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ draft: false, prerelease: true }),
      expect.any(Object)
    )
  })

  it('strips the first line from the release note body before posting', async () => {
    queuePrompts()
    axios.post.mockResolvedValueOnce({ data: {} })
    await publishRelease()
    // getContent: '## Changelog\n\nsome content' → trim → split → splice(0,1) → join → '\nsome content'
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: '\nsome content' }),
      expect.any(Object)
    )
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('calls spinner.fail with the error message when axios.post throws', async () => {
    queuePrompts()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    axios.post.mockRejectedValueOnce(new Error('Network Error'))
    await publishRelease()
    // ora() returns the spinner; ora.mock.results[0].value is that instance
    const spinner = ora.mock.results[0].value
    expect(spinner.fail).toHaveBeenCalledWith('Network Error')
  })

  it('calls spinner.fail with the error code when there is no message property', async () => {
    queuePrompts()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    axios.post.mockRejectedValueOnce({ code: 'ECONNREFUSED' })
    await publishRelease()
    const spinner = ora.mock.results[0].value
    expect(spinner.fail).toHaveBeenCalledWith('ECONNREFUSED')
  })

  it('logs endpoint and message when GitHub returns a 404 response', async () => {
    queuePrompts()
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    axios.post.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { message: 'Not Found' },
        config: { url: 'https://api.github.com/repos/owner/repo/releases' }
      }
    })
    await publishRelease()
    const allLogs = logSpy.mock.calls.map(([arg]) => String(arg ?? '')).join(' ')
    expect(allLogs).toContain('404')
    expect(allLogs).toContain('Not Found')
  })
})
