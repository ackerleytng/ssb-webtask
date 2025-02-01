import { parseYearMonth } from '../utils';

test('parseYearMonth', () => {
  expect(parseYearMonth('june 2018')).toEqual({ remainder: '', year: '2018', month: '6' });
  expect(parseYearMonth('june 18')).toEqual({ remainder: '', year: '2018', month: '6' });
  expect(parseYearMonth('june 98')).toEqual({ remainder: '', year: '1998', month: '6' });
  expect(parseYearMonth('17')).toEqual({ remainder: '', year: '2017', month: undefined });
  expect(parseYearMonth('may')).toEqual({ remainder: '', year: undefined, month: '5' });
  expect(parseYearMonth('15 jan')).toEqual({ remainder: '', year: '2015', month: '1' });
  expect(parseYearMonth('16 feb')).toEqual({ remainder: '', year: '2016', month: '2' });
  expect(parseYearMonth('March 16')).toEqual({ remainder: '', year: '2016', month: '3' });
  expect(parseYearMonth('foo 16')).toEqual({ remainder: 'foo', year: '2016', month: undefined });
  expect(parseYearMonth(' apr 16')).toEqual({ remainder: '', year: '2016', month: '4' });
  expect(parseYearMonth(' jully 13')).toEqual({ remainder: '', year: '2013', month: '7' });
  expect(parseYearMonth(' aug 14')).toEqual({ remainder: '', year: '2014', month: '8' });
  expect(parseYearMonth(' September    14')).toEqual({ remainder: '', year: '2014', month: '9' });
  expect(parseYearMonth('oct    18')).toEqual({ remainder: '', year: '2018', month: '10' });
  expect(parseYearMonth('November 17')).toEqual({ remainder: '', year: '2017', month: '11' });
  expect(parseYearMonth('decem 17')).toEqual({ remainder: '', year: '2017', month: '12' });
});
