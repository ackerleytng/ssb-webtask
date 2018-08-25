const cheerio = require('cheerio')
const request = require('request-promise-native')


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

//-----------------------------------------------------
// Getting past SSB
//-----------------------------------------------------

const doGetPastSsb = function (year, month) {
  return request
    .post('https://secure.sgs.gov.sg/fdanet/StepupInterest.aspx')
    .form({
      __VIEWSTATE: '/wEPDwUJNDcwMDUxNTMyD2QWAmYPZBYCZg9kFgICAw9kFgICAQ9kFgICAQ9kFgICAQ9kFgYCAQ8PFgIeB1Zpc2libGVoZGQCAw8PFgIfAGhkZAIFDxBkDxYOZgIBAgICAwIEAgUCBgIHAggCCQIKAgsCDAINFg4QBQQyMDE1BQQyMDE1ZxAFBDIwMTYFBDIwMTZnEAUEMjAxNwUEMjAxN2cQBQQyMDE4BQQyMDE4ZxAFBDIwMTkFBDIwMTlnEAUEMjAyMAUEMjAyMGcQBQQyMDIxBQQyMDIxZxAFBDIwMjIFBDIwMjJnEAUEMjAyMwUEMjAyM2cQBQQyMDI0BQQyMDI0ZxAFBDIwMjUFBDIwMjVnEAUEMjAyNgUEMjAyNmcQBQQyMDI3BQQyMDI3ZxAFBDIwMjgFBDIwMjhnZGRkZVW463WAFQb/GCKmsSwEnVSyTa6z8YvHLMTXnjIKRxE=',
      __VIEWSTATEGENERATOR: 'FD5F9DCC',
      __EVENTVALIDATION: '/wEdAB/fPhthA6k7rJ0Bxpg63frsl264QqIgx4SkgxA/fsj2zngEK7cnNIpzZFrXY0zC1wnSFPBpH/WyrFPizMMa7f2YLvjzMZB45g61z1YqRlIQkIMD1dR1bX7LAmyzAApjG5mT78zitbhHH8hJZOOubRAcK1AG1M/+idFcsImB/TTxCMmJ91E7JR73vTpZa0pjgbxQo6eW6nkhVQ5hRj1alLBBy0Hk9xvs60uplSJV//7eJhbPhbSEYJQ+kF9r1iATDATGGpc56vID/sZfR+i33h1oy7GaUW2HSx641pLVghGcYDj15L91HkPm+Mobe8LsgmWB9i+nNjZtEceBC+0yT5MOtFDL9GpSKDAnModOrI7WRZC8KM8dWBj2FY/RugaWK04XKWnW/cboX4gctBuSGOpEU7lc/zC2Esxah2MUx+S1p8SLzpan8KgrprKICHEmGVbZ0iPwZ2VpPJLR7MBVC/MQ7TGDIv+yz9tMSpD27bFKorC60q78Qo9pk/WzfwZwPqCJrww1qxabCLhv9+8jfDZthEpxsOAUV403AnfJTA+/bTDdYRuwqJhtW4EBfMNMW4Z4J/OwCrgT4MK7Qvf4IlNkC3iuVRLBzq+4c0kK7ItzZvHw4I9H7EyDbtfm0RVkv+qPf0SeyB/j1fTO27zAX/JluXpYxxAwrTPPItfq+8nDFzPa0GX/LsWaFIZQGfjyNZ8=',
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$StartYearDropDownList: year,
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$StartMonthDropDownList: month,
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$IssueCodeTextBox: '',
      ctl00$ctl00$ContentPlaceHolder1$BodyContentPlaceHolder$DownloadButton: 'Download'
    })
}

const getPastSsb = function (retries, year, month) {
  return doGetPastSsb(year, month)
    .catch(function (e) {
      if (retries === 1) throw e
      return getPastSsb(retries - 1, year, month)
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
  const [year, month] = parseFetch(rest)
  if (typeof year === 'undefined') {
    return new Promise((resolve, reject) => reject('Couldn\'t find a valid year!'))
  } else if (typeof month === 'undefined') {
    return new Promise((resolve, reject) => reject('Couldn\'t find a valid month!'))
  } else {
    return getPastSsb(5, year, month)
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

const goGetSsb = function () {
  const options = {
    url: 'http://www.sgs.gov.sg/savingsbonds/Your-SSB/This-months-bond.aspx',
    headers: {
      'User-Agent': 'ssb-bot'
    }
  }
  return request(options)
}

//-----------------------------------------------------
// Handling output
//-----------------------------------------------------

const sendMessage = function (ctx, message) {
  const options = {
    form: {
      // If message is defined, chat and id are mandatory fields
      'chat_id': ctx.body.message.chat.id,
      'text': message
    }
  }
  request.post(`https://api.telegram.org/bot${ctx.secrets.botApiKey}/sendMessage`, options)
}

//-----------------------------------------------------
// Handling inputs
//-----------------------------------------------------

const handleFetch = function (rest) {
  if (rest.length === 0) {
    return goGetSsb()
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
    return new Promise((resolve, reject) => resolve('Hello!'))
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

const parseFetch = function (string) {
  let [remainder, year] = extractYear(string)
  let [_, month] = extractMonth(remainder)
  return [year, month]
}

const parseInput = function (ctx) {
  if (typeof ctx.body.message !== 'undefined' &&
      typeof ctx.body.message.text !== 'undefined') {
    if (ctx.body.message.text.startsWith('/fetch')) {
      return ['fetch', ctx.body.message.text.replace(/\/fetch@?[a-zA-Z]*/, '').trim()]
    } else if (ctx.body.message.text.startsWith('/start')) {
      return ['start']
    }
  }

  console.log(`|${ctx.body.message.text}| ignored`)
  return undefined
}

module.exports = function (ctx, cb) {
  const cmd = parseInput(ctx)
  if (typeof cmd === 'undefined') {
    cb(null, {status: 'message undefined'})
    return
  }

  handleCmd(...cmd)
    .then(m => sendMessage(ctx, m))
    .catch(e => sendMessage(ctx, e))

  cb(null, {status: 'ok'})
}
