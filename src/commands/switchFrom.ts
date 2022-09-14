import { getBondInterestInfo } from '../ssb';
import { parseYearMonth } from '../utils';
import { differenceInMonths, format, parse } from 'date-fns';
import { noInfo } from '../constants';

/**
 * Extract hold duration. Assumes that input is of a form similar to
 * + "hold 60 months"
 * + "hold 5 years"
 * + "hold 7.4 years"
 * + "hold 1 year 6 months"
 * + ""
 */
const extractHoldDuration = (argString: string): number => {
    if (argString.trim().length === 0) {
        return 120;
    } if (!(argString.match(/year/i) || argString.match(/month/i))) {
        throw new Error('I don\'t understand how long you want to hold the bond for!\n'
            + 'Try something like "jun 18, hold 5 years"');
    } else {
        const yearMonthMatches = argString.match(/,?\s*hold\s*(\d+)\s*years?\s*(\d+)\s*months?/i);
        if (yearMonthMatches) {
            return parseInt(yearMonthMatches[1], 10) * 12 + parseInt(yearMonthMatches[2], 10);
        }

        const monthMatches = argString.match(/,?\s*hold\s*([\d.]+)\s*months?/i);
        if (monthMatches) {
            return Math.floor(parseFloat(monthMatches[1]));
        }

        const yearMatches = argString.match(/,?\s*hold\s*([\d.]+)\s*years?/i);
        if (yearMatches) {
            return Math.floor(parseFloat(yearMatches[1]) * 12);
        }

        throw new Error('Not sure if i understand what you meant!\n'
            + 'Try something like "jun 18, hold 5 years"');
    }
};

const average = (array: number[]): number => array.reduce((a, b) => a + b) / array.length;

const computeEffectiveMonthlyInterestRate = (
    interests: number[],
    numMonthsIn: number,
    numMonthsGoingToHold: number
): number => {
    const monthlyInterests = interests.reduce(
        (acc: number[], i) => acc.concat(Array(12).fill(i / 12)),
        []
    );
    const remainingMonths = monthlyInterests.length - numMonthsIn;
    const monthsToHold = Math.min(remainingMonths, numMonthsGoingToHold);

    return average(monthlyInterests.slice(numMonthsIn, numMonthsIn + monthsToHold));
};

const minAmountForSwitchingToBeWorthIt = (
    prevInterests: number[],
    currInterests: number[],
    numMonthsIn: number,
    numMonthsGoingToHold: number,
) => {
    const actualMonthsCanHold = Math.min(120 - numMonthsIn, numMonthsGoingToHold);
    const prevEffectiveRate = computeEffectiveMonthlyInterestRate(prevInterests, numMonthsIn, actualMonthsCanHold);
    const currEffectiveRate = computeEffectiveMonthlyInterestRate(currInterests, 0, actualMonthsCanHold);

    // Worth it if
    // AmtInSSB * (currEffectiveRate - prevEffectiveRate) / 100 * actualMonthsCanHold > 4
    //   ($4 transaction fees)
    return 400 / actualMonthsCanHold / (currEffectiveRate - prevEffectiveRate);
};

const buildSwitchDecision = (
    curr: Date,
    currInterests: number[],
    prev: Date,
    prevInterests: number[],
    holdMonths: number,
): string => {
    const monthsIn = differenceInMonths(curr, prev);

    const minAmt = minAmountForSwitchingToBeWorthIt(
        prevInterests,
        currInterests,
        monthsIn,
        holdMonths
    );

    const sentences = [
        `${format(prev, 'MMM yyyy')} Interest Rates: ${prevInterests.join(', ')}`,
        `${format(curr, 'MMM yyyy')} Interest Rates: ${currInterests.join(', ')}`,
    ];
    if (minAmt <= 0) {
        sentences.push('You should not switch.');
    } else {
        sentences.push('You should switch if you think you\'re lucky enough to '
            + `switch SGD ${Math.ceil(minAmt)} worth of SSBs.`);
    }

    return sentences.join('\n');
};

const computeSwitchFromResponse = async (argString: string): Promise<string> => {
    const { remainder, year, month } = parseYearMonth(argString);
    if (!year && !month) {
        return 'Please provide a year and month to switch from!';
    }

    const currInfo = await getBondInterestInfo();
    const prevInfo = await getBondInterestInfo(year, month);
    if (!currInfo || !prevInfo) {
        return noInfo;
    }

    const holdMonths = extractHoldDuration(remainder);
    const refDate = new Date();
    return buildSwitchDecision(
        parse(currInfo.issueDate, 'yyyy-MM-dd', refDate), currInfo.interest,
        parse(prevInfo.issueDate, 'yyyy-MM-dd', refDate), prevInfo.interest,
        holdMonths,
    );
};

export {
    computeSwitchFromResponse,
};
