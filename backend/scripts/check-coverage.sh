#!/bin/sh
# Fails when the total statement coverage in a Go cover profile is below
# the minimum. Usage: check-coverage.sh <profile> <minimum-percent>
set -eu

profile="${1:?usage: check-coverage.sh <profile> <minimum-percent>}"
minimum="${2:?usage: check-coverage.sh <profile> <minimum-percent>}"

total=$(go tool cover -func="$profile" | awk '/^total:/ { sub("%", "", $NF); print $NF }')

if awk -v total="$total" -v minimum="$minimum" 'BEGIN { exit !(total + 0 >= minimum + 0) }'; then
	echo "coverage ${total}% meets the ${minimum}% minimum"
else
	echo "coverage ${total}% is below the ${minimum}% minimum" >&2
	exit 1
fi