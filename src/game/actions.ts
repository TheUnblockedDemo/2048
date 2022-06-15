import { Direction } from "./enums";

export interface StartNewGameAction {
  type: "START";
  serializedState: string;
}

export interface MoveAction {
  type: "MOVE";
  direction: Direction;
}

export interface MagicAction {
  type: "MAGIC";
  spell: Spell;
}

export type Action = StartNewGameAction | MoveAction | MagicAction;
