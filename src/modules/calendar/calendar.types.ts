export type CalendarEventInput = {
  summary: string;
  description?: string;
  start: string;
  end: string;
  customerId: string;
};

export type CalendarEventUpdateInput = {
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  customerId?: string;
};

export type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  customerId: string;
  htmlLink?: string;
};

export type ListCalendarEventsParams = {
  customerId?: string;
  timeMin?: string;
  timeMax?: string;
};
