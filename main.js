#!/usr/bin/env node

/* eslint-disable no-underscore-dangle, no-console, import/no-extraneous-dependencies */

const rewire = require('rewire');

const webtask = rewire('./webtask.js');

const testGetInterestInfo = () => {
  const getInterestInfo = webtask.__get__('getInterestInfo');

  console.log('testGetInterestInfo =======');
  getInterestInfo('GX19080E').then(s => console.log(s));
};

const testGetBondInfo = (year, month) => {
  const getBondInfo = webtask.__get__('getBondInfo');

  console.log('testGetBondInfo =======');
  getBondInfo(year, month).then(s => console.log(s));
};

const testParse = (message) => {
  const parseCommand = webtask.__get__('parseCommand');
  const computeResponse = webtask.__get__('computeResponse');

  const messagePromise = new Promise(resolve => resolve(message));

  messagePromise
    .then(parseCommand)
    .then(computeResponse)
    .then(m => console.log(m));
};

if (process.argv.length === 2) {
  testGetInterestInfo();
  testGetBondInfo('2018', '6');
} else if (process.argv.length > 2) {
  if ('--interest'.startsWith(process.argv[2])) {
    testGetInterestInfo();
  } else if ('--bond-info'.startsWith(process.argv[2])) {
    testGetBondInfo(process.argv[3], process.argv[4]);
  } else if ('--parse'.startsWith(process.argv[2])) {
    testParse(process.argv.slice(3).join(' '));
  }
}
