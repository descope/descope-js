#!/bin/bash

output=$(git ls-remote --tags --sort="committerdate" origin);
if [ -z $output ];
then echo origin/$(git rev-parse --abbrev-ref HEAD);
else echo $output;
fi;
