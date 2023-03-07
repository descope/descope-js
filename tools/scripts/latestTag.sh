#!/bin/bash

output=$(git ls-remote --tags --sort="committerdate" origin);
if [ -z $output ];
then echo origin/main;
else echo $output;
fi;
