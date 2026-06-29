export class CreateCalendarEventDto {
  summary: string;
  description?: string;
  start: string;
  end: string;
  customerId: string;
}
