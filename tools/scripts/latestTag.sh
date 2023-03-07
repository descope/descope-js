#!/bin/bash

output=$(git ls-remote --tags --sort="committerdate" origin 2> /dev/null | tail -n 1 | sed 's~.*refs/tags/~~' | sed 's/\\^{}//');
if [ -n $output ];
then echo $output;
else echo origin/$(git rev-parse --abbrev-ref HEAD);
fi;
