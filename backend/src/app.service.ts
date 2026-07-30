import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'restaurante-saas-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
