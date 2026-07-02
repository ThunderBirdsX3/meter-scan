import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntryDetailPage } from './entry-detail.page';

const routes: Routes = [
  { path: '', component: EntryDetailPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EntryDetailRoutingModule {}
