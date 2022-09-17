import { computeFetchResponse } from '../../commands/fetch';
import { noInfo } from '../../constants';
import * as ssb from '../../ssb';


describe('computeFetchResponse', () => {
    test('computeFetchResponse happy case', async () => {
        const getBondInterestInfo = jest.spyOn(ssb, 'getBondInterestInfo').mockResolvedValue(
            {
                issueCode: 'issueCode',
                issueDate: '2000-01-23',
                maturityDate: '2010-01-23',
                openingDate: '2000-01-23',
                closingDate: '2000-01-23',
                interest: [1, 2, 3],
                avgInterest: [1, 2, 3],
            }
        );

        const summary = await computeFetchResponse('jun 15');

        const expected = `issueCode, Jan 23 2000 - Jan 23 2010
Application opens Jan 23 2000, 6pm, closes Jan 23 2000, 9pm
Interest (yrs 1-10): 1 2 3
Averages (yrs 1-10): 1 2 3`;

        expect(summary).toEqual(expected);
        expect(getBondInterestInfo).toBeCalledWith('2015', '6');
    });

    test('computeFetchResponse when getBondInterestInfo returns undefined', async () => {
        const getBondInterestInfo = jest.spyOn(ssb, 'getBondInterestInfo').mockResolvedValue(undefined);

        const summary = await computeFetchResponse('jun 15');
        expect(summary).toEqual(noInfo);
        expect(getBondInterestInfo).toBeCalledWith('2015', '6');
    });
});
