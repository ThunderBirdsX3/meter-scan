import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TripsPage } from './trips.page';
import { TripsRoutingModule } from './trips-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TripsRoutingModule],
  declarations: [TripsPage],
})
export class TripsPageModule {}
