const cheerio = require('cheerio')
const request = require('request-promise-native')

const buildObj = function (pairs) {
  const obj = {}
  for (const [k, v] of pairs) {
    obj[k] = v
  }
  
  return obj
}

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

const sendMessage = function (ctx, message) {
  const options = {
    form: {
      'chat_id': ctx.data.message.chat.id,
      'text': message
    }
  }
  request.post(`https://api.telegram.org/bot${ctx.secrets.botApiKey}/sendMessage`, options)
}

const handleError = function (err) {
  console.log(err)
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

module.exports = function (ctx, cb) {
  goGetSsb()
    .then(parsePage)
    .then(buildSummary)
    .then(m => sendMessage(ctx, m))
    .catch(handleError)

  cb(null, {status: 'ok'})
}
