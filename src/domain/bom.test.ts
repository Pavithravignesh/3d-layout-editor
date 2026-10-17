import { describe, expect, it } from 'vitest';
import { billOfMaterials } from './bom';
import { nextLabel } from './labels';
import { makeItem } from './test-utils';

describe('billOfMaterials', () => {
  it('counts items by type in catalogue order and leaves out unused types', () => {
    const items = [
      makeItem('transformer', 5, 5, 0, 'T-01'),
      makeItem('cabinet', 1, 1, 0, 'C-02'),
      makeItem('cabinet', 3, 1, 0, 'C-01'),
    ];
    expect(billOfMaterials(items)).toEqual([
      { type: 'cabinet', quantity: 2, labels: ['C-01', 'C-02'] },
      { type: 'transformer', quantity: 1, labels: ['T-01'] },
    ]);
  });

  it('is empty for an empty scene', () => {
    expect(billOfMaterials([])).toEqual([]);
  });
});

describe('nextLabel', () => {
  it('numbers each type separately with two digits', () => {
    expect(nextLabel([], 'cabinet')).toBe('C-01');
    expect(nextLabel([makeItem('cabinet', 1, 1, 0, 'C-01')], 'drive')).toBe('D-01');
  });

  it('never reuses a number, even after a delete', () => {
    const items = [makeItem('cabinet', 1, 1, 0, 'C-01'), makeItem('cabinet', 3, 1, 0, 'C-03')];
    expect(nextLabel(items, 'cabinet')).toBe('C-04');
  });
});
