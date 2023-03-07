#!/bin/bash

output=$(git ls-remote --tags --sort="committerdate" origin | tail -n 1 | sed 's~.*refs/tags/~~' | sed 's/\\^{}//')

if [[ "$output" -gt 0 ]]; then
  echo $output
else
  echo 'origin/nx'
fi;
