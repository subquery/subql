import {Module} from '@nestjs/common';
import {ConfigureModule} from './configure/configure.module';
import {GraphqlModule} from './graphql/graphql.module';

@Module({
  imports: [ConfigureModule.register(), GraphqlModule],
  controllers: [],
})
export class AppModule {}
