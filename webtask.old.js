/* eslint-disable no-underscore-dangle */

const moment = require('moment');
const rewire = require('rewire');

const webtask = rewire('./webtask');

const parseCommand = webtask.__get__('parseCommand');

test('parseCommand /fetch', () => {
  expect(parseCommand('/fetch')).toEqual({
    command: 'fetch',
    rest: '',
  });
});

test('parseCommand /fetch rest of the message', () => {
  expect(parseCommand('/fetch rest of the message')).toEqual({
    command: 'fetch',
    rest: 'rest of the message',
  });
});

test('parseCommand /start', () => {
  expect(parseCommand('/start')).toEqual({
    command: 'start',
  });
});

test('parseCommand /disclaimer', () => {
  expect(parseCommand('/disclaimer')).toEqual({
    command: 'disclaimer',
  });
});

test('parseCommand /switchfrom rest of the message', () => {
  expect(parseCommand('/switchfrom rest of the message')).toEqual({
    command: 'switchfrom',
    rest: 'rest of the message',
  });
});

test('parseCommand malformed message', () => {
  expect(() => parseCommand('malformed message'))
    .toThrow('I didn\'t understand that!');
});

test('parseYearMonth', () => {
  const parseYearMonth = webtask.__get__('parseYearMonth');

  expect(parseYearMonth('june 2018')).toEqual({ remainder: '', year: '2018', month: 6 });
  expect(parseYearMonth('june 18')).toEqual({ remainder: '', year: '2018', month: 6 });
  expect(parseYearMonth('june 98')).toEqual({ remainder: '', year: '1998', month: 6 });
  expect(parseYearMonth('17')).toEqual({ remainder: '', year: '2017', month: undefined });
  expect(parseYearMonth('may')).toEqual({ remainder: '', year: undefined, month: 5 });
  expect(parseYearMonth('15 jan')).toEqual({ remainder: '', year: '2015', month: 1 });
  expect(parseYearMonth('16 feb')).toEqual({ remainder: '', year: '2016', month: 2 });
  expect(parseYearMonth('March 16')).toEqual({ remainder: '', year: '2016', month: 3 });
  expect(parseYearMonth('foo 16')).toEqual({ remainder: 'foo', year: '2016', month: undefined });
  expect(parseYearMonth(' apr 16')).toEqual({ remainder: '', year: '2016', month: 4 });
  expect(parseYearMonth(' jully 13')).toEqual({ remainder: '', year: '2013', month: 7 });
  expect(parseYearMonth(' aug 14')).toEqual({ remainder: '', year: '2014', month: 8 });
  expect(parseYearMonth(' September    14')).toEqual({ remainder: '', year: '2014', month: 9 });
  expect(parseYearMonth('oct    18')).toEqual({ remainder: '', year: '2018', month: 10 });
  expect(parseYearMonth('November 17')).toEqual({ remainder: '', year: '2017', month: 11 });
  expect(parseYearMonth('decem 17')).toEqual({ remainder: '', year: '2017', month: 12 });
});

test('extractHoldDuration', () => {
  const extractHoldDuration = webtask.__get__('extractHoldDuration');

  expect(extractHoldDuration('hold 60 months')).toEqual(60);
  expect(extractHoldDuration('hold 48   Months')).toEqual(48);
  expect(extractHoldDuration('hold   5.8   Months')).toEqual(5);
  expect(extractHoldDuration('hold 5 Years')).toEqual(60);
  expect(extractHoldDuration('hold 7.4 years')).toEqual(88);
  expect(extractHoldDuration('hold 1 year 6 months')).toEqual(18);
  expect(extractHoldDuration('hold 10 years  11 months')).toEqual(131);
  expect(extractHoldDuration('')).toEqual(120);
  expect(extractHoldDuration('   ')).toEqual(120);
});

test('computeEffectiveMonthlyInterestRate', () => {
  const computeEffectiveMonthlyInterestRate = webtask.__get__('computeEffectiveMonthlyInterestRate');

  const jun2018Interest = [1.68, 2.14, 2.21, 2.21, 2.30, 2.52, 2.67, 2.81, 2.96, 3.12];
  const aug2018Interest = [1.78, 2.16, 2.37, 2.54, 2.67, 2.76, 2.81, 2.86, 2.95, 3.11];

  expect(computeEffectiveMonthlyInterestRate(jun2018Interest, 2, 118))
    .toBeCloseTo(0.2062711864406782);
  expect(computeEffectiveMonthlyInterestRate(aug2018Interest, 2, 118))
    .toBeCloseTo(0.21790960451977395);
});

test('buildSwitchDecision', () => {
  const buildSwitchDecision = webtask.__get__('buildSwitchDecision');
  const jun2018Interest = [1.68, 2.14, 2.21, 2.21, 2.30, 2.52, 2.67, 2.81, 2.96, 3.12];
  const aug2018Interest = [1.78, 2.16, 2.37, 2.54, 2.67, 2.76, 2.81, 2.86, 2.95, 3.11];

  const message = buildSwitchDecision(
    moment().year(2018).month('aug'),
    aug2018Interest,
    moment().year(2018).month('jun'),
    jun2018Interest,
    120,
  );

  expect(message).toContain('should switch');
  expect(message).toContain('SGD 315');
});
