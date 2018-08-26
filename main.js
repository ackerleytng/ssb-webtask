#!/usr/bin/env node

const rewire = require('rewire')
const webtask = rewire('./webtask.js')

const testCurrentSsb = function () {
  const getUrl = webtask.__get__('getUrl')
  const parsePage = webtask.__get__('parsePage')
  const buildSummary = webtask.__get__('buildSummary')

  console.log('testCurrentSsb =======')
  getUrl('http://www.sgs.gov.sg/savingsbonds/Your-SSB/This-months-bond.aspx')
    .then(parsePage)
    .then(buildSummary)
    .then(s => console.log(s))
}

const testFetchPast = function (year, month) {
  const getUrl = webtask.__get__('getUrl')
  const getPastSsb = webtask.__get__('getPastSsb')
  const parseHiddenFields = webtask.__get__('parseHiddenFields')
  const parsePastPage = webtask.__get__('parsePastPage')
  const buildPastSummary = webtask.__get__('buildPastSummary')

  console.log('testFetchPast ========')
  getUrl('https://secure.sgs.gov.sg/fdanet/StepupInterest.aspx')
    .then(parseHiddenFields)
    .then(hiddenFields => getPastSsb(5, hiddenFields, year, month))
    .then(parsePastPage)
    .then(buildPastSummary)
    .then(s => console.log(s))
    .catch(e => console.log(e))
}

const testParseFetch = function (string) {
  const parseFetch = webtask.__get__('parseFetch')

  result = parseFetch(string)
  console.log(result)
  return result
}

const arrayEqual = function (a, b) {
  return a.toString() === b.toString()
}

if (process.argv.length == 2) {
  testCurrentSsb()
  testFetchPast('2018', '6')
  testParseFetch('june 18')
} else if (process.argv.length > 2) {
  if ('--current'.startsWith(process.argv[2])) {
    testCurrentSsb()
  } else if ('--past'.startsWith(process.argv[2])) {
    testFetchPast(process.argv[3], process.argv[4])
  } else if ('--parse'.startsWith(process.argv[2])) {
    console.log(arrayEqual(testParseFetch('june 2018'), ['2018', '6']))
    console.log(arrayEqual(testParseFetch('june 18'), ['2018', '6']))
    console.log(arrayEqual(testParseFetch('june 98'), ['1998', '6']))
    console.log(arrayEqual(testParseFetch('17'), ['2017', undefined]))
    console.log(arrayEqual(testParseFetch('may'), [undefined, '5']))
    console.log(arrayEqual(testParseFetch('15 jan'), ['2015', '1']))
    console.log(arrayEqual(testParseFetch('feb 16'), ['2016', '2']))
    console.log(arrayEqual(testParseFetch('March 16'), ['2016', '3']))
    console.log(arrayEqual(testParseFetch('foo 16'), ['2016', undefined]))
    console.log(arrayEqual(testParseFetch(' apr 16'), ['2016', '4']))
    console.log(arrayEqual(testParseFetch(' jully 13'), ['2013', '7']))
    console.log(arrayEqual(testParseFetch(' aug 14'), ['2014', '8']))
    console.log(arrayEqual(testParseFetch(' September    14'), ['2014', '9']))
    console.log(arrayEqual(testParseFetch('oct    18'), ['2018', '10']))
    console.log(arrayEqual(testParseFetch('November 17'), ['2017', '11']))
    console.log(arrayEqual(testParseFetch('decem 17'), ['2017', '12']))
  }
}
