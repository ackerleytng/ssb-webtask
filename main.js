#!/usr/bin/env node

const rewire = require('rewire')
const webtask = rewire('./webtask.js')

const testCurrentSsb = function () {
  const goGetSsb = webtask.__get__('goGetSsb')
  const parsePage = webtask.__get__('parsePage')
  const buildSummary = webtask.__get__('buildSummary')

  console.log('testCurrentSsb =======')
  goGetSsb()
    .then(parsePage)
    .then(buildSummary)
    .then(s => console.log(s))
}

const testFetchPast = function () {
  const goGetSsb = webtask.__get__('goGetSsb')

  console.log('testFetchPast ========')
}

if (process.argv.length == 2) {
  testCurrentSsb()
  testFetchPast()
} else if (process.argv.length == 3) {
  if ("--current".startsWith(process.argv[2])) {
    testCurrentSsb()
  } else if ("--past".startsWith(process.argv[2])) {
    testFetchPast()
  }
}
