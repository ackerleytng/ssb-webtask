const request = require('request-promise-native')
const math = require('mathjs')
const moment = require('moment')

//-----------------------------------------------------
// Constants
//-----------------------------------------------------

const disclaimer = [
  'SsbFriendBot tries to be as accurate as possible while reading govt websites.',
  'It will not be responsible for any of your investment decisions.'
]

//-----------------------------------------------------
// Helpers
//-----------------------------------------------------

const buildObj = function (pairs) {
  const obj = {}
  for (const p of pairs) {
    if (p.length > 2) {
      [k, ...v] = p
    } else {
      [k, v] = p
    }
    obj[k] = v
  }

  return obj
}

const getUrl = (url, args) => {
  const options = {
    url: url,
    headers: {
      'User-Agent': 'https://t.me/SsbFriendBot'
    },
    json: true,
  }
  return request(options)
}

const extractResponse = data => data.result.records[0];

const buildSummary = function (parsedPage) {
  const [issuanceDetails, issuanceRates] = parsedPage
  const [opens, closes, results] = parseApplicationPeriod(issuanceDetails['Application period'])
  return (`${issuanceDetails['Bond ID']}, ` +
          `${issuanceDetails['Issue date']} - ` +
          `${issuanceDetails['Maturity date']}\n` +
          `Application opens ${opens}, ` +
          `closes ${closes}\n` +
          `Interest (yrs 1-10): ${issuanceRates['interest'].join(' ')}\n` +
          `Averages (yrs 1-10): ${issuanceRates['avgInterest'].join(' ')}`)
}

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
  // Checked - the api doesn't seem to care about invalid dates, like if the month doesn't have 31 days
  const range = `[${year}-${month}-01 TO ${year}-${month}-31]`;
  return getUrl(`https://www.mas.gov.sg/api/v1/bondsandbills/m/listsavingbonds?rows=1&filters=issue_date:${range}`)
    .then(extractResponse)
    .then(extractBondInfo);
};

//-----------------------------------------------------
// Interest info
//-----------------------------------------------------

const extractInterestInfo = data => {
  const indices = Array(10).fill(0);
  const interest = indices.map((e, i) => data[`year${i + 1}_coupon`]);
  const avgInterest = indices.map((e, i) => data[`year${i + 1}_return`]);

  return { interest, avgInterest };
}

const getInterestInfo = (issueCode) => (
  getUrl(`https://www.mas.gov.sg/api/v1/bondsandbills/m/savingbondsinterest?rows=1&filters=issue_code:${issueCode}`)
    .then(extractResponse)
    .then(extractInterestInfo)
);

//-----------------------------------------------------
// Handling output
//-----------------------------------------------------

/**
 * Sends the message message. msg is the Message object that Telegram sent us
 */
const sendMessage = function (msg, apiKey, message) {
  const options = {
    form: {
      // If Message is defined, chat and id are mandatory fields
      'chat_id': msg.chat.id,
      'text': message
    }
  }
  request.post(`https://api.telegram.org/bot${apiKey}/sendMessage`, options)
}

//-----------------------------------------------------
// Switching from
//-----------------------------------------------------

/**
 * Extract hold duration and return the remainder of the string
 * ('/switchfrom' is elided), since it would be removed from the string already
 * + jun 18, hold 60 months
 * + jun 18, hold 5 years
 * + jun 18, hold 7.4 years
 * + jun 18, hold 1 year 6 months
 * + jun 18
 */
const extractHoldDuration = function (string) {
  if (!(string.match(/year/i) || string.match(/month/i))) {
    if (string.includes(',') || string.match(/hold/i)) {
      throw ('I don\'t understand how long you want to hold the bond for!\n' +
             'Try something like "jun 18, hold 5 years"')
    } else {
      return [string, 120]
    }
  } else {
    const yearMonthMatches = string.match(/,?\s*hold\s*(\d+)\s*years?\s*(\d+)\s*months?/i)
    if (yearMonthMatches) {
      const months = parseInt(yearMonthMatches[1]) * 12 + parseInt(yearMonthMatches[2])
      return [string.replace(yearMonthMatches[0], '').trim(), months]
    }

    const monthMatches = string.match(/,?\s*hold\s*([\d\.]+)\s*months?/i)
    if (monthMatches) {
      const months = Math.floor(parseFloat(monthMatches[1]))
      return [string.replace(monthMatches[0], '').trim(), months]
    }

    const yearMatches = string.match(/,?\s*hold\s*([\d\.]+)\s*years?/i)
    if (yearMatches) {
      const months = Math.floor(parseFloat(yearMatches[1]) * 12)
      return [string.replace(yearMatches[0], '').trim(), months]
    }

    throw ('Not sure if i understand what you meant!\n' +
           'Try something like "jun 18, hold 5 years"')
  }
}

const computeEffectiveMonthlyInterestRate = function (interests, numMonthsIn,
                                                      numMonthsGoingToHold) {
  const monthlyInterests = interests.reduce((acc, i) => acc.concat(new Array(12).fill(i / 12)), [])
  const remainingMonths = monthlyInterests.length - numMonthsIn
  const monthsToHold = Math.min(remainingMonths, numMonthsGoingToHold)

  return math.mean(monthlyInterests.slice(numMonthsIn, numMonthsIn + monthsToHold))
}

const minAmountForSwitchingToBeWorthIt = function(prevInterests, currInterests,
                                                  numMonthsIn, numMonthsGoingToHold) {
  const actualMonthsCanHold = Math.min(120 - numMonthsIn, numMonthsGoingToHold)
  const prevEffectiveRate = computeEffectiveMonthlyInterestRate(prevInterests, numMonthsIn,
                                                                actualMonthsCanHold)
  const currEffectiveRate = computeEffectiveMonthlyInterestRate(currInterests, 0,
                                                                actualMonthsCanHold)

  // Worth it if
  // AmtInSSB * (currEffectiveRate - prevEffectiveRate) / 100 * actualMonthsCanHold > 4
  //   ($4 transaction fees)
  return 400 / actualMonthsCanHold / (currEffectiveRate - prevEffectiveRate)
}

const buildSwitchDecision = function (currDate, currInterests, prevDate, prevInterests,
                                      holdMonths) {
  const prev = moment(prevDate, 'DD MMM YYYY')
  const curr = moment(currDate, 'DD MMM YYYY')
  const monthsIn = curr.diff(prev, 'months')

  const minAmt = minAmountForSwitchingToBeWorthIt(prevInterests.map(parseFloat),
                                                  currInterests.map(parseFloat),
                                                  monthsIn, holdMonths)

  const sentences = [`${prev.format('MMM YYYY')} Interest Rates: ${prevInterests.join(', ')}`,
                     `${curr.format('MMM YYYY')} Interest Rates: ${currInterests.join(', ')}`]
  if (minAmt <= 0) {
    sentences.push('You should not switch.')
  } else {
    sentences.push('You should switch if you think you\'re lucky enough to ' +
                   `switch SGD ${Math.ceil(minAmt)} worth of SSBs.`)
  }

  return sentences.join('\n')
}

const handleSwitchFrom = function (rest) {
  try {
    const [remainder, holdMonths] = extractHoldDuration(rest)

    const pCurrent = getUrl('http://www.sgs.gov.sg/savingsbonds/Your-SSB/This-months-bond.aspx')
          .then(parsePage)
          .then(([issuanceDetails, issuanceRates]) =>
                [issuanceDetails['Issue date'], issuanceRates['interest']])
    const pPrev = goGetPastSsb(remainder)
          .then(parsePastPage)
          .then(info => [info['Issue Date'], info['Interest']])

    return Promise.all([pCurrent, pPrev])
      .then(([[currDate, currInterests], [prevDate, prevInterests]]) =>
            buildSwitchDecision(currDate, currInterests,
                                prevDate, prevInterests,
                                holdMonths))
  } catch (e) {
    return new Promise((resolve, reject) => reject(e))
  }
}

//-----------------------------------------------------
// Handling inputs
//-----------------------------------------------------

const handleFetch = function (rest) {
  if (rest.length === 0) {
    return getUrl('http://www.sgs.gov.sg/savingsbonds/Your-SSB/This-months-bond.aspx')
      .then(parsePage)
      .then(buildSummary)
  } else {
    return goGetPastSsb(rest)
      .then(parsePastPage)
      .then(buildPastSummary)
  }
}

const handleCmd = function (cmd, rest) {
  console.log({cmd: cmd})
  console.log({rest: rest})
  if (cmd === 'start') {
    const lines = ['Hello!'].concat(disclaimer)
    return new Promise((resolve, reject) => resolve(lines.join('\n')))
  } else if (cmd === 'disclaimer') {
    return new Promise((resolve, reject) => resolve(disclaimer.join('\n')))
  } else if (cmd === 'fetch') {
    return handleFetch(rest)
  } else if (cmd === 'switchfrom') {
    return handleSwitchFrom(rest)
  } else {
    return new Promise((resolve, reject) => reject('I didn\'t understand that!'))
  }
}

const padYear = function (year) {
  if (year.length == 2) {
    if (parseInt(year) < 50) {
      return `20${year}`
    } else {
      return `19${year}`
    }
  } else {
    return year
  }
}

/**
 * Extracts the year from this string.
 * Returns [remainder of string (trimmed), year]
 */
const extractYear = function (string) {
  // Match 4 digit numbers first
  let possibleYears = string.match(/\d{4}/g)

  if (!possibleYears) {
    possibleYears = string.match(/\d{2}/g)
  }

  if (!possibleYears) {
    return [string, undefined]
  }

  // Assume the last number is the year
  const year = possibleYears[possibleYears.length - 1]
  const remainder = string.replace(year, '').trim()

  return [remainder, padYear(year)]
}

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const monthRegexes = months.map(s => new RegExp(`${s}[a-z]*`, 'ig'))

/**
 * Extracts the month from this string.
 * Returns [remainder of string (trimmed), month (as string)]
 */
const extractMonth = function (string) {
  const words = string.split(' ')

  for (const w of words) {
    for (const [i, r] of monthRegexes.entries()) {
      const matches = w.match(r)
      if (matches) {
        // Assume the last one is the correct one
        const month = matches[matches.length - 1]
        return [string.replace(month, '').trim(), (i + 1).toString()]
      }
    }
  }

  return [string, undefined]
}

const parseYearMonth = function (string) {
  let [remainder, year] = extractYear(string)
  let [_, month] = extractMonth(remainder)
  return [year, month]
}

const getMessage = function (ctx) {
  // Figure out message or edited_message first
  if (typeof ctx.body.message !== 'undefined') {
    return ctx.body.message
  } else if (typeof ctx.body.edited_message !== 'undefined') {
    return ctx.body.edited_message
  }

  return undefined
}

const parseInput = function (messageText) {
  if (messageText.startsWith('/fetch')) {
    return {
      type: 'fetch',
      rest: messageText.replace(/\/fetch@?[a-zA-Z]*/, '').trim()
    };
  } else if (messageText.startsWith('/start')) {
    return { type: 'start' };
  } else if (messageText.startsWith('/disclaimer')) {
    return { type: 'disclaimer' };
  } else if (messageText.startsWith('/switchfrom')) {
    return {
      type: 'switchfrom',
      rest: messageText.replace(/\/switchfrom@?[a-zA-Z]*/, '').trim()
    }
  } else {
    console.log(`|${messageText}| ignored`);
    return {};
  }
}

module.exports = function (ctx, cb) {
  const msg = getMessage(ctx)
  if (!msg) {
    cb(null, {status: 'Message object undefined'})
    return
  }

  const cmd = parseInput(msg.text)
  if (!cmd.type) {
    cb(null, {status: 'can\'t handle message'})
    return
  }

  handleCmd(...cmd)
    .then(m => sendMessage(msg, ctx.secrets.botApiKey, m))
    .catch(e => sendMessage(msg, ctx.secrets.botApiKey, e))

  cb(null, {status: 'ok'})
}
