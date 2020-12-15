import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { ModelAttributes, Sequelize } from 'sequelize';
import { Entity, Store } from '@subql/types';

@Injectable()
export class StoreService {
  constructor(private sequelize: Sequelize) {}

  async syncSchema(
    models: { name: string; attributes: ModelAttributes<any> }[],
    schema: string,
  ) {
    for (const { name, attributes } of models) {
      this.sequelize.define(name, attributes, {
        // timestamps: false,
        underscored: true,
        freezeTableName: true,
        schema,
      });
    }
    await this.sequelize.sync();
  }

  getStore(): Store {
    return {
      get: async (entity: string, id: string): Promise<Entity | null> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        return model.findOne({ where: { id } }) as any;
      },
      set: async (entity: string, id: string, data: Entity): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.upsert(data);
      },
      remove: async (entity: string, id: string): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.destroy({ where: { id } });
      },
    };
  }
}
