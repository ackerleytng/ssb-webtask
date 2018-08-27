const cheerio = require('cheerio')
const request = require('request-promise-native')

//-----------------------------------------------------
// Constants
//-----------------------------------------------------

const disclaimer = [
  'SsbFriendBot tries to be as accurate as possible while reading govt websites.',
  'It will not be responsible for any of your investment decisions.'
]

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
      throw ('I don\'t understand how long you want to hold the bond for!' +
             'Try something like "jun 18, hold 5 years"')
    } else {
      return [string, 120]
    }
  } else {
    const yearMonthMatches = string.match(/,\s*hold\s*(\d+)\s*years?\s*(\d+)\s*months?/i)
    if (yearMonthMatches) {
      const months = parseInt(yearMonthMatches[1]) * 12 + parseInt(yearMonthMatches[2])
      return [string.replace(yearMonthMatches[0], '').trim(), months]
    }

    const monthMatches = string.match(/,\s*hold\s*([\d\.]+)\s*months?/i)
    if (monthMatches) {
      const months = Math.floor(parseFloat(monthMatches[1]))
      return [string.replace(monthMatches[0], '').trim(), months]
    }

    const yearMatches = string.match(/,\s*hold\s*([\d\.]+)\s*years?/i)
    if (yearMatches) {
      const months = Math.floor(parseFloat(yearMatches[1]) * 12)
      return [string.replace(yearMatches[0], '').trim(), months]
    }

    throw ('Not sure if i understand what you meant!' +
           'Try something like "jun 18, hold 5 years"')
  }
}

/**
 * Parse a switch from command, which should take the form
 */
const parseSwitchFrom = function (string) {
  return extractHoldDuration(string)
}

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

const getUrl = function (url) {
  const options = {
    url: url,
    headers: {
      'User-Agent': 'ssb-bot'
    }
  }
  return request(options)
}

//-----------------------------------------------------
// Getting past SSB
//-----------------------------------------------------

const parseHiddenFields = function (page) {
  const $ = cheerio.load(page)
  return {
    __VIEWSTATE: $('#__VIEWSTATE').attr('value'),
    __VIEWSTATEGENERATOR: $('#__VIEWSTATEGENERATOR').attr('value'),
    __EVENTVALIDATION: $('#__EVENTVALIDATION').attr('value')
  }
}

const doGetPastSsb = function (hiddenFields, year, month) {
  return request
    .post('https://secure.sgs.gov.sg/fdanet/StepupInterest.aspx')
    .form(Object.assign(hiddenFields, {
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$StartYearDropDownList: year,
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$StartMonthDropDownList: month,
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$IssueCodeTextBox: '',
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$DownloadButton: 'Download'
    }))
}

const getPastSsb = function (retries, hiddenFields, year, month) {
  return doGetPastSsb(hiddenFields, year, month)
    .catch(function (e) {
      if (retries === 1) throw e
      console.log({retries: retries})
      return getPastSsb(retries - 1, hiddenFields, year, month)
    })
}

const parsePastPage = function (page) {
  if (page.includes('No Results Found')) {
    throw 'Can\'t find SSB data!'
  }

  const clean = page
        .split('\n')
        .map(s => s
             .replace(':', '%')
             .replace(/[",\*]/g, ''))
        .filter(s => s.includes('%'))
        .map(s => s
             .split('%')
             .filter(s => s.length > 0))
  return buildObj(clean)
}

const buildPastSummary = function (info) {
  return (`${info['Issue Code']}, ` +
          `${info['Issue Date']} - ` +
          `${info['Maturity Date']}\n` +
          `Interest (yrs 1-10): ${info['Interest'].join(' ')}\n` +
          `Averages (yrs 1-10): ${info['Average p.a. return'].join(' ')}`)
}

const goGetPastSsb = function (rest) {
  const [year, month] = parseYearMonth(rest)
  if (typeof year === 'undefined') {
    return new Promise((resolve, reject) => reject('Couldn\'t find a valid year!'))
  } else if (typeof month === 'undefined') {
    return new Promise((resolve, reject) => reject('Couldn\'t find a valid month!'))
  } else {
    return getUrl('https://secure.sgs.gov.sg/fdanet/StepupInterest.aspx')
      .then(parseHiddenFields)
      .then(hiddenFields => getPastSsb(5, hiddenFields, year, month))
  }
}

//-----------------------------------------------------
// Getting current SSB
//-----------------------------------------------------

const parseIssuanceDetails = function (html) {
  const rows = html.split('</tr>')
  const items = rows
        .map(s => s.split('<td>'))
        .filter(s => s.length > 1)
        .map(p => p.map(s => s
                        .replace(/<.*?>/g, '')
                        .replace(/\(\d+\)/g, '')
                        .replace(/&#xA0;/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()))
  return buildObj(items)
}

const parseIssuanceRates = function (html) {
  const rows = html.split('</tr>')
  const items = rows
        .map(s => s.split(/<\/t[dh]>/))
        .map(a => {
          a.splice(0, 1)
          return a
        })
        .filter(s => s.length > 1)
        .map(a => a
             .map(s => s
                  .replace(/<.*?>/g, '')
                  .replace(/&#xA0;/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim())
             .filter(v => v.length > 1))
  return {
    'interest': items[0],
    'avgInterest': items[1]
  }
}

const swapCommas = function (text) {
  return text.split(', ').reverse().join(' ')
}

const parseApplicationPeriod = function (text) {
  return text
    .split(/[A-Z][a-z]+:/)
    .filter(s => s.length > 1)
    .map(s => s
         .replace('Keep track of the important dates with our SSB calendar.', '')
         .replace('After', 'after')
         .trim())
    .map(swapCommas)
}

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

const parsePage = function (page) {
  const $ = cheerio.load(page)
  const issuanceDetails = parseIssuanceDetails($('tbody').html())
  const issuanceRates = parseIssuanceRates($('.scroll-table tbody').html())
  return [issuanceDetails, issuanceRates]
}

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

const parseInput = function (message) {
  if (message.text.startsWith('/fetch')) {
    return ['fetch', message.text.replace(/\/fetch@?[a-zA-Z]*/, '').trim()]
  } else if (message.text.startsWith('/start')) {
    return ['start']
  } else if (message.text.startsWith('/disclaimer')) {
    return ['disclaimer']
  }

  console.log(`|${message.text}| ignored`)
  return undefined
}

module.exports = function (ctx, cb) {
  const msg = getMessage(ctx)
  if (typeof msg === 'undefined') {
    cb(null, {status: 'Message object undefined'})
    return
  }

  const cmd = parseInput(msg)
  if (typeof cmd === 'undefined') {
    cb(null, {status: 'can\'t handle message'})
    return
  }

  handleCmd(...cmd)
    .then(m => sendMessage(msg, ctx.secrets.botApiKey, m))
    .catch(e => sendMessage(msg, ctx.secrets.botApiKey, e))

  cb(null, {status: 'ok'})
}
