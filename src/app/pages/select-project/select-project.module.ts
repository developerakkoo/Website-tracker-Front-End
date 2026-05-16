import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SelectProjectPageRoutingModule } from './select-project-routing.module';
import { SelectProjectPage } from './select-project.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SelectProjectPageRoutingModule],
  declarations: [SelectProjectPage],
})
export class SelectProjectPageModule {}
