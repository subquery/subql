export interface Entity {
  id: string;
}

export interface Store {
  get(entity: string, id: string): Promise<Entity | null>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
}
