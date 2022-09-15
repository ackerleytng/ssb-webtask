import {
    __test__extractHoldDuration as extractHoldDuration,
    __test__computeEffectiveMonthlyInterestRate as computeEffectiveMonthlyInterestRate,
    __test__buildSwitchDecision as buildSwitchDecision,
} from '../../commands/switchFrom';

test('extractHoldDuration', () => {
    expect(extractHoldDuration('hold 60 months')).toEqual(60);
    expect(extractHoldDuration('hold 48   Months')).toEqual(48);
    expect(extractHoldDuration('hold   5.8   Months')).toEqual(5);
    expect(extractHoldDuration('hold 5 Years')).toEqual(60);
    expect(extractHoldDuration('hold 7.4 years')).toEqual(88);
    expect(extractHoldDuration('hold 1 year 6 months')).toEqual(18);
    expect(extractHoldDuration('hold 10 years  11 months')).toEqual(131);
    expect(extractHoldDuration('')).toEqual(120);
    expect(extractHoldDuration('   ')).toEqual(120);
});

test('computeEffectiveMonthlyInterestRate', () => {
    const jun2018Interest = [1.68, 2.14, 2.21, 2.21, 2.30, 2.52, 2.67, 2.81, 2.96, 3.12];
    const aug2018Interest = [1.78, 2.16, 2.37, 2.54, 2.67, 2.76, 2.81, 2.86, 2.95, 3.11];

    expect(computeEffectiveMonthlyInterestRate(jun2018Interest, 2, 118))
        .toBeCloseTo(0.2062711864406782);
    expect(computeEffectiveMonthlyInterestRate(aug2018Interest, 2, 118))
        .toBeCloseTo(0.21790960451977395);
});


test('computeEffectiveMonthlyInterestRate', () => {
    const jun2018Interest = [1.68, 2.14, 2.21, 2.21, 2.30, 2.52, 2.67, 2.81, 2.96, 3.12];
    const aug2018Interest = [1.78, 2.16, 2.37, 2.54, 2.67, 2.76, 2.81, 2.86, 2.95, 3.11];

    const message = buildSwitchDecision(
        // -1 because months are 0-based
        new Date(2018, 8 - 1, 1, 0, 0, 0, 0),
        aug2018Interest,
        new Date(2018, 6 -1, 1, 0, 0, 0, 0),
        jun2018Interest,
        120,
    );

    expect(message).toContain('Jun 2018');
    expect(message).toContain('Aug 2018');
    expect(message).toContain('should switch');
    // TODO Check if this should be 348 or 315
    expect(message).toContain('SGD 348');
});
