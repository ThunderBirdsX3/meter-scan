import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsPage } from './settings.page';

const routes: Routes = [
  { path: '', component: SettingsPage },
  {
    path: 'vehicles',
    loadChildren: () => import('./vehicles/vehicles.module').then(m => m.VehiclesPageModule),
  },
  {
    path: 'trips',
    loadChildren: () => import('./trips/trips.module').then(m => m.TripsPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
