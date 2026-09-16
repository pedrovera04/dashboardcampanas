import { Injectable } from '@angular/core';
import { MAF_DATA } from './data.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly d: any = MAF_DATA;
}
