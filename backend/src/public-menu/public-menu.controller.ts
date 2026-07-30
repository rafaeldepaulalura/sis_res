import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit } from '../common/rate-limit.guard';
import { PublicOrderDto } from './dto/public-order.dto';
import { PublicMenuService } from './public-menu.service';

// Rotas públicas (sem auth) — cardápio digital via QR Code/link.
@Public()
@Controller('public/menu')
export class PublicMenuController {
  constructor(private readonly publicMenu: PublicMenuService) {}

  @Get(':slug')
  getMenu(@Param('slug') slug: string) {
    return this.publicMenu.getMenu(slug);
  }

  // Preenche o checkout do cliente que já comprou antes. Limitado por IP:
  // um cliente real consulta o próprio telefone uma vez, então 10 por minuto
  // é folgado para ele e apertado para quem quisesse varrer números.
  @Get(':slug/customer')
  @RateLimit({ limit: 10, windowSeconds: 60 })
  findCustomer(@Param('slug') slug: string, @Query('phone') phone?: string) {
    if (!phone) return null;
    return this.publicMenu.findCustomerByPhone(slug, phone);
  }

  // Taxa de entrega do bairro, para o cardápio mostrar antes de confirmar.
  @Get(':slug/delivery-quote')
  quoteDelivery(
    @Param('slug') slug: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('subtotal') subtotal?: string,
  ) {
    return this.publicMenu.quoteDelivery(
      slug,
      neighborhood,
      Number(subtotal) || 0,
    );
  }

  @Post(':slug/orders')
  createOrder(@Param('slug') slug: string, @Body() dto: PublicOrderDto) {
    return this.publicMenu.createOrder(slug, dto);
  }
}
