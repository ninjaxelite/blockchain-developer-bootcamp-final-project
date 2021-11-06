import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DpoolComponent } from './dpool.component';

describe('DpoolComponent', () => {
  let component: DpoolComponent;
  let fixture: ComponentFixture<DpoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DpoolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DpoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
