#!/bin/bash

output=$(git ls-remote --tags --sort="committerdate" origin 2> /dev/null | tail -n 1 | sed 's~.*refs/tags/~~' | sed 's/\^{}//');
if [ -z $output ];
then echo origin/main;
else echo $output;
fi;
