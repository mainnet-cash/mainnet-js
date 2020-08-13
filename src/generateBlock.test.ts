import { generateBlock } from './generateBlock'

/**
 * @jest-environment jsdom
 */

test('Generate a block on a Regression Network', () => {
    expect(generateBlock(1)[0].length).toBe(64);
});