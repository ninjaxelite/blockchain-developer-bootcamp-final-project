import { TestBed } from '@angular/core/testing';

import { DpoolService } from './dpool.service';

describe('DpoolService', () => {
  let service: DpoolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DpoolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
