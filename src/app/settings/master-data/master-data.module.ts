import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MasterDataPage } from './master-data.page';
import { MasterDataRoutingModule } from './master-data-routing.module';

@NgModule({
  imports: [CommonModule, IonicModule, MasterDataRoutingModule],
  declarations: [MasterDataPage],
})
export class MasterDataPageModule {}
