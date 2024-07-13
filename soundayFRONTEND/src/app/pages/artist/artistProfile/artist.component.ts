import { Component, OnInit, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IEvent } from '../../../models/i-event';
import { EditEventModalComponent } from "../edit-event-modal/edit-event-modal.component";
import { AddEventModalComponent } from '../add-event-modal/add-event-modal.component';
import { IUser } from '../../../models/i-user';
import { EventService } from '../../events/events.service';
import { AuthService } from '../../../auth/auth.service';
import { CountsAndLike } from '../../../models/counts-and-like';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-artist',
  templateUrl: './artist.component.html',
  styleUrls: ['./artist.component.scss']
})
export class ArtistComponent implements OnInit {
  events: IEvent[] = [];
  pastEvents: IEvent[] = [];
  user: IUser | null = null;
  eventCounts: { [key: number]: CountsAndLike } = {};

  constructor(private eventService: EventService, private authService: AuthService, private modalService: NgbModal) {}

  ngOnInit(): void {
    this.loadEvents();
    this.authService.user$.subscribe(user => {
      this.user = user;
    });
  }

  loadEvents() {
    combineLatest([
      this.eventService.getAll(),
      this.authService.user$
    ]).subscribe(([allEvents, user]) => {
      const today = new Date();
      this.events = allEvents;
      this.pastEvents = allEvents.filter(event => new Date(event.eventDate) < today);

      if (user) {
        const likedEventIds: number[] = user.likeEvents || [];
        allEvents.forEach(event => {
          this.eventCounts[event.id] = {
            id: event.id,
            likedByCurrentUser: likedEventIds.includes(event.id),
            participantsCount: 0, // Default value
            likesCount: 0 // Default value
          };
        });
      }
    });
  }

  toggleLike(eventId: number): void {
    const counts = this.getEventCounts(eventId);
    if (counts) {
      this.eventService.toggleLike(eventId, !counts.likedByCurrentUser).subscribe(() => {
        counts.likedByCurrentUser = !counts.likedByCurrentUser;
        counts.likedByCurrentUser ? counts.likesCount++ : counts.likesCount--;
      });
    }
  }

  getEventCounts(eventId: number): CountsAndLike | undefined {
    return this.eventCounts[eventId];
  }


  openAddEventModal(): void {
    const modalRef = this.modalService.open(AddEventModalComponent);
    modalRef.componentInstance.user = this.user;

    modalRef.result.then((result) => {
      if (result) {
        this.loadEvents();
      }
    }).catch((error) => {
      console.log('Modal dismissed:', error);
    });
  }
  editEvent(event: IEvent) {
    const modalRef = this.modalService.open(EditEventModalComponent);
    modalRef.componentInstance.event = { ...event }; // Passa una copia dell'evento da modificare

    modalRef.componentInstance.eventUpdated.subscribe((updatedEvent: IEvent) => {
      const index = this.events.findIndex(e => e.id === updatedEvent.id);
      if (index !== -1) {
        this.events[index] = updatedEvent;
        this.loadEvents(); // Refresh the events to re-categorize them
      }
    });
  }
}
