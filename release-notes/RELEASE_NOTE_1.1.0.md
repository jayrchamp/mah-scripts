## 1.1.0 (2020-08-12)


### 🤩 Features

* add new command to manage releases and tags ([4476e74](https://github.com/jayrchamp/mah-scripts/commit/4476e74fa757c810c6e0c60c42a0097c09b415f1))
* new cli questions (push-master-to-origin) & (push-develop-to-origin) ([7c2bc72](https://github.com/jayrchamp/mah-scripts/commit/7c2bc7270527c79f2a6d356a696a74e2c66d14f9))


### 💡 Refactor

* fallback on default ".versionrc" in case none is provided by project root ([999d49e](https://github.com/jayrchamp/mah-scripts/commit/999d49ebb7911b403487707b9e76ac371638c2ca))
* push tag when bumping + improve delete-release  + add a new command to only generate release notes ([9b2a7cd](https://github.com/jayrchamp/mah-scripts/commit/9b2a7cd3554b5260546a1587aa9738a8aab4721b))
* update authentification via URL query parameters for Authorization HTTP headers (Github Deprecation) ([8be3f78](https://github.com/jayrchamp/mah-scripts/commit/8be3f78f16494a4825bc82f384182da64cefc933))


### 🐞 Fixes

* **actions/bump:** not validating correctly the boolean input ([2d6a7ba](https://github.com/jayrchamp/mah-scripts/commit/2d6a7ba59126daaff9a04d6ed1d826f511fe49f6))
* **publishRelease:** fix default target commitish branch name "master (default)", should only be "master" ([5842afa](https://github.com/jayrchamp/mah-scripts/commit/5842afa973969b343744a938637388b0aa45230d))
* conditional prompts not being evaluated correctly ([eeca18c](https://github.com/jayrchamp/mah-scripts/commit/eeca18c60a7f02b9a316352d41d7e519bf9aa137))
* ENOENT: no such file or directory when bump version and no "release-notes" directory is found ([4d90821](https://github.com/jayrchamp/mah-scripts/commit/4d9082187ba527a31dedc5576f99bf12d23604ef))
* push tag to origin when bumping version ([ccfc93c](https://github.com/jayrchamp/mah-scripts/commit/ccfc93c2311e0a76237035122e576fbe1162d28f))

