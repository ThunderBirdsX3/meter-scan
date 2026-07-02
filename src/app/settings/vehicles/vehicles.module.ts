import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { VehiclesPage } from './vehicles.page';
import { VehiclesRoutingModule } from './vehicles-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, VehiclesRoutingModule],
  declarations: [VehiclesPage],
})
export class VehiclesPageModule {}
