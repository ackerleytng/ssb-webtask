// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUrl = async (url: string): Promise<any> => {
    const options = {
        headers: {
            'User-Agent': 'https://t.me/SsbFriendBot',
            'Content-Type': 'application/json',
        },
    };
    const result = await fetch(url, options);
    return result.json();
};

//-----------------------------------------------------
// Bond info
//-----------------------------------------------------

interface BondInfo {
    issueCode: string,
    issueDate: string,
    maturityDate: string,
    openingDate: string,
    closingDate: string,
}

const getBondInfo = async (year: string, month: string, useAnnounceDate: boolean): Promise<BondInfo | undefined> => {
    // Checked - the api doesn't seem to care about invalid dates,
    //   like if the month doesn't have 31 days
    const paddedMonth = month.toString().padStart(2, '0');
    const range = `[${year}-${paddedMonth}-01 TO ${year}-${paddedMonth}-31]`;

    const filter = useAnnounceDate ? 'ann_date' : 'issue_date';
    const url = `https://www.mas.gov.sg/api/v1/bondsandbills/m/listsavingbonds?rows=1&filters=${filter}:${range}`;

    const data = await getUrl(url);
    const result = data?.result?.records?.[0];
    if (!result) {
        return;
    }

    return {
        issueCode: result.issue_code,
        issueDate: result.issue_date,
        maturityDate: result.maturity_date,
        openingDate: result.ann_date,
        closingDate: result.last_day_to_apply,
    };
};

//-----------------------------------------------------
// Interest info
//-----------------------------------------------------

interface InterestInfo {
    interest: number[],
    avgInterest: number[],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractInterestInfo = (data: any): InterestInfo => {
    const indices = Array(10).fill(0);
    const interest = indices.map((_, i) => data[`year${i + 1}_coupon`]);
    const avgInterest = indices.map((_, i) => data[`year${i + 1}_return`]);

    return { interest, avgInterest };
};

const getInterestInfo = async (issueCode: string): Promise<InterestInfo> => {
    const url = `https://www.mas.gov.sg/api/v1/bondsandbills/m/savingbondsinterest?rows=1&filters=issue_code:${issueCode}`;
    const data = await getUrl(url);
    return extractInterestInfo(data.result.records[0]);
};

export interface BondInterestInfo extends BondInfo, InterestInfo {}

const getBondInterestInfo = async (year?: string, month?: string): Promise<BondInterestInfo | undefined> => {
    const now = new Date();
    const yr = year || now.getFullYear().toString();
    // Because month is 0-based
    const mth = month || (now.getMonth() + 1).toString();

    // useAnnounceDate when neither are specified
    const useAnnounceDate = !year && !month;

    const bondInfo = await getBondInfo(yr, mth, useAnnounceDate);
    if (!bondInfo) {
        return;
    }

    const interestInfo = await getInterestInfo(bondInfo.issueCode);
    return { ...bondInfo, ...interestInfo };
};

export {
    getBondInterestInfo,
};
