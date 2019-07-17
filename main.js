#!/usr/bin/env node

const rewire = require('rewire')
const webtask = rewire('./webtask.js')

const testGetInterestInfo = () => {
  const getInterestInfo = webtask.__get__('getInterestInfo');

  console.log('testGetInterestInfo =======');
  getInterestInfo('GX19080E').then(s => console.log(s));
}

const testGetBondInfo =  (year, month) => {
  const getBondInfo = webtask.__get__('getBondInfo');

  console.log('testGetBondInfo =======');
  getBondInfo(year, month).then(s => console.log(s));
}

const testParseYearMonth = function (string) {
  const parseYearMonth = webtask.__get__('parseYearMonth')

  const result = parseYearMonth(string)
  console.log(result)
  return result
}

const testExtractHoldDuration = function (string) {
  const extractHoldDuration = webtask.__get__('extractHoldDuration')

  return extractHoldDuration(string)
}

const testMonthlyInterestRate = function () {
  const computeEffectiveMonthlyInterestRate = webtask.__get__('computeEffectiveMonthlyInterestRate')

  const jun2018Interest = [1.68, 2.14, 2.21, 2.21, 2.30, 2.52, 2.67, 2.81, 2.96, 3.12]
  const aug2018Interest = [1.78, 2.16, 2.37, 2.54, 2.67, 2.76, 2.81, 2.86, 2.95, 3.11]
  console.log([0.2062711864406782, computeEffectiveMonthlyInterestRate(jun2018Interest, 2, 118)])
}

const testHandleSwitchFrom = function (string) {
  const handleSwitchFrom = webtask.__get__('handleSwitchFrom')

  handleSwitchFrom(string)
    .then(console.log)
}

const testSwitchFrom = function () {
  const minAmountForSwitchingToBeWorthIt = webtask.__get__('minAmountForSwitchingToBeWorthIt')
  const buildSwitchDecision = webtask.__get__('buildSwitchDecision')
  const jun2018Interest = [1.68, 2.14, 2.21, 2.21, 2.30, 2.52, 2.67, 2.81, 2.96, 3.12]
  const aug2018Interest = [1.78, 2.16, 2.37, 2.54, 2.67, 2.76, 2.81, 2.86, 2.95, 3.11]
  console.log(buildSwitchDecision([minAmountForSwitchingToBeWorthIt(jun2018Interest,
                                                                   aug2018Interest,
                                                                   2, 120),
                                   jun2018Interest,
                                   aug2018Interest]))
}

const arrayEqual = function (a, b) {
  return a.toString() === b.toString()
}

if (process.argv.length == 2) {
  testGetInterestInfo();
  testGetBondInfo('2018', '6');
} else if (process.argv.length > 2) {
  if ('--current'.startsWith(process.argv[2])) {
    testGetInterestInfo()
  } else if ('--past'.startsWith(process.argv[2])) {
    testGetBondInfo(process.argv[3], process.argv[4])
  } else if ('--parse'.startsWith(process.argv[2])) {
    console.log(arrayEqual(testParseYearMonth('june 2018'), ['2018', '6']))
    console.log(arrayEqual(testParseYearMonth('june 18'), ['2018', '6']))
    console.log(arrayEqual(testParseYearMonth('june 98'), ['1998', '6']))
    console.log(arrayEqual(testParseYearMonth('17'), ['2017', undefined]))
    console.log(arrayEqual(testParseYearMonth('may'), [undefined, '5']))
    console.log(arrayEqual(testParseYearMonth('15 jan'), ['2015', '1']))
    console.log(arrayEqual(testParseYearMonth('feb 16'), ['2016', '2']))
    console.log(arrayEqual(testParseYearMonth('March 16'), ['2016', '3']))
    console.log(arrayEqual(testParseYearMonth('foo 16'), ['2016', undefined]))
    console.log(arrayEqual(testParseYearMonth(' apr 16'), ['2016', '4']))
    console.log(arrayEqual(testParseYearMonth(' jully 13'), ['2013', '7']))
    console.log(arrayEqual(testParseYearMonth(' aug 14'), ['2014', '8']))
    console.log(arrayEqual(testParseYearMonth(' September    14'), ['2014', '9']))
    console.log(arrayEqual(testParseYearMonth('oct    18'), ['2018', '10']))
    console.log(arrayEqual(testParseYearMonth('November 17'), ['2017', '11']))
    console.log(arrayEqual(testParseYearMonth('decem 17'), ['2017', '12']))
  } else if ('--parseSwitchFrom'.startsWith(process.argv[2])) {
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold 60 months'),
                           [ 'jun 18', 60 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold 48   Months'),
                           [ 'jun 18', 48 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold   5.8   Months'),
                           [ 'jun 18', 5 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold 5 Years'),
                           [ 'jun 18', 60 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold 7.4 years'),
                           [ 'jun 18', 88 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold 1 year 6 months'),
                           [ 'jun 18', 18 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18, hold 10 years  11 months'),
                           [ 'jun 18', 131 ]))
    console.log(arrayEqual(testExtractHoldDuration('jun 18'),
                           [ 'jun 18', 120 ]))
  } else if ('--monthlyInterestRate'.startsWith(process.argv[2])) {
    testMonthlyInterestRate()
  } else if ('--handleSwitchFrom'.startsWith(process.argv[2])) {
    testHandleSwitchFrom(process.argv[3])
  } else if ('--testSwitchFrom'.startsWith(process.argv[2])) {
    testSwitchFrom()
  }
}
