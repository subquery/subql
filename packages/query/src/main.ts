import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';

(async () => {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
})();
