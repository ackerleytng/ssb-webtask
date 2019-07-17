const rewire = require('rewire');
const webtask = rewire('./webtask');

test('parseInput should be able to parse /fetch', () => {
  const parseInput = webtask.__get__('parseInput');
  expect(parseInput('/fetch')).toEqual({
    type: 'fetch',
    rest: '',
  });
});
