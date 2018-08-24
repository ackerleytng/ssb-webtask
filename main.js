#!/usr/bin/env node

const rewire = require('rewire')
const webtask = rewire('./webtask.js')

const goGetSsb = webtask.__get__('goGetSsb')
const parsePage = webtask.__get__('parsePage')
const buildSummary = webtask.__get__('buildSummary')

goGetSsb()
  .then(parsePage)
  .then(buildSummary)
  .then(s => console.log(s))
