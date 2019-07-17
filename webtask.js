/* eslint-disable no-console */

const request = require('request-promise-native');
const math = require('mathjs');
const moment = require('moment');

//-----------------------------------------------------
// Constants
//-----------------------------------------------------

const disclaimer = [
  'SsbFriendBot tries to be as accurate as possible while reading govt websites.',
  'It will not be responsible for any of your investment decisions.',
];

//-----------------------------------------------------
// Helpers
//-----------------------------------------------------

const getUrl = (url) => {
  const options = {
    url,
    headers: {
      'User-Agent': 'https://t.me/SsbFriendBot',
    },
    json: true,
  };
  return request(options);
};

const extractResponse = data => data.result.records[0];

const niceDate = string => moment(string).format('MMM D YYYY');

const padYear = (year) => {
  if (year.length === 2) {
    return (parseInt(year, 10) < 50)
      ? `20${year}`
      : `19${year}`;
  }

  return year;
};

/**
 * Extracts the year from this string.
 * Returns {
 *   remainder: remainder of string (trimmed),
 *   year
 * }
 */
const extractYear = (string) => {
  // Match 4 digit numbers first
  let possibleYears = string.match(/\d{4}/g);

  // Then try 2 digit numbers
  if (!possibleYears) {
    possibleYears = string.match(/\d{2}/g);
  }

  // Still no luck
  if (!possibleYears) {
    return { remainder: string };
  }

  // Assume the last number is the year
  const foundYear = possibleYears[possibleYears.length - 1];
  const remainder = string.replace(foundYear, '').trim();

  const year = padYear(foundYear);
  return { remainder, year };
};

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthRegexes = months.map(s => new RegExp(`${s}[a-z]*`, 'ig'));

/**
 * Extracts the month from this string.
 * Returns {
 *   remainder: remainder of string (trimmed),
 *   month: month (as string)
 * }
 */
const extractMonth = (string) => {
  const words = string.split(' ');

  for (const w of words) {
    for (const [i, r] of monthRegexes.entries()) {
      const matches = w.match(r);
      if (matches) {
        // Assume the last one is the correct one
        const month = matches[matches.length - 1];
        return {
          remainder: string.replace(month, '').trim(),
          month: (i + 1).toString(),
        };
      }
    }
  }

  return { remainder: string };
};

const parseYearMonth = (string) => {
  const { remainder: yearRemainder, year } = extractYear(string);
  const { remainder, month } = extractMonth(yearRemainder);
  return { year, month, remainder };
};

//-----------------------------------------------------
// Bond info
//-----------------------------------------------------

const extractBondInfo = (data) => {
  const issueCode = data.issue_code;
  const issueDate = data.issue_date;
  const maturityDate = data.maturity_date;
  const openingDate = data.ann_date;
  const closingDate = data.last_day_to_apply;

  return {
    issueCode,
    issueDate,
    maturityDate,
    openingDate,
    closingDate,
  };
};

const getBondInfo = (year, month) => {
  // Checked - the api doesn't seem to care about invalid dates,
  //   like if the month doesn't have 31 days
  const paddedMonth = month.toString().padStart(2, '0');
  const range = `[${year}-${paddedMonth}-01 TO ${year}-${paddedMonth}-31]`;
  return getUrl(`https://www.mas.gov.sg/api/v1/bondsandbills/m/listsavingbonds?rows=1&filters=issue_date:${range}`)
    .then(extractResponse)
    .then(extractBondInfo);
};

//-----------------------------------------------------
// Interest info
//-----------------------------------------------------

const extractInterestInfo = (data) => {
  const indices = Array(10).fill(0);
  const interest = indices.map((e, i) => data[`year${i + 1}_coupon`]);
  const avgInterest = indices.map((e, i) => data[`year${i + 1}_return`]);

  return { interest, avgInterest };
};

const getInterestInfo = issueCode => (
  getUrl(`https://www.mas.gov.sg/api/v1/bondsandbills/m/savingbondsinterest?rows=1&filters=issue_code:${issueCode}`)
    .then(extractResponse)
    .then(extractInterestInfo)
);

const getBondInterestInfo = async ({ year, month }) => {
  const now = moment();
  const yr = year || now.year();
  const mth = month || now.month();

  const bondInfo = await getBondInfo(yr, mth);
  const interestInfo = await getInterestInfo(bondInfo.issueCode);
  return { ...bondInfo, ...interestInfo };
};

//-----------------------------------------------------
// Handling output
//-----------------------------------------------------

/**
 * Sends the message message. msg is the Message object that Telegram sent us
 */
const sendMessage = (msg, apiKey, message) => {
  const options = {
    form: {
      // If Message is defined, chat and id are mandatory fields
      chat_id: msg.chat.id,
      text: message,
    },
  };
  request.post(`https://api.telegram.org/bot${apiKey}/sendMessage`, options);
};

//-----------------------------------------------------
// Switching from
//-----------------------------------------------------

/**
 * Extract hold duration. Assumes that input is of a form similar to
 * + "hold 60 months"
 * + "hold 5 years"
 * + "hold 7.4 years"
 * + "hold 1 year 6 months"
 * + ""
 */
const extractHoldDuration = (string) => {
  if (string.trim().length === 0) {
    return 120;
  } if (!(string.match(/year/i) || string.match(/month/i))) {
    throw new Error('I don\'t understand how long you want to hold the bond for!\n'
                    + 'Try something like "jun 18, hold 5 years"');
  } else {
    const yearMonthMatches = string.match(/,?\s*hold\s*(\d+)\s*years?\s*(\d+)\s*months?/i);
    if (yearMonthMatches) {
      return parseInt(yearMonthMatches[1], 10) * 12 + parseInt(yearMonthMatches[2], 10);
    }

    const monthMatches = string.match(/,?\s*hold\s*([\d.]+)\s*months?/i);
    if (monthMatches) {
      return Math.floor(parseFloat(monthMatches[1]));
    }

    const yearMatches = string.match(/,?\s*hold\s*([\d.]+)\s*years?/i);
    if (yearMatches) {
      return Math.floor(parseFloat(yearMatches[1]) * 12);
    }

    throw new Error('Not sure if i understand what you meant!\n'
                    + 'Try something like "jun 18, hold 5 years"');
  }
};

const computeEffectiveMonthlyInterestRate = (interests, numMonthsIn,
  numMonthsGoingToHold) => {
  const monthlyInterests = interests.reduce((acc, i) => acc.concat(new Array(12).fill(i / 12)), []);
  const remainingMonths = monthlyInterests.length - numMonthsIn;
  const monthsToHold = Math.min(remainingMonths, numMonthsGoingToHold);

  return math.mean(monthlyInterests.slice(numMonthsIn, numMonthsIn + monthsToHold));
};

const minAmountForSwitchingToBeWorthIt = (prevInterests, currInterests,
  numMonthsIn, numMonthsGoingToHold) => {
  const actualMonthsCanHold = Math.min(120 - numMonthsIn, numMonthsGoingToHold);
  const prevEffectiveRate = computeEffectiveMonthlyInterestRate(prevInterests, numMonthsIn,
    actualMonthsCanHold);
  const currEffectiveRate = computeEffectiveMonthlyInterestRate(currInterests, 0,
    actualMonthsCanHold);

  // Worth it if
  // AmtInSSB * (currEffectiveRate - prevEffectiveRate) / 100 * actualMonthsCanHold > 4
  //   ($4 transaction fees)
  return 400 / actualMonthsCanHold / (currEffectiveRate - prevEffectiveRate);
};

const buildSwitchDecision = (curr, currInterests, prev, prevInterests,
  holdMonths) => {
  const monthsIn = curr.diff(prev, 'months');

  const minAmt = minAmountForSwitchingToBeWorthIt(prevInterests,
    currInterests,
    monthsIn, holdMonths);

  const sentences = [`${prev.format('MMM YYYY')} Interest Rates: ${prevInterests.join(', ')}`,
    `${curr.format('MMM YYYY')} Interest Rates: ${currInterests.join(', ')}`];
  if (minAmt <= 0) {
    sentences.push('You should not switch.');
  } else {
    sentences.push('You should switch if you think you\'re lucky enough to '
                   + `switch SGD ${Math.ceil(minAmt)} worth of SSBs.`);
  }

  return sentences.join('\n');
};

const computeSwitchFromResponse = async (rest) => {
  const { remainder, year, month } = parseYearMonth(rest);
  const holdMonths = extractHoldDuration(remainder);

  const currInfo = await getBondInterestInfo({});
  const prevInfo = await getBondInterestInfo({ year, month });

  return buildSwitchDecision(
    moment(), currInfo.interest,
    moment().year(year).month(month), prevInfo.interest,
    holdMonths,
  );
};

//-----------------------------------------------------
// Handle fetch
//-----------------------------------------------------

const buildSummary = info => [
  `${info.issueCode}, ${niceDate(info.issueDate)} - ${niceDate(info.maturityDate)}`,
  `Application opens ${niceDate(info.openingDate)}, 6pm, closes ${niceDate(info.closingDate)}, 9pm`,
  `Interest (yrs 1-10): ${info.interest.join(' ')}`,
  `Averages (yrs 1-10): ${info.avgInterest.join(' ')}`,
].join('\n');

const computeFetchResponse = async (rest) => {
  const yearMonth = (!rest || rest.length === 0)
    ? {}
    : parseYearMonth(rest);

  return getBondInterestInfo(yearMonth);
};

//-----------------------------------------------------
// Dispatch commands
//-----------------------------------------------------

const computeResponse = ({ command, rest }) => {
  console.log({ command, rest });

  switch (command) {
    case 'start':
      return ['Hello!'].concat(disclaimer).join('\n');
    case 'disclaimer':
      return disclaimer.join('\n');
    case 'fetch':
      return computeFetchResponse(rest)
        .then(buildSummary);
    case 'switchfrom':
      return computeSwitchFromResponse(rest);
    default:
      throw new Error('I didn\'t understand that!');
  }
};

//-----------------------------------------------------
// Handling inputs
//-----------------------------------------------------

const getMessage = (ctx) => {
  // Figure out message or edited_message first
  if (typeof ctx.body.message !== 'undefined') {
    return ctx.body.message;
  } if (typeof ctx.body.edited_message !== 'undefined') {
    return ctx.body.edited_message;
  }

  return undefined;
};

const parseCommand = (messageText) => {
  if (messageText.startsWith('/fetch')) {
    return {
      command: 'fetch',
      rest: messageText.replace(/\/fetch@?[a-zA-Z]*/, '').trim(),
    };
  } if (messageText.startsWith('/start')) {
    return { command: 'start' };
  } if (messageText.startsWith('/disclaimer')) {
    return { command: 'disclaimer' };
  } if (messageText.startsWith('/switchfrom')) {
    return {
      command: 'switchfrom',
      rest: messageText.replace(/\/switchfrom@?[a-zA-Z]*/, '').trim(),
    };
  }
  console.log(`|${messageText}| ignored`);
  throw new Error('I didn\'t understand that!');
};

module.exports = (ctx, cb) => {
  const msg = getMessage(ctx);
  if (!msg) {
    cb(null, { status: 'Message object undefined' });
    return;
  }

  const messagePromise = new Promise(resolve => resolve(msg.text));

  messagePromise
    .then(parseCommand)
    .then(computeResponse)
    .then(m => sendMessage(msg, ctx.secrets.botApiKey, m))
    .catch(e => sendMessage(msg, ctx.secrets.botApiKey, e));

  cb(null, { status: 'ok' });
};
