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
jest.mock('axios', () => ({
  get: jest.fn(),
  delete: jest.fn()
}))
jest.mock('readline-sync', () => ({
  keyInSelect: jest.fn(),
  keyInYN: jest.fn(),
  question: jest.fn()
}))

const axios = require('axios')
const readlineSync = require('readline-sync')
const { exec } = require('child_process')

describe('manageReleaseAndTags action (actions/manageReleaseAndTags/index.js)', () => {
  afterEach(() => jest.clearAllMocks())

  const mockToken = (token = 'ghp_test') => {
    exec.mockImplementationOnce((cmd, cb) => cb(null, `${token}\n`, ''))
  }

  it('lists tags when user selects "List all tags"', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(0) // 'List all tags' index

    axios.get.mockResolvedValueOnce({
      data: [
        { ref: 'refs/tags/v1.0.0' },
        { ref: 'refs/tags/v1.1.0' }
      ]
    })

    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/git/refs/tags'),
      expect.any(Object)
    )
    jest.restoreAllMocks()
  })

  it('lists releases when user selects "List all releases"', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(1) // 'List all releases' index

    axios.get.mockResolvedValueOnce({
      data: [{ name: 'v1.0.0', id: 1 }]
    })

    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/releases'),
      expect.any(Object)
    )
    jest.restoreAllMocks()
  })

  it('deletes a specific tag when user selects "Delete a tag" and provides a ref', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(2) // 'Delete a tag'
    readlineSync.question.mockReturnValueOnce('refs/tags/v1.0.0')

    axios.delete.mockResolvedValueOnce({ data: {} })
    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('refs/tags/v1.0.0'),
      expect.any(Object)
    )
    jest.restoreAllMocks()
  })

  it('does not delete a tag when user provides an empty ref', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(2) // 'Delete a tag'
    readlineSync.question.mockReturnValueOnce('')

    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.delete).not.toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  it('deletes a specific release when user selects "Delete a release" and provides id', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(4) // 'Delete a release'
    readlineSync.question.mockReturnValueOnce('42')

    axios.delete.mockResolvedValueOnce({ data: {} })
    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/releases/42'),
      expect.any(Object)
    )
    jest.restoreAllMocks()
  })

  it('deletes all tags when user confirms "Delete all tags"', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(3) // 'Delete all tags'
    readlineSync.keyInYN.mockReturnValueOnce(true)

    axios.get.mockResolvedValueOnce({
      data: [{ ref: 'refs/tags/v1.0.0' }, { ref: 'refs/tags/v1.1.0' }]
    })
    axios.delete.mockResolvedValue({ data: {} })
    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.delete).toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  it('does not delete all tags when user cancels', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(3) // 'Delete all tags'
    readlineSync.keyInYN.mockReturnValueOnce(false)

    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.delete).not.toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  it('deletes all releases when user confirms "Delete all releases"', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(5) // 'Delete all releases'
    readlineSync.keyInYN.mockReturnValueOnce(true)

    axios.get.mockResolvedValueOnce({
      data: [{ id: 10, name: 'v1.0.0' }]
    })
    axios.delete.mockResolvedValueOnce({ data: {} })
    jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(axios.delete).toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('logs 404 details when a delete operation returns a 404 response', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(2) // 'Delete a tag'
    readlineSync.question.mockReturnValueOnce('refs/tags/v1.0.0')

    axios.delete.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { message: 'Reference does not exist' },
        config: { url: 'https://api.github.com/repos/owner/repo/git/refs/tags/v1.0.0' }
      }
    })

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    const allLogs = logSpy.mock.calls.map(([arg]) => String(arg ?? '')).join(' ')
    expect(allLogs).toContain('404')
    expect(allLogs).toContain('Reference does not exist')
    jest.restoreAllMocks()
  })

  it('catches and logs when axios.get fails while listing tags', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(0) // 'List all tags'

    axios.get.mockRejectedValueOnce(new Error('connection timeout'))
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(logSpy).toHaveBeenCalledWith(expect.any(Error))
    jest.restoreAllMocks()
  })

  it('catches and logs when axios.get fails while listing releases', async () => {
    mockToken()
    readlineSync.keyInSelect.mockReturnValueOnce(1) // 'List all releases'

    axios.get.mockRejectedValueOnce(new Error('connection timeout'))
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    expect(logSpy).toHaveBeenCalledWith(expect.any(Error))
    jest.restoreAllMocks()
  })

  it('catches and logs when token fetch fails (main try/catch)', async () => {
    // exec returns empty string → getAccessToken rejects → outer catch fires
    exec.mockImplementationOnce((cmd, cb) => cb(null, '', ''))
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const action = require('../../../actions/manageReleaseAndTags/index')
    await action()

    // The catch block calls console.log(error) — it must have been called at least once
    expect(logSpy).toHaveBeenCalled()
    jest.restoreAllMocks()
  })
})
