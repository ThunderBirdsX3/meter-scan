import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { StatsPage } from './stats.page';
import { StatsRoutingModule } from './stats-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, StatsRoutingModule],
  declarations: [StatsPage],
})
export class StatsPageModule {}
