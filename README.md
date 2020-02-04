# Create a new release

`release.sh`

This will: 
* generate a release note in `./release-notes` that will be used when publishing the release on Github.
* bump new version in package.json.
* stage and commit newly changed package.json w/ commit message "chore(release): v....."
* create a tag.
* create a checkout on a new release-* branch.

* At root level, launch this cmd:

```shell
$  sh scripts/release.sh
```


# Publish a release

`publish-release.js`

This will: 
* get the release note in `./release-notes` relative to the tag version number given as an argument.
* publish the release note to Github in the releases section attached to the tag version number.

* At root level, launch this cmd:

```shell
$  node scripts/publish-release.js
```



# Delete a all releases, tags

`delete-release.js`

This will: 
* delete all releases and tags on Github.

* At root level, launch this cmd:

```shell
$  node scripts/delete-release.js
```
