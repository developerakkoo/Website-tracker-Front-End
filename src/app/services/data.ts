import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root',
})
export class Data {
  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    await this.storage.create();
  }


  async add(key: string, value: any) {
    return this.storage.set(key, value);
  }
  get(key:string){
    return this.storage.get(key);
  }

  remove(key: string) {
    return this.storage.remove(key);
  }

  clearAll() {
    return this.storage.clear();
  }
}
