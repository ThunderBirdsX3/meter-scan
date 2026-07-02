import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EntryDetailPage } from './entry-detail.page';
import { EntryDetailRoutingModule } from './entry-detail-routing.module';

@NgModule({
  imports: [CommonModule, IonicModule, EntryDetailRoutingModule],
  declarations: [EntryDetailPage],
})
export class EntryDetailModule {}
