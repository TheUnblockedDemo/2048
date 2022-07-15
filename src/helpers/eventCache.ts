import { EventCache, EventDateProvider } from './EventCache';
import { ThreadEvents } from './ThreadEvents';

export class BaseEvents {
    public threads: ThreadEvents;

    private constructor(eventDateProvider?: EventDateProvider) {
        const eventCache = new EventCache(eventDateProvider);
        this.threads = new ThreadEvents(eventCache);
    }

    private static updateEvents(eventCache: EventCache) {
        this.instance.threads = new ThreadEvents(eventCache);
    }

    private static instance: BaseEvents = new BaseEvents();
    
    public static getInstance(): BaseEvents {
        return BaseEvents.instance;
    }

    public static setup(eventDateProvider: EventDateProvider) {
        const updatedEventCache = new EventCache(eventDateProvider);
        this.updateEvents(updatedEventCache);
    }
}

const Events = BaseEvents.getInstance();
export default Events;
