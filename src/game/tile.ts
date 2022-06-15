export interface TilePosition {
  rowIndex: number;
  cellIndex: number;
}

export interface Tile extends TilePosition {
  value: number;
}

export function buildTile(
  rowIdx: number,
  colIdx: number,
  value: number
): Tile {
  return {
    rowIndex: rowIdx,
    cellIndex: colIdx,
    value: value
  };
}
