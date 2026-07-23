import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

/**
 * This first-pass backend implements auth + time-clock (and a few read endpoints) for real. The mobile
 * app also calls many endpoints not built yet (leads, price-book, inventory, fleet, …). Rather than let
 * those turn every screen into an error state, answer an unimplemented route with an empty list so the
 * screen renders its normal "nothing here yet" state. Implemented routes never throw NotFound, so they
 * are unaffected. As real endpoints are added, they simply stop falling through to here.
 */
@Catch(NotFoundException)
export class NotFoundCompatFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(200).json([]);
  }
}
