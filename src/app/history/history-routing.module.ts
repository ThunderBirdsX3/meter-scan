import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HistoryPage } from './history.page';

const routes: Routes = [
  { path: '', component: HistoryPage },
  {
    path: 'detail/:id',
    loadChildren: () => import('./entry-detail/entry-detail.module').then(m => m.EntryDetailModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HistoryPageRoutingModule {}
