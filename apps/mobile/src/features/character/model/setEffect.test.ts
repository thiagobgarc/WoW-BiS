import { setEffectText } from './setEffect';

describe('setEffectText', () => {
  it('prefixes the required count when the payload omits it', () => {
    expect(setEffectText(2, 'Set: Damage done increased by 6%.')).toBe(
      '(2) Set: Damage done increased by 6%.',
    );
  });

  it('leaves a string that already carries its count alone', () => {
    // Live data does both, in the same set — see the module comment.
    expect(setEffectText(4, '(4) Set: Damage done increased by 10%.')).toBe(
      '(4) Set: Damage done increased by 10%.',
    );
  });

  it('tolerates leading whitespace before the count', () => {
    expect(setEffectText(4, ' (4) Set: Something.')).toBe(' (4) Set: Something.');
  });

  it('does not treat a parenthetical elsewhere in the line as a prefix', () => {
    expect(setEffectText(2, 'Set: Grants (2) charges.')).toBe('(2) Set: Grants (2) charges.');
  });
});
