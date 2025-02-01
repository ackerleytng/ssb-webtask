interface ExtractionResult {
    value?: string,
    remainder: string,
}

const padYear = (year: string): string => {
  if (year.length === 2) {
    return (parseInt(year, 10) < 50)
      ? `20${year}`
      : `19${year}`;
  }

  return year;
};

const extractYear = (argString: string): ExtractionResult => {
  // Match 4 digit numbers first
  let possibleYears = argString.match(/\d{4}/g);

  // Then try 2 digit numbers
  if (!possibleYears) {
    possibleYears = argString.match(/\d{2}/g);
  }

  // Still no luck
  if (!possibleYears) {
    return { remainder: argString };
  }

  // Assume the last number is the year
  const foundYear = possibleYears[possibleYears.length - 1];
  const remainder = argString.replace(foundYear, '').trim();

  const year = padYear(foundYear);
  return { remainder, value: year };
};

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthRegexes = months.map(s => new RegExp(`${s}[a-z]*`, 'ig'));

const extractMonth = (argString: string): ExtractionResult => {
  const words = argString.split(' ');

  for (const w of words) {
    for (const [i, r] of monthRegexes.entries()) {
      const matches = w.match(r);
      if (matches) {
        // Assume the last one is the correct one
        const month = matches[matches.length - 1];
        return {
          remainder: argString.replace(month, '').trim(),
          value: `${i + 1}`,
        };
      }
    }
  }

  return { remainder: argString };
};

export interface ParsingResult {
    year: string | undefined,
    month: string | undefined,
    remainder: string,
}

const parseYearMonth = (argString: string): ParsingResult => {
  const { remainder: yearRemainder, value: year } = extractYear(argString);
  const { remainder, value: month } = extractMonth(yearRemainder);
  return { year, month, remainder };
};

export {
  parseYearMonth,
};
