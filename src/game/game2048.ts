import { IRandom } from "helpers/random";

import { Direction } from "./enums";
import {
  TileCreatedEvent,
  TileMergeEvent,
  TileMoveEvent,
  GameEvent,
  TilesNotMovedEvent,
  GameOverEvent,
  TileDeletedEvent,
  GameStartedEvent
} from "./events";

import { Grid } from "./grid";
import { Tile } from "./tile";
import { RowProcessor } from "./row-processor";
import { Action } from "./actions";
import { stay } from "helpers/async";
import { ensure } from "helpers/syntax";

export interface IGameState {
  scores: number;
  gridSerialized: string;
}

 // This is the main game class. 
 export class Game2048 {
  private scores: number = 0;
  private grid: Grid;
  private userActionsQueue: Action[] = [];

  constructor(size: number, private rand: IRandom) {
    this.grid = new Grid(size);
  }

  public getGrid() {
    return this.grid;
  }

  public getScores() {
    return this.scores;
  }

  public getUserActionsQueue() {
    return this.userActionsQueue;
  }

  public serialize(): string {
    const state: IGameState = {
      scores: 0,
      gridSerialized: this.grid.serialize()
    };
    return JSON.stringify(state);
  }

  public initFromState(gameState: string): boolean {
    try {
      const state: IGameState = JSON.parse(gameState);
      const scores = ensure(state.scores);
      const grid = ensure(Grid.deserialize(state.gridSerialized));
      this.scores = scores;
      this.grid = grid;
      return true;
    } catch (ex) {
      return false;
    }
  }

  public queueAction(action: Action): void {
    this.userActionsQueue.push(action);
  }

  public async processAction() {
    while (this.userActionsQueue.length === 0) {
      await stay(150);
    }

    const action = this.userActionsQueue.splice(0, 1)[0];
    
    return this.processSingleAction(action);
  }

  private processSingleAction(action: Action) {
    const gameEvents: GameEvent[] = [];

    if (action.type === "MOVE") {
      gameEvents.push(...this.processMoveAction(action.direction));
    }
    
    if (action.type === "START") {
      if (action.serializedState && this.initFromState(action.serializedState)) {
        gameEvents.push(new GameStartedEvent());
        
        for (let irow = 0; irow < this.grid.size; irow++) {
          for (let icell = 0; icell < this.grid.size; icell++) {
            if (this.grid.cells[irow][icell] > 0) {
              gameEvents.push(
                new TileCreatedEvent({
                  cellIndex: icell,
                  rowIndex: irow,
                  value: this.grid.cells[irow][icell]
                })
              );
            }
          }
        }
      } else {
        this.scores = 0;
        gameEvents.push(new GameStartedEvent());
        
        for (let irow = 0; irow < this.grid.size; irow++) {
          for (let icell = 0; icell < this.grid.size; icell++) {
            if (this.grid.cells[irow][icell] > 0) {
              gameEvents.push(
                new TileDeletedEvent({ cellIndex: icell, rowIndex: irow })
              );
              this.grid.cells[irow][icell] = 0;
            }
          }
        }

        const newTile = this.insertNewTileToVacantSpace();
        if (newTile) {
          gameEvents.push(new TileCreatedEvent(newTile));
        }
      }
    }

    return gameEvents;
  }

  private calculateMoveEvents(move: Direction): GameEvent[] {
    const gameEvents = [];
    const rowsData = this.grid.getRowDataByDirection(move);

    for (const row of rowsData) {
      const rowEvents = RowProcessor.ProcessRow(row);

      //apply row events to game grid and publish them to subscribers
      for (const rowEvent of rowEvents) {
        const oldPos = row[rowEvent.oldIndex];
        const newPos = row[rowEvent.newIndex];
        if (rowEvent.isMerged) {
          gameEvents.push(
            new TileMergeEvent(oldPos, newPos, rowEvent.mergedValue)
          );
        } else {
          gameEvents.push(
            new TileMoveEvent(
              oldPos,
              newPos,
              rowEvent.value,
              rowEvent.isDeleted
            )
          );
        }
      }
    }

    return gameEvents;
  }


  private exponentialThreshold = 32
  private calculateScoreValue(eventValue: number): number {
    if (eventValue <= this.exponentialThreshold) {
      return eventValue
    }
    return eventValue ** 2;
  }

  private processMoveAction(move: Direction): GameEvent[] {
    const gameEvents = this.calculateMoveEvents(move);

    const anyTileMoved = gameEvents.length > 0;
    for (const event of gameEvents) {
      if (event instanceof TileMoveEvent) {
        this.grid.updateTileByPos(event.newPosition, event.value);
        this.grid.removeTileByPos(event.oldPosition);
      }

      if (event instanceof TileMergeEvent) {
        this.grid.updateTileByPos(event.mergePosition, event.newValue);
        this.grid.removeTileByPos(event.oldPosition);
        this.scores += this.calculateScoreValue(event.newValue);
      }
    }

    // If we have events then there were some movements and therefore there must be some empty space to insert new tile
    if (anyTileMoved) {
      const newTile = this.insertNewTileToVacantSpace();
      if (!newTile) {
        throw new Error("New title must be inserted somewhere!");
      }
      gameEvents.push(new TileCreatedEvent(newTile));
    } else {
      gameEvents.push(new TilesNotMovedEvent(move));

      // Here we need to check if game grid is full - so might be game is finished if there is no possibility to make a movement
      const availTitles = this.grid.availableCells();
      if (availTitles.length == 0) {
        // Check if there are possible movements
        const weHaveSomePossibleEvents =
          this.calculateMoveEvents(Direction.Up).length > 0 ||
          this.calculateMoveEvents(Direction.Right).length > 0 ||
          this.calculateMoveEvents(Direction.Left).length > 0 ||
          this.calculateMoveEvents(Direction.Down).length > 0;
        if (!weHaveSomePossibleEvents) {
          // Game is over, dude
          gameEvents.push(new GameOverEvent());
        }
      }
    }

    return gameEvents;
  }

  private insertNewTileToVacantSpace(): Tile | undefined {
    const availTitles = this.grid.availableCells();

    if (availTitles.length == 0) {
      return undefined;
    }

    const ti = this.rand.getRandomNumber(0, availTitles.length);
    const pos = availTitles[ti];
    const tile: Tile = {
      rowIndex: pos.rowIndex,
      cellIndex: pos.cellIndex,
      value: 2
    };
    this.grid.insertTileByPos(tile, tile.value);
    
    return tile;
  }
}
