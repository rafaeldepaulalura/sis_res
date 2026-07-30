import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AdminModule } from './admin/admin.module';
import { ResellerModule } from './reseller/reseller.module';
import { RateLimitGuard } from './common/rate-limit.guard';
import { TenantInterceptor } from './common/tenant.interceptor';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { CategoriesModule } from './categories/categories.module';
import { CouriersModule } from './couriers/couriers.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveryModule } from './delivery/delivery.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { PrintingModule } from './printing/printing.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PublicMenuModule } from './public-menu/public-menu.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { TabsModule } from './tabs/tabs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    CustomersModule,
    CouriersModule,
    DeliveryModule,
    EstablishmentsModule,
    ProductsModule,
    TablesModule,
    TabsModule,
    CashRegisterModule,
    KitchenModule,
    ModifiersModule,
    PrintingModule,
    PublicMenuModule,
    ReportsModule,
    UsersModule,
    AdminModule,
    ResellerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Ordem importa: autentica primeiro (popula req.user), depois autoriza
    // por papel e, por fim, pela permissão fina do sub-usuário.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Aplica o contexto de tenant (RLS) a partir do req.user.
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
