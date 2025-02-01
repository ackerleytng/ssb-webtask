import { parseYearMonth } from '../utils';
import { getBondInterestInfo, BondInterestInfo } from '../ssb';
import { format, parse } from 'date-fns';
import { noInfo } from '../constants';

 
const niceDate = (dateString: string): string =>
  format(parse(dateString, 'yyyy-MM-dd', new Date())!, 'MMM dd yyyy');
 

const buildSummary = (info: BondInterestInfo) => [
  `${info.issueCode}, ${niceDate(info.issueDate)} - ${niceDate(info.maturityDate)}`,
  `Application opens ${niceDate(info.openingDate)}, 6pm, closes ${niceDate(info.closingDate)}, 9pm`,
  `Interest (yrs 1-10): ${info.interest.join(' ')}`,
  `Averages (yrs 1-10): ${info.avgInterest.join(' ')}`,
].join('\n');

const computeFetchResponse = async (argString: string): Promise<string> => {
  const { year, month } = parseYearMonth(argString);
  const info = await getBondInterestInfo(year, month);
  if (!info) {
    return noInfo;
  }
  return buildSummary(info);
};

export {
  computeFetchResponse,
};
