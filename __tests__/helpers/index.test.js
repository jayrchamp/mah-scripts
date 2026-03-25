'use strict'

// ---------------------------------------------------------------------------
// Module-level side-effects in helpers/index.js require the heavy deps to be
// mocked BEFORE the module is first require()'d.
// ---------------------------------------------------------------------------

// Mock find-up so findUp.sync returns null (no .versionrc found in tests)
jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))

// Mock the project's own package.json that helpers reads via process.cwd()
jest.mock(
  require('path').resolve(process.cwd(), 'package.json'),
  () => ({
    version: '1.2.0',
    mah: {
      repo: 'owner/repo',
      'default-branch': 'main',
      'deploy-tmpl': {
        prod: 'gcloud deploy {VERSION} app.yaml',
        staging: 'gcloud deploy {VERSION} staging.yaml'
      }
    }
  }),
  { virtual: true }
)

// Mock conventional-recommended-bump so no git process is spawned
jest.mock('conventional-recommended-bump', () =>
  jest.fn((opts, cb) => cb(null, { releaseType: 'patch', reason: 'test', level: 2 }))
)

// Mock child_process.exec so no real shell commands run
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, cb) => cb(null, 'mock-stdout', ''))
}))

// Mock inquirer so prompts never block
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}))

const path = require('path')
const semver = require('semver')
const fs = require('fs')
const childProcess = require('child_process')
const conventionalRecommendedBump = require('conventional-recommended-bump')
const inquirer = require('inquirer')

const helpers = require('../../helpers/index')

// ---------------------------------------------------------------------------
// getPreset
// ---------------------------------------------------------------------------
describe('getPreset()', () => {
  it('returns an object with name = conventionalcommits', () => {
    const preset = helpers.getPreset()
    expect(preset).toMatchObject({ name: 'conventionalcommits' })
  })

  it('includes required URL format keys', () => {
    const preset = helpers.getPreset()
    expect(preset).toHaveProperty('commitUrlFormat')
    expect(preset).toHaveProperty('compareUrlFormat')
    expect(preset).toHaveProperty('issueUrlFormat')
    expect(preset).toHaveProperty('userUrlFormat')
    expect(preset).toHaveProperty('releaseCommitMessageFormat')
  })

  it('releaseCommitMessageFormat contains currentTag placeholder', () => {
    const { releaseCommitMessageFormat } = helpers.getPreset()
    expect(releaseCommitMessageFormat).toContain('{{currentTag}}')
  })
})

// ---------------------------------------------------------------------------
// getCurrentVersion
// ---------------------------------------------------------------------------
describe('getCurrentVersion()', () => {
  it('returns the version from package.json', () => {
    expect(helpers.getCurrentVersion()).toBe('1.2.0')
  })
})

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------
describe('getConfig()', () => {
  it('returns a nested mah config value', () => {
    expect(helpers.getConfig('repo')).toBe('owner/repo')
  })

  it('returns undefined for unknown key', () => {
    expect(helpers.getConfig('nonexistent')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getConfigDefaultBranch
// ---------------------------------------------------------------------------
describe('getConfigDefaultBranch()', () => {
  it('returns the configured default branch', () => {
    expect(helpers.getConfigDefaultBranch()).toBe('main')
  })
})

// ---------------------------------------------------------------------------
// getMahConfig
// ---------------------------------------------------------------------------
describe('getMahConfig()', () => {
  it('returns the full mah config object', () => {
    const config = helpers.getMahConfig()
    expect(config).toHaveProperty('repo', 'owner/repo')
    expect(config).toHaveProperty('default-branch', 'main')
  })
})

// ---------------------------------------------------------------------------
// getConfigDeployTmpl
// ---------------------------------------------------------------------------
describe('getConfigDeployTmpl()', () => {
  it('interpolates VERSION using new nested deploy-tmpl format', () => {
    const result = helpers.getConfigDeployTmpl({ VERSION: '1-2-0' }, 'prod')
    expect(result).toBe('gcloud deploy 1-2-0 app.yaml')
  })

  it('interpolates VERSION for staging env', () => {
    const result = helpers.getConfigDeployTmpl({ VERSION: '1-2-0' }, 'staging')
    expect(result).toBe('gcloud deploy 1-2-0 staging.yaml')
  })

  it('returns empty string when type has no matching template', () => {
    const result = helpers.getConfigDeployTmpl({ VERSION: '1' }, 'unknown')
    expect(result).toBe('')
  })
})

// ---------------------------------------------------------------------------
// getDeployTemplates
// ---------------------------------------------------------------------------
describe('getDeployTemplates()', () => {
  it('returns the deploy-tmpl object from new format', () => {
    const templates = helpers.getDeployTemplates()
    expect(templates).toEqual({
      prod: 'gcloud deploy {VERSION} app.yaml',
      staging: 'gcloud deploy {VERSION} staging.yaml'
    })
  })

  it('returns correct env keys that can be used as menu choices', () => {
    const keys = Object.keys(helpers.getDeployTemplates())
    expect(keys).toContain('prod')
    expect(keys).toContain('staging')
  })

  it('returns env → template map for backward-compat flat-key format', () => {
    jest.resetModules()
    jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))
    jest.mock(
      require('path').resolve(process.cwd(), 'package.json'),
      () => ({
        version: '1.0.0',
        mah: {
          repo: 'owner/repo',
          'deploy-tmpl-prod': 'gcloud deploy {VERSION} app.yaml',
          'deploy-tmpl-staging': 'gcloud deploy {VERSION} staging.yaml'
        }
      }),
      { virtual: true }
    )
    jest.mock('conventional-recommended-bump', () => jest.fn())
    jest.mock('child_process', () => ({ exec: jest.fn() }))
    jest.mock('inquirer', () => ({ prompt: jest.fn() }))

    const freshHelpers = require('../../helpers/index')
    const templates = freshHelpers.getDeployTemplates()
    expect(templates).toEqual({
      prod: 'gcloud deploy {VERSION} app.yaml',
      staging: 'gcloud deploy {VERSION} staging.yaml'
    })
  })
})

// ---------------------------------------------------------------------------
// br
// ---------------------------------------------------------------------------
describe('br()', () => {
  it('calls console.log with empty string', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    helpers.br()
    expect(spy).toHaveBeenCalledWith('')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------
describe('sleep()', () => {
  it('resolves after the given time', async () => {
    jest.useFakeTimers()
    const p = helpers.sleep(500)
    jest.advanceTimersByTime(500)
    await p
    jest.useRealTimers()
  })
})

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------
describe('execute()', () => {
  it('calls the callback with stdout', done => {
    childProcess.exec.mockImplementationOnce((cmd, cb) => cb(null, 'hello', ''))
    helpers.execute('echo hello', output => {
      expect(output).toBe('hello')
      done()
    })
  })
})

// ---------------------------------------------------------------------------
// executePromise
// ---------------------------------------------------------------------------
describe('executePromise()', () => {
  it('resolves with stdout string', async () => {
    childProcess.exec.mockImplementationOnce((cmd, cb) => cb(null, 'result\n', ''))
    const out = await helpers.executePromise('echo result')
    expect(out).toBe('result\n')
  })
})

// ---------------------------------------------------------------------------
// getCurrentGitBranch
// ---------------------------------------------------------------------------
describe('getCurrentGitBranch()', () => {
  it('resolves with trimmed branch name', async () => {
    childProcess.exec.mockImplementationOnce((cmd, cb) => cb(null, 'main\n', ''))
    const branch = await helpers.getCurrentGitBranch()
    expect(branch).toBe('main')
  })
})

// ---------------------------------------------------------------------------
// getAccessToken
// ---------------------------------------------------------------------------
describe('getAccessToken()', () => {
  it('resolves with the token when found', async () => {
    childProcess.exec.mockImplementationOnce((cmd, cb) => cb(null, 'ghp_token123\n', ''))
    const token = await helpers.getAccessToken()
    expect(token).toBe('ghp_token123')
  })

  it('rejects when no token is found', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    childProcess.exec.mockImplementationOnce((cmd, cb) => cb(null, '', ''))
    await expect(helpers.getAccessToken()).rejects.toBeUndefined()
    jest.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// getRecommandedBump
// ---------------------------------------------------------------------------
describe('getRecommandedBump()', () => {
  it('resolves with currentVersion, newVersion, releaseType', async () => {
    const result = await helpers.getRecommandedBump()
    expect(result).toHaveProperty('currentVersion', '1.2.0')
    expect(result).toHaveProperty('releaseType', 'patch')
    expect(semver.valid(result.newVersion)).not.toBeNull()
  })

  it('calls conventionalRecommendedBump with a preset', async () => {
    await helpers.getRecommandedBump()
    expect(conventionalRecommendedBump).toHaveBeenCalledWith(
      expect.objectContaining({ preset: expect.any(Object) }),
      expect.any(Function)
    )
  })
})

// ---------------------------------------------------------------------------
// validateMahConfig
// ---------------------------------------------------------------------------
describe('validateMahConfig()', () => {
  it('returns true when mah config is present', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    const result = helpers.validateMahConfig()
    expect(result).toBe(true)
    jest.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// askVersion
// ---------------------------------------------------------------------------
describe('askVersion()', () => {
  afterEach(() => jest.restoreAllMocks())

  it('returns current version when user presses enter (empty input)', async () => {
    inquirer.prompt.mockResolvedValueOnce({ version: '' })
    const v = await helpers.askVersion()
    expect(semver.valid(v)).not.toBeNull()
  })

  it('returns cleaned version when user types a valid semver', async () => {
    inquirer.prompt.mockResolvedValueOnce({ version: '2.0.0' })
    const v = await helpers.askVersion()
    expect(v).toBe('2.0.0')
  })

  it('retries and resolves on second attempt if first input is invalid', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ version: 'not-a-version' })
      .mockResolvedValueOnce({ version: '3.0.0' })
    jest.spyOn(console, 'log').mockImplementation(() => {})
    const v = await helpers.askVersion()
    expect(v).toBe('3.0.0')
  })
})

// ---------------------------------------------------------------------------
// checkIfExists
// ---------------------------------------------------------------------------
describe('checkIfExists()', () => {
  it('resolves true for an existing file', async () => {
    const result = await helpers.checkIfExists(
      require('path').resolve(__dirname, '../../helpers/index.js')
    )
    expect(result).toBe(true)
  })

  it('resolves false for a non-existing file', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    const result = await helpers.checkIfExists('/tmp/__nonexistent_file_abc123__.md')
    expect(result).toBe(false)
    jest.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// getContent
// ---------------------------------------------------------------------------
describe('getContent()', () => {
  afterEach(() => jest.restoreAllMocks())

  it('strips the first line and returns the rest joined by newlines', async () => {
    jest.spyOn(fs, 'readFile').mockImplementation((file, enc, cb) =>
      cb(null, '# Header\nline 2\nline 3')
    )
    const result = await helpers.getContent('/any/file.md')
    expect(result).toBe('line 2\nline 3')
  })

  it('trims outer whitespace before processing', async () => {
    jest.spyOn(fs, 'readFile').mockImplementation((file, enc, cb) =>
      cb(null, '  # Header\n  line 2  \n  ')
    )
    const result = await helpers.getContent('/any/file.md')
    // trim → '# Header\n  line 2', then strip first line → '  line 2'
    expect(result).toBe('  line 2')
  })

  it('returns empty string when file has only one line', async () => {
    jest.spyOn(fs, 'readFile').mockImplementation((file, enc, cb) =>
      cb(null, '# Only line')
    )
    const result = await helpers.getContent('/any/file.md')
    expect(result).toBe('')
  })
})

// ---------------------------------------------------------------------------
// getConfigDeployTmpl — error path (undefined variable in template)
// ---------------------------------------------------------------------------
describe('getConfigDeployTmpl() — template variable missing', () => {
  afterEach(() => jest.restoreAllMocks())

  it('returns undefined and logs an error when a template variable is not provided', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    // Template is 'gcloud deploy {VERSION} app.yaml', calling without VERSION triggers catch
    const result = helpers.getConfigDeployTmpl({}, 'prod')
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getRecommandedBump — error path
// ---------------------------------------------------------------------------
describe('getRecommandedBump() — error path', () => {
  afterEach(() => jest.restoreAllMocks())

  it('calls process.exit(1) when conventionalRecommendedBump returns an error', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {})
    // Pass a dummy recommendation so the callback doesn't throw after process.exit (source bug: missing return)
    conventionalRecommendedBump.mockImplementationOnce((opts, cb) =>
      cb(new Error('git history error'), { releaseType: 'patch', reason: '', level: 2 })
    )
    await helpers.getRecommandedBump()
    expect(mockExit).toHaveBeenCalledWith(1)
    mockExit.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// validateMahConfig — false path (no mah config in package.json)
// ---------------------------------------------------------------------------
describe('validateMahConfig() — false path', () => {
  it('returns false and logs instructions when mah config is absent', () => {
    // Temporarily stub getMahConfig to simulate a package.json without the mah key.
    // We do this by requiring the module fresh with resetModules + a stripped mock.
    jest.resetModules()
    jest.mock('find-up', () => ({ sync: jest.fn(() => null) }))
    jest.mock(
      require('path').resolve(process.cwd(), 'package.json'),
      () => ({ version: '1.0.0' }), // no mah key
      { virtual: true }
    )
    jest.mock('conventional-recommended-bump', () => jest.fn())
    jest.mock('child_process', () => ({ exec: jest.fn() }))
    jest.mock('inquirer', () => ({ prompt: jest.fn() }))

    const freshHelpers = require('../../helpers/index')
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const result = freshHelpers.validateMahConfig()
    expect(result).toBe(false)
    expect(logSpy).toHaveBeenCalled()
    jest.restoreAllMocks()
  })
})
