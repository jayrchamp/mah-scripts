#!/bin/bash
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

set -e

if [[ -z $1 ]]; then
  echo "Enter new version (current $PACKAGE_VERSION): "
  read -r VERSION
else
  VERSION=$1
fi

read -p "Releasing $VERSION - are you sure? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Releasing $VERSION ..."

    # generate our release-note that will be output on the release page
    releaseFile=$(VERSION="$VERSION" node ./scripts/_gen-release-notes.js)

    # get content of our release-note
    releaseFileContent=$(tail -n +2 "$releaseFile")
    releaseFileContent=${releaseFileContent//'"'/'\"'/}
    releaseFileContent=${releaseFileContent//$'\n'/'\n'}


#     version=$VERSION
#     text=$releaseFileContent
#     branch=$(git rev-parse --abbrev-ref HEAD)
#     repo_full_name=$(git config --get remote.origin.url | sed 's/.*:\/\/github.com\///;s/.git$//')
#     # token='491c01a3530ecedddea6e55de4e035a21bdd5483'
#     token=$(git config --get github.token)

#     if [ -z "$token" ] ; then
#         echo "\r\n"
#         echo "WARNING - Github access token not found. Use 'git config --global github.token {YOUR_ACCESS_TOKEN}'"
#         echo "\r\n"
#         exit
#     fi

#     if [ -z "$text" ] ; then
#         text=" "
#     fi

# generate_post_data() {
# cat <<EOF
# {
#     "name": "v$version",
#     "tag_name": "v$version",
#     "target_commitish": "$branch",
#     "body": "$text",
#     "draft": false,
#     "prerelease": false
# }
# EOF
# }

# curl --data "$(generate_post_data)" "https://api.github.com/repos/ayourp/app/releases?access_token=$token"

# Bumps version, generates CHANGELOG, tag and commit
# yarn run release -- --release-as $VERSION

# BRANCH=$(git rev-parse --abbrev-ref HEAD)
# if [[ "$BRANCH" != "develop" ]]; then
#     git checkout develop
# fi







# # git checkout develop

# ### bump new version to package.json
# yarn version --new-version "$VERSION" --no-git-tag-version

# ### stage everything in working tree
# git add -A
# ### commit changes and chore release
# git commit -m "chore(release): v$VERSION"

# ### creates a tag
# git tag v"$VERSION"

# branchName=$(git rev-parse --abbrev-ref HEAD)

# git checkout master

# # echo $branchName
# git merge $branchName --ff-only








# echo ''
# echo "Pushing master to origin ..."
# git push origin master:master

# echo ''
# echo "Pushing develop to origin ..."
# git push origin develop:develop

# echo ''
# echo "Pushing tags to origin ..."
# git push --tags

# echo ''
# echo "Switching back to develop branch ..."
# git checkout develop




# git push

# # push new tag to origin
# git push -f origin refs/tags/v"$VERSION"

# create a release branch from develop and checkout to it
# git checkout -b release-"v$VERSION" develop

# # push to origin
# git push

fi
