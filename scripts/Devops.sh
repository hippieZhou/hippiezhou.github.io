#!/bin/bash

# Commit message format example:
# docs(TP-157): update readme with project specific content
# ^--^ ^-----^ ^-----------------------------------------^
# |     |       |
# |     |       +-> Summary in present tense.
# |     |
# |     +-> Jira ticket Id.
# |
# +-------> Type: (see below).

# Commit types
commit_types=(
  "feat: A new feature"
  "fix: A bug fix"
  "docs: Documentation only changes"
  "style: Changes that do not affect the meaning of the code (white-space, formatting, etc.)"
  "refactor: A code change that neither fixes a bug nor adds a feature"
  "perf: A code change that improves performance"
  "test: Adding missing tests or correcting existing tests"
  "build: Changes that affect the build system or external dependencies"
  "ci: Changes to CI configuration files and scripts"
  "chore: Other changes that don't modify src or test files"
  "revert: Reverts a previous commit"
)

# Display commit types
echo "Available commit types:"
for type in "${commit_types[@]}"; do
  echo "  - ${type}"
done

# Prompt for commit type
while true; do
  read -p "Enter commit type (e.g., docs, feat, fix, etc.): " type
  if [[ $type =~ ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)$ ]]; then
    break
  else
    echo "Invalid commit type. Please choose from the list above."
  fi
done

# Prompt for card number
read -p "Enter card number (e.g., TP-157): " card_number

# Prompt for commit message
read -p "Enter commit message: " commit_message

# Prompt for co-author (optional)
read -p "Enter co-author (e.g., Name <email@example.com>, leave blank if none): " co_author

# Validate inputs
if [[ -z "$type" || -z "$card_number" || -z "$commit_message" ]]; then
  echo "Error: All fields (type, card number, and commit message) are required."
  exit 1
fi

# Construct the commit message
formatted_commit_message="$type($card_number): $commit_message"
if [[ -n "$co_author" ]]; then
  formatted_commit_message+="\n\nCo-authored-by: $co_author"
fi

# Perform the commit
git commit -m "$formatted_commit_message"

# Confirm success
if [[ $? -eq 0 ]]; then
  echo "Commit created successfully with message:"
  echo -e "$formatted_commit_message"
else
  echo "Error: Commit failed."
fi