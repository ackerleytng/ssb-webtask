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

const testFetchPast = function (year, month) {
  const getPastSsb = webtask.__get__('getPastSsb')
  const parsePastPage = webtask.__get__('parsePastPage')
  const buildPastSummary = webtask.__get__('buildPastSummary')

  console.log('testFetchPast ========')
  getPastSsb(year, month, 5)
    .then(parsePastPage)
    .then(buildPastSummary)
    .then(s => console.log(s))
    .catch(e => console.log(e))
}

if (process.argv.length == 2) {
  testCurrentSsb()
  testFetchPast()
} else if (process.argv.length > 2) {
  if ("--current".startsWith(process.argv[2])) {
    testCurrentSsb()
  } else if ("--past".startsWith(process.argv[2])) {
    testFetchPast(process.argv[3], process.argv[4])
  }
}
