import { __test__parseCommand as parseCommand } from '../handler';

test('parseYearMonth', () => {
    expect(parseCommand('/fetch')).toEqual({ command: 'fetch', rest: '' });
    expect(parseCommand('/start')).toEqual({ command: 'start' });
    expect(parseCommand('/disclaimer')).toEqual({ command: 'disclaimer' });
    expect(parseCommand('/switchfrom rest of the message')).toEqual({ command: 'switchfrom', rest: 'rest of the message' });
    expect(parseCommand('/fetch rest of the message')).toEqual({ command: 'fetch', rest: 'rest of the message' });
    expect(parseCommand('malformed message')).toBeUndefined();
});
