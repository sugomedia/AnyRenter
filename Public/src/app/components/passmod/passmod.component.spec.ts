import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassmodComponent } from './passmod.component';

describe('PassmodComponent', () => {
  let component: PassmodComponent;
  let fixture: ComponentFixture<PassmodComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PassmodComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassmodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
