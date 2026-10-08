import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Gym API berjalan di http://localhost:${config.port}`);
});
